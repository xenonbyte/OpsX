---
phase: 02-opsx-workspace-and-migration
plan: "03"
subsystem: migration
tags: [opsx, migration, runtime, cli]
requires:
  - phase: 02-opsx-workspace-and-migration
    provides: "Plan 02-02 exposed shared migration services (`runMigration`, `getMigrationStatus`) for CLI wiring."
provides:
  - "Canonical runtime/config path truth under `.opsx/` and `~/.opsx/`."
  - "Real `opsx migrate --dry-run` / `opsx migrate` dispatch through migration services."
  - "Truthful `opsx check` and minimal Phase 2 `opsx status` migration diagnostics."
affects: [02-01, 02-04, DIR-01, DIR-02, DIR-03]
tech-stack:
  added: []
  patterns:
    - "Canonical path helpers remain primary; legacy path helpers are explicit diagnostic-only signals."
    - "CLI migrate/status behavior delegates to migration service outputs instead of placeholders."
key-files:
  created: []
  modified:
    - lib/constants.js
    - lib/config.js
    - lib/install.js
    - lib/runtime-guidance.js
    - lib/cli.js
    - scripts/test-workflow-runtime.js
key-decisions:
  - "Treat legacy `openspec/` and `~/.openspec/` only as migration candidates, never canonical runtime success paths."
  - "Keep status messaging explicit that durable change-state lifecycle behavior remains a Phase 4 concern."
patterns-established:
  - "Canonical `.opsx` runtime loading with `change.yaml` metadata."
  - "Phase-aware status output backed by migration preflight state."
requirements-completed:
  - DIR-01
  - DIR-02
  - DIR-03
duration: 8m
completed: 2026-04-27
---

# Phase 02 Plan 03: Runtime Canonical Paths and CLI Migration Wiring Summary

Canonical `.opsx` runtime path resolution and real `opsx migrate/status` dispatch now run through shared migration services.

## Performance

- **Duration:** 8m
- **Started:** 2026-04-27T04:26:00Z
- **Completed:** 2026-04-27T04:34:22Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Switched canonical runtime constants/config/install flows to `.opsx` and `config.yaml` while adding explicit legacy shared-home detectors.
- Reworked `runCheck()` to report canonical paths first and legacy candidates with required migration recommendation wording.
- Replaced CLI migrate/status placeholders with real migration service wiring and Phase 2 truthful status output.
- Updated runtime workflow fixtures/tests to canonical `.opsx` + `change.yaml` so regression coverage remains green after path truth changes.

## Task Commits

Each task was committed atomically:

1. **Task 1: Canonicalize shared-home and workspace config paths in constants, config, and install/check** - `fb923dd` (feat)
2. **Task 2: Wire real `opsx migrate` and canonical runtime guidance into the CLI** - `c1368e3` (feat)

## Files Created/Modified

- `lib/constants.js` - canonical shared-home/global-config constants now point to `.opsx` and `config.yaml`.
- `lib/config.js` - added exported `getLegacySharedHome()` and `getLegacyGlobalConfigPath()` diagnostic helpers.
- `lib/install.js` - `runCheck()` now reports canonical `.opsx` paths and explicit legacy migration candidates.
- `lib/runtime-guidance.js` - runtime config resolution now uses `.opsx/config.yaml` and per-change `change.yaml`.
- `lib/cli.js` - real migrate dispatch via `runMigration()` and minimal truthful Phase 2 status via `getMigrationStatus()`.
- `scripts/test-workflow-runtime.js` - fixtures and assertions aligned with canonical `.opsx` runtime/shared-home layout and new status semantics.

## Decisions Made

- Keep migration/status logic service-backed and CLI-thin to avoid drift between dry-run and execution behavior.
- Preserve Phase 4 ownership by avoiding any status language that implies durable state-machine lifecycle is already implemented.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated shared-home test assertions after canonical path switch**
- **Found during:** Task 1
- **Issue:** Runtime workflow tests still asserted `~/.openspec` install/manifests paths, causing regressions after canonical constants changed to `~/.opsx`.
- **Fix:** Updated affected test assertions and fixture expectations to canonical `~/.opsx` locations.
- **Files modified:** `scripts/test-workflow-runtime.js`
- **Verification:** `npm run test:workflow-runtime`
- **Committed in:** `fb923dd`

**2. [Rule 3 - Blocking] Canonicalized runtime fixture layout for `.opsx/change.yaml` loading**
- **Found during:** Task 2
- **Issue:** Runtime guidance switched to `.opsx/config.yaml` and `change.yaml`; existing fixture builders still created `openspec/.openspec.yaml`.
- **Fix:** Updated fixture generators and status command test flow to create `.opsx` workspace data and validate real Phase 2 migrate/status behavior.
- **Files modified:** `scripts/test-workflow-runtime.js`
- **Verification:** `npm run test:workflow-runtime`, `node bin/opsx.js status`, `node bin/opsx.js migrate --dry-run`
- **Committed in:** `c1368e3`

---

**Total deviations:** 2 auto-fixed (1 Rule 1 bug, 1 Rule 3 blocker)
**Impact on plan:** Both deviations were required to keep verification truthful and green after canonical-path behavior changed.

## Issues Encountered

- Concurrent `git add` attempts caused an index lock race; resolved by serial staging and then completing commit flow.
- Sandbox denied `.git` index lock creation for one staging step; resolved by re-running `git add`/`git commit` with explicit escalation.

## User Setup Required

None.

## Next Phase Readiness

- `02-01` can now validate real public `opsx migrate --dry-run` and truthful status/check migration messaging.
- `02-04` can document canonical path/runtime behavior as shipped implementation instead of future placeholder text.

---
*Phase: 02-opsx-workspace-and-migration*
*Completed: 2026-04-27*

## Self-Check: PASSED

- FOUND: `.planning/phases/02-opsx-workspace-and-migration/02-03-SUMMARY.md`
- FOUND: `fb923dd`
- FOUND: `c1368e3`
