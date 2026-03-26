# OpenSpec

OpenSpec is an AI-native spec-driven workflow system for Claude, Codex, and Gemini.

This package now ships as a Node CLI with:
- project-local `openspec/config.yaml`
- `core` and `expanded` workflow profiles
- schema-driven workflow metadata
- generated platform adapters
- pure Node install/update/uninstall commands
- built-in security-review gating and workflow checkpoints

## Quick start

```bash
npm install -g @xenonbyte/openspec
openspec init --platform codex --profile core
openspec install --platform claude,codex,gemini --profile core
```

Current release: `1.3.0`

Release focus:
- Node-first CLI distribution
- schema-driven workflow runtime
- `security-review` hard/soft gating
- planning and execution checkpoints

## Codex usage

Preferred:
```text
$openspec create an OpenSpec change for add-dark-mode
```

Explicit routing:
```text
/prompts:openspec
/prompts:opsx-propose
```

If a `/prompts:*` route still needs a change name or description, provide it in the next message.

## Profiles

- `core`: `propose`, `explore`, `apply`, `archive`
- `expanded`: all workflow actions including `new`, `continue`, `ff`, `verify`, `sync`, `status`, and onboarding

## Project config

`openspec/config.yaml` controls:
- `schema`
- `language`
- `profile`
- `context`
- `rules`
- `securityReview`

Precedence:
- change metadata
- project config
- global config
- package defaults

## Workflow checkpoints

- `security-review` sits after `design` and before `tasks`
- `spec checkpoint` runs before `tasks`
- `task checkpoint` runs before `apply`
- `execution checkpoint` runs after each top-level task group during `apply`
- Security-review states: `required`, `recommended`, `waived`, `completed`
- Checkpoint states: `PASS`, `WARN`, `BLOCK`

## Commands

```bash
openspec init --platform codex --profile core
openspec install --platform codex --profile core
openspec update --platform codex --profile expanded
openspec uninstall --platform codex
openspec generate-assets
openspec validate-assets
openspec --check
openspec --doc
openspec --language zh
```

## Release gate

Before npm publish or local reinstall:

```bash
openspec generate-assets
openspec validate-assets
```

Only proceed when generated assets, workflow contracts, and packaging metadata are all in sync.

## Documentation

- [Command reference](docs/commands.md)
- [Codex usage guide](docs/codex.md)
- [Customization guide](docs/customization.md)
- [Supported tools](docs/supported-tools.md)

## Repository shape

- `lib/`: runtime modules for config, generation, install, and CLI behavior
- `schemas/`: workflow schema definitions
- `templates/`: command and project templates
- `commands/`: generated platform adapters
- `skills/openspec/`: distributed skill bundle
- `openspec/`: dogfooded project workspace for this repository
