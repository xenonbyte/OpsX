---
phase: 04-change-state-machine-and-drift-control
plan: 04
subsystem: workflow-runtime
tags: [state-machine, hash-drift, context-capsule, drift-ledger, apply-guidance]
requires:
  - phase: 04-01
    provides: YAML-backed persisted state normalization and read-only drift baseline tests.
  - phase: 04-02
    provides: `.opsx` new-change skeletons with persisted `INIT` state and sidecar scaffolds.
  - phase: 04-03
    provides: Strict lifecycle routing and read-only status/resume/continue selectors.
provides:
  - Deterministic tracked artifact hashing and explicit drift comparison helpers.
  - Bounded `context.md` capsule rendering and stable-section `drift.md` append helpers.
  - Accepted-write persistence helpers for checkpoint results and one-group apply execution records.
  - Read-only status/apply drift warnings plus one-group apply routing from persisted state.
affects: [phase-04-wave3, phase-04-wave4, runtime-guidance, change-store, workflow-tests]
tech-stack:
  added: []
  patterns:
    - accepted-write-only hash refresh through persistence helpers
    - read-only drift inspection for status/resume/apply guidance
    - one-top-level-task-group apply selection via persisted `active.nextTaskGroup`
key-files:
  created: [lib/change-artifacts.js, lib/change-capsule.js]
  modified: [lib/change-store.js, lib/runtime-guidance.js, scripts/test-workflow-runtime.js]
key-decisions:
  - "Refresh stored artifact hashes only from accepted-write helpers (`recordCheckpointResult` / `recordTaskGroupExecution`)."
  - "Keep status/resume drift handling read-only: warn and reload from disk without mutating `state.yaml`."
  - "Limit apply guidance to one selected top-level task group, prioritizing persisted `active.nextTaskGroup`."
patterns-established:
  - "Tracked artifact hashes are path-keyed (`proposal.md`, `design.md`, `security-review.md`, `tasks.md`, `specs/**/spec.md`) and compared via `detectArtifactHashDrift()`."
  - "`context.md` is regenerated from normalized state plus last verification, and `drift.md` appends timestamped bullets under fixed headings."
requirements-completed: [STATE-03, STATE-05, STATE-06, STATE-08]
duration: 8m 17s
completed: 2026-04-27
---

# Phase 04 Plan 04: Drift/Context Sidecars and Accepted-Write Persistence Summary

**Phase 4 now has deterministic artifact hash drift detection, bounded context/drift sidecar services, and accepted-write helpers that persist one-group apply execution evidence without mutating read-only status paths.**

## Performance

- **Duration:** 8m 17s
- **Started:** 2026-04-27T15:42:12Z
- **Completed:** 2026-04-27T15:50:29Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Added `lib/change-artifacts.js` for deterministic Phase 4 tracked artifact hashing and explicit drift comparison.
- Added `lib/change-capsule.js` for bounded `context.md` rendering and stable-heading `drift.md` ledger appends.
- Extended `lib/change-store.js` and `lib/runtime-guidance.js` with accepted-write checkpoint/task-group persistence and read-only drift-aware one-group apply guidance.
- Added runtime regression coverage for the exact required Task 2 test names and behavior.

## Task Commits

Each task was committed atomically:

1. **Task 1: Create artifact hashing plus bounded context and drift sidecar services**
   - `f017c64` (`test`): RED tests for artifact hash/capsule/ledger contracts.
   - `2dfa8d3` (`feat`): GREEN implementation for `change-artifacts` and `change-capsule`.
2. **Task 2: Persist accepted checkpoint and one-group apply progress without hard-blocking future Phase 7 rules**
   - `a58a5ed` (`test`): RED tests for read-only drift warning, context/drift persistence, and one-group apply routing.
   - `dd49ddb` (`feat`): GREEN implementation for accepted-write helpers and one-group apply/status drift integrations.

## Files Created/Modified

- `lib/change-artifacts.js` - Added tracked artifact SHA-256 hashing and drift comparison helpers.
- `lib/change-capsule.js` - Added context capsule rendering and stable drift ledger append logic.
- `lib/change-store.js` - Added `recordCheckpointResult`, `setActiveTaskGroup`, and `recordTaskGroupExecution` with sidecar updates.
- `lib/runtime-guidance.js` - Added read-only hash drift warnings and one-group apply selection with path warnings.
- `scripts/test-workflow-runtime.js` - Added exact required regression tests and updated persistence-contract assertions.

## Decisions Made

- Persisted hash refresh is restricted to accepted-write flows (`recordCheckpointResult` and `recordTaskGroupExecution`) to prevent silent drift acceptance.
- Read-only status/resume/apply guidance now performs drift inspection without mutating on-disk hashes.
- Apply payload now prioritizes persisted `active.nextTaskGroup` and exposes only one target task group by default.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Existing read-only status test expected warnings to include only legacy sparse-state warnings; updated assertion to include the new planned hash drift warning.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 4 now has durable drift/context sidecar services and accepted-write persistence hooks required by later generated command refresh plans.
- Ready for `04-05-PLAN.md` source-of-truth guidance updates and bounded generated slice refreshes.

## Known Stubs

None.

## Self-Check: PASSED

- Verified required files exist: `lib/change-artifacts.js`, `lib/change-capsule.js`, `lib/change-store.js`, `lib/runtime-guidance.js`, `scripts/test-workflow-runtime.js`, and this summary.
- Verified task commits exist in history: `f017c64`, `2dfa8d3`, `a58a5ed`, `dd49ddb`.
