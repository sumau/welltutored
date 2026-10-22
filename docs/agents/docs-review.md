# Docs Review

> Settings for the `/docs-review` skill in `.claude/skills/docs-review/`. The
> skill holds the method; this file holds what is particular to this repo.

## Docs in scope

- `README.md`, `CONTRIBUTING.md`, `GLOSSARY.md` and `CLAUDE.md`.
- Every `.md` file under `docs/`, except `docs/agents/` and `docs/adr/`. An ADR
  records a decision when it was made, so it is historical as a whole.

## Glossary

`GLOSSARY.md`. Each term is in bold, followed by its definition and an
`_Avoid_:` line listing the synonyms not to use.

## Gate

The [Docs Check](../code-checks.md#the-docs-check), `pnpm run docs:check`,
implemented in `scripts/src/docs-check.ts`. It does not read `CLAUDE.md`, so
nothing in that file is already proven.
