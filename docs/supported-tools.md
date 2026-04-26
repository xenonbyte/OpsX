# Supported Tools

## Claude

- `/opsx-<action>`
- generated files live under `commands/claude/`

## Codex

- preferred: `$opsx <request>`
- explicit routes: `$opsx-<action>`
- generated files live under `commands/codex/`

## Gemini

- `/opsx-<action>`
- generated files live under `commands/gemini/`

All three platforms share the same workflow semantics from `schemas/spec-driven/schema.json` and the shared skill bundle.
CLI installation always deploys the full command surface (no `--profile` split).

Shared semantics:
- Security-review states: `required`, `recommended`, `waived`, `completed`
- Checkpoint states: `PASS`, `WARN`, `BLOCK`
- `spec checkpoint` before `tasks`
- `task checkpoint` before `apply`
- `execution checkpoint` after each top-level task group during `apply`
