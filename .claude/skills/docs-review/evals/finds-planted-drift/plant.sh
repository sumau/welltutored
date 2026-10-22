#!/usr/bin/env bash
# Plants known drift in a clone of this repo, at its root, then commits it so
# the review audits a clean tree. Removes this evals folder from the clone, so
# the review can't read the answers.
set -eu

plant() { # file, old text, new text
  python3 - "$@" <<'PY'
import sys
path, old, new = sys.argv[1:]
text = open(path).read()
if text.count(old) != 1:
    sys.exit(f"{path}: expected one match for {old!r}")
open(path, "w").write(text.replace(old, new))
PY
}

# Prose: fly.toml runs the check every 15s.
plant docs/pipeline.md "Fly runs it every 15
seconds" "Fly runs it every 60
seconds"

# Diagram: the Sign-in Smoke blocks nothing, so no solid arrow into merge.
plant docs/pipeline.md '    image --> merge' '    image --> merge
    signIn --> merge'

# Glossary: "dashboard" is on the Workspace's Avoid list.
plant docs/architecture.md "publish them in the
Workspace." "publish them in the
dashboard."

# Contradiction: docs/pipeline.md says the manual sign-in comes after merging.
plant CONTRIBUTING.md "- After merging a change that touches auth" "- Before merging a change that touches auth"

# Hedged claims: both "for now" sentences become false.
plant artifacts/welltutored/src/lib/features.ts "PUBLIC_RESOURCES_ENABLED: boolean = false" "PUBLIC_RESOURCES_ENABLED: boolean = true"

# Unstated: drop the sentence naming fly.toml's check path.
plant docs/pipeline.md "\`fly.toml\` points Fly's health check at \`/api/healthz\`, the Health Check. It
answers" "The Health Check
answers"

rm -rf .claude/skills/docs-review/evals
git add -A
git commit -qm "Update docs"
