---
description: OpenSpec workflow overview shared across supported tools.
---
# OpenSpec

OpenSpec is a schema-driven workflow system distributed as a skill-first experience.

Artifacts in `spec-driven`:
- `proposal` -> proposal.md
- `specs` -> specs/<capability>/spec.md
- `design` -> design.md
- `security-review` -> security-review.md
- `tasks` -> tasks.md

Checkpoints in `spec-driven`:
- `spec-checkpoint` -> after design before tasks
- `task-checkpoint` -> after tasks before apply
- `execution-checkpoint` -> after-each-top-level-task-group

Available commands:
- `/opsx:propose` - Create a change and generate planning artifacts in one step.
- `/opsx:explore` - Investigate ideas, constraints, and tradeoffs before committing to a change.
- `/opsx:apply` - Implement tasks from a change and update task state.
- `/opsx:archive` - Archive a completed change and sync specs if needed.
- `/opsx:new` - Create an empty change container and metadata.
- `/opsx:continue` - Create the next ready artifact based on dependencies.
- `/opsx:ff` - Generate all planning artifacts in dependency order.
- `/opsx:verify` - Check completeness, correctness, and coherence against artifacts.
- `/opsx:sync` - Merge delta specs from a change into the main spec set.
- `/opsx:bulk-archive` - Archive multiple completed changes together.
- `/opsx:batch-apply` - Apply multiple ready changes in a controlled sequence.
- `/opsx:resume` - Restore context around active changes and recommend the next move.
- `/opsx:status` - Show change progress, readiness, and blockers.
- `/opsx:onboard` - Walk a user through the minimum OpenSpec workflow path.

Codex guidance:
- Prefer `$openspec <request>` for natural-language requests.
- Use `/prompts:openspec` or `/prompts:opsx-*` for explicit routing.

Security review guidance:
- Use `security-review.md` after `design` and before `tasks` for security-sensitive changes.
- Explicit markers force the review; heuristic matches recommend it and allow waiver with recorded reasoning.
- Review states: `required`, `recommended`, `waived`, `completed`
- Checkpoint states: `PASS`, `WARN`, `BLOCK`
