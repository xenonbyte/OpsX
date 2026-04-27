---
description: OpsX internal Codex route catalog generated from shared workflow metadata.
---
# OpsX Routes (Codex Internal Catalog)

Use the `opsx` skill for this request.

This file is an internal generated route catalog. Public Codex workflow routing uses explicit `$opsx-*` commands only.

Available routes:
- `$opsx-propose` - Create a change and generate planning artifacts in one step.
- `$opsx-explore` - Investigate ideas, constraints, and tradeoffs before committing to a change.
- `$opsx-apply` - Implement tasks from a change and update task state.
- `$opsx-archive` - Archive a completed change and sync specs if needed.
- `$opsx-new` - Create an empty change container and metadata.
- `$opsx-continue` - Create the next ready artifact based on dependencies.
- `$opsx-ff` - Generate all planning artifacts in dependency order.
- `$opsx-verify` - Check completeness, correctness, and coherence against artifacts.
- `$opsx-sync` - Merge delta specs from a change into the main spec set.
- `$opsx-bulk-archive` - Archive multiple completed changes together.
- `$opsx-batch-apply` - Apply multiple ready changes in a controlled sequence.
- `$opsx-resume` - Restore context around active changes and recommend the next move.
- `$opsx-status` - Show change progress, readiness, and blockers.
- `$opsx-onboard` - Walk a user through the minimum OpsX workflow path.

Important:
- Strict preflight before acting:
- Read `.opsx/config.yaml` if present to confirm schema, language, and workspace rules.
- Read `.opsx/active.yaml` if present to locate the active change pointer.
- When an active change exists, read `.opsx/changes/<active-change>/state.yaml` before acting.
- When an active change exists, read `.opsx/changes/<active-change>/context.md` before acting.
- When an active change exists, read current artifacts (`proposal.md`, `specs/`, `design.md`, optional `security-review.md`, and `tasks.md`) before mutating files.
- Treat `$opsx-*` as action selectors in Codex.
- If details are still needed after command selection, provide them in the next message.
- If required artifacts are missing, report missing files and redirect to the next explicit route instead of fabricating state.
- CLI quick checks: `opsx check`, `opsx doc`, `opsx language <en|zh>`.
- Security-review states: `required`, `recommended`, `waived`, `completed`
- Checkpoints: `spec checkpoint` before `tasks`, `task checkpoint` before `apply`, and `execution checkpoint` after each top-level task group.
