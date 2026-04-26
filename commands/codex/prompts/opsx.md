---
description: OpsX entrypoint for Codex. Prefer the opsx skill for natural-language workflow requests.
---
# OpsX

Use the `opsx` skill for this request.

Codex usage model:
- Preferred: `$opsx <request>`
- Explicit routing: `$opsx-*`

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
- Treat `$opsx-*` as action selectors in Codex.
- If details are still needed after command selection, provide them in the next message.
- CLI quick checks: `opsx check`, `opsx doc`, `opsx language <en|zh>`.
- Keep guidance phase-accurate: `.opsx/active.yaml`, per-change `state.yaml`, `spec-split-checkpoint`, and TDD-light checks are planned for later phases.
- Security-review states: `required`, `recommended`, `waived`, `completed`
- Checkpoints: `spec checkpoint` before `tasks`, `task checkpoint` before `apply`, and `execution checkpoint` after each top-level task group.
