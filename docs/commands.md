# OpenSpec Commands

## Available commands

- `/opsx:propose` or `/prompts:opsx-propose`
- `/opsx:explore` or `/prompts:opsx-explore`
- `/opsx:apply` or `/prompts:opsx-apply`
- `/opsx:archive` or `/prompts:opsx-archive`
- `/opsx:new` or `/prompts:opsx-new`
- `/opsx:continue` or `/prompts:opsx-continue`
- `/opsx:ff` or `/prompts:opsx-ff`
- `/opsx:verify` or `/prompts:opsx-verify`
- `/opsx:sync` or `/prompts:opsx-sync`
- `/opsx:bulk-archive` or `/prompts:opsx-bulk-archive`
- `/opsx:batch-apply` or `/prompts:opsx-batch-apply`
- `/opsx:resume` or `/prompts:opsx-resume`
- `/opsx:status` or `/prompts:opsx-status`
- `/opsx:onboard` or `/prompts:opsx-onboard`

## Workflow states

- Security-review: `required`, `recommended`, `waived`, `completed`
- Checkpoints: `PASS`, `WARN`, `BLOCK`

## Workflow checkpoints

- `spec checkpoint`: after `design`, before `tasks`
- `task checkpoint`: after `tasks`, before `apply`
- `execution checkpoint`: after each top-level task group during `apply`
- Checkpoints update existing artifacts and do not create separate review files

Checkpoint output contract (stable for prompt/runtime callers):
- `checkpoint`
- `phase`
- `status` (`PASS` | `WARN` | `BLOCK`)
- `findings`
- `patchTargets`
- `nextStep`

`status`/`resume` surfaces should keep reporting the canonical checkpoint status and next-step recommendation from this contract.

## CLI commands

- `openspec install`
- `openspec uninstall`
- `openspec --check`
- `openspec --doc`
- `openspec --language <en|zh>`
