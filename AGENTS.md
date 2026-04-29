# OpsX Codex Harness Map

This file is a compact map, not the full workflow manual. Keep it short, and move durable details into linked docs, generated prompts, or executable checks.

## Platform Route

- Codex uses explicit `$opsx-*` routes.
- Claude Code and Gemini use `/opsx-*` routes.
- Do not expose dispatcher or wildcard route forms in public docs, prompts, or templates.

## Source Map

- `README.md` and `README-zh.md`: install flow, command surface, source lineage, and capability overview.
- `docs/customization.md`: `.opsx/config.yaml` fields and precedence.
- `docs/agent-harness.md`: how to maintain agent constraint files as maps.
- `skills/opsx/SKILL.md`: shared OpsX workflow contract and reference loading rules.
- `skills/opsx/references/`: detailed artifact templates and action playbooks.
- `templates/`: generated command and project hand-off surfaces.
- `scripts/test-workflow-*.js`: executable workflow, package, generation, path, state, and gate constraints.

## OpsX Workflow Anchors

- Read `.opsx/config.yaml` for project context and workflow defaults.
- Keep active changes under `.opsx/changes/`.
- Keep `security-review.md` between `design.md` and `tasks.md` when required or recommended.
- Run `spec-split-checkpoint` after `specs` before `design`, `spec checkpoint` before `tasks`, `task checkpoint` before `apply`, `execution checkpoint` after each top-level task group, and `implementation-consistency-checkpoint` before verify acceptance.
- When implementing a change, keep `proposal.md`, `specs/`, `design.md`, `tasks.md`, `state.yaml`, `context.md`, and `drift.md` aligned.

## Maintenance Rules

- Prefer a linked source of truth over adding long instructions here.
- When workflow behavior changes, update runtime code, generated prompts, templates, docs, and tests in the same pass.
- For constraint-file or docs changes, run at least `node scripts/test-workflow-generation.js` and `node scripts/check-phase1-legacy-allowlist.js`.
