---
description: Implement tasks from a change and update task state.
---
# OpsX route: Apply

Use the `opsx` skill for this request.

Workflow action: `apply`
Primary workflow entry: `$opsx <request>`
Explicit action route: `$opsx-apply`

Execution rules:
- Follow the `apply` playbook from the `opsx` skill and its referenced files.
- CLI quick checks: `opsx check`, `opsx doc`, and `opsx language <en|zh>`.
- Keep guidance phase-accurate: `.opsx/active.yaml`, per-change `state.yaml`, `spec-split-checkpoint`, and TDD-light checks are planned for later phases.
- Use request details already present in the conversation.
- Do not assume text typed after a `$opsx-*` command is reliably available as an inline argument in Codex.
- Security-review states are `required`, `recommended`, `waived`, `completed`.
- If config or heuristics indicate a security-sensitive change, create or recommend `security-review.md` after `design` and before `tasks`; if the user waives it, record the waiver in artifacts.
- `spec checkpoint` runs after `design` and before `tasks`; `task checkpoint` runs after `tasks` and before `apply`.
- `execution checkpoint` runs after each top-level task group during `apply`.
- Checkpoint outcomes use `PASS`, `WARN`, `BLOCK` and update existing artifacts instead of creating new review files.
- If the required change name, description, or selection is missing, ask for the minimum clarification needed.
- Read the relevant change artifacts before modifying product code.
- When files are mutated, report changed files, current state, next step, and blockers.
