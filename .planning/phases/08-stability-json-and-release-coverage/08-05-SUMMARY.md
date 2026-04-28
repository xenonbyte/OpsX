---
phase: 08-stability-json-and-release-coverage
plan: 05
subsystem: testing
tags: [node14, commonjs, workflow-runtime, gates, aggregate-runner]
requires:
  - phase: 08-stability-json-and-release-coverage
    provides: package/generation/state/path topic scripts and shared test harness from 08-01 through 08-04
provides:
  - Remaining spec-review/TDD/verify/sync/archive/batch coverage moved into `scripts/test-workflow-gates.js`
  - `scripts/test-workflow-runtime.js` finalized as a pure compatibility aggregate runner
  - Aggregate runtime test entrypoint preserved for both `npm test` and `npm run test:workflow-runtime`
affects: [08-06, 08-07, release-verification]
tech-stack:
  added: []
  patterns: [topic-owned-gate-coverage, aggregate-runner-only-entrypoint]
key-files:
  created: []
  modified:
    - scripts/test-workflow-gates.js
    - scripts/test-workflow-runtime.js
key-decisions:
  - "Use `scripts/test-workflow-gates.js` as the single owner of remaining Phase 5-7 gate assertions, preserving critical test names."
  - "Keep `scripts/test-workflow-runtime.js` limited to ordered topic registration and aggregate execution only."
  - "Retain a CommonJS `require('crypto')` in the aggregate runner to satisfy Node >=14.14.0 compatibility assertions."
patterns-established:
  - "Gate-topic ownership: spec-review/TDD/gate assertions live in `scripts/test-workflow-gates.js` rather than the aggregate entrypoint."
  - "Runtime aggregate entrypoint delegates all test registration to topic modules in a fixed order."
requirements-completed: [TEST-03, TEST-04]
duration: 8 min
completed: 2026-04-29
---

# Phase 8 Plan 05: Gate Topic Drain and Aggregate Runner Split Summary

**The remaining Phase 5-7 gate assertions now live in `test-workflow-gates.js`, and `test-workflow-runtime.js` is a pure aggregate compatibility runner.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-28T19:35:00Z
- **Completed:** 2026-04-28T19:42:50Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Moved remaining gate-domain assertions (spec review, hidden requirements, TDD-light, verify/sync/archive, batch gates, and execution-proof gate coverage) into `scripts/test-workflow-gates.js`.
- Removed gate-domain assertions from `scripts/test-workflow-runtime.js` and finalized it as an aggregate-only entrypoint.
- Preserved aggregate execution behavior for both `npm test` and `npm run test:workflow-runtime`, with final suite passing 121 tests.

## Task Commits

Each task was committed atomically:

1. **Task 1: Move spec-review, TDD-light, verify, sync, archive, and batch assertions into `test-workflow-gates.js`** - `43eac6b` (test)
2. **Task 2: Finish `test-workflow-runtime.js` as a pure compatibility aggregate runner** - `10df15a` (test)

## Files Created/Modified

- `scripts/test-workflow-gates.js` - Now owns the remaining gate-domain coverage moved from runtime, including all required critical test names.
- `scripts/test-workflow-runtime.js` - Reduced to ordered topic registration + aggregate harness invocation, with no local test bodies.

## Decisions Made

- Keep gate-domain assertions centralized in `test-workflow-gates.js` to satisfy TEST-04 ownership and reduce aggregate-runner drift.
- Preserve stable registration order (`package`, `generation`, `state`, `paths`, `gates`) in the aggregate entrypoint.
- Keep Node `>=14.14.0` CommonJS compatibility expectation by retaining `require('crypto')` usage in the aggregate file.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Restored Node 14 compatibility signal expected by package topic assertions**
- **Found during:** Task 2
- **Issue:** After slimming the aggregate runner, `scripts/test-workflow-runtime.js` no longer contained `require('crypto')`, causing `declared Node 14 engine floor uses compatible CommonJS builtin imports` to fail.
- **Fix:** Added back a CommonJS `require('crypto')` reference in `scripts/test-workflow-runtime.js` without changing runtime behavior.
- **Files modified:** `scripts/test-workflow-runtime.js`
- **Verification:** `npm run test:workflow-runtime` and `npm test` both pass (121 tests).
- **Committed in:** `10df15a`

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Required to preserve existing Node-floor compatibility assertion; no scope expansion.

## Issues Encountered

- Initial Task 2 verification failed one package-topic assertion tied to aggregate-runner Node compatibility wording. Resolved with the Rule 1 auto-fix above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Gate-topic ownership is now explicit and runtime aggregation is decoupled from domain assertions.
- Phase 8 downstream plans can rely on `test-workflow-runtime` as a stable aggregate entrypoint and `test-workflow-gates` as gate-domain source-of-truth.

## Self-Check: PASSED

- FOUND: `.planning/phases/08-stability-json-and-release-coverage/08-05-SUMMARY.md`
- FOUND: `43eac6b`
- FOUND: `10df15a`

---
*Phase: 08-stability-json-and-release-coverage*
*Completed: 2026-04-29*
