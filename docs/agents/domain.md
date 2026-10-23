# Domain Docs

> Skill config for the mattpocock-skills plugin, written from the
> `/setup-matt-pocock-skills` template. No skill names this file; skills reach
> it through the Agent skills block in `CLAUDE.md`, and the ones that explore
> the codebase (`/grill-with-docs`, `/improve-codebase-architecture`,
> `/domain-modeling`, `/tdd`, `/diagnosing-bugs`, `/triage`, `/pr`) read
> `GLOSSARY.md` and `docs/adr/` as it describes. Before removing a section,
> grep the plugin's skills for what reads it. A setup re-run rewrites this
> file and drops this note, so check its draft for the note.

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`GLOSSARY.md`** at the repo root.
- **`docs/adr/`**: read ADRs that touch the area you're about to work in.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates them lazily when terms or decisions actually get resolved.

## File structure

This is a **single-context** repo: one glossary and one ADR directory at the root, shared by every workspace package.

```
/
├── GLOSSARY.md
├── docs/adr/
│   ├── 0001-....md
│   └── 0002-....md
├── backend/
├── frontend/
└── lib/                ← api-client-react
```

The packages are separate build units, not separate domains. They share one vocabulary, so they share one `GLOSSARY.md`, and there is no `GLOSSARY-MAP.md`.

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `GLOSSARY.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal: either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (event-sourced orders), but worth reopening because…_
