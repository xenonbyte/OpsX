---
phase: 04-change-state-machine-and-drift-control
plan: 03
subsystem: workflow-runtime
tags: [state-machine, runtime-guidance, cli-status, resume-continue]
requires:
  - phase: 04-01
    provides: YAML-backed state normalization and read-only drift contract via `change-store`.
  - phase: 04-02
    provides: `opsx-new` skeletons with persisted `INIT` state and active-change pointer.
provides:
  - Strict local mutation transition table with deterministic continue routing.
  - Read-only status/resume/continue selectors that consume persisted `state.yaml` truthfully.
  - CLI status output that becomes state-aware when `.opsx/config.yaml` exists.
affects: [phase-04-wave2, runtime-guidance, cli, workflow-state]
tech-stack:
  added: []
  patterns:
    - explicit stage/event transition validation with blocking `invalid-transition` results
    - read-model selectors derived from persisted state with no write side effects
key-files:
  created: [lib/change-state.js]
  modified: [lib/runtime-guidance.js, lib/cli.js, scripts/test-workflow-runtime.js]
key-decisions:
  - "Keep continue routing deterministic by using `resolveContinueAction()` against persisted stage data."
  - "Expose state-aware selectors from `runtime-guidance` instead of adding broad CLI workflow execution commands."
patterns-established:
  - "Status payloads now include persisted `stage`, routed `nextAction`, `active.taskGroup`, `warnings`, and `blockers`."
  - "CLI `status` remains truthful for missing workspace/active change while delegating active-change detail rendering to `buildStatusText()`."
requirements-completed: [STATE-02, STATE-07]
duration: 7m 46s
completed: 2026-04-27
---

# Phase 04 Plan 03: State Transition Router and Read-Only Selectors Summary

**Phase 4 now has a strict local lifecycle transition module plus state-aware status/resume/continue read models that route from persisted stage without mutating disk state.**

## Performance

- **Duration:** 7m 46s
- **Started:** 2026-04-27T15:28:49Z
- **Completed:** 2026-04-27T15:36:35Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Added `lib/change-state.js` with exact stage vocabulary, mutation-event constants, blocking invalid-transition results, and continue-action routing.
- Integrated persisted-state selectors into `lib/runtime-guidance.js` via new exports `buildStatusText`, `buildResumeInstructions`, and `buildContinueInstructions`.
- Updated `lib/cli.js` status behavior to use state-aware text when `.opsx/config.yaml` exists while preserving truthful missing-workspace/missing-active guidance.
- Added and updated runtime regression tests for strict transitions, partial-state status/resume behavior, and persisted-stage continue routing.

## Task Commits

Each task was committed atomically:

1. **Task 1: Create the strict local transition table and next-action router**
   - `2a45564` (`test`): RED tests for `change-state` exports, invalid-transition blocking, and stage-based continue routing.
   - `d9046dd` (`feat`): GREEN implementation of `lib/change-state.js` transition table, block payload builder, and continue resolver.
2. **Task 2: Integrate read-only selectors for status/resume/continue**
   - `c9420f6` (`test`): RED tests with exact names for partial-state status/resume and persisted-stage continue routing.
   - `166cdd6` (`feat`): GREEN integration of read-only runtime selectors plus state-aware CLI status output.

## Files Created/Modified

- `lib/change-state.js` - Added strict stage/event transition model and deterministic continue router.
- `lib/runtime-guidance.js` - Added persisted-state view loading and exports for status/resume/continue selector APIs.
- `lib/cli.js` - Reworked `showStatus()` to use state-aware status text for initialized workspaces.
- `scripts/test-workflow-runtime.js` - Added transition/read-model regressions and refreshed status guidance assertions.

## Decisions Made

- Continue routing is now stage-driven (`resolveContinueAction`) rather than inferred only from artifact file presence.
- Read-only status/resume/continue behavior remains non-mutating; selectors consume normalized `state.yaml` and never auto-create state files.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Existing status guidance assertion expected the old Phase 2 placeholder string; updated the runtime test to match the new truthful workspace/onboard guidance output.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 4 now has a stable local lifecycle routing module and selector surface for persisted-state introspection.
- Ready for `04-04` hashing/context/drift/apply-group persistence work to build on this stage vocabulary and routed next-action contract.

## Known Stubs

None.

## Self-Check: PASSED

- Verified summary exists: `.planning/phases/04-change-state-machine-and-drift-control/04-03-SUMMARY.md`.
- Verified task commits exist: `2a45564`, `d9046dd`, `c9420f6`, `166cdd6`.
