# One production environment, with checks standing in for staging

There is one environment: the Deployment at `welltutored.co.uk`. Nothing runs a
copy of it to try changes on first. Instead, a change passes these checks on its
way there:

- `verify` and the Image Smoke on every pull request, including the Sign-in
  Smoke against the Clerk development instance.
- A blue-green Deploy, where the new machine takes traffic only after it passes
  the Health Check, which needs the database to answer.
- The Launch Smoke against the live site once it has switched.

[pipeline.md](../pipeline.md) describes each check.

## Why

A staging environment would mean a second Fly app, a Neon branch kept fresh
from production, a Clerk instance and a hostname for it. Every schema push would
also be done twice, by hand ([ADR-0002](0002-schema-by-deliberate-push.md)).
That is a lot to keep working for a site in stealth, with one owner and a
handful of tutors. The checks above catch most of what staging would, for one
line in `fly.toml` and about a minute of a second machine per deploy.

The trade-off accepted is real. These are only ever checked in production:

- Real data. The Image Smoke runs against seeded sample content.
- Neon and Fly behaviour, such as suspend and wake, pooling, and the proxy.
- HTTPS, certificates and redirects on the real hostnames.
- The production Clerk instance: its settings and its first-party cookies on
  `clerk.welltutored.co.uk`. A manual sign-in after an auth or Clerk change
  covers this ([CONTRIBUTING.md](../../CONTRIBUTING.md)).

And a broken page reaches visitors before the Launch Smoke reports it, since
that runs after the switch. Rolling back is then by hand, and it is only safe
across an additive schema push. The previous image runs against a schema that
was pushed before merge.

## Considered options

- **A staging app.** It catches real-data and platform problems before
  visitors do, at the cost above. It is the expected next step once the
  reasons to revisit below apply.
- **Fly `machine_checks`, to run the Launch Smoke against the new machine
  before it takes traffic.** They are the only way to catch broken pages
  before they go live without staging. But Fly supports them only with the
  `rolling` and `canary` strategies, not `bluegreen`, and with one machine
  `rolling` replaces it in place. Not adopted, because blue-green's switch on
  the Health Check is worth more here. Worth another look if Fly adds them to
  `bluegreen`.
- **Nothing beyond the Launch Smoke.** This was the setup before #70. A deploy
  replaced the only machine in place, so a version that wouldn't start or
  couldn't reach the database went live before anything noticed.

## Consequences

- A broken page, a missing Tutor or a schema mismatch is live until someone
  rolls back. [pipeline.md](../pipeline.md#rolling-back) has how.
- Keep schema pushes additive where possible, so a rollback stays safe.
- Revisit this when any of these happen: the site goes public, traffic grows
  beyond a handful of tutors, or a bug that staging would have caught gets
  through.
