# OpsX Guide

## Quick path

1. `opsx install --platform codex`
2. `opsx check`
3. In Codex, use `$opsx create an OpsX change for <work>`

## Config

Use `.opsx/config.yaml` for `schema`, `language`, `context`, per-artifact `rules`, and `securityReview`.

## Command Surface

- `opsx install --platform <claude|codex|gemini[,...]>`
- `opsx uninstall --platform <claude|codex|gemini[,...]>`
- `opsx check`
- `opsx doc`
- `opsx language <en|zh>`
- `opsx migrate`
- `opsx status`
- `opsx --help`
- `opsx --version`

## Notes

- Install always deploys the full command surface (no `--profile` split).
- `--check` reports installed manifests and treats config `platform` as last selected platform.
- `--doc` prefers package-local guide content over installed shared copies.
- Command bundles are generated during `install`; no extra build/validation command is required.
- In Codex, prefer `$opsx <request>` and `$opsx-*` for explicit routing.
- In Claude/Gemini, use `/opsx-*` commands as the primary route surface.
