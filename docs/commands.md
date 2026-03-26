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

## CLI commands

- `openspec init`
- `openspec install`
- `openspec update`
- `openspec uninstall`
- `openspec generate-assets`
- `openspec validate-assets`
- `openspec --check`
- `openspec --doc`
- `openspec --language <en|zh>`

## Release gate

- Run `openspec generate-assets`
- Run `openspec validate-assets`
- Publish or reinstall only after validation passes
