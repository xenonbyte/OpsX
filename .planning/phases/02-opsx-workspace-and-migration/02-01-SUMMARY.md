---
phase: 02-opsx-workspace-and-migration
plan: "01"
subsystem: testing
tags: [opsx, migration, gitignore, regression]
requires:
  - phase: 02-opsx-workspace-and-migration
    provides: "02-02 migration core (`runMigration`, scaffold generation) and 02-03 CLI wiring made real migrate/status regression possible."
provides:
  - "Wave 0 migration regression coverage for dry-run, execute, and default-abort flows via public CLI."
  - "Legacy shared-home migration fixture coverage rooted at `~/.openspec/commands/openspec.md` and `~/.openspec/skills/openspec/**`."
  - "Canonical `.opsx` gitignore track/ignore policy validated with real `git check-ignore -v` assertions."
affects: [02-04, DIR-03, DIR-04, DIR-05, DIR-06, DIR-07]
tech-stack:
  added: []
  patterns:
    - "Migration regression fixtures isolate repo/home state in temp directories and assert deterministic CLI text output."
    - "Git ignore policy is validated against actual git semantics instead of static string checks."
key-files:
  created:
    - .planning/phases/02-opsx-workspace-and-migration/02-01-SUMMARY.md
  modified:
    - scripts/test-workflow-runtime.js
    - .gitignore
key-decisions:
  - "Keep migration assertions string-exact for required `MOVE`/`CREATE` lines to lock dry-run contract."
  - "Use non-verbose `git check-ignore` exit status for trackability and verbose output for rule provenance."
patterns-established:
  - "Wave 0 migration tests now cover repo + shared-home moves and abort invariants through `bin/opsx.js`."
  - "`.gitignore` policy remains explicit with ordered allow/deny rules for `.opsx` workflow artifacts."
requirements-completed:
  - DIR-03
  - DIR-04
  - DIR-05
  - DIR-06
  - DIR-07
duration: 10m
completed: 2026-04-27
---

# Phase 02 Plan 01: Migration Regression and Gitignore Policy Summary

Deterministic migration CLI regression coverage now validates dry-run, execute, abort, and `.opsx` git policy behavior end-to-end.

## Performance

- **Duration:** 10m
- **Started:** 2026-04-27T04:36:00Z
- **Completed:** 2026-04-27T04:46:02Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added explicit legacy fixture builders in `scripts/test-workflow-runtime.js` for both repo (`openspec/`) and shared-home (`~/.openspec/`) migration inputs.
- Added migration regression tests covering `opsx migrate --dry-run`, `opsx migrate` execute behavior, and default-abort conflict protection with legacy tree preservation assertions.
- Replaced legacy `.gitignore` keep-track behavior with canonical `.opsx` tracked/ignored rules and validated them using real `git check-ignore -v` output in the runtime test suite.

## Task Commits

Each completed task was committed atomically:

1. **Task 1: Add legacy repo/home migration fixtures and executable CLI assertions** - `3da2dd2` (test)
2. **Task 2: Replace legacy keep-track rules with canonical `.opsx` gitignore policy and verify through git** - `6461018` (feat)

## Files Created/Modified

- `.gitignore` - canonical `.opsx` track/ignore policy (`config/active/changes/specs/archive` tracked, `cache/tmp/logs` ignored).
- `scripts/test-workflow-runtime.js` - migration fixture helpers and regression tests for dry-run/execute/abort plus gitignore policy via `git check-ignore`.

## Decisions Made

- Kept required migration dry-run assertions exact-string based for mandated `MOVE` and `CREATE` output lines.
- Split git policy verification into two checks: trackability via non-verbose exit codes, and ignore provenance via verbose rule output.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected gitignore regression expectation for directory-pattern precedence**
- **Found during:** Task 2
- **Issue:** Initial test assumed ignored files would always match `*.**` rules, but git reported the directory-level ignore rule first (for example `.opsx/cache/`).
- **Fix:** Updated assertions to accept the exact matching rule set for each scratch path while still requiring `git check-ignore -v` proof.
- **Files modified:** `scripts/test-workflow-runtime.js`
- **Verification:** `npm run test:workflow-runtime`
- **Committed in:** `6461018`

---

**Total deviations:** 1 auto-fixed (1 Rule 1 bug)
**Impact on plan:** Auto-fix kept verification aligned with real git behavior; no scope expansion.

## Issues Encountered

- `git check-ignore -v` returns the first effective ignore hit for scratch paths, which can be the directory rule instead of the recursive `**` rule.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `02-04` documentation/template updates can now rely on enforced migration + gitignore regression coverage in the fast runtime suite.
- Phase 2 verification now has one stable command (`npm run test:workflow-runtime`) that includes migration and gitignore guards.

---
*Phase: 02-opsx-workspace-and-migration*
*Completed: 2026-04-27*

## Self-Check: PASSED

- FOUND: `.planning/phases/02-opsx-workspace-and-migration/02-01-SUMMARY.md`
- FOUND: `3da2dd2`
- FOUND: `6461018`
