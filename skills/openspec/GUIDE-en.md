# OpenSpec Guide

## Quick path

1. `openspec install --platform codex`
2. `openspec --check`
3. In Codex, use `$openspec create an OpenSpec change for <work>`

## Config

Use `openspec/config.yaml` for `schema`, `language`, `context`, per-artifact `rules`, and `securityReview`.

## Command Surface

- `openspec install --platform <claude|codex|gemini[,...]>`
- `openspec uninstall --platform <claude|codex|gemini[,...]>`
- `openspec --check`
- `openspec --doc`
- `openspec --language <en|zh>`
- `openspec --help`
- `openspec --version`

## Notes

- Install always deploys the full command surface (no `--profile` split).
- `--check` reports installed manifests and treats config `platform` as last selected platform.
- `--doc` prefers package-local guide content over installed shared copies.
- Command bundles are generated during `install`; no extra build/validation command is required.
- In Codex, prefer `$openspec <request>` and `/prompts:opsx-*` for explicit routing.
