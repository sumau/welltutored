# Deploying

Merging to `main` deploys. `.github/workflows/ci.yml` builds the image, runs
`flyctl deploy`, and then runs the launch smoke against the result. This
document covers running the live Deployment: the schema, which is not
automatic, and what to do when a deploy goes wrong. Standing a new Deployment up
from nothing is [first-deploy.md](first-deploy.md).

## What runs

One container serves the API under `/api/*` and the frontend build everywhere
else, with client-side routes falling back to `index.html`. Splitting them is
not a configuration this codebase supports
([ADR-0001](adr/0001-single-origin-deployment.md)). The PostgreSQL database is
on Neon, outside the container.

## Applying the schema

Nothing applies the schema for you, and the Deploy job deliberately does not —
[ADR-0002](adr/0002-schema-by-deliberate-push.md) is why. Drizzle's `push` is
the only mechanism this project has; run it deliberately against the Deployment
database from a checkout.

Read the **direct** connection string into a shell variable once per terminal.
`read -rs` takes it without echoing it or writing it to shell history; paste it,
`?sslmode=require` included, and press Enter. Every database command in this
document and in [schema-push.md](schema-push.md) then uses it as-is, so keep
that terminal open for the session:

```
read -rsp 'Direct DATABASE_URL: ' DIRECT_DATABASE_URL; echo

docker compose run --rm -e DATABASE_URL="$DIRECT_DATABASE_URL" --entrypoint bash migrate \
  -lc 'pnpm --filter @workspace/db run push'
```

This runs from your machine to the database. Secrets set on Fly play no part in
it, so the connection string has to be supplied here.

Three things about that command:

- **Pass `-e DATABASE_URL="$DIRECT_DATABASE_URL"`, expanded, not bare `-e
  DATABASE_URL`.** `docker-compose.yml` sets `DATABASE_URL` on the `migrate`
  service to the local development database, and an explicit `environment:`
  entry beats anything from `.env`. The bare form asks Compose to forward the
  variable from your shell, and when that forwarding does not happen the service
  default applies — so you push to your local container instead of the
  Deployment, successfully and quietly. The expanded form cannot fail that way:
  your shell substitutes the value before Docker sees it, and an unset variable
  passes an empty string, which fails loudly with `DATABASE_URL, ensure the
  database is provisioned` instead of silently choosing the wrong database.
