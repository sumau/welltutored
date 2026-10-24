# Smoke checks

For whoever runs a smoke check or reads a failed one: the checks that a running
site works, whether that is the local stack, the image in CI, or the live
[Deployment](../GLOSSARY.md#delivery). What each asserts, how to run it, and how
to read a failure. Where each runs in CI, and which of them block, is in
[pipeline.md](pipeline.md). Their own logic is tested by `test:smoke`
([code-checks.md](code-checks.md#repository-scripts)).

The `pnpm` commands on this page run inside the `api` container
([local-docker.md](local-docker.md)). The two browser checks, `smoke:enquiry`
and `smoke:sign-in`, run only in CI: they need a Chromium, which none of the
images carry, and the runner has Google Chrome.

| Script | Check | Runs against |
| --- | --- | --- |
| `smoke:launch` | The [Launch Smoke](#the-launch-smoke) | The live Deployment |
| `smoke:launch:dev` | The same check with `--dev`, so without the Clerk check | [The local stack](#run-against-the-local-stack), and the image in [the Image Smoke](#run-the-image-smoke-by-hand) |
| `smoke:enquiry` | [The Enquiry Smoke](#the-enquiry-smoke) | The image in CI, then the live Deployment; CI only |
| `smoke:sign-in` | [The Sign-in Smoke](#the-sign-in-smoke) | The image in CI, built with Clerk development keys; CI only |

## The Launch Smoke

The [Launch Smoke](../GLOSSARY.md#delivery) asserts that a Deployment is
*usable*, which a successful [Deploy](../GLOSSARY.md#delivery) doesn't imply.
It needs no workspace credentials and writes nothing.

```sh
SMOKE_BASE_URL=https://welltutored.co.uk \
  SMOKE_CLERK_FRONTEND_API=https://clerk.welltutored.co.uk pnpm smoke:launch
```

`SMOKE_BASE_URL` is required and has no default. Nothing infers the target: the
Deployment's origin is committed in `fly.toml`, and a check that picks its own
target is one that can report on a site nobody asked about.

`SMOKE_CLERK_FRONTEND_API` is required too, except with `--dev`: it is the
origin of the Clerk production instance, the `clerk.` CNAME on the Deployment's
domain. It must be a bare origin, and is validated before any request.

### What it checks

The Launch Smoke checks:

- the API health response at `/api/healthz`;
- Clerk's `/v1/environment` at `SMOKE_CLERK_FRONTEND_API`, requested directly
  from Clerk, which must answer as a `production` instance — so a broken CNAME,
  a lapsed certificate or a development key shipped by mistake all fail;
- tutor and resource catalogue responses, including a non-empty published
  tutor list and the response fields used by public catalogue links;
- the public home, enquiry, and tutor-profile pages, each requested with
  `Accept: text/html`;
- invalid enquiry recovery by sending `{}` to `POST /api/enquiries`, expecting
  a `400` validation response, and checking health again afterward.

While [Resources](../GLOSSARY.md#the-public-site) are hidden from visitors
(`PUBLIC_RESOURCES_ENABLED` in `frontend/src/lib/features.ts` is `false`), the
check needs no published Resource and doesn't request the resource pages.
Restore both when that switch turns on.

Every request must also finish on the origin it was sent to. A target that
redirects elsewhere fails the check and reports both origins, so an old
hostname redirecting to a replacement is caught before its responses are
treated as healthy.

The command exits non-zero on any failed check.

### Redirect checks

`SMOKE_REDIRECT_FROM` optionally lists the other origins the Deployment answers
on, separated by commas or spaces. Each one must answer
`/enquire?smoke=redirect` with a `301` whose `Location` is the same path and
query on `SMOKE_BASE_URL`. A `302`, a page served in place, or a redirect that
drops the path fails the check.

```sh
SMOKE_BASE_URL=https://welltutored.co.uk \
  SMOKE_REDIRECT_FROM="https://www.welltutored.co.uk https://welltutored.com https://www.welltutored.com https://welltutored.fly.dev" \
  pnpm smoke:launch
```

The Deployment sends these redirects itself when `PUBLIC_ORIGIN` is set; see
[configuration.md](configuration.md).

### Waivers

Two flags waive an assertion the target genuinely can't meet. Each is named
for the condition under which passing it is correct, not for what it skips, so
a stale one reads as a bug rather than as configuration. A waived check is
reported as skipped rather than silently dropped.

| Flag | Waives | Ends when |
| --- | --- | --- |
| `--dev` | the Clerk check, since a local stack runs on a development instance with no `clerk.` CNAME to check | never; development is a permanent mode |
| `--allow-empty` | the non-empty assertion on `/api/tutors` and the page that addresses a [Tutor](../GLOSSARY.md#the-public-site) by slug | a rebuilt, empty Deployment has a published Tutor again |

`smoke:launch:dev` wraps `--dev`, for
[the local stack](#run-against-the-local-stack) and
[the Image Smoke](#run-the-image-smoke-by-hand).

The Deployment has a published Tutor, so the `prod-smoke` job in
`.github/workflows/deploy.yml` runs `smoke:launch` with no waiver. `--allow-empty`
stays for a Deployment rebuilt from an empty database (#48), and has no script
entry. Pass it through `smoke:launch` until the rebuilt Deployment has a
published Tutor again:

```sh
SMOKE_BASE_URL=https://welltutored.co.uk \
  SMOKE_CLERK_FRONTEND_API=https://clerk.welltutored.co.uk pnpm smoke:launch --allow-empty
```

### Timeout controls

`SMOKE_TIMEOUT_MS` limits each request and `SMOKE_TOTAL_TIMEOUT_MS` the whole
check, in milliseconds. Raise them for a target that is slow on purpose. The
defaults and accepted ranges are in `scripts/smoke/launch.ts`, which rejects
a value outside them before making any request.

### When it fails

A red Launch Smoke after a merge means visitors are already seeing the fault.
What to do is in [pipeline.md](pipeline.md#post-deploy-validation).

## Run against the local stack

With the local stack running (`docker compose up api web`), run the development
smoke through the Vite dev server, which proxies `/api` to the API service, so
the web application and `/api` are checked together:

```sh
docker compose run --rm --entrypoint bash api -lc 'SMOKE_BASE_URL=http://web:5173 pnpm smoke:launch:dev'
```

It runs the Launch Smoke's checks except the Clerk one
([waivers](#waivers)).

## Run the Image Smoke by hand

The `prod` compose service runs the production image against the local
development database, which has seed content:

```
docker compose up --build prod      # http://localhost:8081
```

That covers the two things most likely to be wrong — whether the frontend is
actually served, and whether `TRUSTED_ORIGINS` permits an enquiry — without
deploying anything. Run the development smoke against it over the compose
network:

```
docker compose run --rm --entrypoint bash api -lc 'SMOKE_BASE_URL=http://prod:8080 pnpm smoke:launch:dev'
```

It requests every public page with `Accept: text/html`, which is what caught the
Clerk handshake redirect in
[ADR-0001](adr/0001-single-origin-deployment.md#consequences). In CI, the
`ci-smoke` job in `.github/workflows/ci.yml` also runs the two browser checks
against the image; by hand, this covers only the development smoke.

## The Enquiry Smoke

The [Enquiry Smoke](../GLOSSARY.md#delivery) goes through the enquiry form in a
real browser by keyboard alone. It intercepts the request that would send the
form and answers it itself, so the check never creates a real
[Enquiry](../GLOSSARY.md#the-public-site).

It runs only in CI, in the runner's Google Chrome, twice: in the `ci-smoke` job
before merge, against the image ([pipeline.md](pipeline.md#the-ci-smoke)), and
in the `prod-smoke` job after a Deploy, against the Deployment
([pipeline.md](pipeline.md#post-deploy-validation)). `playwright-core` bundles
no browser and none of this project's images carry one, so the script takes
the browser's path from `SMOKE_CHROMIUM_PATH`.

A pass prints `Enquiry keyboard smoke check passed` and a `✓` line for each
behavior checked. A failure prints `Enquiry keyboard smoke check failed:` with
the error, and exits non-zero.

## The Sign-in Smoke

The [Sign-in Smoke](../GLOSSARY.md#delivery) signs in through the real Clerk
form, so its target must be built and run with Clerk **development** keys, and
its database must be a fresh, seeded one with no owner: the check promotes its
user to owner there. It refuses a database that isn't local.

It runs only in CI, in the `ci-smoke` job, against the image
([pipeline.md](pipeline.md#the-ci-smoke)). It signs in as the `+clerk_test`
user in the `CLERK_TEST_EMAIL` secret, of the Clerk development instance whose
keys CI holds ([local-docker.md](local-docker.md#which-clerk-instance-is-which)).
A pull request from a fork gets no secrets, so it skips the check with a
notice.

A pass prints `Sign-in smoke check passed` and a `✓` line for each step. A
failure prints the step it was on and the page's URL, then
`Sign-in smoke check failed:` with the error, and exits non-zero. The run then keeps the `sign-in-smoke-failure` artifact,
with a screenshot of the page and a Playwright trace of the run (console,
network and page snapshots). To read it, download the artifact from the
workflow run's summary page and open `trace.zip` at
[trace.playwright.dev](https://trace.playwright.dev).
