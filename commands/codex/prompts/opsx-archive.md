---
description: Archive a completed change and sync specs if needed.
---
# OpenSpec route: Archive

Use the `openspec` skill for this request.

Workflow action: `archive`
Profile availability: `core, expanded`
Primary workflow entry: `$openspec <request>`
Explicit action route: `/prompts:opsx-archive`

Execution rules:
- Follow the `archive` playbook from the `openspec` skill and its referenced files.
- Read `openspec/config.yaml` if present, then `~/.openspec/.opsx-config.yaml`.
- Use request details already present in the conversation.
- Do not assume text typed after a `/prompts:` command is reliably available as an inline argument in Codex.
- Security-review states are `required`, `recommended`, `waived`, `completed`.
- If config or heuristics indicate a security-sensitive change, create or recommend `security-review.md` after `design` and before `tasks`; if the user waives it, record the waiver in artifacts.
- `spec checkpoint` runs after `design` and before `tasks`; `task checkpoint` runs after `tasks` and before `apply`.
- `execution checkpoint` runs after each top-level task group during `apply`.
- Checkpoint outcomes use `PASS`, `WARN`, `BLOCK` and update existing artifacts instead of creating new review files.
- If the required change name, description, or selection is missing, ask for the minimum clarification needed.
- Archive only completed or explicitly user-approved incomplete changes.
- When files are mutated, report changed files, current state, next step, and blockers.

