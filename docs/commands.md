# OpsX Commands

## Agent Entrypoints

- Claude/Gemini: `/opsx-<action>`
- Codex (recommended): `$opsx <request>`
- Codex (explicit routes): `$opsx-<action>`

## Workflow Action Routes

- `propose`: `/opsx-propose` or `$opsx-propose`
- `explore`: `/opsx-explore` or `$opsx-explore`
- `new`: `/opsx-new` or `$opsx-new`
- `continue`: `/opsx-continue` or `$opsx-continue`
- `ff`: `/opsx-ff` or `$opsx-ff`
- `status`: `/opsx-status` or `$opsx-status`
- `resume`: `/opsx-resume` or `$opsx-resume`
- `apply`: `/opsx-apply` or `$opsx-apply`
- `verify`: `/opsx-verify` or `$opsx-verify`
- `sync`: `/opsx-sync` or `$opsx-sync`
- `archive`: `/opsx-archive` or `$opsx-archive`
- `batch-apply`: `/opsx-batch-apply` or `$opsx-batch-apply`
- `bulk-archive`: `/opsx-bulk-archive` or `$opsx-bulk-archive`
- `onboard`: `/opsx-onboard` or `$opsx-onboard`

## Workflow States

- Security-review: `required`, `recommended`, `waived`, `completed`
- Checkpoint: `PASS`, `WARN`, `BLOCK`

## Workflow Checkpoints

- `spec checkpoint`: after `design`, before `tasks`
- `task checkpoint`: after `tasks`, before `apply`
- `execution checkpoint`: after each top-level task group during `apply`
- Checkpoints update existing artifacts and do not create separate review files.

Checkpoint output contract:
- `checkpoint`
- `phase`
- `status` (`PASS` | `WARN` | `BLOCK`)
- `findings`
- `patchTargets`
- `nextStep`

## CLI Commands

```bash
opsx install --platform <claude|codex|gemini[,...]>
opsx uninstall --platform <claude|codex|gemini[,...]>
opsx check
opsx doc
opsx language <en|zh>
opsx migrate
opsx status
opsx --help
opsx --version
```

Compatibility aliases (secondary):
- `opsx --check`
- `opsx --doc`
- `opsx --language <en|zh>`

Behavior notes:
- `install` / `uninstall` require `--platform` and support comma-separated multi-platform values.
- Installation always deploys the full command surface; there is no profile split.
- `migrate` and `status` are included in the command surface; deeper migration/state workflows are delivered in later phases.
