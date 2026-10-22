# Launch smoke check

The Launch Smoke asserts that a Deployment is *usable*, which a successful
Deploy does not imply. It needs no workspace credentials and writes nothing.

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

## What it checks

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

Resources are hidden from visitors for now (`PUBLIC_RESOURCES_ENABLED` in
`artifacts/welltutored/src/lib/features.ts`), so the check needs no published
Resource and does not request the resource pages. Restore both when that
switch turns on.

Every request must also finish on the origin it was sent to. A target that
redirects elsewhere fails the check and reports both origins, so an old
hostname redirecting to a replacement is caught before its responses are
treated as healthy.

The command exits non-zero on any failed check.

## Redirecting hostnames

`SMOKE_REDIRECT_FROM` optionally lists the other origins the Deployment answers
on, separated by commas or spaces. Each one must answer
`/enquire?smoke=redirect` with a `301` whose `Location` is the same path and
query on `SMOKE_BASE_URL`. A `302`, a page served in place, or a redirect that
drops the path fails the check. Its entries are validated before any request,
like the target: each must be a bare origin, and none may be the target itself.

```sh
SMOKE_BASE_URL=https://welltutored.co.uk \
  SMOKE_REDIRECT_FROM="https://www.welltutored.co.uk https://welltutored.com https://www.welltutored.com https://welltutored.fly.dev" \
  pnpm smoke:launch
```

The Deployment sends these redirects itself once `PUBLIC_ORIGIN` is set; see
the configuration reference in [deploy.md](deploy.md#configuration-reference).

## Waivers

Two flags waive an assertion the target genuinely cannot meet. Each is named
for the condition under which passing it is correct, not for what it skips, so
a stale one reads as a bug rather than as configuration. A waived check is
reported as skipped rather than silently dropped.

| Flag | Waives | Ends when |
| --- | --- | --- |
| `--dev` | the Clerk check, since a local stack runs on a development instance with no `clerk.` CNAME to check | never; development is a permanent mode |
| `--allow-empty` | the non-empty assertion on `/api/tutors` and the page that addresses a Tutor by slug | the Deployment has a published Tutor |

`smoke:dev` wraps `--dev`:

```sh
SMOKE_BASE_URL=http://prod:8080 pnpm smoke:dev
```

The Deployment has a published Tutor, so the deploy job in
`.github/workflows/ci.yml` runs `smoke:launch` with no waiver. `--allow-empty`
stays for a Deployment rebuilt from an empty database (#48), and has no script
entry. Pass it through `smoke:launch` until the rebuilt Deployment has a
published Tutor again:

```sh
SMOKE_BASE_URL=https://welltutored.co.uk \
  SMOKE_CLERK_FRONTEND_API=https://clerk.welltutored.co.uk pnpm smoke:launch --allow-empty
```

## Timeout controls

The smoke check applies a timeout to each request and an overall deadline to
the complete check:

- `SMOKE_TIMEOUT_MS` — per-request timeout. Defaults to `15000` ms and accepts
  integer values from `100` through `60000` ms.
- `SMOKE_TOTAL_TIMEOUT_MS` — overall launch-check timeout. Defaults to `60000`
  ms and accepts integer values from `1000` through `300000` ms.

When a target is intentionally slower, override the relevant values for that
run. Increase the overall timeout as well if the complete sequence needs more
time:

```sh
SMOKE_TIMEOUT_MS=30000 SMOKE_TOTAL_TIMEOUT_MS=120000 pnpm smoke:launch
```

These controls do not disable the checks or allow requests to continue past the
overall deadline. Values outside the supported ranges, or values that are not
whole numbers of milliseconds, fail before requests are made.

## The enquiry browser check

The enquiry form also has a real-browser keyboard smoke check. It traverses the
form with native Tab and Enter actions, and checks validation recovery,
disabled-submit behavior, announced network errors, retry, the success receipt,
and a tutor preselected from their profile. It intercepts the final response,
so the check never creates a real Enquiry.

```sh
SMOKE_BASE_URL=https://welltutored.co.uk \
  SMOKE_CHROMIUM_PATH=/path/to/chromium pnpm smoke:enquiry
```

`SMOKE_CHROMIUM_PATH` is required: `playwright-core` bundles no browser and
none of this project's images carry one, so this check runs from wherever a
Chromium already exists. In CI that is the runner's Google Chrome, in the Image
Smoke ([ci-validation.md](ci-validation.md#the-image-smoke)).
