---
phase: 08-stability-json-and-release-coverage
plan: 01
subsystem: testing
tags: [node14, commonjs, release-gate, test-split]
requires:
  - phase: 07-verify-sync-archive-and-batch-gates
    provides: workflow runtime assertions and gate coverage baseline
provides:
  - Shared workflow runtime test harness in `scripts/test-workflow-shared.js`
  - Topic test contracts for package/generation/state/paths/gates via `registerTests(test, helpers)`
  - Dedicated package and generation topic scripts with standalone execution
  - `npm test` total entrypoint aligned with `npm run test:workflow-runtime`
affects: [08-02, 08-03, 08-04, release-verification]
tech-stack:
  added: []
  patterns: [topic-test-registration, shared-harness, aggregate-runtime-entrypoint]
key-files:
  created:
    - scripts/test-workflow-shared.js
    - scripts/test-workflow-package.js
    - scripts/test-workflow-generation.js
    - scripts/test-workflow-state.js
    - scripts/test-workflow-paths.js
    - scripts/test-workflow-gates.js
  modified:
    - package.json
    - scripts/test-workflow-runtime.js
key-decisions:
  - "Keep `scripts/test-workflow-runtime.js` as compatibility aggregate and register topic scripts in deterministic order."
  - "Move TEST-01 and TEST-02 assertions into dedicated package/generation topic scripts with standalone runners."
  - "Expose `npm test` as the same aggregate entrypoint as `npm run test:workflow-runtime`."
patterns-established:
  - "Topic scripts export `registerTests(test, helpers)` and can run standalone through `runRegisteredTopicTests`."
  - "Shared helper layer centralizes fixture creation, CLI process helpers, parity checks, and hash/path utility helpers."
requirements-completed: [TEST-01, TEST-02]
duration: 6 min
completed: 2026-04-29
---

# Phase 8 Plan 01: Test Split Seam and Package/Generation Topic Extraction Summary

**Shared runtime test harness + package/generation topic split with explicit aggregate `npm test` entrypoint.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-29T02:48:12+08:00
- **Completed:** 2026-04-29T02:53:58+08:00
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Extracted reusable runtime test helpers into `scripts/test-workflow-shared.js` and switched runtime tests to consume this shared layer.
- Introduced deterministic topic registration contract (`registerTests(test, helpers)`) and wired runtime aggregation order.
- Moved package/bin and command-surface parity assertions into `scripts/test-workflow-package.js` and `scripts/test-workflow-generation.js`.
- Added `"test": "node scripts/test-workflow-runtime.js"` while preserving `"test:workflow-runtime"` as the same entrypoint.

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract shared harness + topic registration seam** - `2c37a95` (feat)
2. **Task 2: Move TEST-01/TEST-02 into package/generation topic scripts + wire npm test** - `513d1ff` (feat)

## Files Created/Modified
- `scripts/test-workflow-shared.js` - Shared fixture/process/parity/hash helpers and standalone topic runner.
- `scripts/test-workflow-runtime.js` - Aggregate compatibility runner now registers package/generation/state/paths/gates topics in fixed order.
- `scripts/test-workflow-package.js` - TEST-01 package/bin/install/doc compatibility assertions.
- `scripts/test-workflow-generation.js` - TEST-02 generated parity and banned public-route assertions.
- `scripts/test-workflow-state.js` - Placeholder topic module with `registerTests`.
- `scripts/test-workflow-paths.js` - Placeholder topic module with `registerTests`.
- `scripts/test-workflow-gates.js` - Placeholder topic module with `registerTests`.
- `package.json` - Added `npm test` release-total entrypoint.

## Verification

- `npm run test:workflow-runtime` ✅ (110 passed)
- `node scripts/test-workflow-package.js` ✅ (7 passed)
- `node scripts/test-workflow-generation.js` ✅ (3 passed)
- `npm test` ✅ (110 passed)
- `rg -n "\"test\": \"node scripts/test-workflow-runtime\\.js\"|\"test:workflow-runtime\": \"node scripts/test-workflow-runtime\\.js\"|declared Node 14 engine floor uses compatible CommonJS builtin imports|runtime suite locks renamed skill targets, generated bundles, and checked-in command entries" package.json scripts/test-workflow-package.js scripts/test-workflow-generation.js` ✅

## Decisions Made

- Kept CommonJS + Node `>=14.14.0` contract unchanged; no new dependencies introduced.
- Registered topic scripts in explicit deterministic order: package → generation → state → paths → gates.
- Preserved aggregate compatibility entrypoint (`test:workflow-runtime`) while promoting `npm test` to total preflight entrypoint.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Known Stubs

- `scripts/test-workflow-state.js:6` and `scripts/test-workflow-state.js:7` intentionally keep `registerTests` empty for later Phase 8 plans.
- `scripts/test-workflow-paths.js:6` and `scripts/test-workflow-paths.js:7` intentionally keep `registerTests` empty for later Phase 8 plans.
- `scripts/test-workflow-gates.js:6` and `scripts/test-workflow-gates.js:7` intentionally keep `registerTests` empty for later Phase 8 plans.

## Next Phase Readiness

- Runtime suite split seam is in place and stable; package/generation topic assertions are now isolated and executable.
- Ready for Plan `08-02` to continue topic migration (`state`/`paths`/`gates`) on the same contract.

## Self-Check: PASSED

- Verified required files exist on disk.
- Verified task commits `2c37a95` and `513d1ff` exist in git history.

---
*Phase: 08-stability-json-and-release-coverage*
*Completed: 2026-04-29*
