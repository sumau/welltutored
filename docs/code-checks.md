# Code checks

For whoever writes a test or reads a red `verify`: the checks that run against
the repository before a merge — the test suites, typecheck, build and docs
check that `pnpm run verify:ci` runs — and how to write a test. Checks against
a running site are in [smoke-checks.md](smoke-checks.md).

Most automated tests use Node's built-in `node:test` runner and are executed
with `tsx`; the web tests also use JSDOM where browser APIs are needed.

The commands below run inside the containers: prefix them with
`docker compose exec api` against a running stack. The full suite is:

```
docker compose run --rm test
```

It runs `verify:ci` against a second database, `welltutored_test`, on the same
PostgreSQL service as the development database, and creates that database on
first use. Running `pnpm run verify:ci` directly inside `api` or `web` does not
work. Without `TEST_DATABASE_URL` it tries to build a throwaway cluster with
`initdb` and `pg_ctl`, and the image carries only the PostgreSQL client
binaries:

```
Test database unavailable: required command 'initdb' was not found.
```

The `test` service supplies the connection, which takes the other branch of
`scripts/with-test-database.sh`. CI takes the same branch, with the dedicated
connection coming from its `postgres:16` service container instead
([pipeline.md](pipeline.md#github-actions)). The suite needs no Clerk keys
([pipeline.md](pipeline.md#credentials)).

## Test suites

### API server

Run the API tests with:

```sh
pnpm --filter @workspace/backend test
```

This is the complete API suite used by CI: the in-memory unit checks and the
database-backed integration tests. Running it directly does not provision a
database; `pnpm run verify:ci` does, as above.

Run only the non-mutating API checks with:

```sh
pnpm --filter @workspace/backend run test:unit
```

The lifecycle tests exercise the Express routes and database-backed behavior
end to end within the test process. They create, update, publish, and delete
test records and are therefore reserved for CI with an isolated test
database. Set `TEST_DATABASE_URL` to the dedicated PostgreSQL connection;
`test:integration` sets `NODE_ENV=test`, and the database package refuses to
fall back to `DATABASE_URL` or use the same URL as the application. CI must
apply the current schema to that database before running the integration
script. The CI preparation command does both checks explicitly:

```sh
pnpm run check:test-database
pnpm run prepare:test-database
```

The first command fails if `TEST_DATABASE_URL` is missing or points to
`DATABASE_URL`. The second applies the current schema using the test URL as its
target and fails with a connection-specific message if that database is not
reachable. Each process also uses a unique fixture namespace, so overlapping
runs do not reuse or delete one another's records.

The test database holds the schema and no seed data, so a lifecycle test must
create every row it asserts against, such as a second tutor, and clean up only
its own namespace. The test files run in parallel against that one database,
so a published tutor that one file creates shows up in another file's public
tutor list: give it everything the public API requires, such as a teaching
point, or that list fails with a 500. To stub Clerk, replace the method on the shared users API
prototype: `clerkClient.users` can return a fresh object on each access, so a
stub assigned through it is silently discarded and the route reaches Clerk.

### Web application

Run the Well Tutored web tests with:

```sh
pnpm --filter @workspace/frontend test
```

React components are rendered either into JSDOM or to static markup. Network
and query behavior is supplied by test doubles rather than making real
production requests.

The command runs `tsx` from the API package, which has neither Vite's aliases
nor its JSX transform, so when adding a web test:

- Keep `--tsconfig ../welltutored/tsconfig.json`, which resolves the `@/*`
  aliases, and import `React` explicitly in test files and the components they
  render.
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

The script package has three test suites, all run by `verify:ci`:

```sh
pnpm --filter @workspace/scripts run test:smoke
pnpm --filter @workspace/scripts run test:docs
pnpm run test:database-config
```

The smoke-check tests validate the logic of the scripts in
[smoke-checks.md](smoke-checks.md), without a running site: target selection,
the waiver flags in both directions, redirect protection, timeout handling, and
healthy responses against a local fixture. The documentation tests cover
[the Docs Check](#the-docs-check). The database-config tests ensure that
integration tests require a dedicated `TEST_DATABASE_URL` distinct from
`DATABASE_URL`.

## The Docs Check

The [Docs Check](../GLOSSARY.md#delivery), `pnpm run docs:check`, runs as part
of `pnpm run build`, so a broken doc fails CI's `verify` job and blocks the
deploy. It parses
`README.md`, `CONTRIBUTING.md`, `GLOSSARY.md`, everything under `docs/`, and
the `run:` steps of `.github/workflows/*.yml`, and fails when:

- a `pnpm` command names a script that does not exist;
- a local link, or its `#anchor`, does not resolve;
- a file named in backticks is not in the repository. A short path such as
  `routes/workspace.ts` counts when some file's path ends with it;
- a doc does not open with a line of prose saying who it is for: not a
  heading, list, table, quote, image or code.

It also reads the code, skipping tests and generated code, and fails when:

- the code reads an environment variable by name that
  [configuration.md](configuration.md) does not name;
- a code, config or workflow comment names a doc, or a doc's heading, that
  does not exist.

## Before a pull request

[CONTRIBUTING.md](../CONTRIBUTING.md#before-opening-a-pull-request) has what
has to pass: `docker compose run --rm test`, which runs `pnpm run verify:ci`, the
same gate CI runs. While working, run the affected package's suite first; it is
faster.
