# Standing up a Deployment

For whoever stands a Deployment up from nothing: a new database, Fly app,
domain, Clerk instance, content and first Owner. The live Deployment already exists, so this is for rebuilding
it or starting another. Running the live one is
[schema-changes.md](schema-changes.md) for schema pushes and
[pipeline.md](pipeline.md) for deploys and rollback.

## In order

Each step has its own section below; this is the order they have to happen in.

1. **[Database](#database)** — create the Neon project in London, take the
   pooled and direct connection strings.
2. **[Apply the schema](schema-changes.md#pushing)** — from this checkout,
   using the direct string. Nothing does this for you.
3. **[Clerk keys](#clerk-keys)** — a development instance, because you do not
   control DNS for `*.fly.dev`.
4. **[Deploy](#flyio)** — create the app, set the secrets, put the publishable
   key in `fly.toml`, `fly deploy`.
5. **[Attach a domain](#attaching-a-custom-domain)**, then
   **[move to a production Clerk instance](#moving-to-a-production-clerk-instance)**.
6. **Expect an empty site.** A fresh database has no tutors or resources — see
   [Content](#content) — and no Owner: [promote the first one](#owner).

The image can be checked first without deploying: see the Image Smoke
[by hand](smoke-checks.md#the-image-smoke-by-hand).

## Database

[Neon](https://neon.tech) hosts the PostgreSQL. It has a free tier, takes real
backups, and — the part that matters operationally — is reachable over the
public internet, so every step that runs from this checkout (the schema push,
copying data in) needs no tunnel.

Create the project in **AWS Europe West 2 (London)**, the region nearest
`primary_region = "lhr"` in `fly.toml`. Neon cannot move a project afterwards,
and distance costs more than it looks: every query is a round trip, and `pg`
drops a connection after 10 seconds idle, so on a quiet site most visitors pay
for a fresh TCP, TLS and Postgres handshake too. With the database in Ohio
that came to about 0.7s a request, against 0.15s on a warm connection (issue
#65). If `primary_region` ever changes, move the database with it.

Then take **two** connection strings from its dashboard. Neon
marks the pooled one with `-pooler` in the hostname, and they are not
interchangeable:

- The **pooled** string is the application's. Set it as the `DATABASE_URL`
  secret on the Deployment.
- The **direct** string is for schema work. Use it for the
  [schema push](schema-changes.md#pushing).

Both need `?sslmode=require` appended: `lib/db/src/index.ts` builds a bare `pg`
pool from `DATABASE_URL` and sets no SSL options of its own, so without it the
connection is refused.

Nothing in the application is Neon-specific — it is a `DATABASE_URL` and
nothing more — so any hosted PostgreSQL substitutes, with the pooled/direct
distinction being whatever that provider's equivalent is. Fly's own Postgres
offerings were deliberately not chosen: the managed one is private-network
only, so every command run from a checkout would need a proxy in front of it,
and the unmanaged one is something Fly's documentation says they cannot
support.

## Clerk keys

Which keys work depends on the hostname, and getting this wrong is the most
common way a first Deployment fails.

`publishableKeyFromHost` decides this, and the SPA
(`artifacts/welltutored/src/app/config.ts`) and the API (`app.ts`) both call it:

```js
if (fallbackKey && isDevelopmentFromPublishableKey(fallbackKey)) return fallbackKey;
return buildPublishableKey(`clerk.${hostname}`);
```

- A **development** key (`pk_test_…`) is used exactly as given, so Clerk is
  reached at `<slug>.clerk.accounts.dev` whatever the hostname. This is the only
  configuration that works on a hostname whose DNS you do not control, such as
  `*.fly.dev`, and it needs no records.
- A **production** key (`pk_live_…`), or no key at all, is discarded: both sides
  derive a key for `clerk.<hostname>` instead. That expects the CNAME a Clerk
  production instance asks you to add, so it requires a domain of your own.

So stand the Deployment up on development keys, and move to a production
instance when you attach a real domain. `TRUSTED_ORIGINS` and `PUBLIC_ORIGIN`
change with the domain; `app` in `fly.toml` does not, because it is the Fly
app's name rather than a hostname, and changing it means creating a new app.
Development instances show a notice in the sign-in UI, share Clerk's OAuth
credentials, and carry lower limits, so they are for getting the Deployment
working rather than for live traffic.

The live Deployment runs on a production instance for `welltutored.co.uk`,
reached at `clerk.welltutored.co.uk`. There is no Frontend API proxy: the
browser talks to that CNAME directly.

## Fly.io

`fly.toml` is committed and points at `docker/Dockerfile`.

Fly runs the container; Neon holds the database. By this point the Neon
project exists, the schema is pushed, and you have Clerk development keys — all
three are prerequisites, not steps you can take afterwards.

Pass the secrets in from shell variables rather than typing them into the
command. `read -rs` takes each value without echoing it or writing it to shell
history; paste it and press Enter:

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

The connection string is read as `POOLED_DATABASE_URL`, not `DATABASE_URL`, so
it cannot be confused with the `DIRECT_DATABASE_URL` you read for
[schema work](schema-changes.md#pushing). They are different strings: this
one is the **pooled** endpoint the application runs against, the other is the
**direct** endpoint for DDL. Passing the direct one here works and then quietly
costs you connection pooling in production.

`fly launch --no-deploy` also works, but it rewrites the committed `fly.toml`
from its own guesses; `git diff fly.toml` afterwards and revert what it changed.
`fly apps create` only reserves the name, which is all this repository needs.

CI needs a token of its own. This is the one step nothing else can do for you:

```
fly tokens create deploy
gh secret set FLY_API_TOKEN
```

Then edit two values in `fly.toml` itself. They are committed to the
repository, which is correct for both:

```toml
[build.args]
  # Your Clerk publishable key, pasted in full.
  VITE_CLERK_PUBLISHABLE_KEY = "pk_test_..."

[env]
  # The hostname `fly apps create` gave you, with the scheme and no trailing
  # slash.
  TRUSTED_ORIGINS = "https://welltutored.fly.dev"
```

**The publishable key has to be here and not in `fly secrets`.** Vite compiles
it into the browser bundle while the image is being built, and a Fly secret only
exists once the container is running — too late. Set it with `fly secrets set`
and the build silently uses the empty string in `fly.toml`, the bundle ships
without a Clerk key, and sign-in never initialises. Committing it is expected
rather than a leak: a publishable key is public by design and is served to every
visitor in the JavaScript. The three secrets above are the opposite case and
must never appear in this file.

**`TRUSTED_ORIGINS` must match the deployed hostname exactly** — see the
[configuration reference](configuration.md).

After that, merging to `main` deploys. `fly deploy` from a checkout still works
and is how you would ship a first image before any of this is merged.

## Attaching a custom domain

The Deployment starts on the `*.fly.dev` hostname `fly apps create` gives it.
Moving it onto a domain of its own takes DNS, a certificate per hostname, and
two lines of `fly.toml`, in that order. This is how `welltutored.co.uk` was
attached, with `www.welltutored.co.uk`, `welltutored.com` and
`www.welltutored.com` redirecting to it.

1. **DNS.** For every hostname, an `A` record for the app's IPv4 address and an
   `AAAA` record for its IPv6 address; `fly ips list` shows both. Where DNS is
   on Cloudflare, set each record to **DNS only**: with Cloudflare's proxy in
   front, Fly cannot issue its certificates without further setup.
2. **Certificates.** `fly certs add <hostname>` for each one, then wait until
   `fly certs list` shows every one `Issued`. Fly validates against the DNS
   from step 1, so this cannot usefully come first.
3. **`fly.toml`.** Set `PUBLIC_ORIGIN` to the domain visitors should end up on,
   and `TRUSTED_ORIGINS` to the same value. Every other hostname, the
   `*.fly.dev` one included, then answers with a `301` to the same path there.
   Only after step 2: a redirect to a hostname without a certificate sends
   every visitor to a browser warning.
4. **Launch Smoke.** Point the deploy job's `SMOKE_BASE_URL` at the new origin
   and list the other hostnames in `SMOKE_REDIRECT_FROM`.

`app` in `fly.toml` stays as it is throughout.

## Moving to a production Clerk instance

In this order, so the server's keys and the bundle's key change in one deploy:

1. In the Clerk dashboard, create a production instance for the Public Origin's
   domain, cloning the development instance's settings.
2. Add the DNS records it lists (`clerk.`, `accounts.`, `clkmail.` and two
   DKIM records) in Cloudflare as **DNS only**, and wait until Clerk shows the
   domain verified and its certificates issued.
3. Social sign-in needs credentials of your own; a production instance does not
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
   `https://clerk.<domain>/v1/environment` for a production instance.

## Content

`ensureSeedContent()` only runs when `NODE_ENV=development`
(`artifacts/api-server/src/index.ts`), so a fresh Deployment database has no
tutors or resources and the public directory renders empty. Deploy empty and
create content through `/workspace`. Two things behave differently until there
is a published Tutor, and neither is a fault:

- The directory renders its empty state, and `/api/tutors` returns an empty
  list.
- `pnpm run smoke:launch` **fails**, because it asserts a published Tutor and
  that Tutor's profile page, and so does the deploy job's Launch smoke step,
  which runs it. `--allow-empty` waives exactly those assertions; everything
  that does not depend on content still runs
  ([smoke-checks.md](smoke-checks.md#waivers)). Run it by hand
  while the Deployment is empty, and drop it once there is a published Tutor:

  ```
  SMOKE_BASE_URL=https://welltutored.co.uk \
    SMOKE_CLERK_FRONTEND_API=https://clerk.welltutored.co.uk \
    pnpm run smoke:launch --allow-empty
  ```

## Owner

A new database has no Owner, and nothing creates one. The API creates a
`pending` Workspace Account the first time someone signs in with a verified
primary email address, and only an Owner can approve it, so the first one is
promoted by hand. This applies whenever a production database has no Owner: a
first deploy, or a rebuild from empty. A local database is promoted the same
way with a simpler command, in
[local-docker.md](local-docker.md#signing-in-to-the-workspace).

Approved on 2026-09-27 for the Deployment's first Owner, until an automated
bootstrap replaces it ([#48](https://github.com/sumau/welltutored/issues/48)).
It is a guarded update, run against the **direct** Neon connection string from
a checkout. The person to promote must first sign in once at the Public Origin,
because the pending record is written on first sign-in and not before.

```
read -rsp 'Direct DATABASE_URL: ' DIRECT_DATABASE_URL; echo
docker compose run --rm -T -e DATABASE_URL="$DIRECT_DATABASE_URL" --entrypoint bash migrate \
  -lc 'psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -v email=you@example.com' <<'SQL'
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
see the Owner's Workspace, where they approve everyone else.

### Safety rules

For whoever automates this ([#48](https://github.com/sumau/welltutored/issues/48)):

- Run this against a local database, or against production under the
  procedure above; no other production use is approved.
- Do not add automatic owner elevation to server startup or normal login
  handling.
- Do not run the update if an Owner already exists.
- Do not change an existing Owner through this bootstrap step.

### Database recovery

Recreating a database removes all account roles, tutor assignments, content,
and enquiries. Clerk users remain separate from the database, but their
Workspace Account records must be recreated. After the schema and deployment
configuration are restored, repeat the procedure above for the intended Owner,
then use the normal Workspace approval flow.
