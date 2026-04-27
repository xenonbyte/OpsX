---
phase: 04-change-state-machine-and-drift-control
plan: 06
subsystem: workflow-runtime
tags: [generated-guidance, claude, parity, drift-warnings, state-machine]
requires:
  - phase: 04-05
    provides: Phase 4 source-of-truth fallback guidance and temporary parity gate for stateful generated actions
provides:
  - Refreshed the bounded Claude stateful action slice (`apply`, `continue`, `ff`, `new`, `onboard`, `propose`, `resume`, `status`) from `buildPlatformBundle('claude')`.
  - Restored checked-in Claude command wording parity for read-only hash-drift warnings and one-group apply behavior.
affects: [phase-04-wave5, generated-command-refresh, claude-command-surface, STATE-02, STATE-03, STATE-07, STATE-08]
tech-stack:
  added: []
  patterns:
    - bounded generated refresh by explicit file slice
    - source-output parity verification before task completion
key-files:
  created: [.planning/phases/04-change-state-machine-and-drift-control/04-06-SUMMARY.md]
  modified: [commands/claude/opsx/apply.md, commands/claude/opsx/continue.md, commands/claude/opsx/ff.md, commands/claude/opsx/new.md, commands/claude/opsx/propose.md, commands/claude/opsx/resume.md, commands/claude/opsx/status.md]
key-decisions:
  - "Regenerate only the plan-listed Claude stateful action files from `buildPlatformBundle('claude')` and avoid hand edits."
  - "Keep scope mechanically bounded: do not touch `commands/claude/opsx.md` or any non-listed generated files."
patterns-established:
  - "Use direct bundle parity checks for listed files before finalizing bounded refresh plans."
requirements-completed: [STATE-02, STATE-03, STATE-07, STATE-08]
duration: 4m 41s
completed: 2026-04-28
---

# Phase 04 Plan 06: Claude Stateful Slice Refresh Summary

**Claude stateful command prompts now match the Phase 4 source-of-truth copy for one-group apply execution and read-only drift-warning behavior.**

## Performance

- **Duration:** 4m 41s
- **Started:** 2026-04-27T16:01:42Z
- **Completed:** 2026-04-27T16:06:23Z
- **Tasks:** 1
- **Files modified:** 7

## Accomplishments

- Regenerated the planned Claude stateful action slice directly from `buildPlatformBundle('claude')`.
- Re-aligned checked-in `apply`, `status`, and `resume` with the exact Phase 4 wording for one-group apply and read-only hash-drift handling.
- Passed runtime verification plus byte-for-byte bundle parity checks for all eight listed paths.

## Task Commits

Each task was committed atomically:

1. **Task 1: Regenerate the bounded Claude stateful-action slice from `buildPlatformBundle('claude')`** - `62c9c6d` (`chore`)

## Files Created/Modified

- `commands/claude/opsx/apply.md` - Refreshed generated fallback guidance for one-group apply execution.
- `commands/claude/opsx/continue.md` - Refreshed generated continuation guidance for persisted-stage routing.
- `commands/claude/opsx/ff.md` - Refreshed generated fast-forward guidance tied to accepted-write hash updates.
- `commands/claude/opsx/new.md` - Refreshed generated new-change scaffold guidance with persisted stage setup.
- `commands/claude/opsx/propose.md` - Refreshed generated propose guidance for accepted-write hash updates.
- `commands/claude/opsx/resume.md` - Refreshed generated read-only resume guidance with hash-drift warning text.
- `commands/claude/opsx/status.md` - Refreshed generated read-only status guidance with hash-drift warning text.

## Decisions Made

- Followed the plan exactly: regenerate from source of truth and keep edits bounded to the listed Claude slice.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Claude stateful command slice is now synchronized with Phase 4 source metadata and ready for subsequent bounded refresh plans.
- Runtime verification remains green after the refresh.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: `.planning/phases/04-change-state-machine-and-drift-control/04-06-SUMMARY.md`
- FOUND: `62c9c6d`
