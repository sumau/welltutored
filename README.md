# Well Tutored

Well Tutored helps families discover women tutors, read tutor-written resources,
and send named-tutor enquiries. [Tutors](GLOSSARY.md#the-public-site) maintain
their profiles and resources in a private workspace.

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

## I want to…

**Merging to `main` deploys to production**, so read CONTRIBUTING before
opening a pull request.

| I want to… | Read |
| --- | --- |
| Run it locally | [docs/local-docker.md](docs/local-docker.md) |
| Make and ship a change | [CONTRIBUTING.md](CONTRIBUTING.md) |
| Write or fix a test | [docs/code-checks.md](docs/code-checks.md) |
| Understand a red check | [docs/pipeline.md](docs/pipeline.md) says which check it is; [docs/code-checks.md](docs/code-checks.md) or [docs/smoke-checks.md](docs/smoke-checks.md) explains it |
| Change the schema | [CONTRIBUTING.md](CONTRIBUTING.md#schema-changes)'s Schema changes, then [docs/schema-changes.md](docs/schema-changes.md) |
| Undo a bad deploy | [docs/pipeline.md](docs/pipeline.md#rolling-back)'s Rolling back |
| Change a setting or the domain | [docs/configuration.md](docs/configuration.md) |
| Understand how it fits together | [docs/architecture.md](docs/architecture.md), then [docs/adr/](docs/adr/) for why |
| Rebuild production from nothing | [docs/first-deploy.md](docs/first-deploy.md) |
| Look up a term | [GLOSSARY.md](GLOSSARY.md) |

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
| `frontend` | React + Vite frontend: public directory, tutor and resource pages, enquiry flow, auth screens, and private workspace |
| `frontend/src/index.css` | Editorial visual system and theme tokens |
| `backend` | Express 5 API, which also serves the frontend build: routes, Clerk middleware, seed/bootstrap behavior, and server startup |
| `backend/src/models` | Drizzle/PostgreSQL schema |
| `backend/openapi.yaml` | API contract, source for the generated client and Zod schemas |
| `lib/api-client-react`, `backend/src/api/schemas` | Generated frontend hooks and runtime schemas |
| `scripts` | Docs check, smoke checks and test-database tooling |

## Commands

These run inside the containers. Prefix them with `docker compose exec api`
against a running service, or see
[docs/local-docker.md](docs/local-docker.md) for one-off runs.

- `PORT=8080 pnpm --filter @workspace/backend run dev` — run the API server
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — docs check + typecheck + build all packages
- `pnpm --filter @workspace/backend run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/backend run push` — apply schema changes, deliberately and by hand ([ADR-0002](docs/adr/0002-schema-by-deliberate-push.md))
- `pnpm run prepare:test-database` — validate `TEST_DATABASE_URL` and apply the
  current schema to the dedicated integration-test database

The Vite config defaults `PORT` and `BASE_PATH`; compose overrides `PORT`
([docs/configuration.md](docs/configuration.md)).

## Architecture

One container serves the frontend and the API from one origin
([ADR-0001](docs/adr/0001-single-origin-deployment.md)). The public site needs
no account; Clerk gates only the private workspace. The routes, API boundaries
and publishing rules are in [docs/architecture.md](docs/architecture.md), and
every decision a reader will question has an ADR in [docs/adr/](docs/adr/).
