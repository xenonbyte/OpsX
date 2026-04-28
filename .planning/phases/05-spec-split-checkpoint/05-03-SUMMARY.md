---
phase: 05-spec-split-checkpoint
plan: 03
subsystem: workflow-runtime
tags: [spec-split-checkpoint, workflow, generator, playbooks, parity-gate]
requires:
  - phase: 05-01
    provides: Canonical `spec-split-checkpoint` schema/workflow/store contracts and persistence alias normalization.
  - phase: 05-02
    provides: Deterministic split-spec evidence/finding engine in `lib/spec-validator.js`.
provides:
  - `runSpecSplitCheckpoint()` facade with canonical checkpoint output, inline-spec fallback, and read-only reviewer escalation guidance.
  - Source-of-truth planning checkpoint note scoping to `propose` / `continue` / `ff` only.
  - Bounded temporary parity exemption for exactly nine planning-route prompts across Claude/Codex/Gemini.
  - Skill + bilingual playbook alignment for split-spec-before-design behavior with no new public routes.
affects: [phase-05-wave2, 05-04, 05-05, 05-06, 05-07, command-refresh]
tech-stack:
  added: []
  patterns:
    - checkpoint facade delegates finding logic to validator module and keeps result shaping in `buildCheckpointResult()`
    - source-output drift remains bounded via explicit temporary mismatched-file allowlist assertions
key-files:
  created: [.planning/phases/05-spec-split-checkpoint/05-03-SUMMARY.md]
  modified: [lib/workflow.js, lib/generator.js, scripts/test-workflow-runtime.js, skills/opsx/SKILL.md, skills/opsx/references/action-playbooks.md, skills/opsx/references/action-playbooks-zh.md]
key-decisions:
  - "Escalation remains advisory and read-only inside checkpoint findings/nextStep; no new route and no `spec-review.md` artifact."
  - "Phase 5 source-of-truth planning note changes stay scoped to `propose`/`continue`/`ff`, with a temporary 9-file parity exemption until generated refresh plans land."
patterns-established:
  - "Inline single-spec review path uses `options.sources.specs` fallback at virtual path `specs/inline/spec.md`."
  - "Risk escalation signals combine file-count, capability-count, security-review state, and requirement-count threshold (>=7)."
requirements-completed: [SPEC-02, SPEC-03, SPEC-04]
duration: 2m
completed: 2026-04-28
---

# Phase 05 Plan 03: Split-Spec Runtime Facade and Guidance Alignment Summary

**Split-spec review now runs through a canonical workflow facade with deterministic inline/escalated behavior, while planning guidance and distributed playbooks are aligned to the same pre-design checkpoint contract.**

## Performance

- **Duration:** 2m
- **Started:** 2026-04-28T14:49:36+08:00
- **Completed:** 2026-04-28T06:51:36Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Added `runSpecSplitCheckpoint()` in `lib/workflow.js`, wired to `collectSpecSplitEvidence()` + `reviewSpecSplitEvidence()`, with canonical `buildCheckpointResult()` shaping.
- Added deterministic escalation to `read-only-reviewer-recommended` and explicit read-only `nextStep` guidance with no artifact creation.
- Scoped generator planning checkpoint wording changes to `propose` / `continue` / `ff` via `getPlanningCheckpointNote(actionId)`.
- Added Phase 5 temporary 9-file prompt parity exemption assertions and source-output assertions for `spec-split-checkpoint`.
- Aligned `skills/opsx/SKILL.md` and bilingual playbooks with split-spec-before-design ordering, read-only reviewer constraints, route boundary, and Phase 6/7 deferrals.

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): Wire `runSpecSplitCheckpoint()` and bound source-of-truth planning prompt drift** - `10a430c` (`test`)
2. **Task 1 (GREEN): Wire `runSpecSplitCheckpoint()` and bound source-of-truth planning prompt drift** - `95807e8` (`feat`)
3. **Task 2: Align skill and bilingual playbooks to split-spec-before-design contract** - `5bff046` (`docs`)

## Files Created/Modified

- `.planning/phases/05-spec-split-checkpoint/05-03-SUMMARY.md` - Plan execution summary, verification outcomes, and deviation tracking.
- `lib/workflow.js` - Adds `runSpecSplitCheckpoint()` facade, escalation warning code, inline fallback, and export wiring.
- `lib/generator.js` - Adds action-scoped `getPlanningCheckpointNote(actionId)` for planning-route-only split-checkpoint wording.
- `scripts/test-workflow-runtime.js` - Adds split-checkpoint facade contract tests, temporary 9-file parity exemption assertions, and source-output coverage for planning routes.
- `skills/opsx/SKILL.md` - Adds split-spec checkpoint ordering/read-only reviewer behavior and Phase 6/7 deferrals.
- `skills/opsx/references/action-playbooks.md` - Aligns Common setup + ff with split-spec-before-design and read-only reviewer constraints.
- `skills/opsx/references/action-playbooks-zh.md` - Chinese alignment for the same split-spec and reviewer constraints.

## Decisions Made

- Keep escalation read-only and advisory in checkpoint output (finding + nextStep) instead of adding new command routes or artifacts.
- Preserve broad generator/index stability by limiting split-checkpoint wording changes to planning routes only (`propose`, `continue`, `ff`).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed unqualified Codex route wording in playbook updates**
- **Found during:** Task 2
- **Issue:** New route-boundary line introduced `$opsx-...` text without required `Codex` + `Claude/Gemini` platform labels, failing existing route-surface guard tests.
- **Fix:** Reworded route-boundary lines in both playbooks to include explicit `Codex` and `Claude/Gemini` labels while preserving the “no new spec-split routes” rule.
- **Files modified:** `skills/opsx/references/action-playbooks.md`, `skills/opsx/references/action-playbooks-zh.md`
- **Verification:** `npm run test:workflow-runtime` passed after patch.
- **Committed in:** `5bff046`

---

**Total deviations:** 1 auto-fixed (Rule 3: blocking)
**Impact on plan:** No scope creep; fix was required to satisfy existing route-contract tests and keep plan behavior valid.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 5 runtime facade and source-of-truth guidance are ready for bounded generated refresh slices in `05-04`, `05-05`, and `05-06`.
- Temporary parity exemption is now explicitly locked to the nine planning-route files and can be removed in `05-07` after refresh lands.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: `.planning/phases/05-spec-split-checkpoint/05-03-SUMMARY.md`
- FOUND: `10a430c`
- FOUND: `95807e8`
- FOUND: `5bff046`
