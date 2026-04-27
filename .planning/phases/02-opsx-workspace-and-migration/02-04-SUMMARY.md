---
phase: 02-opsx-workspace-and-migration
plan: "04"
subsystem: docs
tags: [opsx, migration, docs, templates]
requires:
  - phase: 02-opsx-workspace-and-migration
    provides: "02-01 and 02-03 shipped canonical migration/runtime behavior for docs and template alignment."
provides:
  - "README and README-zh now document shipped `opsx migrate --dry-run` zero-write behavior and default abort semantics."
  - "Customization/runtime docs now describe `.opsx/` and `~/.opsx/` as current canonical paths."
  - "Project templates now include explicit canonical save-path hints for `config.yaml` and `change.yaml`."
affects: [DIR-01, DIR-02, DIR-07, phase-02-verification]
tech-stack:
  added: []
  patterns:
    - "Operator-facing docs mirror executable migration semantics and `.gitignore` policy verbatim."
    - "Template guidance adds save-path comments without altering YAML schema shape."
key-files:
  created:
    - .planning/phases/02-opsx-workspace-and-migration/02-04-SUMMARY.md
  modified:
    - README.md
    - README-zh.md
    - docs/customization.md
    - docs/runtime-guidance.md
    - templates/project/config.yaml.tmpl
    - templates/project/change-metadata.yaml.tmpl
key-decisions:
  - "Mirror tracked/ignored `.opsx` paths exactly from `.gitignore` in public docs to prevent operator drift."
  - "Keep legacy `openspec/` naming only in migration-candidate compatibility notes."
patterns-established:
  - "Both language READMEs carry semantically aligned migration and workspace policy guidance."
  - "Canonical save-path comments are placed at template line 1 for immediate operator visibility."
requirements-completed:
  - DIR-01
  - DIR-02
  - DIR-07
duration: 3m
completed: 2026-04-27
---

# Phase 02 Plan 04: Docs and Template Canonical Path Alignment Summary

Public docs and scaffolding templates now describe Phase 2 `.opsx` migration/runtime behavior as shipped truth.

## Performance

- **Duration:** 3m
- **Started:** 2026-04-27T04:50:57Z
- **Completed:** 2026-04-27T04:54:12Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Updated `README.md` and `README-zh.md` to describe `opsx migrate --dry-run` as zero-write preview and `opsx migrate` default-abort behavior when `.opsx/` already exists.
- Added exact tracked/ignored `.opsx` path policy lists in both language READMEs and aligned them with repository `.gitignore` rules.
- Updated `docs/customization.md` and `docs/runtime-guidance.md` to treat `.opsx/config.yaml`, `change.yaml`, and `~/.opsx/config.yaml` as current canonical runtime semantics.
- Added canonical save-path comments to project templates without changing existing YAML key/value structure.

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite public docs from future-tense migration intent to shipped `.opsx` behavior** - `1318b74` (docs)
2. **Task 2: Add explicit canonical save-path hints to project templates** - `19ff8ac` (feat)

## Files Created/Modified

- `README.md` - canonical migration semantics and tracked/ignored workspace policy (English).
- `README-zh.md` - canonical migration semantics and tracked/ignored workspace policy (Chinese).
- `docs/customization.md` - current shared-home/config precedence semantics.
- `docs/runtime-guidance.md` - canonical runtime artifact path compatibility note.
- `templates/project/config.yaml.tmpl` - explicit save-path comment for `.opsx/config.yaml`.
- `templates/project/change-metadata.yaml.tmpl` - explicit save-path comment for `.opsx/changes/<change-name>/change.yaml`.

## Decisions Made

- Keep tracked/ignored path lists literal and exact (`.opsx/config.yaml`, `.opsx/active.yaml`, `.opsx/changes/**`, `.opsx/specs/**`, `.opsx/archive/**`, `.opsx/cache/**`, `.opsx/tmp/**`, `.opsx/logs/**`) so docs cannot drift from `.gitignore`.
- Keep legacy names out of canonical runtime guidance; use them only for migration-candidate explanations.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Known Stubs

- `templates/project/change-metadata.yaml.tmpl:8` keeps `securityWaiver.reason: ""` as an operator-filled template field.
- `docs/customization.md:62` keeps `reason: ""` in the example snippet to match template semantics.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 2 docs/templates are now aligned with shipped migration/runtime behavior and `.gitignore` policy.
- Ready for phase-level verification and completion flow.

---
*Phase: 02-opsx-workspace-and-migration*
*Completed: 2026-04-27*

## Self-Check: PASSED

- FOUND: `.planning/phases/02-opsx-workspace-and-migration/02-04-SUMMARY.md`
- FOUND: `1318b74`
- FOUND: `19ff8ac`
