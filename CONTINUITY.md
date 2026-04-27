## Snapshot
- 2026-04-27 [USER] Goal: Start a new GSD milestone from the supplied OpsX optimization report.
- 2026-04-27 [CODE] Current milestone: `v3.0 OpsX migration and state-machine workflow`.
- 2026-04-27 [CODE] Phase 1 and Phase 2 are complete, verified, and code-review clean.
- 2026-04-27 [CODE] Phase 3 revised planning is complete with 11 execution plans across 5 waves.
- 2026-04-27 [CODE] Public current UX must not expose legacy OpenSpec routes/paths, `/prompts:*`, `/opsx:*`, standalone `$opsx`, or `$opsx <request>`.
- 2026-04-27 [CODE] `commands/codex/prompts/opsx.md` remains only as an internal generated route catalog; public Codex entrypoints are explicit `$opsx-*`.
- 2026-04-27 [CODE] `AGENTS.md` must preserve repo-local `openspec/config.yaml` and `openspec/changes/` authoring-path guidance while replacing stale route bullets with current OpsX guidance.
- 2026-04-27 [CODE] Phase 03 plan `03-03` task execution completed with commit `ac2c755`; next execution target is `03-04-PLAN.md`.

## Done (recent)
- 2026-04-27 [CODE] Executed `03-02-PLAN.md`: centralized strict preflight/fallback metadata in workflow/templates and removed Codex `$opsx <request>` source guidance.
- 2026-04-27 [CODE] Executed `03-03-PLAN.md`: refreshed the first bounded Claude command slice from `buildPlatformBundle('claude')` with parity verification.
- 2026-04-27 [CODE] Resolved Phase 3 research Q1: keep `commands/codex/prompts/opsx.md` as an internal generated index only, never a public standalone route.
- 2026-04-27 [CODE] Resolved Phase 3 research Q2: update only stale route guidance in `AGENTS.md`; preserve legitimate repo-local `openspec/` authoring paths.
- 2026-04-27 [CODE] Rewrote Phase 3 validation mapping to cover 11 plans, 5 waves, direct generated-bundle parity checks, and a final public-surface gate.
- 2026-04-27 [CODE] Updated `.planning/ROADMAP.md` and `.planning/STATE.md` to reflect the revised Phase 3 plan count, waves, and next action.
- 2026-04-27 [CODE] Executed `03-01-PLAN.md`: hardened planning docs for explicit-only public routes and added Phase 3 validation inventories/parity hooks.

## Working set
- /Users/xubo/x-skills/openspec/.planning/ROADMAP.md
- /Users/xubo/x-skills/openspec/.planning/STATE.md
- /Users/xubo/x-skills/openspec/CONTINUITY.md
- /Users/xubo/x-skills/openspec/.planning/phases/03-skill-and-command-surface-rewrite/03-CONTEXT.md
- /Users/xubo/x-skills/openspec/.planning/phases/03-skill-and-command-surface-rewrite/03-RESEARCH.md
- /Users/xubo/x-skills/openspec/.planning/phases/03-skill-and-command-surface-rewrite/03-VALIDATION.md
- /Users/xubo/x-skills/openspec/.planning/phases/03-skill-and-command-surface-rewrite/03-01-SUMMARY.md
- /Users/xubo/x-skills/openspec/.planning/phases/03-skill-and-command-surface-rewrite/03-02-SUMMARY.md
- /Users/xubo/x-skills/openspec/.planning/phases/03-skill-and-command-surface-rewrite/03-03-SUMMARY.md
- /Users/xubo/x-skills/openspec/.planning/phases/03-skill-and-command-surface-rewrite/03-04-PLAN.md
- /Users/xubo/x-skills/openspec/.planning/phases/03-skill-and-command-surface-rewrite/03-09-PLAN.md
- /Users/xubo/x-skills/openspec/.planning/phases/03-skill-and-command-surface-rewrite/03-10-PLAN.md

