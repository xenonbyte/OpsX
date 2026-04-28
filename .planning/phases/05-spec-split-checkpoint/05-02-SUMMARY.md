---
phase: 05-spec-split-checkpoint
plan: 02
subsystem: workflow-runtime
tags: [spec-validator, checkpoint, deterministic-tests, split-spec-review]
requires:
  - phase: 05-01
    provides: Canonical `spec-split-checkpoint` schema/workflow/store contract and checkpoint persistence aliasing.
provides:
  - Reusable split-spec parser and deterministic finding engine in `lib/spec-validator.js`.
  - SPEC-02 regression fixtures that lock duplicate/conflict/coverage/fenced-code detection behavior.
affects: [phase-05-wave1, 05-03, spec-split-runner, workflow-runtime, SPEC-02]
tech-stack:
  added: []
  patterns:
    - deterministic spec-review heuristics using local token overlap and fenced-block scanning only
    - stable finding codes with existing-artifact patch targets (`proposal`, `specs`, concrete spec paths)
key-files:
  created: [lib/spec-validator.js, .planning/phases/05-spec-split-checkpoint/05-02-SUMMARY.md]
  modified: [scripts/test-workflow-runtime.js]
key-decisions:
  - "Implement split-spec validation as a standalone CommonJS module and keep workflow integration decoupled for 05-03 wiring."
  - "Use deterministic local heuristics only (no markdown parser dependency, no LLM/external calls) to satisfy SPEC-02 repeatability."
patterns-established:
  - "Per-file requirement/scenario parsing ignores fenced headings while still scanning fenced bodies for hidden normative content."
  - "SPEC-02 findings are enforced by exact-name regression fixtures and concrete patch-target assertions."
requirements-completed: [SPEC-02]
duration: 3m
completed: 2026-04-28
---

# Phase 05 Plan 02: Split-Spec Validator and SPEC-02 Regressions Summary

**A deterministic split-spec validator now parses specs per file, detects all eight SPEC-02 failure modes, and is locked by fixture-based regression tests.**

## Performance

- **Duration:** 3m
- **Started:** 2026-04-28T06:42:45Z
- **Completed:** 2026-04-28T06:45:30Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added `lib/spec-validator.js` with the exact exported API: `collectSpecSplitEvidence`, `parseSpecFile`, and `reviewSpecSplitEvidence`.
- Implemented deterministic detection for `proposal-coverage-gap`, `scope-expansion-unapproved`, `duplicate-requirement-id`, `duplicate-behavior-likely`, `conflicting-requirements`, `spec-empty`, `scenario-missing`, and `hidden-requirement-in-fence`.
- Added required SPEC-02 regression tests in `scripts/test-workflow-runtime.js` with exact plan-specified test names and concrete patch-target assertions.

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): Create the reusable spec corpus parser and deterministic finding engine** - `e11cc4f` (`test`)
2. **Task 1 (GREEN): Create the reusable spec corpus parser and deterministic finding engine** - `7c83226` (`feat`)
3. **Task 2: Lock SPEC-02 regression fixtures and deterministic finding coverage** - `2697cea` (`test`)

_Note: Task 1 used TDD and therefore includes RED and GREEN commits._

## Files Created/Modified

- `lib/spec-validator.js` - New reusable parser/evidence/review module for split-spec validation.
- `scripts/test-workflow-runtime.js` - Added RED contract test and five required deterministic SPEC-02 fixtures.
- `.planning/phases/05-spec-split-checkpoint/05-02-SUMMARY.md` - Plan execution summary.

## Decisions Made

- Kept parser implementation string-scan based (fence-aware heading parsing) to avoid dependency expansion and keep behavior deterministic.
- Emitted patch targets only to existing artifacts (`proposal`, `specs`, `specs/<capability>/spec.md`) to match checkpoint artifact constraints.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `lib/spec-validator.js` is ready for `runSpecSplitCheckpoint()` wiring in Plan 05-03.
- SPEC-02 regression coverage is in place and green, so downstream guidance/runtime integration can reuse stable finding codes safely.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: `.planning/phases/05-spec-split-checkpoint/05-02-SUMMARY.md`
- FOUND: `e11cc4f`
- FOUND: `7c83226`
- FOUND: `2697cea`
