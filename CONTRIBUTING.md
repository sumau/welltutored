# Contributing

How a change gets from an idea to production, for anyone changing the project.
[README.md](README.md) covers what the project is and how to run it; this file
covers how to change it.

## Merging to `main` ships to production

CI deploys to Fly on every push to `main` and then runs the Prod Smoke
against the live site. There is no separate release step, so a merged pull
request is a shipped one. The rest of this page follows from that.
[docs/pipeline.md](docs/pipeline.md) shows every check between a pull
request and the live site, and which of them block.

## Plans and issues

Issues live in `sumau/welltutored` on GitHub.

- A change that takes more than one pull request gets a tracking issue: the
  decisions, then a `- [ ]` checklist of steps, with steps only a human can do
  marked as such. Tick each box as its step lands on `main`, link the pull
  requests, and close the issue when the last box is ticked.
- Plans live in issues, not in `*-PLAN.md` files in the repo.
- Plan each change with `/grill-with-docs` from the mattpocock-skills plugin,
  which [.claude/settings.json](.claude/settings.json) enables. It records the
  terms it settles in [GLOSSARY.md](GLOSSARY.md) and its decisions as ADRs.
  Its config is in [docs/agents/](docs/agents/).
- Triage uses the labels `needs-triage`, `needs-info`, `ready-for-agent`,
  `ready-for-human` and `wontfix`.

## Make a change

Everything runs in containers; there is no host Node, pnpm or PostgreSQL. See
[docs/local-docker.md](docs/local-docker.md).

- Branch from an up-to-date `main`, one branch per pull request.
- Don't stack pull requests. GitHub doesn't always retarget a stacked pull
  request when its base merges, so it can land on a branch instead of `main`.
  Wait for the previous one to merge, then branch from `main` again.
- Use the terms in [GLOSSARY.md](GLOSSARY.md), and avoid the synonyms it lists.
- A change keeps the docs true. If it makes a statement in the docs false,
  update the statement in the same pull request.
- Docs state the current rules and what they are for. History goes in issues
  and ADRs: an issue number is fine as a pointer, not as the story.
  Record a decision a reader will question as an ADR in
  [docs/adr/](docs/adr/).
- After changing `backend/openapi.yaml`, run
  `pnpm --filter @welltutored/scripts run api-codegen` and commit its output,
  as [docs/api-contract.md](docs/api-contract.md#change-an-endpoint) says.
  Never edit generated code by hand.

## Prepare a pull request

- `docker compose run --rm verify` is green. It runs `pnpm run verify`, the same
  checks as CI's `verify` job ([docs/code-checks.md](docs/code-checks.md)).
  The smokes against the production image run in CI
  ([docs/pipeline.md](docs/pipeline.md)).
- For a UI or build change, click through the running app as well
  (`docker compose up api web`).
- For a change to routing, public API responses, deployment configuration or
  the enquiry journey, also run the Public Site Smoke against the local stack
  ([docs/smoke-checks.md](docs/smoke-checks.md#run-against-the-local-dev-image)).
- After merging a change that touches auth, Clerk or the `@clerk/*` versions,
  sign in on `https://welltutored.co.uk` and open the
  [Workspace](GLOSSARY.md#the-private-area). The Workspace Smoke uses the Clerk
  development instance, so this is the part CI can't cover.
- **The lockfile must stay stable.** CI and the deployment build both install
  with `--frozen-lockfile`. `package.json` pins `packageManager`, and
  `docker/Dockerfile` and `docker/Dockerfile.dev` pin the matching pnpm; change
  all three together or the deploy fails on a lockfile it didn't expect.
- **Documentation is validated.** The
  [Docs Check](docs/code-checks.md#the-docs-check) runs as part of
  `pnpm run build`, so a broken doc fails CI's `verify` job and blocks the
  deploy.

## Schema changes

CI doesn't apply the schema. It is a deliberate `push` run by hand
([ADR-0002](docs/adr/0002-schema-by-deliberate-push.md)), and
[docs/schema-changes.md](docs/schema-changes.md#push-the-schema) has the command.

- Push and merge in the order in
  [docs/schema-changes.md](docs/schema-changes.md#push-or-merge-first).
- A merged pull request doesn't mean its push happened. Confirm the push
  before ticking its box or starting the next schema change.
- Rehearse a push that touches existing rows (a rename, a dropped column, a new
  constraint) on the local database, then on a Neon branch of the
  [Deployment](GLOSSARY.md#delivery)
  ([docs/schema-changes.md](docs/schema-changes.md#rehearse-a-push-on-a-neon-branch)).
  Write what the push prompted, and what you answered, into
  `docs/schema-changes.md`.

## Secrets in instructions

Docs and runbooks that set a secret or a connection string read it into a
named shell variable first, then reference that variable:

```sh
read -rsp 'Direct DATABASE_URL: ' DIRECT_DATABASE_URL; echo
```

Never write a placeholder literal for someone to edit in place, and never
`export` the value. Each Neon string has its own name (`DIRECT_DATABASE_URL`,
`POOLED_DATABASE_URL`, `REHEARSAL_DATABASE_URL`), never a bare `DATABASE_URL`.

## Merge a pull request

The maintainer merges, since merging deploys. A pull request merges only when
it contains the latest `main`, and nothing checks it again after the merge,
so re-run an old pull request's checks before merging it
([docs/pipeline.md](docs/pipeline.md#github-actions)). When a pull request is part of a
plan, say in it which pull requests are ready and the order to merge them in,
and leave a status comment on the tracking issue: what is ready, what comes
next, and anything learned along the way.
