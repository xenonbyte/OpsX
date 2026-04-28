## Snapshot
- 2026-04-27 [USER] Goal: Start a new GSD milestone from the supplied OpsX optimization report.
- 2026-04-27 [CODE] Current milestone: `v3.0 OpsX migration and state-machine workflow`.
- 2026-04-28 [CODE] Phase 1 through Phase 7 are complete, verified, and post-fix code-reviewed clean.
- 2026-04-27 [CODE] Public current UX must not expose legacy OpenSpec routes/paths, `/prompts:*`, `/opsx:*`, standalone `$opsx`, or `$opsx <request>`.
- 2026-04-27 [CODE] `commands/codex/prompts/opsx.md` remains only as an internal generated route catalog; public Codex entrypoints are explicit `$opsx-*`.
- 2026-04-27 [CODE] `AGENTS.md` preserves repo-local `openspec/config.yaml` and `openspec/changes/` authoring-path guidance while replacing stale route bullets with current OpsX guidance.
- 2026-04-28 [USER] Phase 6 TDD default decision: use `rules.tdd.mode: strict` for behavior-change and bugfix work.
- 2026-04-28 [CODE] Phase 7 implements hard verify, sync, archive, drift/path-boundary, and batch isolation gates.
- 2026-04-28 [TOOL] Phase 7 verification passed; `07-VERIFICATION.md` status is `passed`, score is 4/4, and `npm run test:workflow-runtime` passed 104/104.
- 2026-04-28T16:09Z [TOOL] Phase 7 standard re-review superseded the prior clean report: `07-REVIEW.md` is now `issues_found` with 4 warnings, 0 critical.
- 2026-04-28T16:30Z [TOOL] Phase 7 review fixes applied all 4 warnings; `07-REVIEW-FIX.md` has `status: all_fixed`, and `npm run test:workflow-runtime` passed 109/109.
- 2026-04-28T16:47Z [TOOL] Phase 7 post-fix re-review is clean: `07-REVIEW.md` has 0 findings across 30 files, and `npm run test:workflow-runtime` passed 109/109.
- 2026-04-29 [CODE] Phase 8 research is captured; next expected milestone step is `$gsd-plan-phase 8`.
- 2026-04-29 [CODE] Phase 8 planning is complete: `.planning/phases/08-stability-json-and-release-coverage/08-01-PLAN.md` through `08-07-PLAN.md` define the release-hardening execution waves.
- 2026-04-29 [CODE] Phase 8 revision locked `docs/release-checklist.md`, `ok: true` transport semantics, and the full release gate steps `gsd-sdk query verify.schema-drift 08`, `$gsd-code-review 8`, and `$gsd-verify-work 8`.
- 2026-04-29 [CODE] Phase 8 plan `08-02` completed: `opsx status --json` now emits deterministic transport envelopes and state-topic TEST-03 coverage is active.

## Done (recent)
- 2026-04-28 [CODE] Executed all Phase 7 plans `07-01` through `07-08`.
- 2026-04-28 [CODE] Added Phase 7 gate runtime modules and prompt/guidance refreshes for verify, sync, archive, batch-apply, and bulk-archive.
- 2026-04-28T16:30Z [CODE] Fixed the 4 Phase 7 re-review warnings in commits `d729080`, `97f0248`, `6056297`, `73a61ab`, and `64029a1`.
- 2026-04-28T16:47Z [TOOL] Phase 7 post-fix re-review is clean across 30 files.
- 2026-04-28 [TOOL] Phase 7 verifier passed 4/4 must-haves in `07-VERIFICATION.md`.
- 2026-04-29 [CODE] Captured Phase 8 context and discussion log in `.planning/phases/08-stability-json-and-release-coverage/`.
- 2026-04-29 [CODE] Wrote `08-RESEARCH.md` with the recommended Phase 8 path: keep `picomatch`, avoid a new glob dependency, split tests by topic, and gate release with `npm test` plus `npm pack --dry-run --json`.
- 2026-04-29 [CODE] Wrote Phase 8 plans `08-01` through `08-07`, covering test split, `status --json`, shared path/glob utilities, release gates, and docs/checklist updates.
- 2026-04-29 [CODE] Executed Phase 8 plan `08-02` with commits `16d39be` and `6f40d4e`; runtime suite now passes 111/111 with status JSON matrix assertions.

## Working set
- /Users/xubo/x-skills/openspec/.planning/ROADMAP.md
- /Users/xubo/x-skills/openspec/.planning/PROJECT.md
- /Users/xubo/x-skills/openspec/.planning/STATE.md
- /Users/xubo/x-skills/openspec/.planning/REQUIREMENTS.md
- /Users/xubo/x-skills/openspec/CONTINUITY.md
- /Users/xubo/x-skills/openspec/.planning/phases/07-verify-sync-archive-and-batch-gates/07-REVIEW.md
- /Users/xubo/x-skills/openspec/.planning/phases/07-verify-sync-archive-and-batch-gates/07-VERIFICATION.md
- /Users/xubo/x-skills/openspec/.planning/phases/08-stability-json-and-release-coverage/08-CONTEXT.md
- /Users/xubo/x-skills/openspec/.planning/phases/08-stability-json-and-release-coverage/08-RESEARCH.md
- /Users/xubo/x-skills/openspec/.planning/phases/08-stability-json-and-release-coverage/08-DISCUSSION-LOG.md
- /Users/xubo/x-skills/openspec/.planning/phases/08-stability-json-and-release-coverage/08-01-PLAN.md
- /Users/xubo/x-skills/openspec/.planning/phases/08-stability-json-and-release-coverage/08-07-PLAN.md

