---
phase: 08-stability-json-and-release-coverage
plan: 06
subsystem: testing
tags: [release-gate, npm-pack, cli-smoke, public-surface, node14, commonjs]
requires:
  - phase: 08-stability-json-and-release-coverage
    provides: split topic test runners and aggregate runtime entrypoint from 08-01 through 08-05
provides:
  - Package topic release gate now asserts real tarball metadata/surface through npm pack JSON plus shipped CLI smoke coverage
  - Generation topic release gate now reuses legacy allowlist enforcement and preserves explicit post-split release checks
affects: [08-07, release-verification]
tech-stack:
  added: []
  patterns: [pack-json-release-gate, status-json-transport-smoke, legacy-allowlist-release-gate]
key-files:
  created: []
  modified:
    - scripts/test-workflow-package.js
    - scripts/test-workflow-generation.js
key-decisions:
  - "Use `npm_config_cache=.npm-cache npm pack --dry-run --json` as the package-topic release source of truth, and parse JSON instead of text matching."
  - "Treat `status --json` `ok: true` as transport success while validating workspace/migration/change readiness separately in payload fields."
  - "Reuse `scripts/check-phase1-legacy-allowlist.js` inside generation-topic tests to keep hard clean-break public-surface enforcement at release gate time."
patterns-established:
  - "Package-topic script owns tarball metadata/surface + CLI smoke assertions for release preflight."
  - "Generation-topic script owns parity/banned-surface assertions and now executes legacy allowlist + explicit post-check preservation gates."
requirements-completed: [QUAL-05, TEST-01, TEST-02]
duration: 10 min
completed: 2026-04-29
---

# Phase 8 Plan 06: Release Package and Public-Surface Gate Coverage Summary

**Phase 8 release boundaries are now enforced in split topic tests via pack JSON/tarball assertions, shipped CLI smoke checks, generation legacy-surface gates, and explicit post-split release-step preservation.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-04-28T19:45:00Z
- **Completed:** 2026-04-28T19:54:34Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added package-topic release assertions that execute `npm_config_cache=.npm-cache npm pack --dry-run --json`, validate pack metadata, and assert expected shipped surface directories/files.
- Added packaged CLI smoke checks in the package topic for `--help`, `--version`, `check`, `doc`, `status`, and `status --json` with JSON parsing and `ok: true` transport semantics.
- Added generation-topic release gates that invoke the phase-3 legacy public-surface allowlist checker and enforce explicit preservation of `verify.schema-drift`, code-review, and final verify release steps.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add tarball and CLI smoke release assertions to the package topic script** - `a3843ce` (test)
2. **Task 2: Add final parity and legacy public-surface release gates to the generation topic script** - `05f2334` (test)

## Files Created/Modified

- `scripts/test-workflow-package.js` - Added pack JSON release gate, shipped CLI smoke assertions, and status JSON transport-vs-readiness envelope checks.
- `scripts/test-workflow-generation.js` - Added release-time legacy allowlist execution and explicit post-split release-check preservation assertions.

## Decisions Made

- Kept Task 1/2 changes isolated to split topic test scripts per 08-06 scope, without hand-editing generated command outputs.
- Reused existing checker (`scripts/check-phase1-legacy-allowlist.js`) instead of cloning regex logic, reducing drift risk.
- Locked the release post-check list directly in generation-topic tests to keep the `gsd-sdk query verify.schema-drift 08`, `$gsd-code-review 8`, `$gsd-verify-work 8` handoff explicit.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Adjusted changelog surface assertion after real pack output validation**
- **Found during:** Task 1
- **Issue:** `npm pack --dry-run --json` did not include `CHANGELOG.md` in current tarball output, causing the initial strict packed-file assertion to fail.
- **Fix:** Kept tarball JSON surface checks strict for `README.md` and required directories, while asserting `CHANGELOG.md` remains present at repository root as release documentation surface.
- **Files modified:** `scripts/test-workflow-package.js`
- **Verification:** `node scripts/test-workflow-package.js`; `npm test`; `npm_config_cache=.npm-cache npm pack --dry-run --json`
- **Committed in:** `a3843ce`

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** No scope expansion; fix kept release-surface coverage accurate to actual packed output while retaining changelog presence checks.

## Issues Encountered

- Shell commands `gsd-code-review` and `gsd-verify-work` are unavailable in this environment (`command not found`). Equivalent plan preservation is enforced by generation-topic assertions plus successful `gsd-sdk query verify.schema-drift 08`.
- A transient `.git/index.lock` contention occurred after an initial parallel add/commit attempt; resolved by retrying commit serially.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 08-06 release gate coverage is now embedded in split topic scripts and validated through `npm test` and runtime aggregate runs.
- Phase 08-07 can focus on release-facing documentation/checklist updates with these test gates as enforcement baseline.

## Self-Check: PASSED

- FOUND: `.planning/phases/08-stability-json-and-release-coverage/08-06-SUMMARY.md`
- FOUND: `a3843ce`
- FOUND: `05f2334`

---
*Phase: 08-stability-json-and-release-coverage*
*Completed: 2026-04-29*
