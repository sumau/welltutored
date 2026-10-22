# Well Tutored

Well Tutored helps families discover women tutors, read tutor-written
resources, and send named-tutor enquiries. Tutors maintain their profiles and
resources in a private workspace.

The public site presents women tutors, their expertise and availability, and a
library of tutor-written learning resources. Visitors can open a tutor profile
and submit a named-tutor enquiry. Approved workspace users manage tutor
profiles, resources, and workspace accounts.

## Quick start

Everything runs in containers. Docker with Compose v2 is the only prerequisite.

```
cp .env.example .env
docker compose run --rm deps        # install the workspace
docker compose up -d db
docker compose run --rm migrate     # push the database schema
docker compose up api web
```

Then open <http://localhost:5173>. The API seeds illustrative tutors and
resources on first boot. To sign in to `/workspace`, put real Clerk dev keys in
`.env`; the placeholder is enough to browse the public site.

Run the full CI suite with:

```
docker compose run --rm test
```

## Where to read next

- [CONTRIBUTING.md](CONTRIBUTING.md): how changes are made, checked, merged
  and shipped. Read it before opening a pull request.
- [CONTEXT.md](CONTEXT.md): the domain vocabulary shared by every package.
- [docs/architecture.md](docs/architecture.md): routes, API boundaries and
  publishing rules.
- [docs/local-docker.md](docs/local-docker.md): the container workflow in full.
- [docs/deploy.md](docs/deploy.md): deployment. **Merging to `main` ships to
  production**, and schema changes are applied by hand beforehand
  ([ADR-0002](docs/adr/0002-schema-by-deliberate-push.md)).
  [docs/schema-push.md](docs/schema-push.md) records what a push prompts, and
  [docs/first-deploy.md](docs/first-deploy.md) stands a Deployment up from
  nothing.
- [docs/testing.md](docs/testing.md): the test layers and smoke checks.
- [docs/adr/](docs/adr/): architecture decision records.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 7.0
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Layout

| Path | What it holds |
| --- | --- |
| `artifacts/welltutored` | React + Vite frontend: public directory, tutor and resource pages, enquiry flow, auth screens, and private workspace |
| `artifacts/welltutored/src/index.css` | Editorial visual system and theme tokens |
| `artifacts/api-server` | Express 5 API, which also serves the frontend build: routes, Clerk middleware, seed/bootstrap behavior, and server startup |
| `lib/db/src/schema` | Drizzle/PostgreSQL schema |
| `lib/api-spec/openapi.yaml` | API contract, source for the generated client and Zod schemas |
| `lib/api-client-react`, `lib/api-zod` | Generated frontend hooks and runtime schemas |
| `scripts` | Docs check, smoke checks and test-database tooling |

## Commands

These run inside the containers. Prefix them with `docker compose exec api`
against a running service, or see
[docs/local-docker.md](docs/local-docker.md) for one-off runs.

- `PORT=8080 pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — docs check + typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — apply schema changes, deliberately and by hand ([ADR-0002](docs/adr/0002-schema-by-deliberate-push.md))
- `pnpm run prepare:test-database` — validate `TEST_DATABASE_URL` and apply the
  current schema to the dedicated integration-test database

The Vite configs default each artifact's `PORT` and `BASE_PATH`; compose and the
images override them.

### Environment

- `DATABASE_URL` for PostgreSQL access; `VITE_CLERK_PUBLISHABLE_KEY` for the
  frontend; `CLERK_PUBLISHABLE_KEY` for the API's Clerk middleware.
- `CLERK_SECRET_KEY` is required by the API's Clerk middleware even for the
  public site; a placeholder serves it, and a real key enables workspace
  sign-in. The Deployment runs on a Clerk production instance at
  `clerk.welltutored.co.uk`, with no Frontend API proxy.
- Integration tests need a separate `TEST_DATABASE_URL`, never the same as
  `DATABASE_URL` — see [docs/testing.md](docs/testing.md).

## Deploying

**Merging to `main` ships.** CI deploys the container to Fly and then runs the
launch smoke against it; nothing else deploys. `docker/Dockerfile` and
`fly.toml` are the whole configuration.
[docs/deploy.md](docs/deploy.md) covers running the Deployment, and
[docs/first-deploy.md](docs/first-deploy.md) standing one up from nothing.

Schema changes are not part of that. Apply them yourself, before merging
anything that expects them — [ADR-0002](docs/adr/0002-schema-by-deliberate-push.md).

The Deployment is served at `https://welltutored.co.uk`, its Public Origin.
`www.welltutored.co.uk`, `welltutored.com`, `www.welltutored.com` and
`welltutored.fly.dev` all redirect there, because `PUBLIC_ORIGIN` in `fly.toml`
says so.

The trap worth knowing: `TRUSTED_ORIGINS` must name the public origin exactly,
or every credentialed request fails, the public enquiry included
([docs/deploy.md](docs/deploy.md#configuration-reference)).

## Architecture

One container serves the frontend and the API from one origin
([ADR-0001](docs/adr/0001-single-origin-deployment.md)). The public site needs
no account; Clerk gates only the private workspace. The routes, API boundaries
and publishing rules are in [docs/architecture.md](docs/architecture.md), and
every decision a reader will question has an ADR in [docs/adr/](docs/adr/).
