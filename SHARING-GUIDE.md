# OpenSpec Sharing Guide (v2.0.0)

This package is now multi-platform and uses a unified command surface.

## Supported Platforms

- Claude
- Codex
- OpenCode
- Gemini
- OpenClaw

## Core Changes

- Added: `/opsx:rules <type> [profile] [--file <name>]`
- Removed: `/openspec --update` (falls back to help)
- Shared config moved to `~/.openspec/.opsx-config.yaml`

## Install

```bash
./install.sh --platform <claude|codex|opencode|gemini|openclaw> [--workspace <path>]
```

## Uninstall

```bash
./uninstall.sh --platform <claude|codex|opencode|gemini|openclaw>
```

## Rule Type Matrix

- `tech`: `web | api | fullstack | android | ios | harmony | desktop | general`
- `ux`: `product | design-system | research | general`
- `writing`: `docs | blog | spec | proposal | general`
- `other`: `general`

## Platform Output Mapping

- Claude -> `CLAUDE.md`
- Codex/OpenCode/OpenClaw -> `AGENTS.md`
- Gemini -> `GEMINI.md`

## Share Checklist

1. Ensure `commands/opsx/rules.md` exists and legacy rule command files are removed.
2. Ensure no doc mentions `/openspec --update` as an active feature.
3. Ensure installer requires `--platform`.
4. Ensure config template has only `version/platform/language/ruleFile`.
