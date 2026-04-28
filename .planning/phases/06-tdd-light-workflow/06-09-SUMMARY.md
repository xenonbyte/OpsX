---
phase: 06-tdd-light-workflow
plan: 09
subsystem: workflow-runtime
tags: [tdd-light, parity, regression]
requires:
  - phase: 06-06
    provides: Checked-in Claude `apply` / `propose` / `continue` / `ff` prompts refreshed from generator output.
  - phase: 06-07
    provides: Checked-in Codex `apply` / `propose` / `continue` / `ff` prompts refreshed from generator output.
  - phase: 06-08
    provides: Checked-in Gemini `apply` / `propose` / `continue` / `ff` prompts refreshed from generator output.
provides:
  - Strict repo-wide generated-vs-checked-in parity is restored with no Phase 6 mismatch allowlist escape hatch.
  - The same 12 Phase 6 prompt routes are asserted for generated-source wording and checked-in wording.
  - Apply prompts are explicitly asserted to include completed TDD steps and diff summary wording.
affects: [phase-06-closeout, phase-07-quality-gates, generated-command-refresh]
tech-stack:
  added: []
  patterns:
    - Keep bounded prompt-slice content assertions while enforcing strict full-bundle parity.
key-files:
  created: [.planning/phases/06-tdd-light-workflow/06-09-SUMMARY.md]
  modified: [scripts/test-workflow-runtime.js]
key-decisions:
  - "Preserve `PHASE6_TDD_PROMPT_PATHS` as a 12-file assertion scope, but remove all mismatch allowlist behavior from parity checks."
  - "Add explicit checked-in prompt assertions for the same 12 files so shipped text is validated directly."
patterns-established:
  - "Phase-close parity gate: generated/checked-in content assertions remain scoped while `parity.mismatched` is globally strict."
requirements-completed: [TDD-02, TDD-03, TDD-04]
duration: 1m
completed: 2026-04-28
---

# Phase 06 Plan 09: TDD-Light Workflow Summary

**Strict bundle parity is re-locked across Claude/Codex/Gemini while preserving explicit 12-route TDD-light assertions for generated and checked-in prompts.**

## Performance

- **Duration:** 1m
- **Started:** 2026-04-28T10:48:31Z
- **Completed:** 2026-04-28T10:49:23Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Removed temporary Phase 6 mismatch allowlist behavior and restored strict `parity.mismatched === []` checks for every platform bundle.
- Kept source-output assertions scoped to the same 12 Phase 6 prompt files (`apply` / `propose` / `continue` / `ff` across Claude/Codex/Gemini).
- Added checked-in assertions for those exact 12 prompt files, including apply-only checks for `completed TDD steps` and `diff summary`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove temporary Phase 6 allowlist behavior and restore strict parity with explicit checked-in assertions** - `a6a4dd0` (`test`)

## Files Created/Modified

- `.planning/phases/06-tdd-light-workflow/06-09-SUMMARY.md` - Plan completion summary, verification evidence, and self-check.
- `scripts/test-workflow-runtime.js` - Restored strict parity and added explicit checked-in assertions for the 12 Phase 6 prompt routes.

## Decisions Made

- Kept assertion scope constant `PHASE6_TDD_PROMPT_PATHS` at exactly 12 files and added a hard length assertion.
- Removed only the mismatch-escape behavior so Phase 6 closure keeps bounded route checks without weakening global parity.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Verification

- `npm run test:workflow-runtime` -> passed (`77 test(s) passed`).
- `rg -n "rules.tdd.mode|TDD Exemption:|completed TDD steps|diff summary|PHASE6_TDD_PROMPT_PATHS|parity\\.mismatched" scripts/test-workflow-runtime.js` -> passed; confirms Phase 6 prompt contract strings and strict parity assertion are present.
- `rg -n "allowedMismatches|unexpectedMismatches|non-phase6 mismatches" scripts/test-workflow-runtime.js` -> passed (no matches); confirms temporary mismatch allowlist logic is removed.
- `rg -n "checked-in prompt must mention rules.tdd.mode|checked-in prompt must mention TDD Exemption:|checked-in prompt must mention completed TDD steps|checked-in prompt must mention diff summary" scripts/test-workflow-runtime.js` -> passed; confirms explicit checked-in assertions exist for the 12-route contract.

## Threat Flags

None.

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 6 now closes with strict full-bundle parity and no temporary prompt-drift allowances.
- Phase 7 can rely on the restored regression gate as baseline quality coverage.

## Self-Check: PASSED

- FOUND: `.planning/phases/06-tdd-light-workflow/06-09-SUMMARY.md`
- FOUND: `a6a4dd0`
