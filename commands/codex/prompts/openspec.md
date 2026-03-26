---
description: OpenSpec entrypoint for Codex. Prefer the openspec skill for natural-language workflow requests.
---
# OpenSpec

Use the `openspec` skill for this request.

Codex usage model:
- Preferred: `$openspec <request>`
- Explicit routing: `/prompts:openspec` and `/prompts:opsx-*`
- Active profile: `expanded`

Available routes:
- `/prompts:opsx-propose` - Create a change and generate planning artifacts in one step.
- `/prompts:opsx-explore` - Investigate ideas, constraints, and tradeoffs before committing to a change.
- `/prompts:opsx-apply` - Implement tasks from a change and update task state.
- `/prompts:opsx-archive` - Archive a completed change and sync specs if needed.
- `/prompts:opsx-new` - Create an empty change container and metadata.
- `/prompts:opsx-continue` - Create the next ready artifact based on dependencies.
- `/prompts:opsx-ff` - Generate all planning artifacts in dependency order.
- `/prompts:opsx-verify` - Check completeness, correctness, and coherence against artifacts.
- `/prompts:opsx-sync` - Merge delta specs from a change into the main spec set.
- `/prompts:opsx-bulk-archive` - Archive multiple completed changes together.
- `/prompts:opsx-batch-apply` - Apply multiple ready changes in a controlled sequence.
- `/prompts:opsx-resume` - Restore context around active changes and recommend the next move.
- `/prompts:opsx-status` - Show change progress, readiness, and blockers.
- `/prompts:opsx-onboard` - Walk a user through the minimum OpenSpec workflow path.

Important:
- Treat `/prompts:*` as action selectors in Codex.
- If details are still needed after command selection, provide them in the next message.
- Read `openspec/config.yaml` if present, then `~/.openspec/.opsx-config.yaml`.
- Security-review states: `required`, `recommended`, `waived`, `completed`
- Checkpoints: `spec checkpoint` before `tasks`, `task checkpoint` before `apply`, and `execution checkpoint` after each top-level task group.

