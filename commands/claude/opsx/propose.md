---
description: Create a change and generate planning artifacts in one step.
---
# OpsX route: Propose

Use the `opsx` skill for this request.

Workflow action: `propose`
Primary workflow entry: `/opsx-<action>`
Explicit action route: `/opsx-propose`

Execution rules:
- Follow the `propose` playbook from the `opsx` skill and its referenced files.
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
- Load current state and artifacts before planning mutations.
- Update stored artifact hashes only after accepted checkpoint/state writes.
- Use request details already present in the conversation.
- Use inline arguments when available, but confirm ambiguous names or descriptions before mutating files.
- Security-review states are `required`, `recommended`, `waived`, `completed`.
- If config or heuristics indicate a security-sensitive change, create or recommend `security-review.md` after `design` and before `tasks`; if the user waives it, record the waiver in artifacts.
- `spec-split-checkpoint` runs after `specs` and before `design`; `spec checkpoint` runs after `design` and before `tasks`; `task checkpoint` runs after `tasks` and before `apply`, applies `rules.tdd.mode`, requires `RED` and `VERIFY` for `behavior-change` and `bugfix` groups, and accepts visible `TDD Exemption:` reasons for exempt work.
- `execution checkpoint` runs after each top-level task group during `apply`.
- Checkpoint outcomes use `PASS`, `WARN`, `BLOCK` and update existing artifacts instead of creating new review files.
- If the required change name, description, or selection is missing, ask for the minimum clarification needed.
- Keep planning-phase edits inside the active change workspace unless the user explicitly asks to move into implementation.
- When files are mutated, report changed files, current state, next step, and blockers.
