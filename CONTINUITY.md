## Snapshot
- 2026-04-27 [USER] Goal: Start a new GSD milestone from the supplied OpsX optimization report.
- 2026-04-27 [CODE] Current milestone: `v3.0 OpsX migration and state-machine workflow`.
- 2026-04-27 [CODE] Phase 1, Phase 2, Phase 3, and Phase 4 are complete and verified.
- 2026-04-27T17:04Z [TOOL] Phase 4 verifier passed 5/5 must-haves; `04-VERIFICATION.md` was written with `status: passed`.
- 2026-04-27 [TOOL] Phase 4 final code review `04-REVIEW.md` is clean after refreshed review commit `27d8438`.
- 2026-04-27 [TOOL] Final Phase 4 checks passed: `npm run test:workflow-runtime` 49/49 and `gsd-sdk query verify.schema-drift 04`.
- 2026-04-27 [CODE] Phase 3 code review is clean after remediation commits `9690fac` and `c719ba1`.
- 2026-04-27 [CODE] Public current UX must not expose legacy OpenSpec routes/paths, `/prompts:*`, `/opsx:*`, standalone `$opsx`, or `$opsx <request>`.
- 2026-04-27 [CODE] `commands/codex/prompts/opsx.md` remains only as an internal generated route catalog; public Codex entrypoints are explicit `$opsx-*`.
- 2026-04-27 [CODE] `AGENTS.md` preserves repo-local `openspec/config.yaml` and `openspec/changes/` authoring-path guidance while replacing stale route bullets with current OpsX guidance.
- 2026-04-28 [CODE] Current GSD position: Phase 5 (`spec-split-checkpoint`) context is captured; next step is `$gsd-plan-phase 5`.

## Done (recent)
- 2026-04-27 [CODE] Executed all Phase 4 plans `04-01` through `04-09`; summaries exist for every plan.
- 2026-04-27 [CODE] Fixed Phase 4 review findings in commit `7282e57`: lifecycle route gaps, fresh/migrated hash baselines, lowercase legacy stage normalization, and active task group apply selection.
- 2026-04-27 [CODE] Committed clean Phase 4 review report in `535df3b`.
- 2026-04-27 [TOOL] Phase 4 verifier wrote `04-VERIFICATION.md` with `status: passed`, `score: 5/5`, and `requirements_verified: 8/8`.
- 2026-04-27 [CODE] Updated `.planning/STATE.md`, `.planning/ROADMAP.md`, `.planning/PROJECT.md`, and `CONTINUITY.md` for Phase 4 completion and Phase 5 readiness.
- 2026-04-28 [CODE] Captured Phase 5 context and discussion log in `.planning/phases/05-spec-split-checkpoint/`.
- 2026-04-27 [CODE] Executed all Phase 3 plans `03-01` through `03-11`; final review and verification passed.

## Working set
- /Users/xubo/x-skills/openspec/.planning/ROADMAP.md
- /Users/xubo/x-skills/openspec/.planning/REQUIREMENTS.md
- /Users/xubo/x-skills/openspec/.planning/STATE.md
- /Users/xubo/x-skills/openspec/.planning/PROJECT.md
- /Users/xubo/x-skills/openspec/CONTINUITY.md
- /Users/xubo/x-skills/openspec/.planning/phases/05-spec-split-checkpoint/05-CONTEXT.md
- /Users/xubo/x-skills/openspec/.planning/phases/05-spec-split-checkpoint/05-DISCUSSION-LOG.md
- /Users/xubo/x-skills/openspec/schemas/spec-driven/schema.json
- /Users/xubo/x-skills/openspec/lib/workflow.js
- /Users/xubo/x-skills/openspec/lib/change-store.js
- /Users/xubo/x-skills/openspec/scripts/test-workflow-runtime.js

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
- 2026-04-27 [CODE] D011 ACTIVE: Shared playbooks may mention `$opsx-*` only when the same line labels Codex and gives the Claude/Gemini `/opsx-*` equivalent.
- 2026-04-27 [CODE] D012 ACTIVE: Phase 4 is library-first state-machine infrastructure; do not build a full Node workflow execution engine.
- 2026-04-27 [CODE] D013 ACTIVE: Phase 4 uses strict mutation transitions, readable status/resume, warn-and-reload hash drift, and one-top-level-task-group apply guidance.
- 2026-04-27 [CODE] D014 ACTIVE: Phase 4 research recommends `xstate` pure transitions for mutations and `yaml` for persisted state files because the local YAML helper cannot represent the required array-heavy schema.
- 2026-04-27 [CODE] D015 ACTIVE: Phase 4 plans pin `yaml@2.8.3`, do not add `xstate`, and instead schedule a local transition-table module in `lib/change-state.js` to keep the implementation bounded and library-first.

## Receipts
- 2026-04-28 [TOOL] Phase 5 context committed as `08235de`; STATE session record committed as `8aa329d`.
- 2026-04-27T17:04Z [TOOL] Verification pass confirmed Phase 4 goal achievement: `npm run test:workflow-runtime` passed 49/49, `04-REVIEW.md` remained clean, and `04-VERIFICATION.md` captures the passed report.
- 2026-04-28 [TOOL] `npm run test:workflow-runtime` passed 49/49 during `04-09` after removing temporary parity exemptions and restoring full `commands/**` checked-in parity.
- 2026-04-28 [TOOL] `npm run test:workflow-runtime` passed 49/49 during `04-08` and Gemini parity check returned `GEMINI_PARITY_OK`.
- 2026-04-28 [TOOL] `npm run test:workflow-runtime` passed 49/49 during `04-07` and Codex parity check returned `CODEx_PARITY_OK`.
- 2026-04-27 [TOOL] `npm run test:workflow-runtime` passed 39/39 after `04-02` Task 2 GREEN.
- 2026-04-27 [TOOL] `npm run test:workflow-runtime` passed 49/49 after `04-04` Task 2 GREEN.
- 2026-04-27 [TOOL] `gsd-sdk query state.advance-plan` moved Phase 4 cursor from Plan 2 to Plan 3.
- 2026-04-27 [TOOL] Committed Phase 4 context as `94ca803 docs(04): capture phase context`.
- 2026-04-27 [TOOL] `npm run test:workflow-runtime` passed 31/31 while preparing Phase 4 research.
- 2026-04-27 [TOOL] `gsd-sdk query init.plan-phase 04` confirmed `phase_dir=.planning/phases/04-change-state-machine-and-drift-control`, `commit_docs=true`, and no existing Phase 4 plans before planning.
- 2026-04-27 [TOOL] `gsd-sdk query history-digest` confirmed Phase 2 migration scaffolds and Phase 3 generated parity gates are the direct dependencies for Phase 4 planning.
- 2026-04-27 [TOOL] Final Phase 3 verification commands passed: `npm run test:workflow-runtime` 31/31, `node scripts/check-phase1-legacy-allowlist.js`, `node bin/opsx.js --help`, `gsd-sdk query verify.schema-drift 03`, and wrong-platform route greps.
- 2026-04-27 [TOOL] `03-REVIEW.md` final status `clean`; `03-VERIFICATION.md` final status `passed`.
- 2026-04-27 [CODE] Commits `9690fac`, `c719ba1`, `2d17425`, and `950e2f4` closed Phase 3 review remediation, clean review, and verification report.
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
