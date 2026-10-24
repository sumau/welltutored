# Stand up a Deployment

For whoever stands a [Deployment](../GLOSSARY.md#delivery) up from nothing: a
new database, Fly app, domain, Clerk instance, content and first
[Owner](../GLOSSARY.md#the-private-area). The live Deployment already exists, so
this is for rebuilding it or starting another. Running the live one is
[schema-changes.md](schema-changes.md) for schema pushes and
[pipeline.md](pipeline.md) for deploys and rollback.

## Order of steps

Each step has its own section on this page. Do them in this order:

1. **[Database](#database)** — create the Neon project in London, take the
   pooled and direct connection strings.
2. **[Apply the schema](schema-changes.md#push-the-schema)** — from this checkout,
   using the direct string. Nothing does this for you.
3. **[Clerk keys](#clerk-keys)** — a development instance, because you don't
   control DNS for `*.fly.dev`.
4. **[Deploy](#flyio)** — create the app, set the secrets, put the publishable
   key in `fly.toml`, `fly deploy`.
5. **[Attach a domain](#attach-a-custom-domain)**, then
   **[move to a production Clerk instance](#move-to-a-production-clerk-instance)**.
6. **Expect an empty site.** A fresh database has no tutors or resources — see
   [Content](#content) — and no Owner: [promote the first one](#owner).

The image can be checked first without deploying: see the
[Image Smoke](../GLOSSARY.md#delivery)
[by hand](smoke-checks.md#the-image-smoke-by-hand).

## Database

[Neon](https://neon.tech) hosts the PostgreSQL. It is reachable over the
public internet, so every step that runs from this checkout (the schema push,
copying data in) needs no tunnel.

Create the project in **AWS Europe West 2 (London)**, the region nearest
`primary_region = "lhr"` in `fly.toml`, and if `primary_region` ever changes,
move the database with it. Neon can't move a project afterwards, and distance
costs more than it looks: every query is a round trip, and `pg` drops a
connection after 10 seconds idle, so on a quiet site most visitors also pay for
a fresh TCP, TLS and Postgres handshake (#65 has the measurements).

Then take **two** connection strings from its dashboard. Neon
marks the pooled one with `-pooler` in the hostname, and they aren't
interchangeable:

- The **pooled** string is the application's. Set it as the `DATABASE_URL`
  secret on the Deployment.
- The **direct** string is for schema work. Use it for the
  [schema push](schema-changes.md#push-the-schema).

Both need `?sslmode=require` appended: `backend/src/core/db.ts` builds a bare `pg`
pool from `DATABASE_URL` and sets no SSL options of its own, so without it the
connection is refused.

Any hosted PostgreSQL that a checkout can reach substitutes: the application
needs a `DATABASE_URL` and nothing more, plus that provider's equivalent of the
pooled and direct strings. Fly's managed Postgres is private-network only, so
every command run from a checkout would need a proxy in front of it.

## Clerk keys

Which keys work depends on the hostname, and getting this wrong is the most
common way a first Deployment fails.

`publishableKeyFromHost` decides this, and the SPA
(`frontend/src/app/config.ts`) and the API (`app.ts`) both call it. Its
decision comes down to these two lines:

```js
if (fallbackKey && isDevelopmentFromPublishableKey(fallbackKey)) return fallbackKey;
return buildPublishableKey(`clerk.${hostname}`);
```

- A **development** key (`pk_test_…`) is used exactly as given, so Clerk is
  reached at the instance's own `*.clerk.accounts.dev` hostname whatever the
  page's hostname. This is the only configuration that works on a hostname
  whose DNS you don't control, such as `*.fly.dev`, and it needs no records.
- A **production** key (`pk_live_…`), or no key at all, is discarded: both sides
  derive a key for `clerk.HOSTNAME` instead, where `HOSTNAME` is the one the
  browser used. That expects the CNAME a Clerk
  production instance asks you to add, so it requires a domain of your own.

So stand the Deployment up on development keys, and move to a production
instance when you attach a real domain. `TRUSTED_ORIGINS` and `PUBLIC_ORIGIN`
change with the domain; `app` in `fly.toml` doesn't, because it is the Fly
app's name rather than a hostname, and changing it means creating a new app.

The live Deployment runs on a production instance for `welltutored.co.uk`,
reached at `clerk.welltutored.co.uk`. There is no Frontend API proxy: the
browser talks to that CNAME directly.

## Fly.io

`fly.toml` is committed and points at `docker/Dockerfile`. Before you begin,
the Neon project exists, the schema is pushed, and you have Clerk development
keys.

1. Read each secret into a shell variable (paste it, then press Enter), create
   the app, and set the secrets:

   ```
   read -rsp 'Pooled DATABASE_URL: ' POOLED_DATABASE_URL; echo
   read -rsp 'CLERK_SECRET_KEY: ' CLERK_SECRET_KEY; echo
   read -rsp 'CLERK_PUBLISHABLE_KEY: ' CLERK_PUBLISHABLE_KEY; echo

   fly apps create welltutored
   fly secrets set \
     DATABASE_URL="$POOLED_DATABASE_URL" \
     CLERK_SECRET_KEY="$CLERK_SECRET_KEY" \
     CLERK_PUBLISHABLE_KEY="$CLERK_PUBLISHABLE_KEY"
   ```

   This is the **pooled** string, not the `DIRECT_DATABASE_URL` used for
   [schema work](schema-changes.md#push-the-schema). The direct one works here
   too, and quietly costs you connection pooling in production.

   Use `fly apps create`, which only reserves the name, rather than
   `fly launch`, which rewrites the committed `fly.toml` from its own guesses.

2. Give CI a deploy token of its own. Nothing else can do this step for you.
   Create the token, then paste it when `gh` prompts for the secret's value:

   ```
   fly tokens create deploy
   gh secret set FLY_API_TOKEN
   ```

3. Edit `fly.toml`. Its values are committed to the repository, which is
   correct for all of them. Set the publishable key and `TRUSTED_ORIGINS`, and
   delete the `PUBLIC_ORIGIN` line until you
   [attach a custom domain](#attach-a-custom-domain):

   ```toml
   [build.args]
     # Your Clerk publishable key, pasted in full.
     VITE_CLERK_PUBLISHABLE_KEY = "pk_test_..."

   [env]
     # Deleted until you attach a custom domain: left in, it names an origin
     # TRUSTED_ORIGINS doesn't, and the server won't start.
     # PUBLIC_ORIGIN = "https://welltutored.co.uk"
     # The hostname `fly apps create` gave you, with the scheme and no trailing
     # slash.
     TRUSTED_ORIGINS = "https://welltutored.fly.dev"
   ```

   **The publishable key has to be here and not in `fly secrets`.** Vite
   compiles it into the bundle while the image is built, and a Fly secret only
   exists once the container runs. Set as a secret, the build silently uses the
   empty string and sign-in never initialises. A publishable key is public by
   design, so committing it isn't a leak; the three secrets from step 1 must
   never appear in this file.

   **`TRUSTED_ORIGINS` must match the deployed hostname exactly.** See the
   [configuration reference](configuration.md). A `PUBLIC_ORIGIN` that
   `TRUSTED_ORIGINS` doesn't name stops the server from starting.

4. Point the Prod Smoke at this Deployment. The `prod-smoke` job in
   `.github/workflows/ci.yml` names the live Deployment's hostnames: set
   `SMOKE_BASE_URL` in both its steps to your `*.fly.dev` origin, and remove
   `SMOKE_REDIRECT_FROM` and `SMOKE_CLERK_FRONTEND_API` until you
   [attach a custom domain](#attach-a-custom-domain). Left as they are, the
   job checks `welltutored.co.uk` instead of your app.

5. Merge to `main`, which deploys. To ship a first image before any of this is
   merged, run `fly deploy` from a checkout.

## Attach a custom domain

The Deployment starts on the `*.fly.dev` hostname `fly apps create` gives it.
Moving it onto a domain of its own takes DNS, a certificate per hostname, and
two lines of `fly.toml`, in that order. The live Deployment is on
`welltutored.co.uk`, with `www.welltutored.co.uk`, `welltutored.com` and
`www.welltutored.com` redirecting to it.

1. **DNS.** For every hostname, an `A` record for the app's IPv4 address and an
   `AAAA` record for its IPv6 address; `fly ips list` shows both. Where DNS is
   on Cloudflare, set each record to **DNS only**: with Cloudflare's proxy in
   front, Fly can't issue its certificates without further setup.
2. **Certificates.** Run `fly certs add HOSTNAME` for each hostname, then wait
   until
   `fly certs list` shows every one `Issued`. Fly validates against the DNS
   from step 1, so this can't usefully come first.
3. **`fly.toml`.** Set `PUBLIC_ORIGIN` to the domain visitors should end up on,
   and `TRUSTED_ORIGINS` to the same value. Every other hostname, the
   `*.fly.dev` one included, then answers with a `301` to the same path there.
   Only after step 2: a redirect to a hostname without a certificate sends
   every visitor to a browser warning.
4. **Prod Smoke.** Point the `prod-smoke` job's `SMOKE_BASE_URL`, in both its
   steps, at the new origin and list the other hostnames in
   `SMOKE_REDIRECT_FROM`.

`app` in `fly.toml` stays as it is throughout.

## Move to a production Clerk instance

In this order, so the server's keys and the bundle's key change in one deploy:

1. In the Clerk dashboard, create a production instance for the
   [Public Origin](../GLOSSARY.md#delivery)'s domain, cloning the development
   instance's settings.
2. Add the DNS records it lists (`clerk.`, `accounts.`, `clkmail.` and two
   DKIM records) in Cloudflare as **DNS only**, and wait until Clerk shows the
   domain verified and its certificates issued.
3. Social sign-in needs credentials of your own; a production instance doesn't
   share Clerk's. For Google: create a Web OAuth client in Google Cloud with
   the redirect URI Clerk shows, set the consent screen to **In production**
   (in Testing, only listed test users can sign in), and paste the client ID
   and secret into Clerk.
4. Stage the two secrets without restarting anything, so they take effect with
   the next deploy rather than alongside a bundle built for the old instance:

   ```
   read -rsp 'CLERK_SECRET_KEY: ' CLERK_SECRET_KEY; echo
   read -rsp 'CLERK_PUBLISHABLE_KEY: ' CLERK_PUBLISHABLE_KEY; echo
   fly secrets set --stage \
     CLERK_SECRET_KEY="$CLERK_SECRET_KEY" \
     CLERK_PUBLISHABLE_KEY="$CLERK_PUBLISHABLE_KEY"
   ```

5. Put the `pk_live_…` key in `fly.toml` under `[build.args]` and merge. The
   deploy picks up the staged secrets, and the launch smoke checks
   `https://clerk.DOMAIN/v1/environment` for a production instance, where
   `DOMAIN` is the Public Origin's domain.

## Content

`ensureSeedContent()` only runs when `NODE_ENV=development`
(`backend/src/main.ts`), so a fresh Deployment database has no
tutors or resources and the public directory renders empty.
[Deploy](../GLOSSARY.md#delivery) empty and create content through `/workspace`.
Two things behave differently until there is a published
[Tutor](../GLOSSARY.md#the-public-site), and neither is a fault:

- The directory renders its empty state, and `/api/tutors` returns an empty
  list.
- `pnpm run smoke:launch` **fails**, and so does the `prod-smoke` job, because
  the Launch Smoke asserts a published Tutor and the Enquiry Smoke needs one
  that accepts enquiries. Run the Launch Smoke by hand with `--allow-empty`
  until there is one ([smoke-checks.md](smoke-checks.md#waivers)).

## Owner

A new database has no Owner, and nothing creates one. The API creates a
`pending` [Workspace Account](../GLOSSARY.md#the-private-area) the first time
someone signs in with a verified primary email address, and only an Owner can
approve it, so the first one is promoted by hand. This applies whenever a
production database has no Owner: a first deploy, or a rebuild from empty. A
local database is promoted the same way with a simpler command, in
[local-docker.md](local-docker.md#sign-in-to-the-workspace).

Approved on 2026-09-27 for the Deployment's first Owner, until an automated
bootstrap replaces it ([#48](https://github.com/sumau/welltutored/issues/48)).
It is a guarded update, run against the **direct** Neon connection string from
a checkout. The person to promote must first sign in once at the Public Origin,
because the pending record is written on first sign-in and not before. Run
this, replacing `OWNER_EMAIL` with the address they signed in with:

```
read -rsp 'Direct DATABASE_URL: ' DIRECT_DATABASE_URL; echo
docker compose run --rm -T -e DATABASE_URL="$DIRECT_DATABASE_URL" --entrypoint bash migrate \
  -lc 'psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -v email=OWNER_EMAIL' <<'SQL'
\conninfo
UPDATE workspace_accounts
SET role = 'owner', updated_at = NOW()
WHERE lower(email) = lower(:'email')
  AND role = 'pending'
  AND NOT EXISTS (SELECT 1 FROM workspace_accounts WHERE role = 'owner')
RETURNING id, email, role;
SQL
```

Read the `\conninfo` line: it must name the Neon host. `UPDATE 1` with the
Owner's row means it worked. `UPDATE 0` means a guard held: no pending row for
that email (sign in first), or an Owner already exists. Sign out and back in to
see the Owner's [Workspace](../GLOSSARY.md#the-private-area), where they approve
everyone else.

### Safety rules

For whoever automates this ([#48](https://github.com/sumau/welltutored/issues/48)):

- Run this against a local database, or against production under the
  procedure in [Owner](#owner); no other production use is approved.
- Don't add automatic owner elevation to server startup or normal login
  handling.
- Don't run the update if an Owner already exists.
- Don't change an existing Owner through this bootstrap step.

### Database recovery

Recreating a database removes all account roles, tutor assignments, content,
and enquiries. Clerk users remain separate from the database, but their
Workspace Account records must be recreated. After the schema and deployment
configuration are restored, repeat the [Owner](#owner) procedure for the
intended Owner,
then use the normal Workspace approval flow.
