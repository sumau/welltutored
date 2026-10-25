# Code checks

For whoever writes a test or reads a red `verify`: the checks that run against
the repository before a merge — the test suites, typecheck, build,
Docs Check and API codegen check that `pnpm run verify` runs — and how to write a test. Checks against
a running site are in [smoke-checks.md](smoke-checks.md).

Most tests run on Node's built-in `node:test` runner through `tsx`; the web
tests also use JSDOM where they need browser APIs.

The commands on this page run inside the containers: prefix them with
`docker compose exec api` against a running stack
([local-docker.md](local-docker.md)). To run CI's `verify` job locally:

```
docker compose run --rm verify
```

It runs `verify` against a second database, `welltutored_test`, on the same
PostgreSQL service as the development database, and creates that database on
first use. Running `pnpm run verify` directly inside `api` or `web` doesn't
work, because neither sets `TEST_DATABASE_URL`, and the suite stops at its
second step:

```
Test database unavailable: set TEST_DATABASE_URL to a dedicated PostgreSQL connection before running database-backed integration tests.
```

The `verify` service supplies the connection. CI does the same, with the
dedicated connection coming from its `postgres:16` service container instead
([pipeline.md](pipeline.md#github-actions)). The suite needs no Clerk keys
([pipeline.md](pipeline.md#credentials)).

## Test suites

A test file's name decides how it is checked and run:

- **A file named `*.test.ts` or `*.test.tsx` is a test.** It is typechecked,
  and it runs because its name matches the glob in its package's test script,
  with no list to add it to.
- **A test that needs the database is named `*.integration.test.ts`.** Anything
  else is a unit test. In the backend, `test:unit` runs
  `tests/**/!(*.integration).test.ts` and `test:integration` runs
  `tests/**/*.integration.test.ts`.
- **Only tests have test-like names.** Code that supports the tests is named
  after what it does, such as `scripts/integration-database/`.

The exception is `scripts/`, where each folder is one standalone tool and its
package script names that tool's one test file.

### API server

Run the API tests with:

```sh
pnpm --filter @welltutored/backend test
```

This is the complete API suite used by CI: the in-memory unit checks and the
database-backed integration tests. Running it directly doesn't provision a
database; `pnpm run verify` does, through `prepare:integration-database`.

Run only the non-mutating API checks with:

```sh
pnpm --filter @welltutored/backend run test:unit
```

The integration tests exercise the Express routes and database-backed behaviour
end to end within the test process. They create, update, publish, and delete
test records, so they run only against an isolated test database: the one
`verify` provides, in CI or through the `verify` service. Set
`TEST_DATABASE_URL` to the dedicated PostgreSQL connection;
`test:integration` sets `NODE_ENV=test`, and `backend/src/core/config.ts` then
refuses to fall back to `DATABASE_URL` or use the same URL as the
application. The database needs the current schema before the integration
script runs, and the preparation command applies it:

```sh
pnpm run prepare:integration-database
```

It fails if `TEST_DATABASE_URL` is missing or points to `DATABASE_URL`, then
applies the current schema using the test URL as its target. If that database
isn't reachable, it fails with a message naming the connection error. Each
process also uses a unique fixture namespace, so overlapping
runs don't reuse or delete one another's records.

The test database holds the schema and no seed data, so an integration test must
create every row it asserts against, such as a second tutor, and clean up only
its own namespace. The test files run in parallel against that one database,
so a published tutor that one file creates shows up in another file's public
tutor list: give it everything the public API requires, such as a teaching
point, or that list fails with a 500.

To stub Clerk, replace the method on the shared users API prototype:
`clerkClient.users` can return a fresh object on each access, so a stub
assigned through it is silently discarded and the route reaches Clerk.

### Web application

Run the Well Tutored web tests with:

```sh
pnpm --filter @welltutored/frontend test
```

React components are rendered either into JSDOM or to static markup. Network
and query behaviour is supplied by test doubles rather than making real
production requests.

The command runs the tests with `tsx`, which has neither Vite's aliases nor
its JSX transform, so when adding a web test:

- Keep `--tsconfig tsconfig.json`, which resolves the `@/*` aliases, and
  import `React` explicitly in test files and the components they render.
- Put the JSDOM window, its event constructors, `location`, `history`, and the
  window event listener functions on `globalThis` before importing
  `react-dom/client` or rendering a Wouter page. Importing ReactDOM first makes
  it fall back to its legacy input events, and Wouter fails without the
  globals.
- Keep `--test-concurrency=1`: the suites share process-wide globals. Let
  async error states settle inside `act` with a short timer rather than a
  single microtask, or React Query's cache timers can leave the runner looking
  hung.

### Repository scripts

The script package has four test suites, all run by `verify`:

```sh
pnpm --filter @welltutored/scripts run test:smoke
pnpm --filter @welltutored/scripts run test:docs
pnpm --filter @welltutored/scripts run test:api-codegen
pnpm --filter @welltutored/scripts run test:integration-database
```

The smoke-check tests validate the logic of the scripts in
[smoke-checks.md](smoke-checks.md), without a running site: target selection,
the waiver flags in both directions, redirect protection, timeout handling, and
healthy responses against a local fixture. The documentation tests cover
[the Docs Check](#the-docs-check), and the API codegen tests cover how
[the API codegen check](#the-api-codegen-check) finds and compares folders. The integration-database check tests ensure
that integration tests require a dedicated `TEST_DATABASE_URL` distinct from
`DATABASE_URL`.

## The Docs Check

The [Docs Check](../GLOSSARY.md#delivery), `pnpm run docs:check`, runs as part
of `pnpm run build`, so a broken doc fails CI's `verify` job and blocks the
deploy. It parses
`README.md`, `CONTRIBUTING.md`, `GLOSSARY.md`, everything under `docs/`, and
the `run:` steps of `.github/workflows/*.yml`, and fails when:

- a `pnpm` command names a script that doesn't exist;
- a local link, or its `#anchor`, doesn't resolve;
- a file named in backticks isn't in the repository. A short path such as
  `routes/workspace.ts` counts when some file's path ends with it;
- a guide (`README.md`, `CONTRIBUTING.md` or a page at the top level of
  `docs/`) doesn't open with a line of prose saying who it is for: not a
  heading, list, table, quote, image or code. ADRs and `docs/agents/` follow
  their own templates.

It also reads the code, skipping tests and generated code, and fails when:

- the code reads an environment variable by name that
  [configuration.md](configuration.md) doesn't name;
- a code, config or workflow comment names a doc, or a doc's heading, that
  doesn't exist.

## The API codegen check

`backend/openapi.yaml` is written by hand, and Orval generates the React Query
hooks in `frontend/src/client/generated` and the Zod schemas in
`backend/src/api/schemas/generated` from it
([api-contract.md](api-contract.md)). `verify` runs

```sh
pnpm --filter @welltutored/scripts run api-codegen:check
```

which runs `scripts/api-codegen/orval.config.ts`, regenerating the folders it
names, and fails if the result differs from the
files in the working tree, listing each file that changed, appeared or
disappeared. It catches a spec change that nothing compiles against yet, such
as a new `maxLength` or a field made required, which typecheck can't. The fix
is the command the failure names:

```sh
pnpm --filter @welltutored/scripts run api-codegen
```

then commit the result. The check puts the folders back as they were
afterwards, so it never edits files itself. An Orval upgrade that changes the
output's formatting trips it too; regenerate in the upgrade's pull request.

## Before a pull request

[CONTRIBUTING.md](../CONTRIBUTING.md#prepare-a-pull-request) has what
has to pass: `docker compose run --rm verify`, which runs `pnpm run verify`, the
same gate CI runs. While working, run the affected package's suite first; it is
faster.
