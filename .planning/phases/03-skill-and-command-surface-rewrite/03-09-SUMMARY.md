---
phase: 03-skill-and-command-surface-rewrite
plan: "09"
subsystem: skills-and-guides
tags: [opsx, codex, skill-surface, playbooks, empty-state]
requires:
  - phase: 03-skill-and-command-surface-rewrite
    provides: Phase 03-02 explicit routing/preflight contract and refreshed Codex empty-state prompt copy from 03-06 and 03-08.
provides:
  - "Distributed `opsx` skill and bilingual guides now describe Codex public routing as explicit `$opsx-*` only."
  - "Bilingual action playbooks now include `onboard`, `resume`, `batch-apply`, and `bulk-archive` with non-mutating empty-state behavior."
  - "Skill/common setup guidance now requires strict preflight reads for `.opsx/config.yaml`, `.opsx/active.yaml`, active `state.yaml`, `context.md`, and current artifacts."
affects: [03-10, 03-11, CMD-02, CMD-03, CMD-04, CMD-05]
tech-stack:
  added: []
  patterns:
    - "Keep Codex route guidance explicit-only in distributed skill docs (`$opsx-*`)."
    - "Model empty-state handling as report-and-recommend behavior; never implicit workspace/active-change creation."
key-files:
  created:
    - .planning/phases/03-skill-and-command-surface-rewrite/03-09-SUMMARY.md
  modified:
    - skills/opsx/SKILL.md
    - skills/opsx/GUIDE-en.md
    - skills/opsx/GUIDE-zh.md
    - skills/opsx/references/action-playbooks.md
    - skills/opsx/references/action-playbooks-zh.md
key-decisions:
  - "Remove Codex `$opsx <request>` guidance from distributed skill and guides; keep only explicit `$opsx-*` public routes."
  - "Align playbook fallback behavior with generated prompts by reporting missing workspace/active change and recommending next commands without state mutation."
patterns-established:
  - "Common setup in both locales now mirrors strict Phase 3 preflight file reads before any mutation."
  - "Route playbooks for onboarding/resume/batch execution now encode explicit stop-and-recommend behavior for empty state."
requirements-completed:
  - CMD-02
  - CMD-03
  - CMD-04
  - CMD-05
duration: 3m 32s
completed: 2026-04-27
---

# Phase 03 Plan 09: Skill and Command Surface Rewrite Summary

**Distributed OpsX skill/guides/playbooks now enforce explicit-only Codex `$opsx-*` routing with strict preflight reads and non-mutating empty-state playbook behavior.**

## Performance

- **Duration:** 3m 32s
- **Started:** 2026-04-27T11:13:30Z
- **Completed:** 2026-04-27T11:17:02Z
- **Tasks:** 1
- **Files modified:** 5

## Accomplishments

- Rewrote `skills/opsx/SKILL.md` invocation model to explicit Codex `$opsx-*` routes only while preserving the existing change -> project -> global config precedence.
- Added strict preflight wording in skill/playbook guidance for `.opsx/config.yaml`, `.opsx/active.yaml`, active `state.yaml`, active `context.md`, and current artifacts.
- Added/corrected bilingual playbooks for `onboard`, `resume`, `batch-apply`, and `bulk-archive`, including explicit empty-state stop-and-recommend behavior with no implicit state creation.
- Updated bilingual guides to remove `$opsx <request>` guidance and standardize the Codex note to explicit route usage.

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite skill metadata and bilingual playbooks around explicit-only routes and honest empty-state behavior** - `7ae5b61` (feat)

## Verification

- `npm run test:workflow-runtime` passed (30/30).
- `rg -n "\\$opsx <request>|standalone \\$opsx|## onboard|## resume|## batch-apply|## bulk-archive|\\.opsx/config\\.yaml|\\.opsx/active\\.yaml|state\\.yaml|context\\.md|auto-create" skills/opsx` passed and matched required route/preflight/playbook tokens.
- Acceptance checks passed:
  - No standalone Codex route guidance in `skills/opsx/SKILL.md` and guides.
  - Both localized playbooks contain `## onboard`, `## resume`, `## batch-apply`, and `## bulk-archive`.
  - `onboard`/`status`/`resume` playbook text explicitly reports missing workspace or no active change and avoids implicit creation.
  - `skills/opsx/GUIDE-en.md` and `GUIDE-zh.md` explicitly state Codex `$opsx-*` routes only.

## Files Created/Modified

- `.planning/phases/03-skill-and-command-surface-rewrite/03-09-SUMMARY.md` - Plan execution summary and verification log.
- `skills/opsx/SKILL.md` - Updated distributed skill invocation model and strict preflight contract.
- `skills/opsx/GUIDE-en.md` - Updated Codex quick-path and explicit-route guidance.
- `skills/opsx/GUIDE-zh.md` - Updated Codex quick-path and explicit-route guidance in Chinese.
- `skills/opsx/references/action-playbooks.md` - Expanded common setup and added/updated route playbooks with non-mutating empty-state behavior.
- `skills/opsx/references/action-playbooks-zh.md` - Chinese parity for expanded common setup and new route playbooks.

## Decisions Made

- Keep public Codex route wording explicit-only (`$opsx-*`) across distributed skill surfaces.
- Keep empty-state handling descriptive and action-oriented, without auto-creating workspace or active-change state.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 03-10 can update docs/help surfaces using the same explicit-only route and preflight wording now established in the distributed skill.
- The skill/playbook contract is now aligned with generated Codex empty-state prompt behavior for onboarding/resume/batch/archive flows.

---
*Phase: 03-skill-and-command-surface-rewrite*
*Completed: 2026-04-27*

## Self-Check: PASSED

- FOUND: `.planning/phases/03-skill-and-command-surface-rewrite/03-09-SUMMARY.md`
- FOUND: `7ae5b61`
