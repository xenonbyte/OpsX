---
description: Check completeness, correctness, and coherence against artifacts.
---
# OpsX route: Verify

Use the `opsx` skill for this request.

Workflow action: `verify`
Primary workflow entry: `/opsx-<action>`
Explicit action route: `/opsx-verify`

Execution rules:
- Follow the `verify` playbook from the `opsx` skill and its referenced files.
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
- Emit PASS/WARN/BLOCK findings with patch targets and a concrete next action before sync or archive.
- Use request details already present in the conversation.
- Use inline arguments when available, but confirm ambiguous names or descriptions before mutating files.
- Security-review states are `required`, `recommended`, `waived`, `completed`.
- If config or heuristics indicate a security-sensitive change, create or recommend `security-review.md` after `design` and before `tasks`; if the user waives it, record the waiver in artifacts.
- Verify routes must report `PASS`, `WARN`, and `BLOCK` findings with `patchTargets` and a concrete `nextStep` before archive eligibility.
- Verify execution records `PASS`/`WARN`/`BLOCK` findings and blocks downstream archive actions until unresolved `BLOCK` findings are patched.
- Checkpoint outcomes use `PASS`, `WARN`, `BLOCK` and update existing artifacts instead of creating new review files.
- If the required change name, description, or selection is missing, ask for the minimum clarification needed.
- Return PASS/WARN/BLOCK findings with patch targets and a concrete next action.
- When files are mutated, report changed files, current state, next step, and blockers.
