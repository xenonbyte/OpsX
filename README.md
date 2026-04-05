# OpenSpec

OpenSpec is an AI-native spec-driven workflow system for Claude, Codex, and Gemini.

This package now ships as a Node CLI with:
- optional project-local `openspec/config.yaml` overrides
- full workflow command set by default (no profile split)
- schema-driven workflow metadata
- generated platform adapters
- pure Node install/uninstall/check/doc/language commands
- built-in security-review gating and workflow checkpoints
- runtime guidance primitives for status/instructions integrations

## Quick start

```bash
npm install -g @xenonbyte/openspec
openspec install --platform claude,codex,gemini
$openspec help me start an OpenSpec workflow
```

Current release: `2.0.0`

Release focus:
- unified install surface (no `--profile`; always installs full command set)
- checkpoint evidence accuracy and drift/constraint detection fixes
- runtime-guidance kernel for artifact graph, status/instructions, and apply preflight
- multi-platform check/doc behavior hardening (`--check` manifest enumeration, `--doc` local guide precedence)
- security-review hard/soft gating with canonical checkpoint contract stability

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

## Project config

`openspec/config.yaml` controls:
- `schema`
- `language`
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
openspec install --platform claude,codex,gemini
openspec uninstall --platform codex
openspec --check
openspec --doc
openspec --language zh
openspec --help
openspec --version
```

Behavior notes:
- `install` and `uninstall` accept comma-separated platforms via `--platform`.
- `--check` lists installed platform manifests from `~/.openspec/manifests/*.manifest`; config `platform` is reported as the last selected platform.
- `--doc` prefers the package-local guide (`skills/openspec/GUIDE-*.md`) and falls back to the shared installed copy.

## Documentation

- [Command reference](docs/commands.md)
- [Codex usage guide](docs/codex.md)
- [Customization guide](docs/customization.md)
- [Runtime guidance kernel](docs/runtime-guidance.md)
- [Supported tools](docs/supported-tools.md)

## Repository shape

- `lib/`: runtime modules for config, generation, install, and CLI behavior
- `schemas/`: workflow schema definitions
- `templates/`: command and project templates
- `commands/`: generated platform adapters
- `skills/openspec/`: distributed skill bundle
- `openspec/`: dogfooded project workspace for this repository
