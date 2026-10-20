# CI and deploy validation

The project uses separate checks for deterministic code quality, the
production image, the running development stack, and the live Deployment.

## Deterministic CI validation

Run the complete repository verification with:

```sh
pnpm run verify:ci
```

This command runs, in order:

1. The test-database configuration guard tests.
2. The required test-database environment check.
3. Schema preparation against the dedicated `TEST_DATABASE_URL` connection.
4. The complete API server test suite, including database-backed workspace
   lifecycle integration tests.
5. Well Tutored web tests.
6. Smoke-check tests.
7. `pnpm run build`, which checks documented commands, type-checks libraries
   and workspace packages, and builds the packages that define a build script.

The command stops at the first failure and returns a non-zero exit code. It is
the deterministic quality gate and does not depend on a running dev stack or a
deployed URL.

The command uses an externally supplied `TEST_DATABASE_URL` when one is available.
Otherwise, it provisions a temporary local PostgreSQL cluster for the run,
exports its separate connection as `TEST_DATABASE_URL`, and removes the
cluster when validation finishes. It never falls back to `DATABASE_URL`.

CI is the only automated validation path that runs the database-backed API
integration suite. Those tests create, update, publish, and delete test
records, so they must use an isolated test database rather than a live
environment. The gate rejects a value equal to `DATABASE_URL` and
applies the current schema to the test connection before the API suite starts.
If an external test URL is provided but is missing or the schema cannot be
applied, validation stops with an actionable test-database error instead of
falling back to the application database.

## GitHub Actions

[.github/workflows/ci.yml](../.github/workflows/ci.yml) runs this same gate on
every pull request and on pushes to `main`, and a push to `main` that passes it
goes on to deploy. The gate therefore runs before a merge, not only after one.

The workflow supplies a `postgres:16` service container and points
`TEST_DATABASE_URL` at a `welltutored_test` database that it creates first.
Supplying a connection takes the externally-provided branch of
`scripts/with-test-database.sh`, so no throwaway cluster is built for the run.
`DATABASE_URL` is set as well, to a different database on the same server, so
the refusal to share a connection between application and integration-test data
is exercised rather than vacuously satisfied by an absent value.

Two environment constraints are load-bearing. The job runs on `ubuntu-latest`
because it is linux-x64 with glibc, and `pnpm-workspace.yaml` prunes every other
platform's native binaries from the lockfile. And pnpm is installed from the
`packageManager` field rather than a version named in the workflow, so the pin
that `docker/Dockerfile.dev` and the deployment build also depend on stays in
one place.

`docs:check` also reads this workflow's `run:` steps and validates the `pnpm`
scripts they name, so a renamed script cannot reach a deploy job that calls it.

Only the Image Smoke job has Clerk credentials, for the reasons below.

## The Image Smoke

The `image-smoke` job runs alongside `verify`, on every pull request and on
`main`. It checks that the production image starts and serves the site, which
`verify` cannot: it builds the repository, not `docker/Dockerfile`. Without it,
a broken Dockerfile or a startup failure would first show up in `flyctl deploy`
on `main`.

1. Pushes the schema to a `postgres:16` service container.
2. Seeds it by starting the API once with `NODE_ENV=development`, the condition
   `ensureSeedContent()` is gated on, until it logs that it is listening.
3. Builds `docker/Dockerfile` with an empty `VITE_CLERK_PUBLISHABLE_KEY`, like
   the compose `prod` service, with layers cached between runs.
4. Runs the image on `http://localhost:8080`, with `TRUSTED_ORIGINS` set to
   that origin and the `.env.example` placeholder `CLERK_SECRET_KEY`.
5. Runs `pnpm smoke:dev` against it. A failure stops the deploy.
6. Runs `pnpm smoke:enquiry` against it, with the runner's Google Chrome. This
   step does not block yet (`continue-on-error`): it moves through the form by
   tab order, so a harmless markup change can fail it. Once it has proven
   stable, it should block too.
7. Runs the Sign-in Smoke, `pnpm smoke:sign-in`, also with Chrome and also not
   blocking yet. It signs in through the real Clerk form as a `+clerk_test`
   user, which Clerk signs in with the code `424242` and never emails. The
   first sign-in creates a pending account, so it promotes that account to
   owner in the job's database (the guarded update from
   [workspace-owner-bootstrap.md](workspace-owner-bootstrap.md)) and links it
   to a seeded Tutor. Then it signs in again, saves a profile edit, publishes
   a Resource, and checks that the Resource's public page is Not Found while
   Resources are hidden. Once it has run reliably for a couple of weeks, it
   should block too.

The image it checks is not the one that ships. Fly builds the same Dockerfile
again with the `pk_live_` key from `fly.toml`, and giving CI that key would work
against keeping the Clerk instances separate. So this checks the image's
recipe, not the exact image.

## Credentials

