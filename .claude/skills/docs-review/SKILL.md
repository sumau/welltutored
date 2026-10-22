---
name: docs-review
description: Read the docs against the code and report the statements the code no longer supports. It advises; the Docs Check is the gate.
disable-model-invocation: true
---

# Docs Review

Read every doc in scope as a list of **claims**, check each one against the code and the repository's settings, and report what is false, what is true only because of something no doc names, and what can't be checked. The review changes no file and blocks nothing.

**Low recall is worse than false positives.** A false statement the review misses stays invisible; one it reports by mistake costs the reader a minute. When unsure whether a claim holds, report it with the evidence on both sides.

The method is borrowed from [2389-research/documentation-audit](https://github.com/2389-research/documentation-audit), under the MIT licence in [LICENSE](LICENSE).

## Steps

### 1. Pin the inputs

- Read `docs/agents/docs-review.md`: the docs in scope, the glossary, and the gate. If it is missing, stop and say so.
- Record `git rev-parse --short HEAD`. If `git status --porcelain` prints anything, the review covers that commit plus the uncommitted changes, and the report says so.
- Read the glossary, and the gate's own description of what it verifies.

Done when you hold the list of doc paths, the commit, and what the gate verifies.

### 2. Check each doc

Dispatch one subagent per doc in scope, all in parallel. Give each the doc's path, the glossary's path, what the gate verifies, and **The per-doc brief** and **Repository settings** below, pasted in full: the subagent has no other access to them.

Done when every doc in scope has returned its list.

### 3. Expand from each false claim

A false claim usually has siblings. For each one, name its pattern (a renamed script, a changed default, a flag flipped, a check that now blocks) and `grep` every doc in scope for the same pattern. Verify each hit as the brief says.

Done when every false claim's pattern has been searched across every doc.

### 4. Find contradictions

Group the claims from all the lists by subject (a check, a setting, a command, an environment variable, a flow) and read each group side by side. Two docs that disagree are a Finding even when the code can't say which is right.

### 5. Confirm

Open the evidence for each Finding and Unstated item yourself: the cited `file:line` says what the item says it says. Drop an item only when its evidence is plainly wrong. A doubtful one stays, marked as doubtful.

### 6. Report

Write the report in the session, in the format under **The report**, then stop. The user chooses what to fix.

## The per-doc brief

> Read `<doc>` line by line and extract every **claim**: a statement about what the code, the configuration, the repository's settings or the running system does or is. Table rows, list items, a command with its stated effect, and each node and arrow of a Mermaid diagram are claims. A hedged claim ("for now", "not blocking yet", "usually") is still a claim: "hidden for now" is false once the thing is shown.
>
> Skip **historical** statements, which record what happened ("#55 did exactly that in rehearsal", a captured prompt with what was answered). They stay true when the code moves on. A sentence that uses the past to explain a current rule still states that rule, and the rule is a claim.
>
> The gate already proves what it verifies (a link resolves, a named file exists, a `pnpm` script exists), so skip that part; what the sentence says the file or script _does_ is still a claim.
>
> Verify each claim against the source and cite `file:line`. Read the code that does the thing; a matching name is not evidence. Give each claim a verdict:
>
> - **true**: the evidence supports it.
> - **false**: the evidence contradicts it. Say whether the doc or the code looks wrong, and suggest replacement text.
> - **unverifiable**: neither the repository nor the repository host's API can settle it. Say why.
>
> **Diagrams.** An arrow means what the diagram's legend says it means. If the legend says a solid arrow means "the next step waits for this", find what makes the next step wait, and a dotted arrow means nothing waits. With no legend, check only the nodes and labels.
>
> **Repository settings are code.** A claim about how the repository is set up (which checks a merge waits for, which secrets exist, whether Dependabot runs) is checked against the host's API, as **Repository settings** says.
>
> **Glossary.** Report a word from a glossary _Avoid_ list used for the concept that entry names, and a glossary term used for something other than its definition. An _Avoid_ word used for a different concept ("message" for a log line) is fine.
>
> **Unstated.** For each true claim, ask what makes it true. When it holds only because of something no doc in scope names (a setting, a file, a coupling such as a job name the host matches on), report it as Unstated: the claim, what it depends on with evidence, and where a sentence naming it could go. Report a dependency only behind a claim you checked; code and settings that no claim depends on are out of scope.
>
> Return every false and unverifiable claim and every Unstated item, each with the doc's `file:line` and the claim quoted, plus a count of the true claims. Report truth only: style, structure and length are out of scope.

## Repository settings

Read a setting only because a claim names it or depends on it. Settings are read with `gh api` on GitHub; if `gh auth status` fails, every settings claim is Unverifiable.

- **What a merge waits for.** Read both the rulesets in force, `repos/{owner}/{repo}/rules/branches/<default>`, and classic protection, `repos/{owner}/{repo}/branches/<default>/protection`; a check is required if either requires it. Classic protection answering 404 "Branch not protected" means there is none. A required check matches a workflow job by its `name:`, so compare the names.
- **Secrets.** `repos/{owner}/{repo}/actions/secrets` lists their names.
- **Dependabot.** `.github/dependabot.yml` configures version updates. Security updates are settings: `repos/{owner}/{repo}/vulnerability-alerts` (204 means on) and `repos/{owner}/{repo}/automated-security-fixes`.

Any other refused call (403, or a 404 GitHub also gives when the token can't see the setting) makes the claim Unverifiable, never false. Settings held by other services (hosting, database, auth) are Unverifiable unless a file in the repository holds them.

## The report

```markdown
# Docs Review of <short commit>[, with uncommitted changes]

<n> docs, <n> claims checked: <n> findings, <n> unstated, <n> unverifiable.

## Findings

### <doc path>

- **<doc>:<line>**: "<claim, quoted>"
  - Evidence: <code file:line>, and what it shows.
  - Looks wrong: the doc | the code | unclear.
  - Suggested: "<replacement text>"

### Contradictions

- **<doc>:<line>** says "<…>"; **<doc>:<line>** says "<…>". Evidence, if any.

## Unstated

- **<doc>:<line>**: "<claim, quoted>"
  - Depends on: <what>, with evidence.
  - Could go in: <doc, section>.

## Unverifiable

- **<doc>:<line>**: "<claim, quoted>". Why it can't be checked.
```

Findings are grouped by doc, in scope order. A section with nothing in it reads "None."
