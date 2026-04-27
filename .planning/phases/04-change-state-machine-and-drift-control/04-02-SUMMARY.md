---
phase: 04-change-state-machine-and-drift-control
plan: 02
subsystem: workflow-runtime
tags: [state-machine, opsx-new, scaffolding, regression-tests]
requires:
  - phase: 04-01
    provides: YAML-backed state store contract and Wave 0 runtime regression harness.
provides:
  - Narrow `createChangeSkeleton()` filesystem path for `opsx-new` scaffolds.
  - Active-change pointer updates and persisted `INIT` state for new changes.
  - Runtime regression coverage for placeholder scaffold files plus `INIT` lifecycle guarantees.
affects: [phase-04-wave1, phase-04-wave2, runtime-guidance]
tech-stack:
  added: []
  patterns:
    - state-first skeleton initialization via `change-store` helpers
    - placeholder artifact scaffolds that keep lifecycle/checkpoint defaults at INIT/PENDING
key-files:
  created: []
  modified: [lib/workspace.js, scripts/test-workflow-runtime.js]
key-decisions:
  - "Keep 04-02 scope library-first and filesystem-scaffold focused; do not build a broad CLI workflow engine."
  - "Write placeholder planning artifacts for new changes while persisting `state.yaml` as `stage: INIT` with pending checkpoints."
patterns-established:
  - "createChangeSkeleton writes change metadata + placeholder docs, then delegates state/active persistence to `change-store`."
  - "New-change regression tests assert `specs/README.md` scaffolding and explicit non-progression semantics for placeholder design/tasks files."
requirements-completed: [STATE-01, STATE-04]
duration: 6m 4s
completed: 2026-04-27
---

# Phase 04 Plan 02: New-Change Skeleton and INIT-State Contract Summary

**`opsx-new` now creates a complete Phase 4 change skeleton and immediately persists active-pointer + INIT lifecycle state without implying accepted planning progress.**

## Performance

- **Duration:** 6m 4s
- **Started:** 2026-04-27T15:16:51Z
- **Completed:** 2026-04-27T15:22:55Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added `createChangeSkeleton({ repoRoot, changeName, schemaName, createdAt, securitySensitive })` in `lib/workspace.js` for narrow `opsx-new` scaffold creation.
- New skeleton creation now writes `change.yaml`, `proposal.md`, `design.md`, `tasks.md`, `specs/README.md`, `state.yaml`, `context.md`, and `drift.md`, then updates `.opsx/active.yaml`.
- Added plan-mandated runtime regression for `opsx-new` skeleton behavior, including active pointer, `INIT` stage, and placeholder non-progression assertions.

## Task Commits

Each task was committed atomically:

1. **Task 1: Create the narrow `opsx-new` skeleton writer and active-change selection path**
   - `6a9eb6e` (`test`): RED test for full skeleton artifacts and INIT lifecycle defaults.
   - `e9d73aa` (`feat`): GREEN implementation of `createChangeSkeleton` with state-store + active-pointer writes.
2. **Task 2: Add runtime tests that prove the new-change skeleton is complete and still starts at INIT**
   - `345dcce` (`test`): RED test with exact required test name for opsx-new skeleton contract.
   - `499c130` (`feat`): GREEN completion of exact contract assertions (file set, active pointer, INIT stage, placeholder non-progression block).

## Files Created/Modified

- `lib/workspace.js` - Added `createChangeSkeleton()` and new-change context generation; writes placeholder artifacts and delegates persisted lifecycle state to `change-store`.
- `scripts/test-workflow-runtime.js` - Added/updated regression tests for full `opsx-new` skeleton scaffolding and explicit INIT-stage lifecycle guarantees.

## Decisions Made

- Kept skeleton generation bounded to filesystem/state persistence contracts and avoided broader runtime-guidance refactors in this plan.
- Used `change-store` persistence APIs (`writeChangeState`, `writeActiveChangePointer`) as the source of truth for new-change `state.yaml` and `.opsx/active.yaml`.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `opsx-new` now produces durable, resumable, Phase 4-shaped artifacts on disk.
- Wave 2+ plans can integrate state-machine routing and read-model behavior against this persisted INIT contract.

## Known Stubs

None.

## Self-Check: PASSED

- Verified summary exists: `.planning/phases/04-change-state-machine-and-drift-control/04-02-SUMMARY.md`.
- Verified task commits exist: `6a9eb6e`, `e9d73aa`, `345dcce`, `499c130`.
