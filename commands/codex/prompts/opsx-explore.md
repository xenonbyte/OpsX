---
description: Investigate ideas, constraints, and tradeoffs before committing to a change.
---
# OpsX route: Explore

Use the `opsx` skill for this request.

Workflow action: `explore`
Primary workflow entry: `$opsx-* (explicit routes only)`
Explicit action route: `$opsx-explore`

Execution rules:
- Follow the `explore` playbook from the `opsx` skill and its referenced files.
- CLI quick checks: `opsx check`, `opsx doc`, and `opsx language <en|zh>`.
- Preflight before acting:
- Read `.opsx/config.yaml` if present to confirm schema, language, and workspace rules.
- Read `.opsx/active.yaml` if present to locate the active change pointer.
- When an active change exists, read `.opsx/changes/<active-change>/state.yaml` before acting.
- When an active change exists, read `.opsx/changes/<active-change>/context.md` before acting.
- When an active change exists, read current artifacts (`proposal.md`, `specs/`, `design.md`, optional `security-review.md`, and `tasks.md`) before mutating files.
- If required artifacts are missing, report that honestly and apply route-specific fallback guidance.
- Route fallback guidance:
- If `.opsx/config.yaml` is missing, explain the workspace status and direct the user to `$opsx-onboard`.
- If `.opsx/active.yaml` is missing, report it honestly and recommend the next explicit route.
- Use request details already present in the conversation.
- Do not assume text typed after a `$opsx-*` command is reliably available as an inline argument in Codex.
- Security-review states are `required`, `recommended`, `waived`, `completed`.
- If config or heuristics indicate a security-sensitive change, create or recommend `security-review.md` after `design` and before `tasks`; if the user waives it, record the waiver in artifacts.
- `spec checkpoint` runs after `design` and before `tasks`; `task checkpoint` runs after `tasks` and before `apply`.
- `execution checkpoint` runs after each top-level task group during `apply`.
- Checkpoint outcomes use `PASS`, `WARN`, `BLOCK` and update existing artifacts instead of creating new review files.
- If the required change name, description, or selection is missing, ask for the minimum clarification needed.
- Stay exploratory unless the user clearly asks to create or update artifacts.
- When files are mutated, report changed files, current state, next step, and blockers.
