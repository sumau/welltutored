---
name: docs-review
description: Read the docs you name against the code and report the statements the code no longer supports. It advises; the Docs Check is the gate.
disable-model-invocation: true
model: sonnet
argument-hint: "<doc>… | all"
---

# Docs Review

Read the docs as a list of **claims**, check each claim against the code, and report what is false and what can't be checked. The review changes no file and blocks nothing.

**Low recall is worse than false positives.** A false statement the review misses stays invisible; one it reports by mistake costs the reader a minute. When unsure whether a claim holds, report it with the evidence on both sides.

The method is borrowed from [2389-research/documentation-audit](https://github.com/2389-research/documentation-audit), under the MIT licence in [LICENSE](LICENSE).

## Steps

### 1. Pin the inputs

- Read `docs/agents/docs-review.md`: the docs in scope and the gate. If it is missing, stop and say so.
- Choose the docs from the argument: the paths named, or every doc in scope for `all`. With no argument, ask which and wait. A named doc outside the scope is still reviewed.
- Record `git rev-parse --short HEAD`. If `git status --porcelain` prints anything, the review covers that commit plus the uncommitted changes, and the report says so.
- Read the gate's own description of what it verifies.

Done when you hold the doc paths, the commit, and what the gate verifies.

### 2. Extract the claims

Read each doc line by line and list every claim, opening no code. Follow **What is a claim** below. Give each claim:

- the doc's `file:line` and the claim, quoted;
- the **file** it is about: a path the sentence or its section names in backticks, or `none` when it names no file. A claim about several files goes under the one that would prove it;
- for a claim with file `none`, its **subject** in two or three words ("manual sign-in"), the same words for every claim about the same thing.

Done when every line of every chosen doc has been read and each claim has its file.

### 3. Verify, one subagent per file

Group the claims by file. Each group, from whichever docs, goes to one subagent, so each file is read once. Split a group of more than about 25 claims into parts; each part still reads its file. The claims with file `none` form their own group, split the same way, but never between two claims with the same subject: claims that could contradict each other must reach the same subagent.

Dispatch every subagent in one message so they run in parallel. Give each the file, its claims, what the gate verifies, and **The verification brief** below, pasted in full: the subagent has no other access to it.

Done when every group has returned its verdicts.

### 4. Report

Write the report in the session, in the format under **The report**, then stop. The user chooses what to fix.

## What is a claim

A statement about what the code, the configuration or the running system does or is. Table rows, list items, a command with its stated effect, and each node and arrow of a Mermaid diagram are claims. A hedged claim ("for now", "not blocking yet", "usually") is still a claim: "hidden for now" is false once the thing is shown.

- **Diagrams.** An arrow means what the diagram's legend says it means; with no legend, only the nodes and labels are claims.
- **Historical** statements record what happened ("#55 did exactly that in rehearsal", a captured prompt with what was answered). They stay true when the code moves on, so they are not claims. A sentence that uses the past to explain a current rule still states that rule, and the rule is a claim.
- **The gate** already proves what it verifies (a link resolves, a named file exists, a `pnpm` script exists). What the sentence says the file or script _does_ is still a claim.

## The verification brief

> Verify each claim below. The named file may be only the end of a path (`src/lib/features.ts`): read the file whose path ends with it, which the Docs Check guarantees exists. Read it first and cite `file:line`; search the codebase only for what the file can't settle, or for a claim with no file. Read the code that does the thing: a matching name is not evidence.
>
> Give each claim a verdict:
>
> - **true**: the evidence supports it.
> - **false**: the evidence contradicts it. Say whether the doc or the code looks wrong, and suggest replacement text.
> - **unverifiable**: nothing in the repository settles it. Say why. A claim about how the repository host or another service is set up (which checks a merge waits for, which secrets exist, whether Dependabot runs) is unverifiable unless a file in the repository holds the setting. Make no API calls.
>
> **Diagrams.** If the legend says a solid arrow means "the next step waits for this", find what makes the next step wait; a dotted arrow means nothing waits. A file showing that a step can't fail (`continue-on-error: true`, say) settles a solid arrow out of that step as false.
>
> **Contradictions.** Two claims in your list that disagree are a finding even when the code can't say which is right. Quote both.
>
> Return every false claim, every contradiction and every unverifiable claim, each with the doc's `file:line` and the claim quoted, plus a count of the true claims.

## The report

```markdown
# Docs Review of <short commit>[, with uncommitted changes]

<n> docs, <n> claims checked: <n> findings, <n> unverifiable.

## Findings

### <doc path>

- **<doc>:<line>**: "<claim, quoted>"
  - Evidence: <code file:line>, and what it shows.
  - Looks wrong: the doc | the code | unclear.
  - Suggested: "<replacement text>"

### Contradictions

- **<doc>:<line>** says "<…>"; **<doc>:<line>** says "<…>". Evidence, if any.

## Unverifiable

- **<doc>:<line>**: "<claim, quoted>". Why it can't be checked.
```

Findings are grouped by doc, in the order the docs were chosen. A section with nothing in it reads "None." Report truth only: what no doc mentions, style, structure and length are out of scope.
