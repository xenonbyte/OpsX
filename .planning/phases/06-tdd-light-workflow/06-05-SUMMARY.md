---
phase: 06-tdd-light-workflow
plan: 05
subsystem: workflow-runtime
tags: [tdd-light, generator, parity-gate, command-parity]
requires:
  - phase: 06-02
    provides: Test Plan markers and visible TDD exemption wording in source guidance.
  - phase: 06-03
    provides: task-checkpoint strict/light/off semantics driven by rules.tdd.mode.
  - phase: 06-04
    provides: execution-checkpoint proof fields including completed steps and drift status.
provides:
  - Action-scoped generator note updates for `apply`, `propose`, `continue`, and `ff` to describe shipped TDD-light semantics.
  - Apply-only execution checkpoint note describing persisted proof (`completed TDD steps`, verification command/result, diff, drift).
  - Temporary 12-file Phase 6 prompt parity allowance while keeping strict parity for non-listed files.
affects: [06-06, 06-07, 06-08, 06-09, generated-command-refresh]
tech-stack:
  added: []
  patterns:
    - Keep source-of-truth guidance changes bounded to explicitly refreshed action prompts.
    - Use per-phase mismatch allowlists while preserving strict parity checks outside the allowlist.
key-files:
  created: [.planning/phases/06-tdd-light-workflow/06-05-SUMMARY.md]
  modified: [lib/generator.js, scripts/test-workflow-runtime.js]
key-decisions:
  - "Scope TDD-light wording updates only to apply/propose/continue/ff to avoid repo-wide generated churn before refresh waves."
  - "Expose execution-proof detail only on apply via a dedicated generator helper, leaving other routes unchanged."
  - "Allow temporary mismatch only for the exact 12 Phase 6 prompt files; keep strict parity for all non-listed files."
patterns-established:
  - "Phase-scoped prompt parity windows are declared in runtime tests with explicit file allowlists and source-output assertions."
requirements-completed: [TDD-02, TDD-03, TDD-04]
duration: 1m 50s
completed: 2026-04-28
---

# Phase 06 Plan 05: TDD-Light Workflow Summary

**Generator source-of-truth prompt notes now encode shipped TDD-light checkpoint semantics for the 12 refresh-target prompts, with a bounded temporary parity window for those files only.**

## Performance

- **Duration:** 1m 50s
- **Started:** 2026-04-28T10:21:53Z
- **Completed:** 2026-04-28T10:23:43Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments

- Added `PHASE6_TDD_PROMPT_PATHS` (exact 12 checked-in files) and source-output assertions requiring `rules.tdd.mode`, `RED`, `VERIFY`, `TDD Exemption:`, plus `completed TDD steps` for `apply`.
- Added temporary parity gating that permits mismatch only for those 12 prompt files while keeping strict parity enforcement for all non-listed generated outputs.
- Updated `lib/generator.js` to emit action-scoped planning checkpoint notes for `apply`, `propose`, `continue`, and `ff`, and added apply-only execution checkpoint proof wording via `getExecutionCheckpointNote(actionId)`.

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): Scope Phase 6 prompt wording to the 12 TDD-light action prompts and stage a temporary parity gate** - `2da6a99` (`test`)
2. **Task 1 (GREEN): Scope Phase 6 prompt wording to the 12 TDD-light action prompts and stage a temporary parity gate** - `19a2d60` (`feat`)

_Note: Task 1 is TDD and intentionally split into RED then GREEN commits._

## Files Created/Modified

- `.planning/phases/06-tdd-light-workflow/06-05-SUMMARY.md` - Plan completion summary and verification evidence.
- `scripts/test-workflow-runtime.js` - Added 12-file allowlist constant, generated-output assertions, and bounded parity mismatch gate for Phase 6 prompt refreshes.
- `lib/generator.js` - Added action-scoped planning note wording and apply-only execution-checkpoint proof note helper.

## Decisions Made

- Kept source-of-truth wording changes bounded to the four Phase 6 refresh actions (`apply`, `propose`, `continue`, `ff`) to avoid unrelated command drift.
- Made execution-proof wording route-specific by introducing `getExecutionCheckpointNote(actionId)` and applying extended proof language only to `apply`.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Verification

- `npm run test:workflow-runtime` -> passed (`77 test(s) passed`).
- `rg -n "rules.tdd.mode|TDD Exemption:|completed TDD steps|PHASE6_TDD_PROMPT_PATHS|opsx-apply|opsx-propose|opsx-continue|opsx-ff" lib/generator.js scripts/test-workflow-runtime.js` -> passed.
- `git diff --name-only` after GREEN commit showed only `lib/generator.js`, confirming no `commands/**` file edits in this plan.

## Threat Flags

None.

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Source-of-truth copy now describes shipped TDD-light semantics for the exact 12 target prompts.
- Phase 06 plans 06-08 can refresh Claude/Codex/Gemini checked-in prompts under a bounded mismatch window.
- Phase 06-09 can remove the temporary allowlist and restore strict full-bundle parity.

## Self-Check: PASSED

- FOUND: `.planning/phases/06-tdd-light-workflow/06-05-SUMMARY.md`
- FOUND: `2da6a99`
- FOUND: `19a2d60`
