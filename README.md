# Well Tutored

Well Tutored helps families find women tutors and send named-tutor enquiries.
[Tutors](GLOSSARY.md#the-public-site) maintain their profiles and the resources
they write in the private [Workspace](GLOSSARY.md#the-private-area).

The public site presents women tutors, their expertise and availability.
Visitors can open a tutor profile and submit a named-tutor enquiry. Resources
are hidden from visitors while a feature switch is off
([docs/architecture.md](docs/architecture.md#public-website)). In the Workspace,
a tutor edits their own profile and resources and sees their enquiries, and
the [Owner](GLOSSARY.md#the-private-area) also manages every tutor profile and
approves accounts.

This file is for developers: it gets the project running locally and points to
the doc for each task.

## Quick start

Everything runs in containers. Docker with Compose v2 is the only prerequisite.

To set up and start the stack, run:

```
cp .env.example .env
docker compose run --rm deps        # install dependencies
docker compose up -d db
docker compose run --rm migrate     # push the database schema
docker compose up api web
```

Open <http://localhost:5173>. In development, the API seeds illustrative tutors
and resources when it starts. The placeholder Clerk key in `.env` is enough to
browse the public site. To sign in to `/workspace`, replace it with real Clerk
development keys.

To run the same checks as CI's `verify` job, run:

```
docker compose run --rm verify
```

CI also runs smokes against the production image; see
[docs/pipeline.md](docs/pipeline.md).

## Find the right doc

**Merging to `main` deploys to production**, so read CONTRIBUTING before
opening a pull request. Each task has one doc to start from:

| I want to… | Read |
| --- | --- |
| Run it locally | [docs/local-docker.md](docs/local-docker.md) |
| Make and ship a change | [CONTRIBUTING.md](CONTRIBUTING.md) |
| Write or fix a test | [docs/code-checks.md](docs/code-checks.md) |
| Understand a red check | [docs/pipeline.md](docs/pipeline.md) says which check it is; [docs/code-checks.md](docs/code-checks.md) or [docs/smoke-checks.md](docs/smoke-checks.md) explains it |
| Change the API | [docs/api-contract.md](docs/api-contract.md) |
| Change the schema | [CONTRIBUTING.md](CONTRIBUTING.md#schema-changes)'s Schema changes, then [docs/schema-changes.md](docs/schema-changes.md) |
| Undo a bad deploy | [docs/pipeline.md](docs/pipeline.md#roll-back-a-deploy)'s Roll back a deploy |
| Change a setting or the domain | [docs/configuration.md](docs/configuration.md) |
| Understand how it fits together | [docs/architecture.md](docs/architecture.md), then [docs/adr/](docs/adr/) for why |
| Rebuild production from nothing | [docs/first-deploy.md](docs/first-deploy.md) |
| Look up a term | [GLOSSARY.md](GLOSSARY.md) |

## Stack

The project is built with:

- pnpm workspaces, Node.js 24, TypeScript 7.0
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval, from a hand-written OpenAPI spec ([docs/api-contract.md](docs/api-contract.md))
- Build: esbuild (ESM bundle)

## Layout

| Path | What it holds |
| --- | --- |
| `frontend` | React + Vite frontend: public directory, tutor and resource pages, enquiry flow, auth screens, and private workspace |
| `frontend/src/index.css` | Editorial visual system and theme tokens |
| `frontend/src/client` | Generated React Query hooks and the fetch they use |
| `backend` | Express 5 API, which also serves the frontend build |
| `backend/openapi.yaml` | API contract, source for the generated hooks and Zod schemas |
| `backend/src/api` | Routes, request checks, response shapes and generated Zod schemas |
| `backend/src/crud` | Every database query |
| `backend/src/domain` | Rules with no database or HTTP in them |
| `backend/src/models` | Drizzle/PostgreSQL schema |
| `backend/src/core` | Settings, database pool, logging, health check |
| `backend/tests` | Backend tests, mirroring `backend/src` |
| `scripts` | Smoke checks, the Docs Check, the API code generator and its check, and integration-database tooling, a folder each |

What each backend folder is for is in
[docs/architecture.md](docs/architecture.md#backend-layout).

## Commands

These commands run inside the containers. Prefix them with `docker compose exec api`
against a running service, or see
[docs/local-docker.md](docs/local-docker.md) for one-off runs.

- `PORT=8080 pnpm --filter @welltutored/backend run dev` — run the API server
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — docs check + typecheck + build all packages
- `pnpm --filter @welltutored/scripts run api-codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec ([docs/api-contract.md](docs/api-contract.md))
- `pnpm --filter @welltutored/backend run push` — apply schema changes, deliberately and by hand ([ADR-0002](docs/adr/0002-schema-by-deliberate-push.md))

The test commands are in [docs/code-checks.md](docs/code-checks.md), and the
smoke checks in [docs/smoke-checks.md](docs/smoke-checks.md).

The Vite config defaults `PORT` and `BASE_PATH`; compose overrides `PORT`
([docs/configuration.md](docs/configuration.md)).

## Architecture

One container serves the frontend and the API from one origin
([ADR-0001](docs/adr/0001-single-origin-deployment.md)). The public site needs
no account; Clerk gates only the Workspace. The routes, API boundaries
and publishing rules are in [docs/architecture.md](docs/architecture.md), and
every decision a reader will question has an ADR in [docs/adr/](docs/adr/).
