# Testing

The project uses several complementary test layers. Most automated tests use
Node's built-in `node:test` runner and are executed with `tsx`; the web tests
also use JSDOM where browser APIs are needed.

The commands below run inside the containers: prefix them with
`docker compose exec api` against a running stack. The exception is the
[Sign-in Smoke](#sign-in-smoke), which needs a Chromium the images do not
carry. The full suite is `docker compose run --rm test`
([local-docker.md](local-docker.md#tests)).

## Test suites

### API server

Run the API tests with:

```sh
pnpm --filter @workspace/api-server test
```

This is the complete API suite used by CI. It runs the in-memory unit checks
and the database-backed integration tests, which cover:

- Workspace tutor, resource, article, account, and permission lifecycles,
  including owner-only behavior and Clerk identity reuse.
- Enquiries: a valid enquiry is saved and its delivery status recorded,
  invalid ones are rejected, the workspace lists each tutor only their own,
  and a failed one can be retried. Delivery failures are simulated by failing
  the database update that records delivery.
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
- Tutor profile behavior, including tutors whose intake is full.
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

The smoke-check tests validate target selection, the waiver flags in both
directions, redirect protection, timeout handling, and healthy responses
against a local fixture. The documentation tests ensure that `pnpm` commands —
in the docs and in the workflows' `run:` steps — refer to real package scripts,
and that local links resolve. The database-config tests ensure that
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

## Smoke checks

The smoke scripts check a running site rather than the code.
[launch-smoke-check.md](launch-smoke-check.md) covers what each one checks and
how to run it, and [pipeline.md](pipeline.md) where each one runs and
which of them block. Their own logic is tested by `test:smoke`, under
[Repository scripts](#repository-scripts).

### Against the local stack

With the local stack running (`docker compose up api web`), run the development
smoke through the Vite dev server, which proxies `/api` to the API service, so
the web application and `/api` are checked together:

```sh
docker compose run --rm --entrypoint bash api -lc 'SMOKE_BASE_URL=http://web:5173 pnpm smoke:dev'
```

It checks health, catalogue data, public routes and invalid-enquiry recovery,
and skips the Clerk check, because a local stack runs on a development instance
with no `clerk.` CNAME to check.

### Sign-in Smoke

The Sign-in Smoke signs in through the real Clerk form, so its target must be
built and run with Clerk **development** keys, and its database must be a
fresh, seeded one with no owner: the check promotes its user to owner there. It
refuses a database that is not local. `SMOKE_SIGN_IN_EMAIL` must be a
`+clerk_test` user of the instance those keys belong to, which may not be the
one CI uses ([local-docker.md](local-docker.md#which-clerk-instance-is-which)),
and `SMOKE_FAILURE_SCREENSHOT` optionally
names a file for a screenshot of the page when it fails:

```sh
SMOKE_BASE_URL=http://localhost:8080 \
  SMOKE_SIGN_IN_EMAIL=someone+clerk_test@example.com \
  SMOKE_DATABASE_URL=postgres://postgres:postgres@localhost:5432/image_smoke \
  SMOKE_CHROMIUM_PATH=/path/to/chromium pnpm smoke:sign-in
```

[pipeline.md](pipeline.md#the-image-smoke) has the steps CI uses to
prepare that target.

## Before a pull request

[CONTRIBUTING.md](../CONTRIBUTING.md#before-opening-a-pull-request) has what
has to pass: `docker compose run --rm test`, which runs `pnpm run verify:ci`, the
same gate CI runs. While working, run the affected package's suite first; it is
faster.
