---
phase: 08-stability-json-and-release-coverage
plan: 02
subsystem: cli
tags: [status-json, node14, commonjs, test-split, migration]
requires:
  - phase: 08-stability-json-and-release-coverage
    provides: topic test split seam and aggregate runtime delegation contract from 08-01
provides:
  - Deterministic `opsx status --json` envelope with expected-state exit-0 transport semantics
  - State-topic runtime coverage for migration/state/resume/continue/status and JSON matrix assertions
  - Aggregate runtime runner delegation that keeps state coverage registered through `scripts/test-workflow-state.js`
affects: [08-03, 08-04, release-verification]
tech-stack:
  added: []
  patterns: [deterministic-json-transport, state-topic-test-ownership, aggregate-runner-delegation]
key-files:
  created: []
  modified:
    - lib/cli.js
    - scripts/test-workflow-state.js
    - scripts/test-workflow-runtime.js
key-decisions:
  - "`ok: true` denotes successful JSON transport for expected workflow states, not workspace readiness."
  - "`status --json` keeps stdout JSON-only and reserves stderr/non-zero exits for exceptional failures."
  - "Migration/state/resume/continue/status assertions live in `scripts/test-workflow-state.js`; runtime aggregate keeps delegation only."
patterns-established:
  - "CLI status transport reuses `getMigrationStatus`, `loadActiveChangePointer`, and `buildStatus` instead of recomputing domain state."
  - "State-topic tests lock deterministic envelope key order and expected-state exit/stderr contract."
requirements-completed: [QUAL-05, TEST-03]
duration: 10 min
completed: 2026-04-29
---

# Phase 8 Plan 02: Status JSON Transport and State Topic Coverage Summary

**Deterministic `opsx status --json` transport plus state-topic regression coverage for migration/state/resume/continue and JSON envelope semantics.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-04-28T18:58:03Z
- **Completed:** 2026-04-28T19:09:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Added `--json` status transport in `lib/cli.js` with deterministic top-level envelope order: `ok`, `version`, `command`, `workspace`, `migration`, `activeChange`, `changeStatus`, `warnings`, `errors`.
- Kept text `opsx status` behavior separate while making JSON expected states exit `0`, stdout JSON-only, and stderr empty.
- Moved migration/state/resume/continue/status assertions from aggregate runtime suite into `scripts/test-workflow-state.js`.
- Added exact `status --json` matrix coverage for missing workspace, missing active change, active blocked state, and exceptional non-zero stderr behavior.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add the deterministic `status --json` envelope and expected-state transport semantics** - `16d39be` (feat)
2. **Task 2: Move TEST-03 coverage into the state topic script and add the JSON status matrix** - `6f40d4e` (test)

## Files Created/Modified
- `lib/cli.js` - Added `--json` boolean parsing and deterministic status envelope transport adapter.
- `scripts/test-workflow-state.js` - Owns migration/state/resume/continue/status tests and new JSON contract matrix.
- `scripts/test-workflow-runtime.js` - Removed migrated state/migration/status blocks; keeps topic registration delegation.

## Verification

- `node scripts/test-workflow-state.js` ✅ (13 passed)
- `npm run test:workflow-runtime` ✅ (111 passed)
- `npm test` ✅ (111 passed)
- `rg -n "BOOLEAN_FLAGS = new Set\\(\\['check', 'doc', 'dry-run', 'help', 'json', 'version'\\]\\)|ok: true|command: 'status'|workspace|migration|activeChange|changeStatus|warnings|errors|getMigrationStatus|loadActiveChangePointer|buildStatus" lib/cli.js` ✅
- `rg -n "opsx status reports truthful migration and onboard guidance when workspace is missing|opsx status --json emits a deterministic envelope for expected workflow states|test-workflow-state" scripts/test-workflow-state.js scripts/test-workflow-runtime.js` ✅

## Decisions Made

- Kept CLI as transport-only adapter over existing libraries (`getMigrationStatus`, `loadActiveChangePointer`, `buildStatus`) to preserve library-first architecture.
- Locked top-level JSON envelope key order explicitly in tests to prevent drift for machine consumers.
- Treated missing workspace/missing active change/blocked status as expected workflow states (`exit 0`) in JSON mode.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed missing YAML dependency in state topic test runtime**
- **Found during:** Task 2 verification (`node scripts/test-workflow-state.js`)
- **Issue:** `scripts/test-workflow-state.js` read `YAML` from helper payload where it was undefined, causing test crashes.
- **Fix:** Imported `yaml` directly in `scripts/test-workflow-state.js` and removed invalid helper destructuring.
- **Files modified:** `scripts/test-workflow-state.js`
- **Verification:** `node scripts/test-workflow-state.js` passed after fix.
- **Committed in:** `6f40d4e` (part of Task 2 commit)

**2. [Rule 1 - Bug] Fixed flaky missing-active-change JSON assertion due to shared fixture residue**
- **Found during:** Task 2 verification (`node scripts/test-workflow-state.js`)
- **Issue:** Prior tests left `.opsx/active.yaml` in shared fixture, making "missing active change" scenario non-deterministic.
- **Fix:** Explicitly removed `.opsx/active.yaml` before running the missing-active JSON scenario.
- **Files modified:** `scripts/test-workflow-state.js`
- **Verification:** JSON matrix test passes consistently with expected activeChange/null assertions.
- **Committed in:** `6f40d4e` (part of Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 Rule 1 bug fixes)  
**Impact on plan:** Both fixes were required to make the planned state-topic and JSON contract verification deterministic and passing.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `opsx status --json` transport contract and state-topic ownership are now locked by focused tests.
- Ready for `08-03` path/glob utility stabilization work on top of this JSON/status baseline.

## Self-Check: PASSED

- Verified summary exists: `.planning/phases/08-stability-json-and-release-coverage/08-02-SUMMARY.md`
- Verified modified files exist: `lib/cli.js`, `scripts/test-workflow-state.js`, `scripts/test-workflow-runtime.js`
- Verified task commits exist in git history: `16d39be`, `6f40d4e`

---
*Phase: 08-stability-json-and-release-coverage*
*Completed: 2026-04-29*
