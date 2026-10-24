# Smoke checks

For whoever runs a smoke check or reads a failed one: the checks that a running
site works, whether that is the local stack, the image in CI, or the live
[Deployment](../GLOSSARY.md#delivery). What each asserts, how to run it, and how
to read a failure. Where each runs in CI, and which of them block, is in
[pipeline.md](pipeline.md). Their own logic is tested by `test:smoke`
([code-checks.md](code-checks.md#repository-scripts)).

The `pnpm` commands on this page run inside the `api` container
([local-docker.md](local-docker.md)). The two browser checks, `smoke:enquiry`
and `smoke:workspace`, run only in CI: they need a Chromium, which none of the
images carry, and the runner has Google Chrome.

| Script | Check | What it checks | CI Smoke | Prod Smoke | [Local dev image](local-docker.md#the-local-dev-image-and-the-local-prod-image) | [Local prod image](local-docker.md#the-local-dev-image-and-the-local-prod-image) | Needs |
| --- | --- | --- | :-: | :-: | :-: | :-: | --- |
| `smoke:public-site` | [The Public Site Smoke](#the-public-site-smoke) | Health, catalogue, a published Tutor, public pages, invalid-enquiry recovery | ✅ | ✅ | ✅ | ✅ | HTTP only; a published Tutor; `SMOKE_BASE_URL` |
| `smoke:domain` | [The Domain Smoke](#the-domain-smoke) | Redirects to the Public Origin, the Clerk production instance | — | ✅ | — | — | HTTP only; live DNS and certificates; `SMOKE_BASE_URL`, `SMOKE_CLERK_FRONTEND_API`, `SMOKE_REDIRECT_FROM` |
| `smoke:enquiry` | [The Enquiry Smoke](#the-enquiry-smoke) | The enquiry form, by keyboard alone, with the final request intercepted | ✅ | ✅ | — | — | Chromium; a published Tutor that accepts enquiries; `SMOKE_BASE_URL`, `SMOKE_CHROMIUM_PATH` |
| `smoke:workspace` | [The Workspace Smoke](#the-workspace-smoke) | Sign-in, profile edit, a Resource published that stays hidden | ✅ ¹ | — | — | — | Chromium; a direct database connection; an image built with Clerk development keys; `SMOKE_BASE_URL`, `SMOKE_CHROMIUM_PATH`, `SMOKE_SIGN_IN_EMAIL`, `SMOKE_DATABASE_URL` |

¹ Not on a pull request from a fork, which gets no Clerk secrets.

## The Public Site Smoke

The [Public Site Smoke](../GLOSSARY.md#delivery) asserts that the site is
*usable*, which a successful [Deploy](../GLOSSARY.md#delivery) doesn't imply.
It makes the same assertions on every target, needs no workspace credentials
and writes nothing.

```sh
SMOKE_BASE_URL=https://welltutored.co.uk pnpm smoke:public-site
```

`SMOKE_BASE_URL` is required and has no default. Nothing infers the target: the
Deployment's origin is committed in `fly.toml`, and a check that picks its own
target is one that can report on a site nobody asked about.

### What it checks

The Public Site Smoke checks:

- the API health response at `/api/healthz`;
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

A pass prints `Public site smoke check passed`, a `✓` line for each check and
a `-` line for each skipped one. A failure prints
`Public site smoke check failed:` with the error, and exits non-zero.

### Waivers

`--allow-empty` waives the non-empty assertion on `/api/tutors` and the page
that addresses a [Tutor](../GLOSSARY.md#the-public-site) by slug. It is named
for the condition under which passing it is correct, not for what it skips, so
a stale one reads as a bug rather than as configuration. The waived checks are
reported as skipped rather than silently dropped.

The Deployment has a published Tutor, so the `prod-smoke` job in
`.github/workflows/deploy.yml` runs `smoke:public-site` with no waiver.
`--allow-empty` stays for a Deployment rebuilt from an empty database (#48),
and has no script entry. Pass it through `smoke:public-site` until the rebuilt
Deployment has a published Tutor again:

```sh
SMOKE_BASE_URL=https://welltutored.co.uk pnpm smoke:public-site --allow-empty
```

### When it fails

A red Public Site Smoke after a merge means visitors are already seeing the
fault. What to do is in [pipeline.md](pipeline.md#post-deploy-validation).

## The Domain Smoke

The [Domain Smoke](../GLOSSARY.md#delivery) asserts that the domain setup
around the Deployment holds. It needs live DNS and certificates, so it can pass
only against the live domain, and runs only in the Prod Smoke. It writes
nothing, and never requests `SMOKE_BASE_URL` itself.

```sh
SMOKE_BASE_URL=https://welltutored.co.uk \
  SMOKE_CLERK_FRONTEND_API=https://clerk.welltutored.co.uk \
  SMOKE_REDIRECT_FROM="https://www.welltutored.co.uk https://welltutored.com https://www.welltutored.com https://welltutored.fly.dev" \
  pnpm smoke:domain
```

All three variables are required, and are validated before any request:

- `SMOKE_BASE_URL` is the Public Origin, the target of the redirects.
- `SMOKE_CLERK_FRONTEND_API` is the origin of the Clerk production instance,
  the `clerk.` CNAME on the Deployment's domain. It must be a bare origin.
- `SMOKE_REDIRECT_FROM` lists the other origins the Deployment answers on,
  separated by commas or spaces. It must list at least one.

### What it checks

The Domain Smoke checks:

- Clerk's `/v1/environment` at `SMOKE_CLERK_FRONTEND_API`, requested directly
  from Clerk, which must answer as a `production` instance, so a broken CNAME,
  a lapsed certificate or a development key shipped by mistake all fail;
- that each origin in `SMOKE_REDIRECT_FROM` answers `/enquire?smoke=redirect`
  with a `301` whose `Location` is the same path and query on
  `SMOKE_BASE_URL`. A `302`, a page served in place, or a redirect that drops
  the path fails the check.

The Deployment sends these redirects itself when `PUBLIC_ORIGIN` is set; see
[configuration.md](configuration.md).

A pass prints `Domain smoke check passed` and a `✓` line for each check. A
failure prints `Domain smoke check failed:` with the error, and exits non-zero.

### When it fails

A red Domain Smoke after a merge means some visitors may already be reaching a
broken hostname or a broken sign-in. What to do is in
[pipeline.md](pipeline.md#post-deploy-validation).

## Timeout controls

Every Smoke reads `SMOKE_TIMEOUT_MS`, which limits each request or browser
wait. The Public Site Smoke and the Domain Smoke also read
`SMOKE_TOTAL_TIMEOUT_MS`, which limits the whole check; the browser Smokes
don't. Both are in milliseconds. Raise them for a target that is slow on
purpose. The defaults and accepted ranges are in `scripts/smoke/shared.ts`,
which rejects a value outside them before making any request.

## Run against the local dev image

This runs the Public Site Smoke against the app you develop on, the
[local dev image](local-docker.md#the-local-dev-image-and-the-local-prod-image)
at <http://localhost:5173>, instead of the live site. Run it before opening a
pull request that changes routing, public API responses, deployment
configuration or the enquiry form
([CONTRIBUTING.md](../CONTRIBUTING.md#prepare-a-pull-request)). It catches a
broken page or endpoint before CI does.

With the local stack running (`docker compose up api web`), run:

```sh
docker compose run --rm --entrypoint bash api -lc 'SMOKE_BASE_URL=http://web:5173 pnpm smoke:public-site'
```

The check runs in its own container, which reaches the `web` service by name
rather than as `localhost`. The `web` service forwards every `/api` request to
the `api` service, so the one address checks both the pages and the API. It
passes on the sample content the API seeds on first boot.

This checks your code on the development servers. Running it
[against the local prod image](#run-against-the-local-prod-image) also catches
faults in how the app is built and served.

## Run against the local prod image

The `prod` compose service runs the production image, the
[local prod image](local-docker.md#the-local-dev-image-and-the-local-prod-image),
against the local development database, which has seed content:

```
docker compose up --build prod      # http://localhost:8081
```

That covers the two things most likely to be wrong — whether the frontend is
actually served, and whether `TRUSTED_ORIGINS` permits an enquiry — without
deploying anything. Run the Public Site Smoke against it over the compose
network:

```
docker compose run --rm --entrypoint bash api -lc 'SMOKE_BASE_URL=http://prod:8080 pnpm smoke:public-site'
```

It requests every public page with `Accept: text/html`, which is what caught the
Clerk handshake redirect in
[ADR-0001](adr/0001-single-origin-deployment.md#consequences). In CI, the
`ci-smoke` job in `.github/workflows/ci.yml` also runs the two browser checks
against the image; by hand, this covers only the Public Site Smoke.

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

## The Workspace Smoke

The [Workspace Smoke](../GLOSSARY.md#delivery) signs in through the real Clerk
form and uses the [Workspace](../GLOSSARY.md#the-private-area): it saves a
profile edit, and publishes a Resource that stays hidden from visitors. So its
target must be built and run with Clerk **development** keys, and its database
must be a fresh, seeded one with no owner: the check promotes its user to owner
there, over a direct connection (`SMOKE_DATABASE_URL`). It refuses a database
that isn't local.

It runs only in CI, in the `ci-smoke` job, against the image
([pipeline.md](pipeline.md#the-ci-smoke)), and last, since it writes to the
database. It signs in as the `+clerk_test` user in the `CLERK_TEST_EMAIL`
secret, passed as `SMOKE_SIGN_IN_EMAIL`, of the Clerk development instance
whose keys CI holds
([local-docker.md](local-docker.md#which-clerk-instance-is-which)). A pull
request from a fork gets no secrets, so it skips the check with a notice.

A pass prints `Workspace smoke check passed` and a `✓` line for each step. A
failure prints the step it was on and the page's URL, then
`Workspace smoke check failed:` with the error, and exits non-zero. The run
then keeps the `workspace-smoke-failure` artifact, with a screenshot of the
page and a Playwright trace of the run (console, network and page snapshots).
To read it, download the artifact from the workflow run's summary page and
open `trace.zip` at
[trace.playwright.dev](https://trace.playwright.dev).
