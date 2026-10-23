# Configuration

For whoever needs to change a setting, or the domain: every environment
variable the application reads, what it does, when it is read, and where it is
set.

| Variable | When | Set in | Notes |
| --- | --- | --- | --- |
| `DATABASE_URL` | runtime, required | `fly secrets`; `docker-compose.yml` locally | Append `?sslmode=require` for a hosted database: `backend/src/core/db.ts` creates a bare `pg` pool with no SSL options of its own. The [Deployment](../GLOSSARY.md#delivery) uses Neon's pooled string ([first-deploy.md](first-deploy.md#database)). |
| `TRUSTED_ORIGINS` | runtime, required | `fly.toml`; `docker-compose.yml` locally | The exact public origin, e.g. `https://welltutored.co.uk`. See below. |
| `PUBLIC_ORIGIN` | runtime, optional | `fly.toml` | The [Public Origin](../GLOSSARY.md#delivery), e.g. `https://welltutored.example`. When set, a request arriving on any other hostname gets a `301` to the same path and query there; `/api/healthz` is exempt, because Fly's health checks do not use the public hostname. It must also appear in `TRUSTED_ORIGINS`, or the server refuses to start. Unset, nothing redirects. |
| `PORT` | runtime, required | `docker/Dockerfile` and `fly.toml`; `docker-compose.yml` locally | The image defaults it to `8080`. |
| `WEB_CLIENT_ROOT` | runtime, required | `docker/Dockerfile` | The directory holding the frontend build; the image sets it to `/app/web`. Leaving it unset makes the server skip serving the frontend entirely, so every page answers 404 while `/api/healthz` stays green. It logs a warning in that state. |
| `NODE_ENV` | runtime | `docker/Dockerfile` (`production`); the `dev` script locally (`development`) | `development` seeds sample content on start. `production` removes the localhost fallback for an unset `TRUSTED_ORIGINS`, and makes a missing `WEB_CLIENT_ROOT` a warning. `test` is set by the integration tests. |
| `CLERK_SECRET_KEY` | runtime, required | `fly secrets`; `.env` locally | Not optional: the Clerk middleware fails every `/api` request with a 500 when it is absent, public endpoints included. A real key enables workspace sign-in; a syntactically valid placeholder (`sk_test_` + 32 characters, as in `.env.example`) is enough to serve the public site. |
| `CLERK_PUBLISHABLE_KEY` | runtime | `fly secrets`; `.env` locally | Used by the Clerk middleware. |
| `VITE_CLERK_PUBLISHABLE_KEY` | **build** | a build argument in `fly.toml`'s `[build.args]`; `.env` locally | Compiled into the browser bundle. Setting it at runtime, as a Fly secret for instance, has no effect ([first-deploy.md](first-deploy.md#flyio)). |
| `LOG_LEVEL` | runtime, optional | not set | The server's log level; `info` when unset. |
| `BASE_PATH` | **build**, optional | not set | The path the frontend is served under, read by `frontend/vite.config.ts`; `/` when unset. |

Changing the domain means changing `TRUSTED_ORIGINS` and `PUBLIC_ORIGIN`
together, after the new hostname has a certificate;
[first-deploy.md](first-deploy.md#attaching-a-custom-domain) has the order.

Variables that only the tooling reads are documented where it is used:
`API_PROXY_TARGET` in [local-docker.md](local-docker.md#how-requests-are-routed),
`TEST_DATABASE_URL` in [code-checks.md](code-checks.md#api-server), and the `SMOKE_*`
variables, such as `SMOKE_TIMEOUT_MS` and `SMOKE_TOTAL_TIMEOUT_MS`, in
[smoke-checks.md](smoke-checks.md). The [Docs Check](../GLOSSARY.md#delivery)
fails when the code reads a variable by name that this page does not name.

## `TRUSTED_ORIGINS`

`TRUSTED_ORIGINS` is the one that bites. In production nothing infers it, and an
empty trusted-origin set rejects every credentialed request — including the
public enquiry POST, which is the main thing visitors do. Set it to the public
origin, with no trailing path, and update it when the domain changes.

`configuredValues` in `backend/src/middlewares/request-origin.ts`
reads `TRUSTED_ORIGINS` and `CORS_ORIGINS`, treats them as one list, and falls
back to the localhost defaults only outside production. Setting either one
**replaces** those defaults, so a Deployment trusts what `fly.toml` names and
nothing else.

## Clerk keys

The public site does not need *working* Clerk keys, but it does need
`CLERK_SECRET_KEY` to be present — see the table. With a placeholder, the
directory and enquiry flow both work and `/workspace` simply cannot be
signed into. Pages themselves keep rendering either way, because the Clerk
middleware is mounted under `/api` only.

Which keys work on which hostname is in
[first-deploy.md](first-deploy.md#clerk-keys).
