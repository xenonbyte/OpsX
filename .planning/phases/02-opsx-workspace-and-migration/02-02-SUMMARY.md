---
phase: 02-opsx-workspace-and-migration
plan: "02"
subsystem: migration
tags: [opsx, migration, workspace, state]
requires:
  - phase: 02-opsx-workspace-and-migration
    provides: Plan order was repaired so migration core executes before regression tests.
provides:
  - "Canonical `.opsx` workspace path helpers"
  - "Safe legacy `openspec/` and `~/.openspec/` migration plan service"
affects: [02-03, 02-01, DIR-03, DIR-04, DIR-05, DIR-06]
tech-stack:
  added: []
  patterns:
    - "Migration dry-run and execute both consume a single operation plan."
key-files:
  created:
    - lib/workspace.js
    - lib/migrate.js
  modified: []
key-decisions:
  - "Keep scaffold generation minimal and non-overwriting; Phase 4 still owns the full state machine."
  - "Migrate real legacy shared-home assets from `~/.openspec/commands/openspec.md` and `~/.openspec/skills/openspec/**` to canonical OpsX targets."
patterns-established:
  - "Filesystem migration is planned first, preflighted, and then executed with moves before scaffold creation."
requirements-completed:
  - DIR-03
  - DIR-04
  - DIR-05
  - DIR-06
duration: 18m
completed: 2026-04-27
---

# Phase 02 Plan 02: Migration Core Summary

Built the reusable migration core that later CLI wiring can call without embedding filesystem behavior in `lib/cli.js`.

## Performance

- **Duration:** 18m
- **Completed:** 2026-04-27
- **Tasks:** 2
- **Files created:** 2

## Accomplishments

- Added `lib/workspace.js` with canonical `.opsx` path helpers and non-overwriting scaffold writers for `active.yaml`, `state.yaml`, `context.md`, and `drift.md`.
- Added `lib/migrate.js` with `createMigrationPlan`, `formatMigrationPlan`, `runMigration`, and `getMigrationStatus`.
- Encoded default-abort behavior when canonical project or shared-home destinations already exist.
- Preserved dry-run safety: dry-run formats the same move/create plan used by execute mode and performs no writes.
- Covered real legacy shared-home source assets: `~/.openspec/.opsx-config.yaml`, `~/.openspec/manifests`, `~/.openspec/skills/openspec`, and `~/.openspec/commands/openspec.md`.

## Task Commits

Each completed task was committed atomically:

1. **Task 1: Create `lib/workspace.js` for canonical path resolution and honest scaffold generation** - `1456101` (feat)
2. **Task 2: Create `lib/migrate.js` with one immutable plan for dry-run, execute, and status inspection** - `95a0a48` (feat)

## Files Created/Modified

- `lib/workspace.js` - canonical project/change path helpers plus minimal state/context/drift scaffold generation.
- `lib/migrate.js` - migration plan builder, dry-run formatter, execute-mode mover, and migration status inspector.

## Decisions Made

- Treat unknown legacy shared-home entries and `~/.openspec/backups` as warning-only candidates rather than automatic move targets.
- Generate migration scaffolds only after moves complete, and only when each target file is missing.
- Keep `state.yaml` and `context.md` honest placeholders instead of inferring Phase 4 workflow transitions.

## Verification

- `npm run test:workflow-runtime` ✅
- `rg -n "createMigrationPlan|formatMigrationPlan|runMigration|getMigrationStatus|OpsX migration plan \\(dry-run\\)|MOVE openspec/config.yaml -> \\.opsx/config\\.yaml|MOVE ~\\/\\.openspec/\\.opsx-config\\.yaml -> ~\\/\\.opsx/config\\.yaml|MOVE ~\\/\\.openspec/skills/openspec -> ~\\/\\.opsx/skills/opsx|MOVE ~\\/\\.openspec/commands/openspec\\.md -> ~\\/\\.opsx/commands/opsx\\.md" lib/migrate.js` ✅
- `node -e` module export check for all four migration functions ✅
- Temp repo/home smoke: dry-run performed zero writes, execute created `.opsx/config.yaml`, `.opsx/changes/demo/change.yaml`, state/context/drift scaffolds, `~/.opsx/commands/opsx.md`, and `~/.opsx/skills/opsx/SKILL.md` ✅

## Deviations from Plan

- `02-01` was initially attempted first and correctly blocked because it asserted real `opsx migrate` behavior before the migration core and CLI wiring existed.
- The phase plan order was repaired before this plan executed: `02-02` now precedes `02-03`, `02-01`, and `02-04`.

## Issues Encountered

- The first executor stream disconnected after committing Task 1 and leaving `lib/migrate.js` untracked. The orchestrator spot-check showed no summary and only one task commit, so Task 2 and this summary were completed manually.

## User Setup Required

None.

## Next Phase Readiness

- `02-03` can now import `runMigration` and `getMigrationStatus` from `lib/migrate.js`.
- `02-01` should run after `02-03` so its CLI migration regression tests can assert real public command behavior.

---
*Phase: 02-opsx-workspace-and-migration*
*Completed: 2026-04-27*

## Self-Check: PASSED

- FOUND: `.planning/phases/02-opsx-workspace-and-migration/02-02-SUMMARY.md`
- FOUND: `1456101`
- FOUND: `95a0a48`
