---
type: llm
focus: trace
weight: 1
---

The report puts a checklist before the findings, then the four tiers in order (leads to a wrong action, wrong fact, imprecise, needs a decision), each with items or "None.". Every item in the first two tiers gives a doc file:line, a code file:line (or, for a contradiction between docs, the other doc's file:line), which side looks wrong, and suggested text.