- **`?sslmode=require`** belongs on the connection string, for the reason in
  the [configuration reference](#configuration-reference).
- **Use Neon's direct connection string here**, not the pooled one — the
  `-pooler` hostname is the application's. Pooled connections are a poor fit for
  DDL.

`push` prompts before anything destructive. Read the prompt, and review the diff
of `lib/db/src/schema/` first — nothing downstream asks.
[schema-push.md](schema-push.md) has what each kind of change prompts, how past
pushes were answered, and how to rehearse a push on a Neon branch first.

Check what landed, and check *where* it landed at the same time:

```
docker compose run --rm -e DATABASE_URL="$DIRECT_DATABASE_URL" --entrypoint bash migrate \
  -lc 'psql "$DATABASE_URL" -c "\conninfo" -c "\dt"'
```

`tutors`, `resources`, `enquiries` and `workspace_accounts` should all be
listed.

Read the `\conninfo` line first, and read it twice. It names the host you
actually reached, and it is the only output here that distinguishes the
Deployment from your local container — the table list looks the same either way.
There are two ways to be somewhere you did not intend:

- **Host `db` at port `5432`** — the environment variable did not reach the
  container and you are inspecting, or pushing to, the local database.
- **A hostname containing `-pooler`** — you are on the pooled endpoint, which is
  the application's, not the one for schema work. Drop `-pooler` from the
  hostname to get the direct endpoint. `push` against the pooled endpoint can
  report success without converging, so a `push` that keeps finding the same
  changes run after run is the symptom to watch for.

## Blue-green deploys

`fly.toml` sets `strategy = "bluegreen"`. A deploy boots a new machine beside
the current one, waits for it to pass the Health Check, moves traffic to it, and
then destroys the old one. So a version that doesn't start, or can't reach the
database, never takes traffic. The machine also gets a new ID on every deploy,
so nothing may depend on one.

`fly.toml` points Fly's health check at `/api/healthz`, the Health Check. It
answers `200` only when the database answers a `SELECT 1` within 3 seconds, and
`503` otherwise, so a wrong `DATABASE_URL` or an unreachable Neon takes the
machine out of rotation. Fly then serves its own proxy error rather than the
app's. That is accepted, since every page needs the database anyway. The 3
seconds sit above Neon's wake-from-suspend time and below the check's 5-second
`timeout`.

What blue-green does **not** catch: broken pages, a missing Tutor, or code that
doesn't match the live schema, which still answers `SELECT 1`. Those surface in the
Launch Smoke, which runs after the switch, against the version visitors already
see.

**A failed deploy** is a red `Deploy to Fly` step. `flyctl` reports the new
machine failing its checks, and the old machine keeps serving the previous
version. Run `fly machines list` afterwards: if a machine from the failed
attempt is still there, destroy it with `fly machines destroy <id> --force`.

**A deploy that passes but breaks the site** is a red Launch smoke after a
green `Deploy to Fly`. The new version is live, and nothing rolls it back by
itself. To go back to the previous image:

```
fly releases --image          # the image reference of each release
fly deploy --image <previous image reference>
```

Run it from a checkout of `main`, since it still reads `fly.toml` from there.
Then revert the change on `main`, or the next merge ships it again.

**Rolling back past a schema push is only safe if the push was additive.** The
schema is pushed before merge ([ADR-0002](adr/0002-schema-by-deliberate-push.md)),
so the previous image runs against the new schema. A new nullable column or
table is fine. A renamed or dropped column breaks the old code too, and the
rollback then means pushing the old schema back by hand.

Deploying this way was chosen instead of a staging environment
([ADR-0003](adr/0003-no-staging-environment.md)).

## Configuration reference

| Variable | When | Notes |
| --- | --- | --- |
| `DATABASE_URL` | runtime, required | Append `?sslmode=require` for a hosted database: `lib/db/src/index.ts` creates a bare `pg` pool with no SSL options of its own. |
| `TRUSTED_ORIGINS` | runtime, required | The exact public origin, e.g. `https://welltutored.co.uk`. See below. |
| `PUBLIC_ORIGIN` | runtime, optional | The Public Origin, e.g. `https://welltutored.example`. When set, a request arriving on any other hostname gets a `301` to the same path and query there; `/api/healthz` is exempt, because Fly's health checks do not use the public hostname. It must also appear in `TRUSTED_ORIGINS`, or the server refuses to start. Unset, nothing redirects. |
| `PORT` | runtime, required | The image defaults it to `8080`. |
| `WEB_CLIENT_ROOT` | runtime, required | The directory holding the frontend build; `docker/Dockerfile` sets it to `/app/web`. Leaving it unset makes the server skip serving the frontend entirely, so every page answers 404 while `/api/healthz` stays green. It logs a warning in that state. |
| `CLERK_SECRET_KEY` | runtime, required | Not optional: the Clerk middleware fails every `/api` request with a 500 when it is absent, public endpoints included. A real key enables workspace sign-in; a syntactically valid placeholder (`sk_test_` + 32 characters, as in `.env.example`) is enough to serve the public site. |
| `CLERK_PUBLISHABLE_KEY` | runtime | Used by the Clerk middleware. |
| `VITE_CLERK_PUBLISHABLE_KEY` | **build**, as a build argument | Compiled into the browser bundle. Setting it at runtime has no effect. |

`TRUSTED_ORIGINS` is the one that bites. In production nothing infers it, and an
empty trusted-origin set rejects every credentialed request — including the
public enquiry POST, which is the main thing visitors do. Set it to the public
origin, with no trailing path, and update it when the domain changes.

`configuredValues` in `artifacts/api-server/src/middlewares/request-origin.ts`
reads `TRUSTED_ORIGINS` and `CORS_ORIGINS`, treats them as one list, and falls
back to the localhost defaults only outside production. Setting either one
**replaces** those defaults, so a Deployment trusts what `fly.toml` names and
nothing else.

The public site does not need *working* Clerk keys, but it does need
`CLERK_SECRET_KEY` to be present — see the table. With a placeholder, the
directory and enquiry flow both work and `/workspace` simply cannot be
signed into. Pages themselves keep rendering either way, because the Clerk
middleware is mounted under `/api` only.

## Verifying the image locally

The `prod` compose service runs the Deployment image against the local
development database, which has seed content:

```
docker compose up --build prod      # http://localhost:8081
```

That covers the two things most likely to be wrong — whether the frontend is
actually served, and whether `TRUSTED_ORIGINS` permits an enquiry — without
deploying anything. The launch smoke check runs against it over the compose
network, and is the regression test for both:

```
docker compose run --rm --entrypoint bash api -lc 'SMOKE_BASE_URL=http://prod:8080 pnpm run smoke:dev'
```

It requests every public page with `Accept: text/html`, which is what caught the
Clerk handshake redirect in
[ADR-0001](adr/0001-single-origin-deployment.md#consequences). The rest of the suite is unchanged:
`docker compose run --rm test`, described in [local-docker.md](local-docker.md).
