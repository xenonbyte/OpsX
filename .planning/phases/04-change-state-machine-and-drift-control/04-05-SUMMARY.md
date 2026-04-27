---
phase: 04-change-state-machine-and-drift-control
plan: 05
subsystem: workflow-runtime
tags: [state-machine, generated-guidance, parity-gate, playbooks, drift-warnings]
requires:
  - phase: 04-03
    provides: persisted-stage routing and read-only continue/status/resume selectors
  - phase: 04-04
    provides: artifact hash drift detection and accepted-write persistence services
provides:
  - Phase 4 source-of-truth fallback guidance for stateful actions (`new`, `propose`, `ff`, `continue`, `apply`, `status`, `resume`, `onboard`).
  - Temporary source-output parity gate that exempts exactly 24 stateful generated action files while preserving parity checks for untouched files.
  - Bilingual distributed skill playbooks aligned to read-only drift handling, one-group apply execution checkpoints, and Phase 7 hard-gate deferral.
affects: [phase-04-wave4, phase-04-wave5, generated-command-refresh, skill-guidance, STATE-02, STATE-03, STATE-07, STATE-08]
tech-stack:
  added: []
  patterns:
    - source-output-first gating before bounded generated refresh slices
    - read-only hash-drift warn+reload semantics for status/resume guidance
    - one-top-level-task-group apply contract with checkpoint-and-stop behavior
key-files:
  created: [.planning/phases/04-change-state-machine-and-drift-control/04-05-SUMMARY.md]
  modified: [lib/workflow.js, scripts/test-workflow-runtime.js, skills/opsx/SKILL.md, skills/opsx/references/action-playbooks.md, skills/opsx/references/action-playbooks-zh.md]
key-decisions:
  - "Temporarily exempt only the 24 planned stateful generated files from checked-in parity, while keeping parity strict for all untouched generated entries."
  - "Encode read-only hash drift wording directly in source-of-truth fallback metadata so generated prompts stay platform-consistent."
  - "Keep verify/archive path hard-blocking deferred to Phase 7 and document Phase 4 as warning-only for allowedPaths/forbiddenPaths."
patterns-established:
  - "Task 1 uses TDD gate commits: RED test update first, then GREEN metadata implementation."
  - "Distributed skill docs and generated source metadata are updated in lockstep to prevent operator-guidance drift."
requirements-completed: [STATE-02, STATE-03, STATE-07, STATE-08]
duration: 3m 33s
completed: 2026-04-27
---

# Phase 04 Plan 05: Source-of-Truth Guidance and Temporary Parity Gate Summary

**Phase 4 guidance now codifies persisted-stage, read-only hash-drift handling, and one-group apply semantics while keeping runtime tests green through a bounded 24-file generated parity exemption.**

## Performance

- **Duration:** 3m 33s
- **Started:** 2026-04-27T15:57:00Z
- **Completed:** 2026-04-27T16:00:33Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Extended `lib/workflow.js` source-of-truth action fallback metadata with explicit Phase 4 semantics for `new`, `propose`, `ff`, `continue`, `apply`, `status`, and `resume`.
- Added a temporary source-output gate in `scripts/test-workflow-runtime.js` that lists the exact 24 parity-exempt generated files and asserts new read-only/apply wording via `buildPlatformBundle()`.
- Updated `skills/opsx/SKILL.md` and bilingual action playbooks so operator guidance matches persisted state behavior, including Phase 7 hard-gate deferral language.

## Task Commits

Each task was committed atomically:

1. **Task 1: Update Phase 4 source-of-truth action guidance and stage a temporary source-output gate**
   - `08e0267` (`test`): RED tests for temporary parity exemption list and new source-output wording assertions.
   - `47624d3` (`feat`): GREEN implementation for Phase 4 stateful fallback semantics in `lib/workflow.js`.
2. **Task 2: Align distributed skill guidance in both languages to the persisted-state contract**
   - `3c34e31` (`docs`): Updated `skills/opsx/SKILL.md` plus English/Chinese action playbooks for read-only drift and one-group apply semantics.

_Note: Task 1 is TDD and intentionally split into RED (`test`) then GREEN (`feat`) commits._

## Files Created/Modified

- `lib/workflow.js` - Added explicit Phase 4 fallback semantics and read-only/apply wording for stateful actions.
- `scripts/test-workflow-runtime.js` - Added exact 24-file temporary parity exemption contract and source-output assertions for read-only/apply phrases.
- `skills/opsx/SKILL.md` - Updated execution loop and guardrails for read-only routes, hash drift behavior, and one-group apply checkpoint persistence.
- `skills/opsx/references/action-playbooks.md` - Aligned `new/continue/resume/apply/status` behavior and Phase 7 hard-gate deferral messaging.
- `skills/opsx/references/action-playbooks-zh.md` - Kept Chinese playbook semantics aligned with the same Phase 4 contract and Phase 7 deferral wording.

## Decisions Made

- Keep strict checked-in parity active for all untouched generated files, and exempt only the planned 24 stateful generated leaves during this bounded refresh window.
- Require read-only routes (`status`, `resume`) to surface hash drift with warn+reload language and explicitly forbid hash refresh from read-only paths.
- Keep `allowedPaths`/`forbiddenPaths` enforcement advisory in Phase 4 docs and defer hard verify/archive blocking semantics to Phase 7.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Runtime source-of-truth and distributed skill guidance are now aligned for persisted-stage, drift warnings, and one-group apply behavior.
- The repository is ready for bounded generated command refresh plans without failing `npm run test:workflow-runtime` on intentionally deferred files.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: `.planning/phases/04-change-state-machine-and-drift-control/04-05-SUMMARY.md`
- FOUND: `08e0267`
- FOUND: `47624d3`
- FOUND: `3c34e31`
