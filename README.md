# OpsX

OpsX is an AI-native operational spec execution workflow for Claude, Codex, and Gemini.

## Quick Start

```bash
npm install -g @xenonbyte/opsx
opsx install --platform claude,codex,gemini
opsx check
```

Current release: `3.0.0`

## CLI Surface

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

## Codex Usage

Use explicit action routes:
```text
$opsx-onboard
$opsx-propose
$opsx-status
$opsx-apply
```

Additional workflow routes follow the same explicit pattern (for example:
`$opsx-explore`, `$opsx-continue`, `$opsx-verify`, `$opsx-archive`).
Use only explicit action routes shown above; avoid dispatcher or wildcard route forms.

## Release Preflight

Use one total entrypoint before release:

```bash
npm test
```

This runs the split Phase 8 workflow/runtime coverage (package, generation,
state, paths, and gates) through the aggregate test runner.

## Project Config

OpsX project-level workflow defaults now live in `.opsx/config.yaml`.
Use `opsx migrate --dry-run` to print the exact `MOVE`/`CREATE` mapping with
zero writes. Run `opsx migrate` to execute the same plan; it aborts by default
if `.opsx/` already exists.

Precedence:
- change metadata (`.opsx/changes/<name>/change.yaml`)
- project config (`.opsx/config.yaml`)
- global config (`~/.opsx/config.yaml`)
- package defaults

Workspace tracking policy:
- Tracked: `.opsx/config.yaml`, `.opsx/active.yaml`, `.opsx/changes/**`, `.opsx/specs/**`, `.opsx/archive/**`
- Ignored: `.opsx/cache/**`, `.opsx/tmp/**`, `.opsx/logs/**`

## Workflow Checkpoints

- `security-review` sits after `design` and before `tasks`
- `spec-split-checkpoint` runs after `specs` and before `design`
- `spec checkpoint` runs after `design` and before `tasks`
- `task checkpoint` runs after `tasks` and before `apply`
- `execution checkpoint` runs after each top-level task group during `apply`
- `implementation-consistency-checkpoint` runs after implementation and before verify acceptance
- Security-review states: `required`, `recommended`, `waived`, `completed`
- Checkpoint states: `PASS`, `WARN`, `BLOCK`

Change-local specs are full target specs for each capability. `sync` writes them into `.opsx/specs/`; do not treat them as delta-only patches.

## Documentation

- [Command reference](docs/commands.md)
- [Codex usage guide](docs/codex.md)
- [Customization guide](docs/customization.md)
- [Runtime guidance kernel](docs/runtime-guidance.md)
- [Supported tools](docs/supported-tools.md)

## Repository Shape

- `lib/`: runtime modules for config, generation, install, and CLI behavior
- `schemas/`: workflow schema definitions
- `templates/`: command and project templates
- `commands/`: generated platform adapters
- `skills/opsx/`: distributed skill bundle
- `.opsx/`: workflow workspace (created in projects that adopt OpsX)
