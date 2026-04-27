# OpenSpec project hand-off

This repository uses OpenSpec as the workflow source of truth.
- Read `openspec/config.yaml` for project context and workflow defaults.
- Keep change artifacts under `openspec/changes/`.
- For Codex, use explicit $opsx-* routes; for Claude/Gemini, use /opsx-* routes.
- Keep `security-review.md` between `design.md` and `tasks.md` when required or recommended.
- Run `spec checkpoint` before `tasks`, `task checkpoint` before `apply`, and `execution checkpoint` after each top-level task group.
- When implementing a change, keep `proposal.md`, `specs/`, `design.md`, and `tasks.md` aligned.