`pnpm run verify:ci` needs no Clerk credentials. The suite passes with
`CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, and `VITE_CLERK_PUBLISHABLE_KEY`
all absent, so the `verify` job is not given Clerk secrets, and the interactive
`clerk auth login` flow has no place in it: that command authenticates a person
through a browser, which CI does not have.

Nothing in the suite reaches Clerk over the network. The workspace lifecycle
tests replace `clerkClient.users.getUser` on its prototype and supply
authentication through the `@clerk/express.auth` symbol, the web tests render
under JSDOM, and `test:smoke` exercises the smoke scripts' own logic rather
than launching them against a running host.

The one check that depends on a live Clerk instance is the launch smoke
check's request to the production instance's `/v1/environment`, which goes to
Clerk directly and needs no keys at all. Development smoke skips it, because a
local stack runs on a development instance with no `clerk.` CNAME to check.

The dedicated test database is therefore the only external dependency the
deterministic gate has.

The Image Smoke job is the exception, for the Sign-in Smoke. It reads three
repository secrets from the Clerk **development** instance:

| Secret | Used for |
| --- | --- |
| `CLERK_TEST_PUBLISHABLE_KEY` | The image's `VITE_CLERK_PUBLISHABLE_KEY` build argument, and its `CLERK_PUBLISHABLE_KEY` |
| `CLERK_TEST_SECRET_KEY` | The image's `CLERK_SECRET_KEY` |
| `CLERK_TEST_EMAIL` | The `+clerk_test` user the Sign-in Smoke signs in as. A secret only because the repository is public. |

The job refuses keys that are not `pk_test_` and `sk_test_`. Without the
secrets, as on a pull request from a fork or Dependabot, the image builds with
an empty publishable key and runs with the `.env.example` placeholder secret
key. The development smoke then still passes and the Sign-in Smoke fails
without blocking.

What the Sign-in Smoke cannot cover is the production Clerk instance itself:
its first-party cookies on `clerk.welltutored.co.uk` and the dashboard
settings that can differ between the two instances. That is a manual sign-in
after merging an auth or Clerk change
([CONTRIBUTING.md](../CONTRIBUTING.md#before-opening-a-pull-request)).

## The deploy job

The `deploy` job in the same workflow runs only on a push to `main`, and only
once `verify` and the Image Smoke have passed — `needs: [verify, image-smoke]`
is what makes a failure in either stop a deploy. It checks out, installs `flyctl`, runs `flyctl deploy`, and then
runs the launch smoke against the live site.

It has its own `concurrency` group, without `cancel-in-progress`. The
workflow-level group cancels superseded pull-request runs, which is right for
verification and wrong for a deploy: a cancelled one leaves the Deployment
wherever `flyctl` had got to. Deploys queue instead.

It does **not** apply the schema. That is
[ADR-0002](adr/0002-schema-by-deliberate-push.md), and it is the point.

## Development smoke validation

With the local stack running, validate it through the Vite dev server, which
proxies `/api` to the API service:

```sh
SMOKE_BASE_URL=http://localhost:5173 pnpm smoke:dev
```

The development launch check validates health, catalogue data, public routes,
and invalid-enquiry recovery. It intentionally skips the Clerk Frontend API
proxy assertion because the API server only enables that proxy in production.

`SMOKE_BASE_URL` is required and has no default, in every mode — see
[launch-smoke-check.md](launch-smoke-check.md). Target the dev server rather
than the API port directly, so the web application and `/api` are checked
together.

The browser check (`pnpm smoke:enquiry`) validates the enquiry flow with
keyboard navigation, validation recovery, retry behavior, and an announced
success receipt. Its requests are intercepted so it does not create a real
Enquiry. It needs `SMOKE_CHROMIUM_PATH`. CI runs both checks against the
production image, in the Image Smoke.

## Post-deploy validation

The deploy job finishes by running the launch smoke against the live site:

```sh
SMOKE_BASE_URL=https://welltutored.co.uk \
  SMOKE_CLERK_FRONTEND_API=https://clerk.welltutored.co.uk \
  pnpm run smoke:launch
```

CI also sets `SMOKE_REDIRECT_FROM` to the Deployment's other hostnames, so the
same run checks that each redirects to the Public Origin.

A successful Deploy does not mean a usable Deployment, which is why this runs
at all. The check fails if the site is unhealthy or redirects to another
origin.

It runs without waivers, so it also asserts a published Tutor and that
Tutor's profile page. **A red Launch smoke on a merge to `main` is a real
failure**: an unhealthy site, a redirect to another origin, a broken public
page, or published content that has gone missing. It is not something to wave
through.

## Why separate gates

`verify:ci`, the Image Smoke and the launch smoke stay separate. The Image
Smoke needs a built image, a running container and the only Clerk secrets
in CI, and the launch smoke
validates the Deployment visitors actually reach. The order to run them in before merging is
in [CONTRIBUTING.md](../CONTRIBUTING.md#before-opening-a-pull-request).