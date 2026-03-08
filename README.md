# OpenSpec Skill (Multi-Platform)

OpenSpec enhanced workflow skill with unified `/openspec` and `/opsx:*` semantics across:
- Claude
- Codex
- OpenCode
- Gemini
- OpenClaw

## What's New (v2.0.0)

- New constraints command: `/opsx:rules <type> [profile] [--file <name>]`
- Removed: `/openspec --update` (now silently falls back to help)
- Shared config path: `~/.openspec/.opsx-config.yaml`
- Single-platform installer: `./install.sh --platform <...>`

## Type System

Top-level `type`:
- `tech`
- `ux`
- `writing`
- `other`

Profiles:
- `tech`: `web | api | fullstack | android | ios | harmony | desktop | general`
- `ux`: `product | design-system | research | general`
- `writing`: `docs | blog | spec | proposal | general`
- `other`: `general`

Alias:
- `/opsx:rules android` is treated as `/opsx:rules tech android`

Legacy behavior:
- `mobile` is removed. Use `android | ios | harmony`.

## Rule File Mapping by Platform

- Claude -> `CLAUDE.md`
- Codex -> `AGENTS.md`
- OpenCode -> `AGENTS.md`
- OpenClaw -> `AGENTS.md`
- Gemini -> `GEMINI.md`

You can override by passing `--file <name>`.

## Installation

```bash
chmod +x install.sh uninstall.sh
./install.sh --platform claude
./install.sh --platform codex
./install.sh --platform gemini --workspace /path/to/project
```

Uninstall:

```bash
./uninstall.sh --platform claude
```

## Common Commands

- `/openspec --help`
- `/openspec --version`
- `/openspec --language zh|en`
- `/openspec --doc`

Workflow:
- `/opsx:propose`
- `/opsx:continue`
- `/opsx:apply`
- `/opsx:verify`
- `/opsx:archive`

Constraints:
- `/opsx:rules tech android`
- `/opsx:rules ux design-system`
- `/opsx:rules writing docs`
- `/opsx:rules other`

## Config

`~/.openspec/.opsx-config.yaml`

```yaml
version: "2.0.0"
platform: "claude"
language: "zh"
ruleFile: "CLAUDE.md"
```

## License

MIT (inherits upstream OpenSpec licensing model)