## Decisions
- 2026-04-27 [CODE] D001 ACTIVE: Treat v3.0 as a breaking OpsX rename and workflow-state upgrade.
- 2026-04-27 [CODE] D002 ACTIVE: Use `.opsx/` and `~/.opsx/` as canonical current workflow directories; keep old OpenSpec paths only in migration/history notes.
- 2026-04-27 [CODE] D003 ACTIVE: Keep the full OpsX command set; do not add Lite/Advanced profiles.
- 2026-04-27 [CODE] D004 ACTIVE: Use disk-backed state (`state.yaml`, `context.md`, `drift.md`, artifact hashes) as the anti-drift mechanism.
- 2026-04-27 [CODE] D005 ACTIVE: Add TDD-light and `spec-split-checkpoint` as quality gates without turning OpsX into a full autonomous agent engine.
- 2026-04-27 [CODE] D008 ACTIVE: Phase 3 supersedes earlier migration/history allowlist assumptions; v3.0 should remove legacy OpenSpec surfaces rather than preserving historical compatibility wording/tests.
- 2026-04-27 [CODE] D009 ACTIVE: Keep `commands/codex/prompts/opsx.md` only as an internal generated route catalog; public Codex entrypoints remain explicit `$opsx-*`.
- 2026-04-27 [CODE] D012 ACTIVE: Phase 4 is library-first state-machine infrastructure; do not build a full Node workflow execution engine.
- 2026-04-27 [CODE] D015 ACTIVE: Phase 4 plans pin `yaml@2.8.3`, do not add `xstate`, and use a local transition-table module in `lib/change-state.js`.
- 2026-04-28 [USER] D016 ACTIVE: Phase 6 `rules.tdd.mode` defaults to `strict`, enforcing RED and VERIFY for behavior-change and bugfix work while keeping REFACTOR optional and allowing visible exemptions for non-behavior work.
- 2026-04-28 [USER] D018 ACTIVE: Phase 7 should implement hard verify/archive gates, conservative sync conflict checks, archive-internal safe sync, per-change batch skip reporting, and library-first gate modules rather than prompt-only guidance.
- 2026-04-28 [CODE] D019 ACTIVE: Phase 7 plans lock `picomatch@4.0.4` for Node-14-compatible `allowedPaths` / `forbiddenPaths` matching and preserve archived changes as full directories at `.opsx/archive/<change-name>/`.
- 2026-04-28 [CODE] D020 ACTIVE: Phase 7 hard gates reject forged sync roots, validate canonical spec writes, treat per-change batch exceptions as blocked results, and require clean verify/sync/archive preconditions before archival.

## Receipts
- 2026-04-28 [TOOL] Phase 7 plans `07-01` through `07-08` executed and produced summaries.
- 2026-04-28 [TOOL] `npm run test:workflow-runtime` passed 100/100 after all Phase 7 plan execution before review remediation.
- 2026-04-28 [TOOL] Initial Phase 7 review found 1 critical and 3 warnings; remediation commit `2712351` hardened verify, sync, and batch gates.
- 2026-04-28 [TOOL] Second Phase 7 review found forged canonical sync root risk; remediation commit `60d3420` rejects caller-supplied spec roots outside `repoRoot/.opsx/specs`.
- 2026-04-28 [TOOL] `npm run test:workflow-runtime` passed 104/104 after Phase 7 review remediation.
- 2026-04-28 [TOOL] Final Phase 7 review report committed as `7e68899` with `status: clean`, 0 findings, and 104/104 tests.
- 2026-04-28T16:09Z [TOOL] Phase 7 re-review superseded `7e68899`; current `07-REVIEW.md` has `status: issues_found`, warning=4, critical=0, info=0.
- 2026-04-28T16:30Z [TOOL] Fix report `07-REVIEW-FIX.md` reports `findings_in_scope: 4`, `fixed: 4`, `skipped: 0`, `status: all_fixed`.
- 2026-04-28 [TOOL] Local verification after fixes: `npm run test:workflow-runtime` passed 109/109.
- 2026-04-28T16:47Z [TOOL] Phase 7 clean post-fix review superseded the issues report; current `07-REVIEW.md` has `status: clean`, files_reviewed=30, and critical/warning/info/total all 0.
- 2026-04-29 [TOOL] Phase 8 context committed as `d72dd54`; locked decisions include full `status --json` envelope, JSON-only stdout with exit 0 for expected states, researched path/glob dependency, full path surface coverage, split test scripts with `npm test`, complete release gate, `npm pack --dry-run --json`, and release docs updates.
- 2026-04-29 [TOOL] Phase 8 research probes: `npm run test:workflow-runtime` passed 109/109, `node bin/opsx.js status --json` still prints text, and `npm_config_cache=.npm-cache npm pack --dry-run --json` succeeded while the default `~/.npm` cache failed with `EPERM`.
- 2026-04-29 [TOOL] Phase 8 planning outputs created locally: 7 PLAN.md files plus Roadmap plan index updates for Phase 8.
- 2026-04-29 [TOOL] Phase 8 plan `08-02` verification passed: `node scripts/test-workflow-state.js` (13/13), `npm run test:workflow-runtime` (111/111), and `npm test` (111/111).
- 2026-04-28 [TOOL] `gsd-sdk query verify.schema-drift 07` returned valid with 0 issues across 8 checked plans.
- 2026-04-28 [TOOL] Phase 7 verification report committed as `f32d323` with `status: passed` and 4/4 must-haves verified.
- 2026-04-28 [TOOL] `workflow.security_enforcement` is true; no `07-SECURITY.md` exists yet, so run `$gsd-secure-phase 7` before advancing if a dedicated security gate is required.
