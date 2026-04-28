---
gsd_state_version: 1.0
milestone: v3.0
milestone_name: milestone
status: executing
stopped_at: Completed 05-01-PLAN.md
last_updated: "2026-04-28T06:39:51.869Z"
last_activity: 2026-04-28
progress:
  total_phases: 8
  completed_phases: 4
  total_plans: 37
  completed_plans: 31
  percent: 84
---

# State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-04-27)

**Core value:** Agents can reliably continue spec-driven work from disk-backed OpsX artifacts instead of relying on fragile chat history.
**Current focus:** Phase 05 — spec-split-checkpoint

## Current Position

Phase: 05 (spec-split-checkpoint) — EXECUTING
Plan: 2 of 7
Status: Ready to execute
Last activity: 2026-04-28

## Next Action

Run `$gsd-execute-phase 5` to continue executing Phase 5 from the first incomplete plan.

## Accumulated Context

- 2026-04-27: This repository had OpenSpec workflow artifacts but no `.planning/` directory before the v3.0 OpsX milestone.
- 2026-04-27: User provided the complete milestone direction: rename to OpsX, migrate paths, unify commands, add change state machine, add TDD-light, add spec-split review, and harden verification/archive behavior.
- 2026-04-27: Phase 1 planning and execution completed; final plan checker result was PASS and verification passed.
- 2026-04-27: Phase 2 planning and execution completed; verification passed 9/9 must-haves and post-fix code review is clean.
- 2026-04-27: Phase 3 context locked explicit `$opsx-*` Codex routing, strict prompt preflight wording, centralized generation, hard legacy cleanup, and non-mutating empty-state behavior for `onboard`, `status`, and `resume`.
- 2026-04-27: Phase 3 revised planning now uses 11 plans across 5 waves: Wave 0 planning/gates, Wave 1 source-of-truth metadata/tests, Wave 2 six bounded generated refresh slices, Wave 3 skills/docs alignment, Wave 4 help + final verification.
- 2026-04-27: Phase 3 execution completed; verifier passed 5/5 must-haves and code review is clean with 0 findings.
- 2026-04-27: Phase 4 context gathered; decisions lock a library-first state-machine implementation, strict mutation transitions, warn-and-reload hash drift, and one-top-level-task-group apply guidance.
- 2026-04-27: Phase 4 planned into 9 plans across 7 waves; independent plan checker passed with all STATE-01 through STATE-08 requirements covered.
- 2026-04-27: Phase 4 execution completed; verifier passed 5/5 must-haves, `04-REVIEW.md` is clean after remediation commit `7282e57`, and `npm run test:workflow-runtime` passed 49/49.

## Decisions

