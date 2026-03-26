---
description: Create a change and generate planning artifacts in one step.
---
# OpenSpec route: Propose

Use the `openspec` skill for this request.

Workflow action: `propose`
Profile availability: `core, expanded`
Primary workflow entry: `/openspec <request>`
Explicit action route: `/opsx:propose`

Execution rules:
- Follow the `propose` playbook from the `openspec` skill and its referenced files.
- Read `openspec/config.yaml` if present, then `~/.openspec/.opsx-config.yaml`.
- Use request details already present in the conversation.
- Use inline arguments when available, but confirm ambiguous names or descriptions before mutating files.
- Security-review states are `required`, `recommended`, `waived`, `completed`.
- If config or heuristics indicate a security-sensitive change, create or recommend `security-review.md` after `design` and before `tasks`; if the user waives it, record the waiver in artifacts.
- `spec checkpoint` runs after `design` and before `tasks`; `task checkpoint` runs after `tasks` and before `apply`.
- `execution checkpoint` runs after each top-level task group during `apply`.
- Checkpoint outcomes use `PASS`, `WARN`, `BLOCK` and update existing artifacts instead of creating new review files.
- If the required change name, description, or selection is missing, ask for the minimum clarification needed.
- Keep planning-phase edits inside `openspec/changes/<name>/` unless the user explicitly asks to move into implementation.
- When files are mutated, report changed files, current state, next step, and blockers.

