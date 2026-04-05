# OpenSpec Commands

## Core profile

- `/opsx:propose` or `/prompts:opsx-propose`
- `/opsx:explore` or `/prompts:opsx-explore`
- `/opsx:apply` or `/prompts:opsx-apply`
- `/opsx:archive` or `/prompts:opsx-archive`

## Expanded profile

Adds:
- `new`
- `continue`
- `ff`
- `verify`
- `sync`
- `bulk-archive`
- `batch-apply`
- `resume`
- `status`
- `onboard`

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
