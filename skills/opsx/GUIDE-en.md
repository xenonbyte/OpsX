# OpsX Guide

## Quick path

1. `opsx install --platform codex`
2. `opsx check`
3. In Codex, run `$opsx-onboard`, then continue with `$opsx-new` or `$opsx-propose`

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
- Command/action-skill bundles are generated during `install`; no extra build/validation command is required.
- Use `$opsx-*` routes in Codex.
- In Claude/Gemini, use `/opsx-*` commands as the primary route surface.