## Decisions
- 2026-04-27 [CODE] D001 ACTIVE: Treat v3.0 as a breaking OpsX rename and workflow-state upgrade.
- 2026-04-27 [CODE] D002 ACTIVE: Use `.opsx/` and `~/.opsx/` as canonical current workflow directories; keep old OpenSpec paths only in migration/history notes.
- 2026-04-27 [CODE] D003 ACTIVE: Keep the full OpsX command set; do not add Lite/Advanced profiles.
- 2026-04-27 [CODE] D004 ACTIVE: Use disk-backed state (`state.yaml`, `context.md`, `drift.md`, artifact hashes) as the anti-drift mechanism.
- 2026-04-27 [CODE] D005 ACTIVE: Add TDD-light and `spec-split-checkpoint` as quality gates without turning OpsX into a full autonomous agent engine.
- 2026-04-27 [CODE] D006 ACTIVE: Phase 1 should ship `opsx` identity without an `openspec` binary alias in `@xenonbyte/opsx@3.0.0`; any bridge belongs to a separate `@xenonbyte/openspec@2.x` compatibility package.
- 2026-04-27 [CODE] D007 ACTIVE: Phase 1 may perform coarse generated asset/skill path renames for package coherence, while Phase 3 owns detailed command/skill preflight semantics.
- 2026-04-27 [CODE] D008 ACTIVE: Phase 3 supersedes earlier migration/history allowlist assumptions; v3.0 should remove legacy OpenSpec surfaces rather than preserving historical compatibility wording/tests.
- 2026-04-27 [CODE] D009 ACTIVE: Keep `commands/codex/prompts/opsx.md` only as an internal generated route catalog; public Codex entrypoints remain explicit `$opsx-*`.
- 2026-04-27 [CODE] D010 ACTIVE: In `AGENTS.md`, preserve repo-local `openspec/` authoring-path guidance and change only stale route bullets to current OpsX routes.

## Receipts
- 2026-04-27 [CODE] Phase 3 revision addressed all checker blockers/warnings by splitting source-of-truth edits from generated refreshes and separating skill/docs/help surfaces into bounded plans.
- 2026-04-27 [TOOL] `date -u +%Y-%m-%dT%H:%M:%SZ` returned `2026-04-27T09:01:50Z` for the revised planning timestamp.
- 2026-04-27 [TOOL] Phase 3 generated bundle inventory confirmed 45 checked-in command files across Claude, Codex, and Gemini, requiring bounded refresh slices to stay under plan file-budget warnings.
- 2026-04-27 [TOOL] Existing checker feedback required resolving `03-RESEARCH.md` open questions and splitting the old `03-02` / `03-03` plan scopes.
- 2026-04-27 [CODE] Revised Phase 3 now uses Wave 0 planning contracts, Wave 1 source-output assertions, Wave 2 six bounded generated refresh slices, Wave 3 skill/docs alignment, and Wave 4 help + final verification.
- 2026-04-27 [TOOL] `npm run test:workflow-runtime` remained the fast baseline suite during planning; `node scripts/check-phase1-legacy-allowlist.js` was already known-stale and is now narrowed/activated only in the final verification wave.
- 2026-04-27 [TOOL] Phase 2 verifier wrote `02-VERIFICATION.md` with `status: passed`, `score: 9/9 must-haves verified`, and automated checks `npm run test:workflow-runtime`, `opsx --help`, `opsx status`, `opsx migrate --dry-run`, and `opsx check`.
- 2026-04-27 [TOOL] Final Phase 2 clean review commit `bbdd06e` wrote `02-REVIEW.md` with `status: clean`; reviewer verification ran `npm run test:workflow-runtime` and passed `30/30`.
- 2026-04-27 [TOOL] Revised Phase 3 `03-01-PLAN.md` through `03-11-PLAN.md` passed `frontmatter.validate`, `verify.plan-structure`, and the independent `gsd-plan-checker` with `VERIFICATION PASSED`.
- 2026-04-27 [TOOL] `03-01` execution verification passed: `npm run test:workflow-runtime` (30/30), planning-doc grep contract, and validation-script grep contract.
- 2026-04-27 [TOOL] `03-02` execution verification passed: `npm run test:workflow-runtime` (30/30) and source-contract grep checks for explicit routes plus strict preflight paths.
- 2026-04-27 [TOOL] `03-03` execution verification passed: `npm run test:workflow-runtime` (30/30) and listed Claude files parity-verified against `buildPlatformBundle('claude')`.
