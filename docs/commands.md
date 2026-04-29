# OpsX Commands

## Agent Entrypoints

- Claude/Gemini: `/opsx-<action>`
- Codex: `$opsx-<action>` (explicit routes only)

Codex explicit route examples:
- `$opsx-onboard`
- `$opsx-propose`
- `$opsx-status`
- `$opsx-apply`

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

- `spec-split-checkpoint`: after `specs`, before `design`
- `spec checkpoint`: after `design`, before `tasks`
- `task checkpoint`: after `tasks`, before `apply`
- `implementation-consistency-checkpoint`: after all active task groups are implemented, before verify acceptance
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
opsx status --json
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
- `migrate`, `status`, and state-aware resume/continue guidance are included in the command surface.

Spec sync note:
- OpsX change-local specs are expected to represent the full target spec for each capability, not only a delta patch. `sync` writes those full capability specs into `.opsx/specs/`.

## `opsx status --json` Contract

- `status --json` writes a machine-readable JSON envelope to stdout only.
- Top-level keys are stable for automation: `ok`, `version`, `command`, `workspace`, `migration`, `activeChange`, `changeStatus`, `warnings`, `errors`.
- `ok: true` means transport success (the CLI successfully emitted JSON). It does not mean the workspace or change is ready.
- Expected workflow states still exit `0` in `--json` mode, including:
  - workspace not initialized
  - no active change selected
  - migration candidates present
  - readiness warnings/blockers surfaced in `workspace`, `migration`, `changeStatus`, `warnings`, or `errors`
- True exceptional failures (for example invalid command arguments or runtime filesystem exceptions) use stderr and non-zero exit.
