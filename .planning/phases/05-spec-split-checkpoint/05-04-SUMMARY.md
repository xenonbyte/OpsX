---
phase: 05-spec-split-checkpoint
plan: 04
subsystem: workflow-runtime
tags: [spec-split-checkpoint, generator, claude, parity-gate]
requires:
  - phase: 05-03
    provides: Source-of-truth split-spec planning note and bounded Phase 5 parity contract.
provides:
  - Regenerated Claude `propose`/`continue`/`ff` planning prompts from `buildPlatformBundle('claude')`.
  - Checked-in Claude planning prompts now include `spec-split-checkpoint` before `design`.
  - Phase 5 parity assertion now enforces "remaining exempt drift only" so verification stays green after bounded refreshes.
affects: [05-05, 05-06, 05-07, command-refresh]
tech-stack:
  added: []
  patterns:
    - Mechanical command refresh from generator output with no hand-edited prompt prose.
    - Temporary parity waiver constrained to approved prompt allowlist while refreshed slices converge.
key-files:
  created: [.planning/phases/05-spec-split-checkpoint/05-04-SUMMARY.md]
  modified: [commands/claude/opsx/propose.md, commands/claude/opsx/continue.md, commands/claude/opsx/ff.md, scripts/test-workflow-runtime.js]
key-decisions:
  - "Keep Claude refresh byte-for-byte from `buildPlatformBundle('claude')`; no manual prose edits."
  - "Treat the stale strict-equality parity check as a blocking verifier bug and narrow it to remaining exempt drift."
patterns-established:
  - "Phase 5 bounded refresh plans can pass full runtime tests while unresolved exemptions remain on other platforms."
requirements-completed: [SPEC-03]
duration: 2m
completed: 2026-04-28
---

# Phase 05 Plan 04: Claude Planning Prompt Refresh Summary

**Claude `propose`/`continue`/`ff` prompts now ship the split-spec-before-design checkpoint wording directly from generator output, with verification gates still bounded to remaining Phase 5 exemptions.**

## Performance

- **Duration:** 2m
- **Started:** 2026-04-28T06:54:32Z
- **Completed:** 2026-04-28T06:55:56Z
- **Tasks:** 1
- **Files modified:** 4

## Accomplishments

- Refreshed `commands/claude/opsx/propose.md`, `continue.md`, and `ff.md` from `buildPlatformBundle('claude')`.
- Confirmed all three Claude planning prompts contain `spec-split-checkpoint` before `design`.
- Restored green `npm run test:workflow-runtime` by constraining Phase 5 mismatch assertions to remaining exempt drift paths only.

## Task Commits

Each task was committed atomically:

1. **Task 1: Regenerate the Claude `propose` / `continue` / `ff` slice from `buildPlatformBundle('claude')`** - `af74908` (`feat`)

## Files Created/Modified

- `.planning/phases/05-spec-split-checkpoint/05-04-SUMMARY.md` - Plan execution summary and verification record.
- `commands/claude/opsx/propose.md` - Generated planning checkpoint note now includes `spec-split-checkpoint` before `design`.
- `commands/claude/opsx/continue.md` - Generated planning checkpoint note now includes `spec-split-checkpoint` before `design`.
- `commands/claude/opsx/ff.md` - Generated planning checkpoint note now includes `spec-split-checkpoint` before `design`.
- `scripts/test-workflow-runtime.js` - Updated Phase 5 parity assertion to enforce bounded allowlist drift instead of stale full-list equality.

## Decisions Made

- Kept prompt changes strictly generator-driven and limited to the three declared Claude planning routes.
- Applied a minimal Rule 3 blocker fix in runtime tests so parity checks remain strict-but-progressive across 05-04/05-05/05-06.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed stale parity equality check after Claude slice refresh**
- **Found during:** Task 1
- **Issue:** `npm run test:workflow-runtime` failed because the test still required Claude files to remain mismatched even after this plan refreshed them.
- **Fix:** Changed parity assertion to require that mismatches (if any) stay within the approved Phase 5 exemption allowlist, enabling "remaining platforms only" drift.
- **Files modified:** `scripts/test-workflow-runtime.js`
- **Verification:** `npm run test:workflow-runtime` (64 passed), plus prompt grep verification.
- **Committed in:** `af74908`

---

**Total deviations:** 1 auto-fixed (Rule 3: blocking)
**Impact on plan:** Required to satisfy the plan's mandated runtime verification while keeping exemption scope bounded.

## Issues Encountered

- Runtime suite parity expectation was stale relative to this bounded Claude refresh.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 05-05 can refresh Codex `propose`/`continue`/`ff` against the same source-of-truth note.
- 05-06 can refresh Gemini `propose`/`continue`/`ff`, then 05-07 can remove Phase 5 temporary parity allowances.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: `.planning/phases/05-spec-split-checkpoint/05-04-SUMMARY.md`
- FOUND: `af74908`
