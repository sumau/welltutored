# CLAUDE.md

## Read this first

[README.md](README.md) covers the project: stack, commands, layout, deployment
and architecture decisions. [CONTRIBUTING.md](CONTRIBUTING.md) covers how a
change is made, checked, merged and shipped, and it applies to Claude as much
as to anyone. Read both before making changes.

Keep it that way. Facts about the project go in those two files, not here. This
file covers only what differs when working through Claude Code.

## Running things here

Everything runs in containers — there is no host Node, pnpm, or PostgreSQL.
[docs/local-docker.md](docs/local-docker.md) has the full workflow; the short
version:

```
docker compose up api web          # http://localhost:5173
docker compose run --rm migrate    # apply schema changes
docker compose run --rm test       # full CI suite
```

So the `pnpm` commands in `README.md` are correct but need a prefix: `docker
compose exec api <command>` against a running service, or `docker compose run
--rm --entrypoint bash api -lc '<command>'` for a one-off.

## Never merge

Do not run `gh pr merge`: merging to `main` deploys to production, and the user
merges. Open the pull request, and when it is ready, say so.

## This file is not validated

`pnpm run docs:check` checks `README.md`, `CONTRIBUTING.md` and `docs/`, but
not this file. Claims here are unverified, so keep them few.

## Agent skills

### Issue tracker

Issues live as GitHub issues in `sumau/welltutored`, driven by the `gh` CLI.
See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles, each label string equal to its role name.
See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` and `docs/adr/` at the repo root.
See `docs/agents/domain.md`.
