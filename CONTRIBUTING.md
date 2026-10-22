# Contributing

How a change gets from an idea to production. [README.md](README.md) covers
what the project is and how to run it; this file covers how to change it.

## Merging to `main` ships to production

CI deploys to Fly on every push to `main` and then runs the launch smoke
against the live site. There is no separate release step, so a merged pull
request is a shipped one. Everything below follows from that.
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

## Making a change

Everything runs in containers; there is no host Node, pnpm or PostgreSQL. See
[docs/local-docker.md](docs/local-docker.md).

- Branch from an up-to-date `main`, one branch per pull request.
- Do not stack pull requests. GitHub does not always retarget a stacked pull
  request when its base merges, so it can land on a branch instead of `main`.
  Wait for the previous one to merge, then branch from `main` again.
- Use the terms in [GLOSSARY.md](GLOSSARY.md), and avoid the synonyms it lists.
  Record a decision a reader will question as an ADR in
  [docs/adr/](docs/adr/).
- After changing `lib/api-spec/openapi.yaml`, run
  `pnpm --filter @workspace/api-spec run codegen`. Never edit the generated
  code in `lib/api-client-react` or `lib/api-zod` by hand.

## Before opening a pull request

- `docker compose run --rm test` is green. It runs the same suite as CI
  ([docs/code-checks.md](docs/code-checks.md)).
- For a UI or build change, click through the running app as well
  (`docker compose up api web`).
- For a change to routing, public API responses, deployment configuration or
  the enquiry journey, also run the development smoke against the local stack
  ([docs/smoke-checks.md](docs/smoke-checks.md#against-the-local-stack)).
- After merging a change that touches auth, Clerk or the `@clerk/*` versions,
  sign in on `https://welltutored.co.uk` and open the
  [Workspace](GLOSSARY.md#the-private-area). The Sign-in Smoke uses the Clerk
  development instance, so this is the part CI can't cover.
- **The lockfile must stay stable.** CI and the deployment build both install
  with `--frozen-lockfile`. `package.json` pins `packageManager`, and
  `docker/Dockerfile.dev` pins the matching pnpm; change them together or the
  deploy fails on a lockfile it did not expect.
- **Documentation is validated.** `pnpm run docs:check` parses `README.md`,
  this file, `GLOSSARY.md`, everything under `docs/`, and the `run:` steps of
  `.github/workflows/*.yml`. It fails when a `pnpm` command names a script that
  does not exist, a local link or its `#anchor` does not resolve, a file named
  in backticks is not in the repository, or a doc does not open with a line
  saying who it is for. A short path such as `routes/workspace.ts` counts when some file's path
  ends with it. It also reads the code, skipping tests and generated code, and
  fails when the code reads an environment variable by name that
  [docs/configuration.md](docs/configuration.md) does not name, or when a code,
  config or workflow comment names a doc, or a doc's heading, that does not
  exist. It runs as part of `pnpm run build`, so a broken doc breaks the
  deployment build.

## Schema changes

CI does not apply the schema. It is a deliberate `push` run by hand
([ADR-0002](docs/adr/0002-schema-by-deliberate-push.md)), and
[docs/schema-changes.md](docs/schema-changes.md#pushing) has the command.

- Push to production **before** merging anything that expects the new schema.
- A merged pull request does not mean its push happened. Confirm the push
  before ticking its box or starting the next schema change.
- Rehearse a push that touches existing rows (a rename, a dropped column, a new
  constraint) on the local database, then on a Neon branch of the
  [Deployment](GLOSSARY.md#delivery)
  ([docs/schema-changes.md](docs/schema-changes.md#rehearsing-a-push-on-a-neon-branch)).
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

## Merging

The maintainer merges, since merging deploys. When a pull request is part of a
plan, say in it which pull requests are ready and the order to merge them in,
and leave a status comment on the tracking issue: what is ready, what comes
next, and anything learned along the way.
