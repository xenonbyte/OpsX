# OpsX

OpsX is an AI-native operational spec execution workflow for Claude, Codex, and Gemini.

OpsX was originally adapted from Fission-AI/OpenSpec.

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
opsx --help
opsx --version
```

Compatibility aliases (secondary):
- `opsx --check`
- `opsx --doc`
- `opsx --language`

## Codex Usage

Preferred entrypoint:
```text
$opsx <request>
```

Explicit action routes:
```text
$opsx-propose
$opsx-apply
$opsx-status
```

## Project Config

Project-level workflow defaults live in `.opsx/config.yaml`.

Precedence:
- change metadata
- project config
- global config
- package defaults

## Workflow Checkpoints

- `security-review` sits after `design` and before `tasks`
- `spec checkpoint` runs before `tasks`
- `task checkpoint` runs before `apply`
- `execution checkpoint` runs after each top-level task group during `apply`
- Security-review states: `required`, `recommended`, `waived`, `completed`
- Checkpoint states: `PASS`, `WARN`, `BLOCK`

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
