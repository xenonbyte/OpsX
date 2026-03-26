---
description: Investigate ideas, constraints, and tradeoffs before committing to a change.
---
# OpenSpec route: Explore

Use the `openspec` skill for this request.

Workflow action: `explore`
Profile availability: `core, expanded`
Primary workflow entry: `/openspec <request>`
Explicit action route: `/opsx:explore`

Execution rules:
- Follow the `explore` playbook from the `openspec` skill and its referenced files.
- Read `openspec/config.yaml` if present, then `~/.openspec/.opsx-config.yaml`.
- Use request details already present in the conversation.
- Use inline arguments when available, but confirm ambiguous names or descriptions before mutating files.
- Security-review states are `required`, `recommended`, `waived`, `completed`.
- If config or heuristics indicate a security-sensitive change, create or recommend `security-review.md` after `design` and before `tasks`; if the user waives it, record the waiver in artifacts.
- `spec checkpoint` runs after `design` and before `tasks`; `task checkpoint` runs after `tasks` and before `apply`.
- `execution checkpoint` runs after each top-level task group during `apply`.
- Checkpoint outcomes use `PASS`, `WARN`, `BLOCK` and update existing artifacts instead of creating new review files.
- If the required change name, description, or selection is missing, ask for the minimum clarification needed.
- Stay exploratory unless the user clearly asks to create or update artifacts.
- When files are mutated, report changed files, current state, next step, and blockers.

