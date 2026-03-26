# Supported Tools

## Claude

- `/openspec`
- `/opsx:*`
- generated files live under `commands/claude/`

## Codex

- preferred: `$openspec <request>`
- explicit routes: `/prompts:openspec`, `/prompts:opsx-*`
- generated files live under `commands/codex/`

## Gemini

- `/openspec`
- `/opsx:*`
- generated files live under `commands/gemini/`

All three platforms share the same workflow semantics from `schemas/spec-driven/schema.json` and the shared skill bundle.

Shared semantics:
- Security-review states: `required`, `recommended`, `waived`, `completed`
- Checkpoint states: `PASS`, `WARN`, `BLOCK`
- `spec checkpoint` before `tasks`
- `task checkpoint` before `apply`
- `execution checkpoint` after each top-level task group during `apply`
