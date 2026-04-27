---
phase: 04-change-state-machine-and-drift-control
plan: 07
subsystem: workflow-runtime
tags: [generated-guidance, codex, parity, drift-warnings, state-machine]
requires:
  - phase: 04-05
    provides: Phase 4 source-of-truth fallback guidance and temporary parity gate for stateful generated actions
provides:
  - Refreshed the bounded Codex stateful action slice (`apply`, `continue`, `ff`, `new`, `onboard`, `propose`, `resume`, `status`) from `buildPlatformBundle('codex')`.
  - Restored checked-in Codex command wording parity for read-only hash-drift warnings and one-group apply behavior.
affects: [phase-04-wave5, generated-command-refresh, codex-command-surface, STATE-02, STATE-03, STATE-07, STATE-08]
tech-stack:
  added: []
  patterns:
    - bounded generated refresh by explicit file slice
    - source-output parity verification before task completion
key-files:
  created: [.planning/phases/04-change-state-machine-and-drift-control/04-07-SUMMARY.md]
  modified: [commands/codex/prompts/opsx-apply.md, commands/codex/prompts/opsx-continue.md, commands/codex/prompts/opsx-ff.md, commands/codex/prompts/opsx-new.md, commands/codex/prompts/opsx-propose.md, commands/codex/prompts/opsx-resume.md, commands/codex/prompts/opsx-status.md]
key-decisions:
  - "Regenerate only the plan-listed Codex stateful action files from `buildPlatformBundle('codex')` and avoid hand edits."
  - "Keep scope mechanically bounded: do not touch `commands/codex/prompts/opsx.md` or any non-listed generated files."
patterns-established:
  - "Use direct bundle parity checks for listed files before finalizing bounded refresh plans."
requirements-completed: [STATE-02, STATE-03, STATE-07, STATE-08]
duration: 1m 54s
completed: 2026-04-28
---

# Phase 04 Plan 07: Codex Stateful Slice Refresh Summary

**Codex stateful command prompts now match the Phase 4 source-of-truth copy for one-group apply execution and read-only drift-warning behavior.**

## Performance

- **Duration:** 1m 54s
- **Started:** 2026-04-27T16:10:42Z
- **Completed:** 2026-04-27T16:12:36Z
- **Tasks:** 1
- **Files modified:** 7

## Accomplishments

- Regenerated the planned Codex stateful action slice directly from `buildPlatformBundle('codex')`.
- Re-aligned checked-in `apply`, `status`, and `resume` with the exact Phase 4 wording for one-group apply and read-only hash-drift handling.
- Passed runtime verification plus byte-for-byte bundle parity checks for all eight listed paths.

## Task Commits

Each task was committed atomically:

1. **Task 1: Regenerate the bounded Codex stateful prompt slice from `buildPlatformBundle('codex')`** - `b6dbc29` (`chore`)

## Files Created/Modified

- `commands/codex/prompts/opsx-apply.md` - Refreshed generated fallback guidance for one-group apply execution.
- `commands/codex/prompts/opsx-continue.md` - Refreshed generated continuation guidance for persisted-stage routing.
- `commands/codex/prompts/opsx-ff.md` - Refreshed generated fast-forward guidance tied to accepted-write hash updates.
- `commands/codex/prompts/opsx-new.md` - Refreshed generated new-change scaffold guidance with persisted stage setup.
- `commands/codex/prompts/opsx-propose.md` - Refreshed generated propose guidance for accepted-write hash updates.
- `commands/codex/prompts/opsx-resume.md` - Refreshed generated read-only resume guidance with hash-drift warning text.
- `commands/codex/prompts/opsx-status.md` - Refreshed generated read-only status guidance with hash-drift warning text.

## Decisions Made

- Followed the plan exactly: regenerate from source of truth and keep edits bounded to the listed Codex slice.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Codex stateful command slice is now synchronized with Phase 4 source metadata and ready for subsequent bounded refresh plans.
- Runtime verification remains green after the refresh.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: `.planning/phases/04-change-state-machine-and-drift-control/04-07-SUMMARY.md`
- FOUND: `b6dbc29`
