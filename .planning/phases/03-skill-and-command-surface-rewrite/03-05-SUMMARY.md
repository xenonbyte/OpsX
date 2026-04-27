---
phase: 03-skill-and-command-surface-rewrite
plan: "05"
subsystem: codex-prompts
tags: [opsx, codex, command-surface, generated-bundle]
requires:
  - phase: 03-skill-and-command-surface-rewrite
    provides: Phase 03-02 source-of-truth generator and template contract.
provides:
  - "First bounded Codex prompt slice refreshed from `buildPlatformBundle('codex')`."
  - "`commands/codex/prompts/opsx.md` retained as an internal generated route catalog only."
  - "Codex action prompts in this slice use explicit `$opsx-*` routing and strict Phase 3 preflight guidance."
affects: [03-06, 03-09, 03-10, 03-11, CMD-02, CMD-04]
tech-stack:
  added: []
  patterns:
    - "Refresh checked-in generated prompt leaves from `buildPlatformBundle('codex')` in bounded slices."
    - "Treat `commands/codex/prompts/opsx.md` as an internal catalog, not a public standalone workflow route."
key-files:
  created:
    - .planning/phases/03-skill-and-command-surface-rewrite/03-05-SUMMARY.md
  modified:
    - commands/codex/prompts/opsx.md
    - commands/codex/prompts/opsx-apply.md
    - commands/codex/prompts/opsx-archive.md
    - commands/codex/prompts/opsx-batch-apply.md
    - commands/codex/prompts/opsx-bulk-archive.md
    - commands/codex/prompts/opsx-continue.md
    - commands/codex/prompts/opsx-explore.md
    - commands/codex/prompts/opsx-ff.md
key-decisions:
  - "Closed the unresponsive executor by spot-checking its uncommitted output, verifying parity, and committing the bounded generated slice from the orchestrator."
patterns-established:
  - "If a sequential executor leaves verified target-only changes but does not return, the orchestrator can complete the commit after parity and test checks pass."
requirements-completed:
  - CMD-02
  - CMD-04
duration: recovered by orchestrator
completed: 2026-04-27
---

# Phase 03 Plan 05: Skill and Command Surface Rewrite Summary

The first Codex generated prompt slice now matches the shared generator output. The root Codex prompt file is kept only as an internal route catalog and no longer presents standalone `$opsx` or `$opsx <request>` as public workflow guidance.

## Performance

- **Completed:** 2026-04-27T10:49:31Z
- **Tasks:** 1
- **Files modified:** 8

## Accomplishments

- Refreshed `commands/codex/prompts/opsx.md` plus the first seven Codex action prompt files from `buildPlatformBundle('codex')`.
- Changed the Codex root prompt copy to "OpsX Routes (Codex Internal Catalog)" and explicit `$opsx-*` routing only.
- Added strict preflight wording to the refreshed Codex action prompts.

## Task Commits

1. **Task 1: Refresh first bounded Codex prompt slice** - `17f38c2` (feat)

## Verification

- `npm run test:workflow-runtime` passed 30/30.
- Direct parity check for the eight Plan 03-05 files against `buildPlatformBundle('codex')` passed with `codex-slice-1-parity-ok`.

## Deviations from Plan

- The initial executor modified the correct target files but did not return or commit after an extended wait. The orchestrator verified the uncommitted output, closed the stalled agent, and committed the verified slice directly.

## User Setup Required

None.

## Next Phase Readiness

- `03-06` can refresh the remaining Codex action prompts, including `onboard`, `resume`, and `status`.

## Self-Check: PASSED

- FOUND: `.planning/phases/03-skill-and-command-surface-rewrite/03-05-SUMMARY.md`
- FOUND: `17f38c2`
