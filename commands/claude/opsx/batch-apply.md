---
description: Apply multiple ready changes in a controlled sequence.
---
# OpsX route: Batch apply

Use the `opsx` skill for this request.

Workflow action: `batch-apply`
Primary workflow entry: `/opsx-<action>`
Explicit action route: `/opsx-batch-apply`

Execution rules:
- Follow the `batch-apply` playbook from the `opsx` skill and its referenced files.
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
- Evaluate global preconditions first and stop immediately when they fail with BLOCK.
- Run each target change in per-change isolation and report applied/skipped/blocked results with reasons.
- Use request details already present in the conversation.
- Use inline arguments when available, but confirm ambiguous names or descriptions before mutating files.
- Security-review states are `required`, `recommended`, `waived`, `completed`.
- If config or heuristics indicate a security-sensitive change, create or recommend `security-review.md` after `design` and before `tasks`; if the user waives it, record the waiver in artifacts.
- Batch routes must run global preconditions first, then process each change in per-change isolation and report applied/archived, skipped, and blocked counts.
- Batch execution keeps per-change isolation, continues through per-change failures, and reports skipped/blocked reasons plus aggregate counts.
- Checkpoint outcomes use `PASS`, `WARN`, `BLOCK` and update existing artifacts instead of creating new review files.
- If the required change name, description, or selection is missing, ask for the minimum clarification needed.
- Use per-change isolation, keep running after per-change failures, and report applied/skipped/blocked counts.
- When files are mutated, report changed files, current state, next step, and blockers.
