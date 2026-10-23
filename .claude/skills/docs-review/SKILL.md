---
name: docs-review
description: Read the docs you name against the code and report the statements the code no longer supports. It advises; the Docs Check is the gate.
disable-model-invocation: true
argument-hint: "<doc>… | all"
---

# Docs Review

Read the docs as a list of **claims**, check each claim against the code, and report what is false and what can't be checked. The review changes no tracked file and blocks nothing; it only saves its report.

**Low recall is worse than false positives.** A false statement the review misses stays invisible; one it reports by mistake costs the reader a minute. When unsure whether a claim holds, report it with the evidence on both sides.

The method is borrowed from [2389-research/documentation-audit](https://github.com/2389-research/documentation-audit), under the MIT licence in [LICENSE](LICENSE).

## Steps

When each of steps 1 to 3 is done, print one line saying so and what it produced, such as `Step 2 of 4 done: 241 claims from 6 docs.` In step 3, also print a line as each subagent returns, such as `Verified 3 of 11 groups.` The user is waiting with no other sign of progress.

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
- its **subject** in two or three words ("manual sign-in"), the same words for every claim about the same thing, whatever its file.

Done when every line of every chosen doc has been read and each claim has its file and subject.

### 3. Verify, one subagent per file

Group the claims by file. Each group, from whichever docs, goes to one subagent, so each file is read once. Split a group of more than about 25 claims into parts; each part still reads its file. The claims with file `none` form their own group, split the same way, but never between two claims with the same subject: claims that could contradict each other must reach the same subagent. When a subject's claims fall in more than one group, give each of those groups the other groups' claims with that subject as **related claims**, to compare against but not to verify.

Write the subagents' inputs to files in `.docs-review/work/`, replacing any from an earlier run, so each brief stays one line:

- `.docs-review/work/brief.md`: **The verification brief** below, in full, then what the gate verifies;
- one `.docs-review/work/<n>.md` per group or part: its file, its claims, and any related claims.

Then dispatch every subagent in a single message, so they run in parallel, each with `model: sonnet`: verifying is most of the cost, so it runs on Sonnet, while extracting and reporting stay on the session's model. Each prompt is only: "Follow `.docs-review/work/brief.md` for the claims in `.docs-review/work/<n>.md`." Don't send one subagent and wait before writing the next.

Done when every group has returned its verdicts.

### 4. Report

Merge the verdicts into items. One item is one fix: claims that a single edit corrects, or that contradict each other, go in the same item, from whichever docs. Put each item in the first tier that fits:

1. **Leads to a wrong action**: someone following the doc would do the wrong thing, or rely on a check that isn't there.
2. **Wrong fact**: false, but acting on it does no harm.
3. **Imprecise**: true in part; an added condition or a narrower word fixes it.
4. **Needs a decision**: the code may be what's wrong, or the evidence can't say which side is right.

The tier is a judgement to help the reader triage. Never drop an item because of its tier.

Write the report in the format under **The report**. Save it to `.docs-review/<commit>.md` at the repository root (`<commit>-2.md` and so on if that exists), which git ignores. Then show only the first line of the report, the summary line, the checklist and the saved path, and stop: printing the full report again costs as much as writing it. The user chooses what to fix.

## What is a claim

A statement about what the code, the configuration or the running system does or is. Table rows, list items, a command with its stated effect, and each node and arrow of a Mermaid diagram are claims. A hedged claim ("for now", "not blocking yet", "usually") is still a claim: "hidden for now" is false once the thing is shown. A rule or instruction for the reader (what to run, when, in which order) is a claim too: the code or another doc can contradict it.

- **Diagrams.** An arrow means what the diagram's legend says it means; with no legend, only the nodes and labels are claims.
- **Historical** statements record what happened ("#55 did exactly that in rehearsal", a captured prompt with what was answered). They stay true when the code moves on, so they are not claims. A sentence that uses the past to explain a current rule still states that rule, and the rule is a claim.
- **The gate** already proves what it verifies (a link resolves, a named file exists, a `pnpm` script exists). What the sentence says the file or script _does_ is still a claim.

## The verification brief

> Verify each claim in your claims file. Use only Read, Grep and Glob: Bash may be refused, and nothing here needs it. The named file may be only the end of a path (`src/lib/features.ts`): read the file whose path ends with it, which the Docs Check guarantees exists. Read it first and cite `file:line`; search the codebase only for what the file can't settle, or for a claim with no file. Read the code that does the thing: a matching name is not evidence.
>
> Give each claim a verdict:
>
> - **true**: the evidence supports it.
> - **false**: the evidence contradicts it. Say whether the doc or the code looks wrong, and suggest replacement text.
> - **unverifiable**: nothing in the repository settles it. Say why. A claim about how the repository host or another service is set up (which checks a merge waits for, which secrets exist, whether Dependabot runs) is unverifiable unless a file in the repository holds the setting. Make no API calls.
>
> **Diagrams.** If the legend says a solid arrow means "the next step waits for this", find what makes the next step wait; a dotted arrow means nothing waits. A file showing that a step can't fail (`continue-on-error: true`, say) settles a solid arrow out of that step as false.
>
> **Contradictions.** Two claims in your list that disagree are a finding even when the code can't say which is right, and so is a claim that disagrees with a related claim. Quote both.
>
> Return every false claim, every contradiction and every unverifiable claim, each with the doc's `file:line` and the claim quoted, plus a count of the true claims.

## The report

```markdown
# Docs Review of <short commit>[, with uncommitted changes]

<n> docs, <n> claims checked: <n> findings (<n> lead to a wrong action, <n> wrong facts, <n> imprecise, <n> need a decision), <n> unverifiable.

## Checklist

**1. Leads to a wrong action**
- [ ] 1.1 <what is wrong, in one line>

**2. Wrong fact**
- [ ] 2.1 <…>

**3. Imprecise**
- [ ] 3.1 <…>

**4. Needs a decision**
- [ ] 4.1 <…>

## 1. Leads to a wrong action

### 1.1 <the same line as in the checklist>

- **<doc>:<line>**: "<claim, quoted>"
- **<doc>:<line>**: "<another claim in the same item>"
- Evidence: <code file:line>, or for docs that contradict each other, the other doc's file:line; and what it shows.
- Looks wrong: <which doc> | the code | unclear.
- Suggested: "<replacement text>"

## 2. Wrong fact

<as in section 1>

## 3. Imprecise

- **3.1 <doc>:<line>**: "<claim, quoted>". <The evidence, in a sentence.> Suggested: "<replacement text>".

## 4. Needs a decision

### 4.1 <the same line as in the checklist>

<the claims and the evidence, as in section 1>
- Decide: <the question, and what to change for each answer>.

## Unverifiable

<reason, such as "GitHub settings" or "needs a test run">:
- <doc>:<line>: <the claim, in a few words>
```

The checklist and the sections share one numbering, restarting in each tier. A tier with nothing in it reads "None." Write nothing outside this format, such as a summary of the biggest items: section 1 does that job. Report truth only: what no doc mentions, style, structure and length are out of scope.
