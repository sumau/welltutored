#!/usr/bin/env python3
# Splits the claims from step 2 into the subagents' claim files, so the model
# writes each claim once. Reads every .docs-review/work/claims/*.tsv, one claim
# per line: doc:line, file, subject, claim, separated by tabs. Writes one
# .docs-review/work/<n>.md per group, replacing any from an earlier run, and
# prints the counts. Run it from the repository root.
import sys
from collections import defaultdict
from pathlib import Path

WORK = Path(".docs-review/work")
MAX_CLAIMS = 25

claims, errors = [], []
for path in sorted((WORK / "claims").glob("*.tsv")):
    for number, line in enumerate(path.read_text().splitlines(), 1):
        if not line.strip() or line.startswith("#"):
            continue
        fields = [field.strip() for field in line.split("\t", 3)]
        if len(fields) < 4 or not all(fields) or ":" not in fields[0]:
            errors.append(f"{path}:{number}: expected doc:line, file, subject, claim")
            continue
        claims.append(dict(zip(("where", "file", "subject", "claim"), fields)))
if errors or not claims:
    sys.exit("\n".join(errors) or f"no claims in {WORK / 'claims'}/*.tsv")

# Group by file. A group of more than MAX_CLAIMS splits into parts, never
# between two claims with the same subject: claims that could contradict each
# other must reach the same subagent.
by_file = defaultdict(list)
for claim in claims:
    by_file[claim["file"]].append(claim)
groups = []
for file, file_claims in by_file.items():
    by_subject = defaultdict(list)
    for claim in file_claims:
        by_subject[claim["subject"]].append(claim)
    part = []
    for subject_claims in by_subject.values():
        if part and len(part) + len(subject_claims) > MAX_CLAIMS:
            groups.append((file, part))
            part = []
        part = part + subject_claims
    groups.append((file, part))

def line(claim):
    return f"- `{claim['where']}` ({claim['subject']}): {claim['claim']}"


for old in WORK.glob("[0-9]*.md"):
    old.unlink()
# A subject whose claims fall in more than one group gives each of those
# groups the others' claims, to compare against but not to verify.
for n, (file, part) in enumerate(groups):
    subjects = {claim["subject"] for claim in part}
    related = [
        claim
        for m, (_, other) in enumerate(groups)
        if m != n
        for claim in other
        if claim["subject"] in subjects
    ]
    text = [f"# Group {n + 1}", "", f"File: `{file}`", "", "## Claims", ""]
    text += [line(claim) for claim in part]
    if related:
        text += ["", "## Related claims (compare, don't verify)", ""]
        text += [line(claim) for claim in related]
    (WORK / f"{n + 1}.md").write_text("\n".join(text) + "\n")

docs = {claim["where"].rsplit(":", 1)[0] for claim in claims}
print(f"{len(claims)} claims from {len(docs)} docs in {len(groups)} groups: "
      f"{WORK}/1.md to {WORK}/{len(groups)}.md")
