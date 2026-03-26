# OpenSpec Guide

## Quick path

1. `openspec init --platform codex --profile core`
2. `openspec install --platform codex --profile core`
3. In Codex, use `$openspec create an OpenSpec change for <work>`

## Config

Use `openspec/config.yaml` for schema, language, profile, context, and per-artifact rules.

## Profiles

- `core`: propose, explore, apply, archive
- `expanded`: full workflow command surface

## Generated adapters

Run `openspec generate-assets` after changing workflow definitions, then `openspec validate-assets` before publishing.
