---
description: Show change progress, readiness, and blockers.
---
# OpsX route: Status

Use OpsX workflow guidance for this request. The installed shared contract is available at `~/.opsx/skills/opsx/SKILL.md` when present.

Workflow action: `status`
Primary workflow entry: `/opsx-<action>`
Explicit action route: `/opsx-status`

Execution rules:
- Follow the `status` playbook from shared OpsX guidance and its referenced files.
- CLI quick checks: `opsx check`, `opsx doc`, and `opsx language <en|zh>`.
- Preflight before acting:
- Read `.opsx/config.yaml` if present to confirm schema, language, and workspace rules.
- Read `.opsx/active.yaml` if present to locate the active change pointer.
- When an active change exists, read `.opsx/changes/<active-change>/state.yaml` before acting.
- When an active change exists, read `.opsx/changes/<active-change>/context.md` before acting.
- When an active change exists, read current artifacts (`proposal.md`, `specs/`, `design.md`, optional `security-review.md`, and `tasks.md`) before mutating files.
- If required artifacts are missing, report that honestly and apply route-specific fallback guidance.
- Route fallback guidance:
- Workspace not initialized: `.opsx/config.yaml` is missing.
- No active change is selected in `.opsx/active.yaml`.
- Do not auto-create `.opsx/active.yaml` or change state from `status`.
- Warn on artifact hash drift, reload from disk, and do not refresh stored hashes from read-only routes.
- Report whether the workspace exists, include drift warnings, and recommend the next concrete command.
- Use request details already present in the conversation.
- Use inline arguments when available, but confirm ambiguous names or descriptions before mutating files.
- Security-review states are `required`, `recommended`, `waived`, `completed`.
- If config or heuristics indicate a security-sensitive change, create or recommend `security-review.md` after `design` and before `tasks`; if the user waives it, record the waiver in artifacts.
- `spec checkpoint` runs after `design` and before `tasks`; `task checkpoint` runs after `tasks` and before `apply`.
- `execution checkpoint` runs after each top-level task group during `apply`.
- Checkpoint outcomes use `PASS`, `WARN`, `BLOCK` and update existing artifacts instead of creating new review files.
- If the required change name, description, or selection is missing, ask for the minimum clarification needed.
- Inspect artifacts and task state without changing unrelated files.
- When files are mutated, report changed files, current state, next step, and blockers.
