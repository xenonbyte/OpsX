---
description: OpsX workflow command index for Claude
---
# OpsX Workflow

Use the `opsx` skill for this request.

Platform: Claude
Primary workflow entry: `/opsx-<action>`

Available routes:
- `/opsx-propose` - Create a change and generate planning artifacts in one step.
- `/opsx-explore` - Investigate ideas, constraints, and tradeoffs before committing to a change.
- `/opsx-apply` - Implement tasks from a change and update task state.
- `/opsx-archive` - Archive a completed change and sync specs if needed.
- `/opsx-new` - Create an empty change container and metadata.
- `/opsx-continue` - Create the next ready artifact based on dependencies.
- `/opsx-ff` - Generate all planning artifacts in dependency order.
- `/opsx-verify` - Check completeness, correctness, and coherence against artifacts.
- `/opsx-sync` - Merge delta specs from a change into the main spec set.
- `/opsx-bulk-archive` - Archive multiple completed changes together.
- `/opsx-batch-apply` - Apply multiple ready changes in a controlled sequence.
- `/opsx-resume` - Restore context around active changes and recommend the next move.
- `/opsx-status` - Show change progress, readiness, and blockers.
- `/opsx-onboard` - Walk a user through the minimum OpsX workflow path.

Notes:
- CLI quick checks: `opsx check`, `opsx doc`, and `opsx language <en|zh>`.
- `Inline command arguments are acceptable, but the workflow should still confirm missing or ambiguous details.`
- Preflight before acting:
- Read `.opsx/config.yaml` if present to confirm schema, language, and workspace rules.
- Read `.opsx/active.yaml` if present to locate the active change pointer.
- When an active change exists, read `.opsx/changes/<active-change>/state.yaml` before acting.
- When an active change exists, read `.opsx/changes/<active-change>/context.md` before acting.
- When an active change exists, read current artifacts (`proposal.md`, `specs/`, `design.md`, optional `security-review.md`, and `tasks.md`) before mutating files.
- If workspace files are missing, report missing paths and recommend the next explicit route instead of inventing state.
- Security-review states: `required`, `recommended`, `waived`, `completed`
- Checkpoints: `spec-split-checkpoint` before `design`, `spec checkpoint` before `tasks`, `task checkpoint` before `apply`, `execution checkpoint` after each top-level task group, and `implementation-consistency-checkpoint` before verify acceptance.
- Checkpoint outcomes: `PASS`, `WARN`, `BLOCK`
- Keep workflow semantics shared across Claude, Codex, and Gemini.
