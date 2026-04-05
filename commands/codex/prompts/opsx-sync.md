---
description: Merge delta specs from a change into the main spec set.
---
# OpenSpec route: Sync

Use the `openspec` skill for this request.

Workflow action: `sync`
Primary workflow entry: `$openspec <request>`
Explicit action route: `/prompts:opsx-sync`

Execution rules:
- Follow the `sync` playbook from the `openspec` skill and its referenced files.
- Read `openspec/config.yaml` if present, then `~/.openspec/.opsx-config.yaml`.
- Use request details already present in the conversation.
- Do not assume text typed after a `/prompts:` command is reliably available as an inline argument in Codex.
- Security-review states are `required`, `recommended`, `waived`, `completed`.
- If config or heuristics indicate a security-sensitive change, create or recommend `security-review.md` after `design` and before `tasks`; if the user waives it, record the waiver in artifacts.
- `spec checkpoint` runs after `design` and before `tasks`; `task checkpoint` runs after `tasks` and before `apply`.
- `execution checkpoint` runs after each top-level task group during `apply`.
- Checkpoint outcomes use `PASS`, `WARN`, `BLOCK` and update existing artifacts instead of creating new review files.
- If the required change name, description, or selection is missing, ask for the minimum clarification needed.
- Merge only the requested delta specs and report conflicts explicitly.
- When files are mutated, report changed files, current state, next step, and blockers.

