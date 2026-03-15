# OpenSpec Sharing Guide (v1.0.0)

This package is now multi-platform and uses a unified command surface.

## Supported Platforms

- Claude
- Codex
- Gemini

## Core Changes

- Removed: `/openspec --update` (falls back to help)
- Shared config moved to `~/.openspec/.opsx-config.yaml`
- Codex command surface uses custom prompts:
  - `/prompts:openspec ...`
  - `/prompts:opsx-<action>`

## Install

```bash
./install.sh --platform <claude|codex|gemini> [--workspace <path>]
```

## Uninstall

```bash
./uninstall.sh --platform <claude|codex|gemini>
```

## Platform Output Mapping

- Claude -> `CLAUDE.md`
- Codex -> `AGENTS.md`
- Gemini -> `GEMINI.md`

## Share Checklist

1. Ensure no doc mentions `/openspec --update` as an active feature.
2. Ensure installer requires `--platform`.
3. Ensure config template has only `version/platform/language/ruleFile`.
