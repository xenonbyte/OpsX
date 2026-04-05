# OpenSpec Commands

## Agent entrypoints

Canonical workflow names are `openspec` and `opsx`.

- Claude/Gemini:
  - `/openspec <request>`
  - `/opsx:<action>`
- Codex (recommended):
  - `$openspec <request>`
- Codex (explicit routes):
  - `/prompts:openspec`
  - `/prompts:opsx-<action>`

## Workflow action routes

- `propose`: `/opsx:propose` or `/prompts:opsx-propose`
- `explore`: `/opsx:explore` or `/prompts:opsx-explore`
- `new`: `/opsx:new` or `/prompts:opsx-new`
- `continue`: `/opsx:continue` or `/prompts:opsx-continue`
- `ff`: `/opsx:ff` or `/prompts:opsx-ff`
- `status`: `/opsx:status` or `/prompts:opsx-status`
- `resume`: `/opsx:resume` or `/prompts:opsx-resume`
- `apply`: `/opsx:apply` or `/prompts:opsx-apply`
- `verify`: `/opsx:verify` or `/prompts:opsx-verify`
- `sync`: `/opsx:sync` or `/prompts:opsx-sync`
- `archive`: `/opsx:archive` or `/prompts:opsx-archive`
- `batch-apply`: `/opsx:batch-apply` or `/prompts:opsx-batch-apply`
- `bulk-archive`: `/opsx:bulk-archive` or `/prompts:opsx-bulk-archive`
- `onboard`: `/opsx:onboard` or `/prompts:opsx-onboard`

## Workflow states

- Security-review: `required`, `recommended`, `waived`, `completed`
- Checkpoint: `PASS`, `WARN`, `BLOCK`

## Workflow checkpoints

- `spec checkpoint`: after `design`, before `tasks`
- `task checkpoint`: after `tasks`, before `apply`
- `execution checkpoint`: after each top-level task group during `apply`
- Checkpoints update existing artifacts and do not create separate review files.

Checkpoint output contract (stable for prompt/runtime callers):
- `checkpoint`
- `phase`
- `status` (`PASS` | `WARN` | `BLOCK`)
- `findings`
- `patchTargets`
- `nextStep`

`status`/`resume` surfaces should report canonical checkpoint status and next-step recommendation from this contract.

## CLI commands

```bash
openspec install --platform <claude|codex|gemini[,...]>
openspec uninstall --platform <claude|codex|gemini[,...]>
openspec --check
openspec --doc
openspec --language <en|zh>
openspec --help
openspec --version
```

Behavior notes:
- `install` / `uninstall` require `--platform` and support comma-separated multi-platform values.
- Installation always deploys the full command surface; there is no `--profile` split.
- `--check` lists installed manifests under `~/.openspec/manifests/*.manifest` and reports config `platform` as the last selected platform.
- `--doc` prefers package-local guides and falls back to shared installed guides.
