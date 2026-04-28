---
gsd_state_version: 1.0
milestone: v3.0
milestone_name: milestone
status: executing
stopped_at: Completed 06-07-PLAN.md
last_updated: "2026-04-28T10:31:39.204Z"
last_activity: 2026-04-28
progress:
  total_phases: 8
  completed_phases: 5
  total_plans: 46
  completed_plans: 44
  percent: 96
---

# State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-04-27)

**Core value:** Agents can reliably continue spec-driven work from disk-backed OpsX artifacts instead of relying on fragile chat history.
**Current focus:** Phase 06 — TDD-Light Workflow

## Current Position

Phase: 06 (TDD-Light Workflow) — EXECUTING
Plan: 7 of 9
Status: Ready to execute
Last activity: 2026-04-28

## Next Action

Run `$gsd-execute-phase 6` to execute the Phase 6 waves, starting with Wave 1.

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
- 2026-04-28: Phase 6 planned into 9 plans across 6 waves; Wave 1 covers `rules.tdd` defaults and task guidance, Waves 2-4 implement checkpoint/persistence/generator source work, Wave 5 refreshes the 12 route prompts for `apply` / `propose` / `continue` / `ff`, and Wave 6 restores strict parity.

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
- Phase 05 Plan 02 implements deterministic split-spec validation in lib/spec-validator.js with no new parser dependency.
- Phase 05 Plan 02 locks SPEC-02 finding codes and concrete patch targets through fixture-based workflow-runtime tests.
- Phase 05 Plan 03 keeps split-spec escalation read-only within checkpoint findings/nextStep; no new routes or spec-review artifact.
- Phase 05 Plan 03 scopes split-spec planning note updates to propose/continue/ff and gates checked-in drift with a temporary 9-file parity exemption.
- Phase 05 Plan 04 refreshed only Claude propose/continue/ff from buildPlatformBundle('claude') to ship spec-split-checkpoint before design.
- Phase 05 Plan 04 narrowed temporary parity assertions to remaining exempt drift so runtime verification stays bounded during staggered prompt refreshes.
- Phase 05 Plan 05 refreshed only the Codex propose/continue/ff prompts from buildPlatformBundle('codex') without manual prose edits.
- Phase 05 Plan 05 kept temporary parity-gate logic unchanged because 05-04 already narrowed checks to remaining exemptions.
- Phase 05 Plan 06 refreshes only Gemini propose/continue/ff planning prompts from buildPlatformBundle('gemini').
- Phase 05 Plan 06 keeps temporary parity-gate logic unchanged because bounded runtime verification already passes.
- Phase 05 Plan 07 removed temporary prompt parity exemptions and restored strict repo-wide generated parity checks.
- Phase 05 Plan 07 locked split-spec planning note assertions on both generated output and checked-in prompts for the same 9 planning routes.
- [Phase 06]: Keep generated prompt refresh bounded to `apply`, `propose`, `continue`, and `ff` across Claude/Codex/Gemini, using a temporary 12-file parity gate before the final repo-wide parity restore.
- [Phase 06] Normalize rules.tdd via normalizeTddConfig() so checkpoint logic always receives strict-safe mode and list defaults.
- [Phase 06] Merge requireFor/exempt lists additively and de-duplicate entries to preserve explicit custom classes without losing defaults.
- Keep Test Plan metadata separate from numbered execution groups for deterministic parsing.
- Require visible TDD Exemption reasons plus VERIFY coverage even for exempt groups.
- Keep TDD enforcement on existing task-checkpoint surface and expose metadata via checkpoint payload instead of adding a new checkpoint id.
- Use explicit TDD Class/TDD Exemption markers as authoritative and keep heuristics conservative (behavior-change/bugfix tokens) to avoid false blocking.
- [Phase 06 Plan 04] Expose normalized execution proof fields on execution-checkpoint results so store persistence can reuse the same payload.
- [Phase 06 Plan 04] Keep richer proof in existing verificationLog/context.md/drift.md artifacts and enforce thin proof via WARN finding execution-proof-missing.
- Phase 06 Plan 05 scoped TDD-light prompt wording to apply/propose/continue/ff only to keep refresh bounded.
- Phase 06 Plan 05 introduced apply-only execution-checkpoint wording for completed TDD steps and proof fields.
- Phase 06 Plan 05 added a temporary 12-file parity allowlist while preserving strict parity for non-listed prompts.
- Phase 06 Plan 06 completion is gated by npm run test:workflow-runtime plus direct four-file Claude parity assertion.
- Phase 06 Plan 07 kept refresh scope strictly bounded to the four plan-listed Codex action prompts.
- Phase 06 Plan 07 used source-of-truth regeneration only and avoided manual edits to checked-in prompt prose.

## Blockers

(None)

## Open Questions

(None)

**Completed Phase:** 1 (OpsX Naming and CLI Surface) — 6/6 plans — verification passed — 2026-04-26
**Completed Phase:** 2 (.opsx/ Workspace and Migration) — 4/4 plans — verification passed — 2026-04-27
**Completed Phase:** 3 (Skill and Command Surface Rewrite) — 11/11 plans — verification passed — 2026-04-27
**Completed Phase:** 4 (Change State Machine and Drift Control) — 9/9 plans — verification passed — 2026-04-27
**Completed Phase:** 5 (Spec-Split Checkpoint) — 7/7 plans — verification passed — 2026-04-28

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
| Phase 05 P02 | 3m | 2 tasks | 2 files |
| Phase 05 P03 | 2m | 2 tasks | 6 files |
| Phase 05 P04 | 2m | 1 tasks | 4 files |
| Phase 05 P05 | 3m | 1 tasks | 3 files |
| Phase 05 P06 | 39s | 1 tasks | 3 files |
| Phase 05 P07 | 3m | 1 tasks | 2 files |
| Phase 06 P01 | 1m 44s | 1 tasks | 3 files |
| Phase 06 P02 | 2 min | 2 tasks | 6 files |
| Phase 06 P03 | 14 min | 1 tasks | 3 files |
| Phase 06 P04 | 2m 45s | 1 tasks | 4 files |
| Phase 06 P05 | 1m 50s | 1 tasks | 2 files |
| Phase 06 P06 | 1m | 1 tasks | 4 files |
| Phase 06 P07 | 1m 29s | 1 tasks | 4 files |

## Session

Last session: 2026-04-28T10:31:39.201Z
Stopped At: Completed 06-07-PLAN.md
Resume File: None

**Next Phase:** 06 (TDD-Light Workflow)

**Planned Phase:** 06 (TDD-Light Workflow) — 9 plans — 2026-04-28T09:20:24.705Z
