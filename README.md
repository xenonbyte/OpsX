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

| Action | Claude / Gemini | Codex | What it does | Use when |
| --- | --- | --- | --- | --- |
| onboard | `/opsx-onboard` | `$opsx-onboard` | Introduces the minimum setup path and next workflow route. | You are starting in a repo, checking install state, or unsure which OpsX route comes first. |
| new | `/opsx-new` | `$opsx-new` | Creates an empty change scaffold with metadata and state files. | You know the change name or topic but want to fill proposal/spec/design/tasks later. |
| propose | `/opsx-propose` | `$opsx-propose` | Creates a change and drafts the initial planning artifacts in one pass. | You already have enough scope to describe the intended behavior and want OpsX to start planning. |
| explore | `/opsx-explore` | `$opsx-explore` | Investigates ideas, risks, constraints, and tradeoffs without committing to artifacts. | The problem is still fuzzy and you want discovery before creating a formal change. |
| continue | `/opsx-continue` | `$opsx-continue` | Reads persisted state and creates only the next valid artifact. | A change is in progress and you want to advance one dependency-safe step. |
| ff | `/opsx-ff` | `$opsx-ff` | Fast-forwards planning artifacts in dependency order. | The scope is simple enough to produce the remaining planning stack together. |
| status | `/opsx-status` | `$opsx-status` | Shows workspace, active change, readiness, drift, and blockers. | You need a read-only snapshot before deciding what to do next. |
| resume | `/opsx-resume` | `$opsx-resume` | Restores context around active changes and recommends the next move. | You are returning after a break or context reset and want orientation without mutation. |
| apply | `/opsx-apply` | `$opsx-apply` | Implements exactly one top-level task group and records execution evidence. | Tasks are ready and you want a controlled implementation step with checkpoint state. |
| verify | `/opsx-verify` | `$opsx-verify` | Checks implemented work against approved specs/tasks and emits PASS/WARN/BLOCK findings. | Implementation is complete or nearly complete and must be gated before sync or archive. |
| sync | `/opsx-sync` | `$opsx-sync` | Merges verified change-local specs into canonical `.opsx/specs/` specs. | Verify has passed and the project spec set should absorb the accepted change. |
| archive | `/opsx-archive` | `$opsx-archive` | Archives a verified and synced change directory. | A change is done and should move out of the active change set. |
| batch-apply | `/opsx-batch-apply` | `$opsx-batch-apply` | Applies multiple ready changes with per-change isolation and skip/block reporting. | Several changes are ready and you want controlled sequential execution. |
| bulk-archive | `/opsx-bulk-archive` | `$opsx-bulk-archive` | Archives multiple completed changes with per-change precondition checks. | You are cleaning up completed work after verification and sync gates have passed. |

Use only explicit action routes from the table. Avoid dispatcher or wildcard
route forms.

## Capability Improvements

- Unified install and uninstall across Claude, Codex, and Gemini:
  `opsx install --platform claude,codex,gemini`.
- Explicit generated agent commands for every workflow action, with Codex using
  `$opsx-*` routes and Claude/Gemini using `/opsx-*` routes.
- Claude/Gemini command files are installed as flat `opsx-<action>` entries;
  Codex installs one generated action skill per `$opsx-<action>` route.
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
- `commands/`: generated platform adapters and Codex action-skill sources
- `skills/opsx/`: shared skill contract copied into generated action skills
- `.opsx/`: workflow workspace (created in projects that adopt OpsX)
