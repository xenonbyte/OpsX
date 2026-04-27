---
phase: 03-skill-and-command-surface-rewrite
plan: "10"
subsystem: docs-surface
tags: [opsx, docs, codex, explicit-routes, runtime-guidance]
requires:
  - phase: 03-skill-and-command-surface-rewrite
    provides: Refreshed generated command bundles and explicit-only routing contract from 03-03 through 03-09.
provides:
  - "README and docs now present Codex public usage as explicit `$opsx-*` routes only."
  - "Public docs remove banned legacy/public-route tokens and OpenSpec lineage sentence."
  - "Runtime guidance compatibility notes now center current `.opsx` runtime artifacts only."
affects: [03-11, CMD-02, CMD-03, CMD-04, CMD-05]
tech-stack:
  added: []
  patterns:
    - "Keep public Codex docs explicit-only (`$opsx-*`) and avoid standalone route narratives."
    - "Describe runtime compatibility with current `.opsx` artifacts while treating legacy layouts as migration-only context."
key-files:
  created:
    - .planning/phases/03-skill-and-command-surface-rewrite/03-10-SUMMARY.md
  modified:
    - README.md
    - README-zh.md
    - docs/commands.md
    - docs/codex.md
    - docs/supported-tools.md
    - docs/runtime-guidance.md
key-decisions:
  - "Remove all public `$opsx <request>` guidance and standardize on explicit `$opsx-*` route examples."
  - "Keep `commands/codex/prompts/opsx.md` documented as internal catalog only; public docs expose explicit action routes."
patterns-established:
  - "README and docs route examples consistently include `$opsx-onboard`, `$opsx-propose`, `$opsx-status`, and `$opsx-apply`."
  - "Runtime guidance avoids presenting legacy path tokens as current user-facing runtime inputs."
requirements-completed:
  - CMD-02
  - CMD-03
  - CMD-04
  - CMD-05
duration: 2m 29s
completed: 2026-04-27
---

# Phase 03 Plan 10: Skill and Command Surface Rewrite Summary

**README and public docs now enforce a hard clean break with explicit-only Codex `$opsx-*` routes and `.opsx`-only current runtime guidance.**

## Performance

- **Duration:** 2m 29s
- **Started:** 2026-04-27T11:22:34Z
- **Completed:** 2026-04-27T11:25:03Z
- **Tasks:** 1
- **Files modified:** 6

## Accomplishments

- Rewrote `README.md` and `README-zh.md` to remove `$opsx <request>` and `Fission-AI/OpenSpec`, replacing them with explicit `$opsx-*` route examples.
- Rewrote `docs/commands.md`, `docs/codex.md`, and `docs/supported-tools.md` so Codex public routing is explicit-only and aligned with generated route inventory.
- Rewrote `docs/runtime-guidance.md` compatibility notes to describe current `.opsx` runtime artifacts without legacy path tokens as current guidance.

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite README/docs to hard clean break and explicit-only route surface** - `d07da90` (docs)

## Verification

- `npm run test:workflow-runtime` passed (30/30).
- `rg -n "\\$opsx-(onboard|propose|status|apply)" README.md README-zh.md docs/commands.md docs/codex.md docs/supported-tools.md` passed with expected explicit-route hits across all listed files.
- `node -e 'const fs=require("fs");const files=["README.md","README-zh.md","docs/commands.md","docs/codex.md","docs/supported-tools.md","docs/runtime-guidance.md"];const banned=["$opsx <request>","/openspec","$openspec","/prompts:openspec","/opsx:*","/prompts:opsx-*","openspec/",".openspec","~/.openspec","Fission-AI/OpenSpec"];for(const file of files){const text=fs.readFileSync(file,"utf8");for(const token of banned){if(text.includes(token)){throw new Error(file+" contains "+token);}}}'` passed.

## Files Created/Modified

- `.planning/phases/03-skill-and-command-surface-rewrite/03-10-SUMMARY.md` - Plan execution summary and verification log.
- `README.md` - Removed lineage sentence and switched Codex usage to explicit `$opsx-*` examples.
- `README-zh.md` - Chinese parity for explicit-only Codex route guidance and lineage removal.
- `docs/commands.md` - Updated Agent Entrypoints to explicit-only Codex route model.
- `docs/codex.md` - Replaced preferred standalone entry guidance with explicit public routes and internal catalog note.
- `docs/supported-tools.md` - Updated Codex section to explicit routes only with concrete examples.
- `docs/runtime-guidance.md` - Reframed compatibility notes around current `.opsx` runtime artifacts.

## Decisions Made

- Public Codex documentation must use explicit `$opsx-*` commands only; no standalone route narrative.
- Runtime guidance should reference only current `.opsx` inputs for active behavior, while treating older layouts as migration translation context.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The first attempt of the banned-token Node one-liner used double-quoted shell wrapping, which expanded `$opsx` and produced a false-positive empty-token check. Re-ran with correct quoting and the intended token list.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 03-11 can finalize remaining route/help alignment checks on top of this explicit-only doc baseline.
- Public docs and runtime guidance now match the hard clean-break contract required by CMD-02/03/04/05.

---
*Phase: 03-skill-and-command-surface-rewrite*
*Completed: 2026-04-27*

## Self-Check: PASSED

- FOUND: `.planning/phases/03-skill-and-command-surface-rewrite/03-10-SUMMARY.md`
- FOUND: `d07da90`
