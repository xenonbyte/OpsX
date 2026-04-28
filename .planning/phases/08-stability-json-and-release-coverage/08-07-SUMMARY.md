---
phase: 08-stability-json-and-release-coverage
plan: 07
subsystem: docs
tags: [release-checklist, status-json, docs-hardening, preflight-gate, path-glob]
requires:
  - phase: 08-stability-json-and-release-coverage
    provides: split topic test runners and release gate coverage through 08-06
provides:
  - Canonical release checklist at docs/release-checklist.md with exact prepublish commands
  - Release-facing docs aligned to status JSON envelope semantics and npm test preflight contract
  - Runtime guidance docs aligned to shared path/glob utility boundary
affects: [phase-08-closeout, release-verification, operator-docs]
tech-stack:
  added: []
  patterns: [canonical-release-checklist, transport-vs-readiness-doc-separation, explicit-route-doc-contract]
key-files:
  created:
    - docs/release-checklist.md
  modified:
    - README.md
    - README-zh.md
    - docs/commands.md
    - docs/runtime-guidance.md
    - CHANGELOG.md
key-decisions:
  - "Keep docs/release-checklist.md as the single canonical release gate source for Phase 8."
  - "Document `ok: true` as transport success while keeping workflow readiness in workspace/migration/changeStatus/warnings/errors."
  - "Preserve explicit-only public routes and avoid standalone `$opsx` wording in release-facing docs."
patterns-established:
  - "Release docs and checklist now mirror the same split test/runtime gate used by npm test."
  - "Checklist codifies local npm cache override and post-test schema/review/UAT handoff commands."
requirements-completed: [QUAL-05, QUAL-06, TEST-01, TEST-02, TEST-03, TEST-04]
duration: 5 min
completed: 2026-04-29
---

# Phase 8 Plan 07: Release Docs and Checklist Summary

**Phase 8 now closes with a canonical release checklist plus operator-facing docs that match shipped `status --json`, path/glob stability boundaries, and `npm test` preflight behavior.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-28T19:59:10Z
- **Completed:** 2026-04-28T20:04:44Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Updated README (EN/ZH), commands docs, and runtime guidance to document `npm test` preflight, `opsx status --json`, and `ok: true` transport semantics.
- Added `docs/release-checklist.md` as the canonical Phase 8 prepublish gate with exact commands, pass/fail criteria, and JSON transport-vs-readiness notes.
- Updated changelog v3.0 highlights with Phase 8 release-hardening and checklist location.

## Task Commits

Each task was committed atomically:

1. **Task 1: Refresh README and command/runtime docs to match the shipped Phase 8 contract** - `4aff80d` (docs)
2. **Task 2: Add the canonical release checklist and verify the documented final gate** - `f79c62b` (docs)

## Files Created/Modified

- `README.md` - Added `status --json`, explicit-route constraint note, and `npm test` release preflight section.
- `README-zh.md` - Added parallel Chinese updates for `status --json`, route constraints, and `npm test` preflight.
- `docs/commands.md` - Added machine-readable `status --json` envelope contract and `ok: true` transport semantics.
- `docs/runtime-guidance.md` - Documented `lib/path-utils.js` / `lib/glob-utils.js` stabilization boundary and release gate reminder.
- `docs/release-checklist.md` - New canonical prepublish checklist with exact Phase 8 gate commands and expected outcomes.
- `CHANGELOG.md` - Added Phase 8 release-hardening and canonical checklist callouts under v3.0.0.

## Decisions Made

- Checklist commands are documented exactly as release gate source-of-truth, including local npm cache override and post-test schema/review/UAT steps.
- Expected `status --json` states remain exit-0 with readiness diagnostics in payload fields instead of flipping transport success.
- Docs maintain explicit `$opsx-*` / `/opsx-*` route guidance and prohibit standalone `$opsx` usage.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed a forbidden legacy token from the new release checklist**
- **Found during:** Task 2 verification (`npm test`)
- **Issue:** `scripts/check-phase1-legacy-allowlist.js` failed because `docs/release-checklist.md` contained a banned legacy token (`OpenSpec`) in pass/fail prose.
- **Fix:** Updated checklist wording to keep the legacy-surface gate description without the banned token.
- **Files modified:** `docs/release-checklist.md`
- **Verification:** `npm test`; `node scripts/check-phase1-legacy-allowlist.js`
- **Committed in:** `f79c62b`

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** No scope expansion; fix was required for release-gate compliance.

## Issues Encountered

- `gsd-code-review 8`, `$gsd-code-review 8`, `gsd-verify-work 8`, and `$gsd-verify-work 8` are not executable shell commands in this environment (`command not found`). All other release-gate commands passed, and the checklist preserves these required post-test workflow steps explicitly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 8 documentation and canonical release checklist are now aligned with shipped runtime/test behavior.
- Ready for phase closeout verification/transition using the documented gate sequence.

## Self-Check: PASSED

- FOUND: `.planning/phases/08-stability-json-and-release-coverage/08-07-SUMMARY.md`
- FOUND: `4aff80d`
- FOUND: `f79c62b`

---
*Phase: 08-stability-json-and-release-coverage*
*Completed: 2026-04-29*
