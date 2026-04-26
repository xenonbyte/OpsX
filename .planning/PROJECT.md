# OpsX

## What This Is

OpsX is the next major version of the current `xenonbyte/openspec` repository. It is an AI-native operational spec execution workflow for Claude Code, Codex, and Gemini that turns user intent into versioned specs, lightweight TDD tasks, state-machine-driven execution steps, checkpoint reviews, verification records, and archive history.

The current codebase still ships as OpenSpec `2.0.1` with `openspec` paths, commands, package metadata, and skill names. The v3.0 milestone converts the product to OpsX as a breaking release and makes `.opsx/` the source of truth for recoverable agent workflows.

## Core Value

Agents can reliably continue spec-driven work from disk-backed OpsX artifacts instead of relying on fragile chat history.

## Current Milestone: v3.0 OpsX migration and state-machine workflow

**Goal:** Fully convert OpenSpec to OpsX while adding a lightweight, recoverable workflow state machine with spec review, TDD-light, drift tracking, and stronger verification gates.

**Target features:**
- Rename project, package, CLI, commands, skills, docs, templates, and runtime constants from OpenSpec/openspec to OpsX/opsx.
- Migrate project workspace from `openspec/` to `.opsx/` and global home from `~/.openspec/` to `~/.opsx/`.
- Standardize Claude Code commands as `/opsx-*`, Codex commands as `$opsx-*`, npm package as `@xenonbyte/opsx`, CLI as `opsx`, and skill as `opsx`.
- Add change-level `state.yaml`, `context.md`, `drift.md`, artifact hashes, allowed/forbidden path guards, and resumable `opsx-continue`/`opsx-resume` behavior.
- Add `spec-split-checkpoint` before design to catch split-spec coverage, duplication, conflict, hidden requirement, and scope drift issues.
- Add TDD-light task structure and checkpoint rules for RED/GREEN/REFACTOR/VERIFY.
- Strengthen `opsx-verify`, `opsx-sync`, `opsx-archive`, batch apply, bulk archive, clean JSON output, glob/path handling, migration, and regression coverage.

## Requirements

### Validated

- ✓ Node CLI packaging and install/check/doc/language flows exist in `@xenonbyte/openspec` — v2.0.0/v2.0.1
- ✓ Schema-driven artifacts support `proposal`, `specs`, `design`, optional `security-review`, and `tasks` — v2.0.0
- ✓ Security-review gating supports required, recommended, waived, and completed states — v2.0.0/v2.0.1
- ✓ Spec, task, and execution checkpoint concepts are implemented in the runtime schema — v2.0.0
- ✓ Runtime guidance APIs can compute workflow status and apply instructions from artifacts — v2.0.0/v2.0.1

### Active

- [ ] Complete the OpsX naming and package migration for the v3.0 breaking release.
- [ ] Move project and global workflow state to `.opsx/` and `~/.opsx/` with a safe migration command.
- [ ] Rewrite command, skill, template, and documentation surfaces around `/opsx-*`, `$opsx-*`, and `opsx`.
- [ ] Introduce a durable change-level state machine that every command reads before acting.
- [ ] Add spec-split automatic review and hidden requirement detection.
- [ ] Add TDD-light planning and execution checkpoint enforcement.
- [ ] Enforce verification, sync, archive, drift, and path-boundary quality gates.
- [ ] Expand tests so the v3.0 migration is guarded by command, migration, state, spec-review, TDD, and JSON-output coverage.

### Out of Scope

- Lite/advanced command profiles — explicitly excluded; OpsX keeps the full command set by default.
- A full autonomous agent engine — OpsX should stay a lightweight workflow state machine, not a GSD2-style auto runner.
- Keeping `/openspec`, `$openspec`, `/prompts:openspec`, or `/opsx:*` as primary v3.0 runtime surfaces — only migration guidance may mention old names.
- Silent compatibility shims in `@xenonbyte/opsx@3.0.0` — the old `@xenonbyte/openspec` package may provide bridge messaging separately.
- Hosted services, telemetry, remote sync, or cloud execution — not needed for this milestone.

## Context

- Local repo inspection on 2026-04-27 confirms `package.json` still uses `@xenonbyte/openspec`, binary `openspec`, and GitHub URLs under `xenonbyte/openspec`.
- `README.md` still presents OpenSpec, `openspec install`, `$openspec`, `/prompts:openspec`, `openspec/config.yaml`, `~/.openspec`, `skills/openspec`, and the `openspec/` dogfood workspace.
- `openspec/config.yaml` already uses Chinese language defaults and describes this package as the XenonByte OpenSpec multi-platform distribution.
- `schemas/spec-driven/schema.json` currently has `spec-checkpoint`, `task-checkpoint`, and `execution-checkpoint`, but not `spec-split-checkpoint` or runtime state artifacts.
- The repository did not have `.planning/` before this milestone; this document starts the GSD planning layer for the existing brownfield project.
- User-supplied milestone input on 2026-04-27 defines the desired OpsX direction, migration mapping, command model, state machine, spec review, TDD-light, anti-drift rules, and recommended PR breakdown.

## Constraints

- **Breaking release:** Version should move to `3.0.0` because package name, CLI, command names, directories, and skill name change.
- **Command compatibility:** Claude Code uses `/opsx-*`; Codex uses `$opsx-*`; the public docs should not expose `/prompts:*` as the primary user entry.
- **Workflow source of truth:** Commands must trust `.opsx/` files and re-read artifacts from disk before acting.
- **No profile split:** Keep the full command set visible; do not introduce Lite/Advanced modes.
- **Migration safety:** `opsx migrate` must dry-run, abort when `.opsx/` already exists by default, and require explicit merge intent for conflict-prone migrations.
- **Verification discipline:** Archive must require verified or synced state, complete tasks, complete execution checkpoints, and no unresolved drift blockers.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Rename OpenSpec to OpsX for v3.0 | Current naming is mixed and old entrypoints keep agents/users on stale mental models | Pending |
| Use `.opsx/` and `~/.opsx/` as canonical directories | Dot-directory state is explicit workflow metadata and aligns project/global naming | Pending |
| Keep full `opsx-*` command set, no Lite profile | User explicitly wants complete workflow power without profile choice overhead | Pending |
| Add state/context/drift runtime artifacts | Durable disk state reduces chat-summary drift and enables clean-context recovery | Pending |
| Add TDD-light instead of strict TDD by default | Captures red/green verification discipline without making all tasks heavyweight | Pending |
| Add spec-split checkpoint before design | Split specs need early coverage/conflict review before design and tasks harden | Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `$gsd-transition`):
1. Requirements invalidated? -> Move to Out of Scope with reason
2. Requirements validated? -> Move to Validated with phase reference
3. New requirements emerged? -> Add to Active
4. Decisions to log? -> Add to Key Decisions
5. "What This Is" still accurate? -> Update if drifted

**After each milestone** (via `$gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-27 after starting milestone v3.0*
