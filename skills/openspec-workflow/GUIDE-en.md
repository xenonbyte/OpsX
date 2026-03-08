# OpenSpec Practical Guide (v2.0.0)

## 1. Overview

OpenSpec is a spec-driven workflow with unified commands:
- Entry: `/openspec`
- Subcommands: `/opsx:*`

Supported platforms: Claude, Codex, OpenCode, Gemini, OpenClaw.

## 2. Meta Commands

- `/openspec --help`
- `/openspec --version`
- `/openspec --language zh|en`
- `/openspec --doc`

Note: `/openspec --update` is removed. When called, it silently falls back to help.

## 3. Constraints Command

Usage:

```bash
/opsx:rules <type> [profile] [--file <name>]
```

### type
- `tech`
- `ux`
- `writing`
- `other`

### profile
- `tech`: `web | api | fullstack | android | ios | harmony | desktop | general`
- `ux`: `product | design-system | research | general`
- `writing`: `docs | blog | spec | proposal | general`
- `other`: `general`

### Rules
- No args: auto-detect, fallback to `other general`
- First arg `android/ios/harmony/web/api/...`: mapped to `tech <profile>`
- `mobile` is removed; use `android|ios|harmony`

## 4. Generation Model

`/opsx:rules` uses 3 layers:
- Base: scope/boundaries, workflow, commits, quality gates, prohibited actions, DoD
- Type Pack: domain-specific constraints by type
- Project Signals: strengthen rules from repository evidence

Priority: `explicit args > repo facts > type defaults`

Every rule must be executable, verifiable, and labeled `MUST/SHOULD`.

## 5. Rule File Mapping

- Claude -> `CLAUDE.md`
- Codex -> `AGENTS.md`
- OpenCode -> `AGENTS.md`
- OpenClaw -> `AGENTS.md`
- Gemini -> `GEMINI.md`

Override with `--file`.

## 6. Install and Config

Install:

```bash
./install.sh --platform <claude|codex|opencode|gemini|openclaw> [--workspace <path>]
```

Uninstall:

```bash
./uninstall.sh --platform <claude|codex|opencode|gemini|openclaw>
```

Shared config:
- `~/.openspec/.opsx-config.yaml`

## 7. Other Workflow Commands

- `/opsx:propose`
- `/opsx:new`
- `/opsx:continue`
- `/opsx:ff`
- `/opsx:apply`
- `/opsx:verify`
- `/opsx:sync`
- `/opsx:archive`
- `/opsx:bulk-archive`
- `/opsx:batch-apply`
- `/opsx:resume`
- `/opsx:status`
- `/opsx:onboard`
