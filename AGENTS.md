# OpsX project hand-off

This repository uses OpsX as the workflow source of truth.
- Read `.opsx/config.yaml` for project context and workflow defaults.
- Keep active changes under `.opsx/changes/`.
- For Codex, use explicit $opsx-* routes; for Claude/Gemini, use /opsx-* routes.
- Keep `security-review.md` between `design.md` and `tasks.md` when required or recommended.
- Run `spec-split-checkpoint` after `specs` before `design`, `spec checkpoint` before `tasks`, `task checkpoint` before `apply`, `execution checkpoint` after each top-level task group, and `implementation-consistency-checkpoint` before verify acceptance.
- When implementing a change, keep `proposal.md`, `specs/`, `design.md`, `tasks.md`, `state.yaml`, `context.md`, and `drift.md` aligned.
