---
phase: 06-tdd-light-workflow
plan: 02
subsystem: workflow-guidance
tags: [tdd-light, templates, playbooks, skill-guidance]
requires:
  - phase: 06-01
    provides: strict-by-default `rules.tdd` runtime config baseline
provides:
  - Added machine-readable `## Test Plan` contract and TDD marker examples in EN/ZH `tasks.md` templates.
  - Replaced Phase 6 deferral wording with shipped `rules.tdd.mode` guidance in skill and route playbooks.
  - Updated template-source runtime regression assertion to match the new marker contract.
affects: [phase-06-03, task-checkpoint, execution-checkpoint, generated-guidance]
tech-stack:
  added: []
  patterns:
    - `tasks.md` guidance uses one locale-independent marker grammar: `## Test Plan`, `TDD Class:`, `TDD Exemption:`, `RED`, `GREEN`, `REFACTOR`, `VERIFY`.
    - Playbook and skill instructions must describe the same checkpoint enforcement semantics as runtime config.
key-files:
  created: [.planning/phases/06-tdd-light-workflow/06-02-SUMMARY.md]
  modified: [skills/opsx/references/artifact-templates.md, skills/opsx/references/artifact-templates-zh.md, skills/opsx/SKILL.md, skills/opsx/references/action-playbooks.md, skills/opsx/references/action-playbooks-zh.md, scripts/test-workflow-runtime.js]
key-decisions:
  - "Keep TDD marker parsing locale-independent by preserving exact English marker tokens in both EN/ZH templates."
  - "Require visible `TDD Exemption:` reasons plus `VERIFY:` coverage instead of implicit exemptions."
patterns-established:
  - "Template and distributed playbook changes are validated by runtime tests in the same task wave."
requirements-completed: [TDD-02]
duration: 2 min
completed: 2026-04-28
---

# Phase 06 Plan 02: TDD Marker Guidance Summary

**OpsX templates and distributed guidance now ship an explicit, machine-readable TDD-light task grammar with visible exemptions and verification expectations.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-28T09:52:11Z
- **Completed:** 2026-04-28T09:54:48Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Replaced generic `tasks.md` examples with concrete `## Test Plan` metadata and explicit TDD marker examples in both English and Chinese templates.
- Added explicit behavior-change (`TDD Class`) and docs-only exemption (`TDD Exemption`) examples, each with `VERIFY:` checklist coverage.
- Updated skill/playbook route guidance to describe shipped `rules.tdd.mode` behavior and apply-time evidence persistence (`completed TDD steps`, verification result, diff summary, drift).

## Task Commits

Each task was committed atomically:

1. **Task 1: Add machine-readable `tasks.md` TDD markers and examples in both artifact templates** - `1286da2` (`feat`)
2. **Task 2: Replace Phase 6 deferral wording with shipped TDD-light guidance in skill and playbooks** - `1f8e8e1` (`docs`)

## Files Created/Modified

- `.planning/phases/06-tdd-light-workflow/06-02-SUMMARY.md` - Plan execution summary, deviations, and verification evidence.
- `skills/opsx/references/artifact-templates.md` - English `tasks.md` source-of-truth now includes `## Test Plan` and explicit TDD markers.
- `skills/opsx/references/artifact-templates-zh.md` - Chinese `tasks.md` source-of-truth aligned to the same machine-readable marker set.
- `skills/opsx/SKILL.md` - Removed Phase 6 deferral; added shipped `rules.tdd.mode` and apply evidence persistence guidance.
- `skills/opsx/references/action-playbooks.md` - Added explicit route-level `Test Plan`/`TDD Class`/`TDD Exemption`/`VERIFY` and `manual-only verification` guidance.
- `skills/opsx/references/action-playbooks-zh.md` - Chinese playbook aligned with same explicit marker and manual-verification contract.
- `scripts/test-workflow-runtime.js` - Updated template-source assertion to the new marker-based `tasks.md` contract.

## Decisions Made

- Keep `## Test Plan` metadata separate from numbered executable task groups so apply-time group parsing remains deterministic.
- Make exemption policy explicit (`TDD Exemption: <class> — <reason>`) and require `VERIFY:` even for exempt groups.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated stale runtime assertion after template contract change**
- **Found during:** Task 1 verification (`npm run test:workflow-runtime`)
- **Issue:** Runtime test `artifact templates resolve from package even when project repo has no skills folder` still asserted the old example line `- [ ] 1.1 Example task`.
- **Fix:** Updated the assertion to validate new marker contract presence (`## Test Plan`, `TDD Class: behavior-change`, `TDD Exemption: docs-only`).
- **Files modified:** `scripts/test-workflow-runtime.js`
- **Verification:** Re-ran `npm run test:workflow-runtime` and all `69 test(s)` passed.
- **Committed in:** `1286da2`

---

**Total deviations:** 1 auto-fixed (Rule 3 blocking issue)
**Impact on plan:** Required for verification stability after intentional template grammar changes. No scope creep.

## Issues Encountered

- A transient `git index.lock` race appeared during parallel staging; resolved by retrying `git add`/`git commit` sequentially.

## Verification

- `npm run test:workflow-runtime` -> passed (`69 test(s) passed`).
- `rg -n "## Test Plan|TDD Class: behavior-change|TDD Exemption: docs-only|RED:|GREEN:|REFACTOR:|VERIFY:" skills/opsx/references/artifact-templates.md skills/opsx/references/artifact-templates-zh.md` -> passed.
- `rg -n "rules.tdd.mode|TDD Exemption:|completed TDD steps|manual-only verification|延后到 Phase 6|deferred to Phase 6|Phase 7" skills/opsx/SKILL.md skills/opsx/references/action-playbooks.md skills/opsx/references/action-playbooks-zh.md` -> passed; no `deferred to Phase 6` or `延后到 Phase 6` matches remain.

## Threat Flags

None.

## Known Stubs

None - changed content introduces no functional stubs; remaining placeholder mentions are intentional template/test fixture wording.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- TDD-02 guidance is now explicit and parseable across EN/ZH authored templates.
- Phase 06 plans 03+ can enforce/checkpoint this grammar without relying on ambiguous prose.

## Self-Check: PASSED

- FOUND: `.planning/phases/06-tdd-light-workflow/06-02-SUMMARY.md`
- FOUND: `1286da2`
- FOUND: `1f8e8e1`
