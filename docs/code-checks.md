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
pnpm --filter @workspace/api-server test
```

This is the complete API suite used by CI. It runs the in-memory unit checks
and the database-backed integration tests, which cover:

- [Workspace](../GLOSSARY.md#the-private-area) tutor, resource, article,
  account, and permission lifecycles, including owner-only behavior and Clerk
  identity reuse.
- [Enquiries](../GLOSSARY.md#the-public-site): a valid enquiry is saved and its
  delivery status recorded, invalid ones are rejected, the workspace lists each
  tutor only their own, and a failed one can be retried. Delivery failures are
  simulated by failing the database update that records delivery.
- The public resource list and resource pages: only published resources by
  published tutors, search, the subject filter, and paging.

Running this package test command directly does not provision a database.
`pnpm run verify:ci` does: it uses `TEST_DATABASE_URL` when supplied, and
otherwise creates a temporary local PostgreSQL cluster, applies the current
schema, runs the integration tests, and removes the cluster afterward. The
temporary cluster needs `initdb`, which the containers lack, so locally the
`test` service supplies the database instead.

Run only the non-mutating API checks with:

```sh
pnpm --filter @workspace/api-server run test:unit
```

These checks cover:

- Publishability rules for tutor profiles and resources.
- Supported and legacy resource type normalization.
- Request-origin normalization and protection against cross-site workspace
  mutations.
- Resolution of the web client root the API serves, which is nothing unless
  one is configured.

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
pnpm --filter @workspace/welltutored test
```

The suite checks:

- Public and workspace route resolution, metadata, redirects, and Clerk
  callback routes.
- Homepage loading, successful tutor rendering, and retry behavior.
- [Tutor](../GLOSSARY.md#the-public-site) profile behavior, including tutors
  whose intake is full.
- Enquiry form validation, keyboard navigation, focus management, disabled
  submit behavior, announced errors, retry behavior, and successful receipts.
- Public tutor-query caching, expiry, and mutation invalidation.
- Workspace authentication loading, approved, pending, error, and retry
  states.

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
`docs:check`, which reads `README.md`, `CONTRIBUTING.md`, `GLOSSARY.md`,
everything under `docs/` and the workflows' `run:` steps. They ensure that
`pnpm` commands refer to real package scripts, that local links resolve, and
that each guide's title is followed by a line of prose saying who it is for:
not a heading, list, table, quote, image or code. The database-config tests ensure that
integration tests require a dedicated `TEST_DATABASE_URL` distinct from
`DATABASE_URL`.

## Static verification

Run the repository-wide type checks with:

```sh
pnpm run typecheck
```

Run the normal build verification with:

```sh
pnpm run build
```

The build first checks documented commands, then type-checks libraries and
workspace packages, and finally builds the packages that define a build script.

## Before a pull request

[CONTRIBUTING.md](../CONTRIBUTING.md#before-opening-a-pull-request) has what
has to pass: `docker compose run --rm test`, which runs `pnpm run verify:ci`, the
same gate CI runs. While working, run the affected package's suite first; it is
faster.
