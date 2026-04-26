# Changelog

## v3.0.0

Release date: 2026-04-27

Highlights:
- Ship the breaking rename from OpenSpec to OpsX on the public surface: npm package `@xenonbyte/opsx`, CLI `opsx`, and distributed skill bundle `skills/opsx`
- Do not ship an `openspec` executable alias in `@xenonbyte/opsx@3.0.0`; any compatibility bridge belongs to a separate `@xenonbyte/openspec@2.x` follow-up
- Keep Phase 1 messaging honest: full `.opsx/` workspace/global migration is deferred to Phase 2, and durable workflow state-machine behavior is deferred to later phases

## v2.0.1

Release date: 2026-04-06

Highlights:
- Make advisory `security-review` non-actionable across runtime guidance, workflow state, and summarized workflow output while preserving visible review state
- Preserve caller-provided preview sources for heuristic review detection and apply previews when on-disk artifacts are absent or whitespace-only
- Normalize array-backed `tasks` preview sources and keep `buildApplyInstructions().ready` gated by on-disk required artifact completion

## v2.0.0

Release date: 2026-04-05

Highlights:
- Ship the unified OpenSpec 2.0 CLI surface with schema-driven workflow metadata and generated platform adapters
- Add the runtime-guidance kernel for artifact graph resolution, status/instructions integrations, and apply preflight
- Stabilize security-review gating plus spec/task/execution checkpoint contracts across install/check/doc flows

## v1.3.1

Release date: 2026-03-27

Highlights:
- Fix Codex install output path so generated prompt assets land in `~/.codex/prompts/` instead of `~/.codex/prompts/prompts/`
- Keep `1.3.0` workflow runtime, checkpoint, and Node-first CLI behavior unchanged

## v1.3.0

Release date: 2026-03-26

Highlights:
- Ship OpenSpec as a Node-first CLI for installation, removal, and workflow support
- Add project-level `openspec/config.yaml` with schema, profile, language, context, rules, and `securityReview` policy
- Add schema-driven workflow runtime with explicit `security-review` hard gate and heuristic soft gate
- Add canonical security-review states: `required`, `recommended`, `waived`, `completed`
- Add planning checkpoints: `spec checkpoint` before `tasks` and `task checkpoint` before `apply`
- Add execution checkpoints after each top-level task group during `apply`
- Generate Claude, Codex, and Gemini adapters from shared templates instead of maintaining separate prompt logic
- Make Codex use `$openspec` as the primary entrypoint and keep `/prompts:*` as thin routing commands
- Refresh README, focused docs, skill guidance, and artifact/playbook references to match the new workflow model