- [Phase 02]: Mirror tracked/ignored `.opsx` path list exactly from `.gitignore` in public docs. — Prevents operator policy drift between docs and repo behavior.
- [Phase 02]: Keep legacy `openspec/` paths only in migration-candidate compatibility notes. — Avoids presenting legacy layout as canonical runtime path.
- [Phase 03]: Hard clean break for legacy OpenSpec surfaces. — Supersedes earlier migration/history allowlists; planning must update requirements and tests accordingly.
- [Phase 03]: Keep `commands/codex/prompts/opsx.md` only as an internal generated route catalog; never a public standalone Codex entrypoint.
- [Phase 03]: Preserve repo-local `openspec/` authoring instructions in `AGENTS.md`; replace only stale route guidance with current OpsX routes.
- Phase 03 Plan 01 rewrote NAME-04/CMD-04 and Phase 3 success criteria to enforce explicit banned public entrypoints.
- Phase 03 Plan 01 established runtime helper inventories for route bans, bundle parity, and empty-state fallback matching before generated rewrites.
- Phase 03-02 enforces explicit-only $opsx-* routing in workflow metadata/templates and removes $opsx <request> source guidance.
- Wave 1 runtime tests now validate generated source output while deferring checked-in commands parity activation to later refresh waves.
- Phase 03 Plan 03 refreshed the first bounded Claude command slice by regenerating exactly eight files from buildPlatformBundle('claude').
- Wave 2 generated refreshes continue with explicit byte-for-byte parity checks before each bounded slice commit.
- Phase 03 Plan 04 kept scope strictly to the seven plan-listed Claude generated leaves and avoided source-template edits.
- Phase 03 Plan 04 enforced byte-for-byte parity checks for all seven refreshed Claude leaves.
- Phase 03 Plan 06 kept scope strictly mechanical: regenerate only the seven plan-listed Codex leaves from buildPlatformBundle('codex') with no source-template edits.
- Phase 03 Plan 07 kept scope strictly mechanical by regenerating only the eight plan-listed Gemini files from buildPlatformBundle('gemini').
- Phase 03 Plan 08 kept scope strictly mechanical: refresh only the seven plan-listed Gemini action leaves with no source/template/help/docs/skills edits.
- Phase 03 Plan 09 locked distributed skill/guides to explicit Codex $opsx-* public routes only.
- Phase 03 Plan 09 aligned bilingual playbooks with non-mutating empty-state guidance for onboard/status/resume/batch-apply/bulk-archive.
- Remove public $opsx <request> guidance and standardize docs on explicit $opsx-* routes only.
- Document commands/codex/prompts/opsx.md as internal catalog while keeping public Codex docs explicit-only.
- Phase 03 Plan 11 enforces explicit-only Codex/Claude-Gemini route guidance across CLI help, postinstall, template, and AGENTS surfaces.
- Phase 03 Plan 11 promotes checked-in commands/** parity to a hard runtime gate against buildPlatformBundle() output.
- Phase 03 code-review remediation made generated fallback routes platform-aware and added shared playbook route-label guards.
- [Phase 04]: Keep Phase 4 library-first; avoid building a full Node workflow execution engine.
- [Phase 04]: Use strict mutation transitions, readable status/resume, warn-and-reload hash drift, and one-top-level-task-group apply guidance.
- [Phase 04]: Implement a local transition-table module instead of adding `xstate`; add `yaml@2.8.3` for persisted state YAML that includes arrays and nested collections.
- Keep read-only drift inspection non-mutating: surface warnings and reload context without refreshing stored hashes.
- Phase 04 Plan 02 keeps opsx-new scaffolding library-first and filesystem-bounded without broad CLI workflow execution.
- Phase 04 Plan 02 persists new-change INIT lifecycle and active pointer through change-store helpers during skeleton creation.
- Phase 04 Plan 03 routes continue/status/resume from persisted stage via change-state selectors.
- CLI status now delegates active-change rendering to runtime-guidance buildStatusText while keeping missing-workspace guidance truthful.
- Phase 04 Plan 04 refreshes stored hashes only through accepted-write helpers (recordCheckpointResult/recordTaskGroupExecution).
- Phase 04 Plan 04 keeps status/resume drift inspection read-only: warn+reload without mutating state.yaml hashes.
- Phase 04 Plan 04 constrains apply guidance to one selected top-level task group via persisted active.nextTaskGroup preference.
- Keep strict checked-in parity active for untouched generated files and exempt only the planned 24 stateful leaves during refresh.
- Read-only status/resume routes must warn on hash drift, reload from disk, and never refresh stored hashes directly.
- Phase 4 treats allowedPaths/forbiddenPaths as warnings; hard verify/archive blocking remains deferred to Phase 7.
- Keep 04-06 scope bounded: do not touch commands/claude/opsx.md or any non-listed generated files.
- Phase 04 Plan 07 keeps Codex refresh mechanically bounded to the listed stateful action slice from buildPlatformBundle('codex').
- Phase 04 Plan 08 refreshes only the listed Gemini stateful action files from buildPlatformBundle('gemini') with no hand edits.
- Phase 04 Plan 08 keeps scope mechanically bounded by leaving commands/gemini/opsx.toml and non-listed generated files untouched.
- Phase 04 Plan 09 removed temporary parity exemptions and restored strict repo-wide checked-in command parity against buildPlatformBundle() output.
- Phase 04 Plan 09 kept source-output assertions for read-only hash-drift wording and one-group apply behavior while re-locking full parity.
- Phase 05 Plan 01 keeps spec-split-checkpoint as canonical output id while normalizing persisted aliases to checkpoints.specSplit.
- Phase 05 Plan 01 reuses Phase 4 checkpoint persistence/validator contracts without adding new artifact types.

## Blockers

(None)

## Open Questions

(None)

**Completed Phase:** 1 (OpsX Naming and CLI Surface) — 6/6 plans — verification passed — 2026-04-26
**Completed Phase:** 2 (.opsx/ Workspace and Migration) — 4/4 plans — verification passed — 2026-04-27
**Completed Phase:** 3 (Skill and Command Surface Rewrite) — 11/11 plans — verification passed — 2026-04-27
**Completed Phase:** 4 (Change State Machine and Drift Control) — 9/9 plans — verification passed — 2026-04-27

## Performance Metrics

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 02 P04 | 3m | 2 tasks | 6 files |
| Phase 03 P01 | 7m 4s | 2 tasks | 5 files |
| Phase 03 P02 | 6m 14s | 2 tasks | 7 files |
| Phase 03 P03 | 1m 23s | 1 tasks | 8 files |
| Phase 03 P04 | 1m 30s | 1 tasks | 7 files |
| Phase 03 P06 | 4m | 1 tasks | 7 files |
| Phase 03 P07 | 1m 21s | 1 tasks | 8 files |
| Phase 03 P08 | 7m | 1 tasks | 7 files |
| Phase 03 P09 | 3m 32s | 1 tasks | 5 files |
| Phase 03 P10 | 2m 29s | 1 tasks | 6 files |
| Phase 03 P11 | 10m | 1 tasks | 5 files |
| Phase 04 P01 | 5m 40s | 2 tasks | 5 files |
| Phase 04 P02 | 6m 4s | 2 tasks | 2 files |
| Phase 04 P03 | 7m 46s | 2 tasks | 4 files |
| Phase 04 P04 | 8m 17s | 2 tasks | 5 files |
| Phase 04 P05 | 3m 33s | 2 tasks | 5 files |
| Phase 04 P06 | 4m 41s | 1 tasks | 7 files |
| Phase 04 P07 | 1m 54s | 1 tasks | 7 files |
| Phase 04 P08 | 4m 44s | 1 tasks | 7 files |
| Phase 04 P09 | 6m | 1 tasks | 1 files |
| Phase 05 P01 | 5m | 2 tasks | 4 files |

## Session

Last session: 2026-04-28T06:39:51.866Z
Stopped At: Completed 05-01-PLAN.md
Resume File: None

**Planned Phase:** 05 (spec-split-checkpoint) — 7 plans — 2026-04-27T19:16:27.225Z
