---
description: Archive a completed change and sync specs if needed.
---
# OpsX route: Archive

Use the `opsx` skill for this request.

Workflow action: `archive`
Primary workflow entry: `$opsx-* (explicit routes only)`
Explicit action route: `$opsx-archive`

Execution rules:
- Follow the `archive` playbook from the `opsx` skill and its referenced files.
- CLI quick checks: `opsx check`, `opsx doc`, and `opsx language <en|zh>`.
- Preflight before acting:
- Read `.opsx/config.yaml` if present to confirm schema, language, and workspace rules.
- Read `.opsx/active.yaml` if present to locate the active change pointer.
- When an active change exists, read `.opsx/changes/<active-change>/state.yaml` before acting.
- When an active change exists, read `.opsx/changes/<active-change>/context.md` before acting.
- When an active change exists, read current artifacts (`proposal.md`, `specs/`, `design.md`, optional `security-review.md`, and `tasks.md`) before mutating files.
- If required artifacts are missing, report that honestly and apply route-specific fallback guidance.
- Route fallback guidance:
- If `.opsx/config.yaml` is missing, stop and redirect to `$opsx-onboard`.
- If `.opsx/active.yaml` is missing or points to a missing change, stop and ask the user to run `$opsx-new` or `$opsx-propose`.
- Archive only changes that pass verify and sync preconditions.
- If the change is only VERIFIED, run the same safe sync check before moving it.
- Move the full change directory into `.opsx/archive/<change-name>/` after PASS gate acceptance.
- Use request details already present in the conversation.
- Do not assume text typed after a `$opsx-*` command is reliably available as an inline argument in Codex.
- Security-review states are `required`, `recommended`, `waived`, `completed`.
- If config or heuristics indicate a security-sensitive change, create or recommend `security-review.md` after `design` and before `tasks`; if the user waives it, record the waiver in artifacts.
- Archive routes must require verify/sync preconditions; if a change is `VERIFIED`, run the same safe sync check before moving it into `.opsx/archive/<change-name>/`.
- Archive execution re-runs verify/sync safety, performs internal safe sync from `VERIFIED`, and archives the full change directory at `.opsx/archive/<change-name>/.`
- Checkpoint outcomes use `PASS`, `WARN`, `BLOCK` and update existing artifacts instead of creating new review files.
- If the required change name, description, or selection is missing, ask for the minimum clarification needed.
- Archive only changes that pass verify and sync preconditions, and if a change is only VERIFIED, run the same safe sync check before moving it.
- When files are mutated, report changed files, current state, next step, and blockers.
