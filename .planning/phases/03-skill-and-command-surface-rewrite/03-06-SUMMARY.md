---
phase: 03-skill-and-command-surface-rewrite
plan: "06"
subsystem: codex-prompts
tags: [opsx, codex, command-surface, generated-bundle, empty-state]
requires:
  - phase: 03-skill-and-command-surface-rewrite
    provides: Phase 03-02 source-of-truth routing/preflight/fallback contract and Phase 03-05 first Codex refresh slice.
provides:
  - "Second bounded Codex prompt slice refreshed from `buildPlatformBundle('codex')`."
  - "`opsx-onboard`, `opsx-resume`, and `opsx-status` checked-in prompts now carry explicit missing-workspace or no-active-change fallback wording."
  - "The seven-plan-listed Codex leaves are parity-verified against current generator output."
affects: [03-07, 03-08, 03-09, 03-10, 03-11, CMD-02, CMD-04, CMD-05]
tech-stack:
  added: []
  patterns:
    - "Refresh checked-in generated prompt leaves from `buildPlatformBundle('codex')` in bounded slices."
    - "Keep empty-state fallback copy centralized in source-of-truth metadata/templates, then regenerate leaves mechanically."
key-files:
  created:
    - .planning/phases/03-skill-and-command-surface-rewrite/03-06-SUMMARY.md
  modified:
    - commands/codex/prompts/opsx-new.md
    - commands/codex/prompts/opsx-onboard.md
    - commands/codex/prompts/opsx-propose.md
    - commands/codex/prompts/opsx-resume.md
    - commands/codex/prompts/opsx-status.md
    - commands/codex/prompts/opsx-sync.md
    - commands/codex/prompts/opsx-verify.md
key-decisions:
  - "Keep 03-06 strictly mechanical: regenerate only the seven plan-listed Codex leaves from `buildPlatformBundle('codex')` with no source-template edits."
patterns-established:
  - "Acceptance checks combine runtime suite + exact per-file bundle parity + fallback/banned-token assertions before commit."
requirements-completed:
  - CMD-02
  - CMD-04
  - CMD-05
duration: 4m
completed: 2026-04-27
---

# Phase 03 Plan 06: Skill and Command Surface Rewrite Summary

**The second bounded Codex refresh slice now matches generator output and ships explicit non-mutating empty-state fallback guidance for onboard/resume/status.**

## Performance

- **Duration:** 4m
- **Started:** 2026-04-27T10:50:03Z
- **Completed:** 2026-04-27T10:54:03Z
- **Tasks:** 1
- **Files modified:** 7

## Accomplishments

- Refreshed exactly seven plan-scoped Codex prompt leaves from `buildPlatformBundle('codex')`.
- Updated these checked-in leaves to explicit primary routing copy: `$opsx-* (explicit routes only)`.
- Landed missing-workspace/no-active-change fallback wording for `opsx-onboard`, `opsx-resume`, and `opsx-status` with explicit non-mutating behavior.

## Task Commits

Each task was committed atomically:

1. **Task 1: Regenerate the remaining Codex prompt leaves, including the empty-state routes** - `4016d94` (feat)

## Verification

- `npm run test:workflow-runtime` passed (30/30).
- Plan parity check passed:
  `node -e "const fs=require('fs');const path=require('path');const { buildPlatformBundle } = require('./lib/generator'); ..."` -> `codex-slice-2-parity-ok`.
- Additional acceptance checks passed:
  - `onboard`/`resume`/`status` include missing workspace or no active change fallback lines and "Do not auto-create `.opsx/active.yaml` or change state ..." guidance.
  - No banned public-entry tokens (`$opsx <request>`, `/openspec`, `$openspec`, `/prompts:openspec`, `/opsx:*`, `/prompts:opsx-*`) appear in the seven refreshed files.

## Files Created/Modified

- `.planning/phases/03-skill-and-command-surface-rewrite/03-06-SUMMARY.md` - Plan execution summary and verification record.
- `commands/codex/prompts/opsx-new.md` - Refreshed Codex `new` route leaf from current generator output.
- `commands/codex/prompts/opsx-onboard.md` - Refreshed onboarding leaf with explicit missing-workspace/no-active-change fallback wording.
- `commands/codex/prompts/opsx-propose.md` - Refreshed propose leaf from current generator output.
- `commands/codex/prompts/opsx-resume.md` - Refreshed resume leaf with explicit no-active-change fallback wording.
- `commands/codex/prompts/opsx-status.md` - Refreshed status leaf with explicit missing-workspace/no-active-change fallback wording.
- `commands/codex/prompts/opsx-sync.md` - Refreshed sync leaf from current generator output.
- `commands/codex/prompts/opsx-verify.md` - Refreshed verify leaf from current generator output.

## Decisions Made

- None - followed plan as specified.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- A local ad-hoc Node assertion command initially failed due shell backtick escaping in `zsh`; reran with single-quoted script and the same checks passed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `03-07` can continue with the bounded Gemini refresh slice while preserving the same generator-parity verification pattern.
- Codex bounded refresh is now complete across `03-05` and `03-06`.

---
*Phase: 03-skill-and-command-surface-rewrite*
*Completed: 2026-04-27*

## Self-Check: PASSED

- FOUND: `.planning/phases/03-skill-and-command-surface-rewrite/03-06-SUMMARY.md`
- FOUND: `4016d94`
