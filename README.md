# OpsX

[简体中文](README-zh.md)

OpsX is an AI-native operational spec execution workflow for Claude, Codex, and Gemini.

OpsX is a downstream adaptation of [Fission-AI/OpenSpec](https://github.com/Fission-AI/OpenSpec).
It keeps the lightweight spec-driven workflow idea and adds a stricter OpsX
public surface, multi-agent install flow, and state-aware execution gates.

## Quick Start

```bash
npm install -g @xenonbyte/opsx
opsx install --platform claude,codex,gemini
opsx check
```

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

## Agent Commands

Claude and Gemini use `/opsx-<action>`. Codex uses `$opsx-<action>`.

| Action | Claude / Gemini | Codex |
| --- | --- | --- |
| onboard | `/opsx-onboard` | `$opsx-onboard` |
| new | `/opsx-new` | `$opsx-new` |
| propose | `/opsx-propose` | `$opsx-propose` |
| explore | `/opsx-explore` | `$opsx-explore` |
| continue | `/opsx-continue` | `$opsx-continue` |
| ff | `/opsx-ff` | `$opsx-ff` |
| status | `/opsx-status` | `$opsx-status` |
| resume | `/opsx-resume` | `$opsx-resume` |
| apply | `/opsx-apply` | `$opsx-apply` |
| verify | `/opsx-verify` | `$opsx-verify` |
| sync | `/opsx-sync` | `$opsx-sync` |
| archive | `/opsx-archive` | `$opsx-archive` |
| batch-apply | `/opsx-batch-apply` | `$opsx-batch-apply` |
| bulk-archive | `/opsx-bulk-archive` | `$opsx-bulk-archive` |

Use only explicit action routes from the table. Avoid dispatcher or wildcard
route forms.

## Capability Improvements

- Unified install and uninstall across Claude, Codex, and Gemini:
  `opsx install --platform claude,codex,gemini`.
- Explicit generated agent commands for every workflow action, with Codex using
  `$opsx-*` routes and Claude/Gemini using `/opsx-*` routes.
- Canonical `.opsx/` workspace layout for project config, active change state,
  change artifacts, synced specs, and archive output.
- State-aware `status`, `resume`, `continue`, `apply`, `verify`, `sync`, and
  `archive` flows backed by `state.yaml`, `context.md`, and `drift.md`.
- Security-review and checkpoint gates:
  `spec-split-checkpoint`, `spec checkpoint`, `task checkpoint`,
  `execution checkpoint`, and `implementation-consistency-checkpoint`.
- Stable `opsx status --json` envelope for automation and tooling.
- Migration support for older workspace layouts through `opsx migrate` and
  `opsx migrate --dry-run`.
- Release hardening through split runtime tests, package-surface checks, and a
  single `npm test` preflight entrypoint.

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

- [Customization guide](docs/customization.md)
- [Agent harness map](docs/agent-harness.md)

## Repository Shape

- `lib/`: runtime modules for config, generation, install, and CLI behavior
- `schemas/`: workflow schema definitions
- `templates/`: command and project templates
- `commands/`: generated platform adapters
- `skills/opsx/`: distributed skill bundle
- `.opsx/`: workflow workspace (created in projects that adopt OpsX)
