---
phase: 05-spec-split-checkpoint
plan: 01
subsystem: workflow-runtime
tags: [checkpoint-catalog, schema, change-store, regression-tests]
requires:
  - phase: 04-04
    provides: checkpoint persistence helpers and accepted-write state flow in `lib/change-store.js`
  - phase: 04-09
    provides: strict runtime contract validation and parity-gated regression harness
provides:
  - Canonical `spec-split-checkpoint` schema/workflow contract for the pre-design planning gate.
  - Stable checkpoint alias normalization to persisted `checkpoints.specSplit` without changing existing checkpoint slots.
  - Wave 0 regression coverage that locks checkpoint ordering, persistence round-trip, and validator health.
affects: [phase-05-wave1, spec-validator-integration, workflow-runtime, SPEC-01]
tech-stack:
  added: []
  patterns:
    - canonical checkpoint ids in schema/output with persisted-key alias normalization in `change-store`
    - checkpoint catalog drift prevention via runtime contract tests in `scripts/test-workflow-runtime.js`
key-files:
  created: [.planning/phases/05-spec-split-checkpoint/05-01-SUMMARY.md]
  modified: [schemas/spec-driven/schema.json, lib/workflow.js, lib/change-store.js, scripts/test-workflow-runtime.js]
key-decisions:
  - "Keep `spec-split-checkpoint` as the only canonical public id while normalizing persisted aliases (`spec-split-checkpoint`, `spec-split`, `specSplit`) to `checkpoints.specSplit`."
  - "Reuse existing Phase 4 checkpoint persistence and validator contracts instead of introducing new artifact types or new checkpoint files."
patterns-established:
  - "Checkpoint alias maps must be explicit and covered by normalize/write/read round-trip tests."
  - "New checkpoint ids must be added to `DEFAULT_CHECKPOINT_IDS` so `validateCheckpointContracts()` fails fast on schema drift."
requirements-completed: [SPEC-01]
duration: 5m
completed: 2026-04-28
---

# Phase 05 Plan 01: Spec-Split Catalog and Wave 0 Contracts Summary

**Phase 5 now ships a canonical pre-design `spec-split-checkpoint` contract wired through schema, workflow defaults, persisted state aliasing, and runtime regression tests.**

## Performance

- **Duration:** 5m
- **Started:** 2026-04-28T06:34:30Z
- **Completed:** 2026-04-28T06:39:15Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Added `spec-split-checkpoint` to the schema checkpoint catalog with trigger `after-specs-before-design` and insertion `after specs / before design`.
- Extended workflow checkpoint defaults and pass-path semantics so `spec-split-checkpoint` PASS leads to `Proceed to design.` while `spec-checkpoint` stays the later design-before-tasks gate.
- Extended `lib/change-store.js` with a dedicated `specSplit` slot and explicit alias normalization for checkpoint persistence.
- Locked Wave 0 regression contracts in `scripts/test-workflow-runtime.js` using exact plan-required test names for ordering, round-trip persistence, and contract-validator health.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add the pre-design checkpoint catalog and persisted alias mapping (RED)** - `cf2367a` (`test`)
2. **Task 1: Add the pre-design checkpoint catalog and persisted alias mapping (GREEN)** - `825c9c5` (`feat`)
3. **Task 2: Add Wave 0 regression coverage for checkpoint ordering and persistence** - `9cb5e64` (`test`)

_Note: Task 1 used TDD and therefore includes RED and GREEN commits._

## Files Created/Modified

- `.planning/phases/05-spec-split-checkpoint/05-01-SUMMARY.md` - Plan execution summary, verification outcomes, and continuity metadata.
- `schemas/spec-driven/schema.json` - Adds canonical `spec-split-checkpoint` definition and placement metadata.
- `lib/workflow.js` - Registers `spec-split-checkpoint` in default contract validation set and maps PASS next-step text to design.
- `lib/change-store.js` - Adds `checkpoints.specSplit` default slot plus explicit alias normalization for canonical and shorthand split-checkpoint ids.
- `scripts/test-workflow-runtime.js` - Adds/renames Wave 0 regression tests for schema order, persistence round-trip, and checkpoint contract validation.

## Decisions Made

- Persisted checkpoint state continues using the existing Phase 4 store model; no new checkpoint artifact type was introduced.
- Canonical checkpoint ids remain stable for external/runtime output, while persistence accepts alias forms strictly at the store boundary.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 5 Wave 0 contract is now stable: later validator/guidance plans can rely on canonical schema id, workflow catalog entry, and persisted `specSplit` slot.
- Regression suite remains green with `npm run test:workflow-runtime`.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: `.planning/phases/05-spec-split-checkpoint/05-01-SUMMARY.md`
- FOUND: `cf2367a`
- FOUND: `825c9c5`
- FOUND: `9cb5e64`
