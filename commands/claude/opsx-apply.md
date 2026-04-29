---
description: Implement tasks from a change and update task state.
---
# OpsX route: Apply

Use OpsX workflow guidance for this request. The installed shared contract is available at `~/.opsx/skills/opsx/SKILL.md` when present.

Workflow action: `apply`
Primary workflow entry: `/opsx-<action>`
Explicit action route: `/opsx-apply`

Execution rules:
- Follow the `apply` playbook from shared OpsX guidance and its referenced files.
- CLI quick checks: `opsx check`, `opsx doc`, and `opsx language <en|zh>`.
- Preflight before acting:
- Read `.opsx/config.yaml` if present to confirm schema, language, and workspace rules.
- Read `.opsx/active.yaml` if present to locate the active change pointer.
- When an active change exists, read `.opsx/changes/<active-change>/state.yaml` before acting.
- When an active change exists, read `.opsx/changes/<active-change>/context.md` before acting.
- When an active change exists, read current artifacts (`proposal.md`, `specs/`, `design.md`, optional `security-review.md`, and `tasks.md`) before mutating files.
- If required artifacts are missing, report that honestly and apply route-specific fallback guidance.
- Route fallback guidance:
- If `.opsx/config.yaml` is missing, stop and redirect to `/opsx-onboard`.
- If `.opsx/active.yaml` is missing or points to a missing change, stop and ask the user to run `/opsx-new` or `/opsx-propose`.
- Execute exactly one top-level task group by default.
- After that group, record one execution checkpoint, refresh `context.md` / `drift.md`, and stop for the next run.
- Update stored artifact hashes only after accepted checkpoint/state writes.
- Use request details already present in the conversation.
- Use inline arguments when available, but confirm ambiguous names or descriptions before mutating files.
- Security-review states are `required`, `recommended`, `waived`, `completed`.
- If config or heuristics indicate a security-sensitive change, create or recommend `security-review.md` after `design` and before `tasks`; if the user waives it, record the waiver in artifacts.
- `spec checkpoint` runs after `design` and before `tasks`; `task checkpoint` runs after `tasks` and before `apply`, applies `rules.tdd.mode`, requires `RED` and `VERIFY` for `behavior-change` and `bugfix` groups, and accepts visible `TDD Exemption:` reasons for exempt work.
- `execution checkpoint` runs after each top-level task group during `apply` and records completed TDD steps, verification command/result, diff summary, and drift status.
- Checkpoint outcomes use `PASS`, `WARN`, `BLOCK` and update existing artifacts instead of creating new review files.
- If the required change name, description, or selection is missing, ask for the minimum clarification needed.
- Read the relevant change artifacts before modifying product code.
- When files are mutated, report changed files, current state, next step, and blockers.
