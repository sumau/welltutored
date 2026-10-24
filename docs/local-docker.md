# Local Docker development

For anyone running or working on the stack locally: the first run, everyday
commands, Clerk development keys, and signing in to the
[Workspace](../GLOSSARY.md#the-private-area). The full stack — PostgreSQL, the
API server, and the Vite frontend — runs in containers, so no Node, pnpm, or
PostgreSQL install is needed on the host.

## Prerequisites

Docker with Compose v2. Nothing else.

## First run

```
cp .env.example .env
docker compose run --rm deps        # installs dependencies (a few minutes)
docker compose up -d db
docker compose run --rm migrate     # pushes the Drizzle schema
docker compose up api web
```

Then open <http://localhost:5173>. The API is also reachable directly on
<http://localhost:8080>, and PostgreSQL on port 5432.

On first boot the API seeds illustrative tutors and resources, because the
`dev` script sets `NODE_ENV=development`.

If `deps` fails because it wants to purge `node_modules`, the existing install
recorded a different store path. Remove the installed packages, then run
`deps` again:

```
rm -rf node_modules */node_modules
docker compose run --rm deps
```

## Everyday use

```
docker compose up api web           # start
docker compose logs -f api          # follow logs
docker compose down                 # stop, keeping the database
docker compose down -v              # stop and discard the database
docker compose run --rm verify      # the checks CI runs on every PR
```

What the suite runs, and why it needs the `verify` service, is in
[code-checks.md](code-checks.md).

The repository is bind-mounted, so edits on the host apply inside the
containers. Vite hot-reloads. The API server builds with esbuild and doesn't
watch, so restart it after server changes:

```
docker compose restart api
```

After changing `backend/openapi.yaml`, regenerate the client inside the
container, then restart:

```
docker compose exec api pnpm --filter @welltutored/backend run codegen
```

Schema changes are applied the same way as the initial push, with
`pnpm --filter @welltutored/backend run push`, through
`docker compose run --rm migrate`.

## How requests are routed

The [Deployment](../GLOSSARY.md#delivery) serves the frontend and the API from
one origin, so the frontend calls `/api` with relative paths. Locally the two
run on separate ports, so the Vite dev server proxies `/api` to the API service.
The target is set by `API_PROXY_TARGET` (`http://api:8080` in Compose,
defaulting to `http://localhost:8080` for a host-native run).

The proxy deliberately doesn't rewrite the `Origin` header: the API only
trusts the frontend's own origin, which Compose states explicitly through
`TRUSTED_ORIGINS`.

## Clerk

`CLERK_SECRET_KEY` is required even for the public site. The API mounts Clerk
middleware under `/api`, so without a key every request there fails with a 500.
The placeholder in `.env.example` is enough to browse the public experience;
signing in to `/workspace` needs real Clerk keys.

They must be **development** keys (`pk_test_` / `sk_test_`), not production
keys: a `pk_live_` key is discarded in favour of one for `clerk.localhost`,
which doesn't resolve ([first-deploy.md](first-deploy.md#clerk-keys) explains
`publishableKeyFromHost`, which decides this). Clerk development instances
accept any host, so localhost needs no domain configuration.

Get a set of keys in one of these ways:

- `npx clerk@latest init --accountless` creates an unclaimed development
  application and writes its keys, with no Clerk account or login. Run it in a
  scratch directory and copy the keys over: it is framework-aware and will
  otherwise try to scaffold Clerk into this repository, which already has it
  wired up. The application isn't in your Clerk dashboard, so its users are
  only the ones who sign up at `localhost`, and it isn't the instance CI uses
  (see [Which Clerk instance is which](#which-clerk-instance-is-which)).
- `npx clerk@latest env pull` writes the keys of an application you already
  own, after logging in.
- Copy them from <https://dashboard.clerk.com/~/api-keys>.

Put all three variables in `.env`, using the same publishable value twice:

```
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

Then recreate the containers. A plain restart keeps the old environment:

```
docker compose up -d --force-recreate api web
```

### Which Clerk instance is which

Three Clerk instances can be in play, and each has its own users:

| Instance | Where its keys live | Who it signs in |
| --- | --- | --- |
| An accountless development application, if `.env` came from `--accountless` | `.env` | Whoever signed up at `localhost`. Not visible in the dashboard. |
| The development instance of the application you own | GitHub secrets `CLERK_TEST_*` ([pipeline.md](pipeline.md#credentials)) | The [Sign-in Smoke](../GLOSSARY.md#delivery)'s `+clerk_test` user, created in the dashboard |
| The production instance of the same application | `fly.toml` and Fly secrets ([first-deploy.md](first-deploy.md#deploy-to-flyio)) | [Tutors](../GLOSSARY.md#the-public-site) on `welltutored.co.uk` |

A user exists only in the instance it was created in. "Couldn't find your
account" for an address you know you created usually means the keys name a
different instance. The publishable key says which one: the part after
`pk_test_` is base64 for the instance's Frontend API host, such as
`example-name-12.clerk.accounts.dev`.

## Sign in to the Workspace

A Clerk application starts with no users, and the sign-in form answers an
unknown address with "Couldn't find your account", which reads like a
configuration fault but isn't one. So sign up first.

Authenticating isn't the same as having access to the Workspace. On first
sign-in the API creates a `workspace_accounts` row with the role `pending`,
which the Workspace refuses. A database created by Compose contains no Owner to
approve it, so the first account has to be promoted directly.

1. Go to <http://localhost:5173/sign-up> and register. Development instances
   accept `+clerk_test` subaddresses and never send mail to them: register
   `you+clerk_test@example.com` and enter the fixed verification code
   `424242`. A real address works too, and Clerk emails a genuine code.
2. Promote the account to Owner:

   ```
   docker compose exec -T db psql -U postgres -d welltutored -c "
   UPDATE workspace_accounts
      SET role = 'owner', updated_at = NOW()
    WHERE lower(email) = lower('you+clerk_test@example.com')
      AND role = 'pending'
      AND NOT EXISTS (SELECT 1 FROM workspace_accounts WHERE role = 'owner')
   RETURNING id, email, role;"
   ```

   The guards make this safe to repeat: after an Owner exists it changes nothing.
   No rows returned means the address matched no pending account. Every later
   account is approved by the Owner in the Workspace instead. The
   production procedure, and the rules any automation of it must keep, are in
   [first-deploy.md](first-deploy.md#promote-the-first-owner).

### What survives what

Restarts and `docker compose down` keep both the Clerk user and the database,
so access carries over untouched.

`docker compose down -v` discards the database, and every account role with it.
The Clerk user is unaffected, because it lives on Clerk's side rather than in
PostgreSQL — so sign in rather than sign up, which writes a fresh `pending`
row, then repeat the promotion in
[Sign in to the Workspace](#sign-in-to-the-workspace).

An unclaimed accountless application expires on its own and takes its users
with it. The database is untouched, and this is the case that looks worse than
it is: Workspace Accounts are keyed on the verified email address, not the
Clerk user id. A new Clerk identity presenting an email that already has an
account resolves to that account and creates no duplicate, which
`backend/tests/api/routes/workspace.lifecycle.integration.test.ts` asserts. So
recovery isn't a fresh start:

1. Create a replacement application, as described in [Clerk](#clerk).
2. Put its three keys in `.env`.
3. Recreate the containers: `docker compose up -d --force-recreate api web`.
4. Sign up with the same email address as before.

The existing account is picked up again, owner role included. Only losing the
application and the database together calls for a new sign-up followed by the
promotion.

Claiming the application with `clerk auth login` avoids the expiry altogether,
and is worth doing once if this login is meant to last.

## Notes on the image

- Debian (glibc), not Alpine: `pnpm-workspace.yaml` excludes every `*-musl`
  native binary, so a musl base can't resolve lightningcss, Tailwind's oxide
  binary, or rolldown.
- `linux/amd64`: the same overrides keep only the `linux-x64` esbuild binary.
- pnpm is pinned in the image to the exact version in the root
  `package.json` `packageManager` field.
  Two versions of pnpm writing `pnpm-lock.yaml` produce churn, and both CI and
  the deployment build install with `--frozen-lockfile`, so a mismatch fails
  the deploy rather than resolving itself.
- The pnpm store lives at `.pnpm-store/` in the repository (gitignored). It
  has to share a filesystem with the installed packages so that hardlinking
  works, and node_modules is in the bind mount; a named volume would sit on
  another device and be ignored. It survives `docker compose down -v`, so
  reinstalls stay fast. Delete the directory to reclaim the space.
