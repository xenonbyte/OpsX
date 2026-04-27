## Snapshot
- 2026-04-27 [USER] Goal: Start a new GSD milestone from the supplied OpsX optimization report.
- 2026-04-27 [CODE] Current milestone: `v3.0 OpsX migration and state-machine workflow`.
- 2026-04-27 [CODE] Current phase context: Phase 1 `OpsX Naming and CLI Surface` is complete and verified; Phase 2 `.opsx/ Workspace and Migration` is next.
- 2026-04-27 [TOOL] Repo had OpenSpec artifacts under `openspec/` but no existing `.planning/` directory.
- 2026-04-27 [ASSUMPTION] Because interactive question tooling is unavailable in Default mode and the user supplied a complete implementation report, the milestone goals and roadmap approval are treated as covered by the user input.
- 2026-04-27 [CODE] GSD planning layer now exists under `.planning/`; phase numbering is reset to Phase 1.

## Done (recent)
- 2026-04-27 [CODE] Created `.planning/phases/01-opsx-naming-and-cli-surface/01-RESEARCH.md` with naming-surface inventory, phase boundaries, implementation order, runtime-state inventory, verification gates, and rename risks.
- 2026-04-27 [CODE] Created `.planning/phases/01-opsx-naming-and-cli-surface/01-01-PLAN.md`, `01-02-PLAN.md`, and `01-03-PLAN.md` covering package/CLI identity, install+generated asset rename, and docs/release allowlist gating.
- 2026-04-27 [CODE] Revised Phase 1 plans so `opsx check|doc|language` are the primary CLI surface and the over-wide plans are now split into `01-02` skill/plumbing, `01-03` generator/assets, `01-04` runtime regressions, `01-05` docs/templates, and `01-06` changelog/allowlist gates.
- 2026-04-27 [CODE] Finalized Phase 1 plan checker issues by grouping `01-03` command asset file scope and adding `lib/config.js`, `lib/constants.js`, `lib/install.js`, and `lib/runtime-guidance.js` to the explicit `01-06` deferred-runtime allowlist contract.
- 2026-04-27 [CODE] Executed Phase 1 across 6 plans, fixed code-review findings, normalized SUMMARY filenames, and verified 5/5 Phase 1 requirements.
- 2026-04-27 [CODE] Re-ran Phase 1 code review after fixing install/uninstall warnings, then fixed the remaining Info-level `opsx --language <en|zh>` docs consistency item with `--all`.
- 2026-04-27 [CODE] Created `.planning/PROJECT.md` with OpsX v3.0 goals, validated OpenSpec context, active requirements, out-of-scope boundaries, constraints, and decisions.
- 2026-04-27 [CODE] Created `.planning/REQUIREMENTS.md` with 43 mapped v3.0 requirements across naming, workspace migration, commands/skills, state machine, spec review, TDD-light, quality gates, and tests.
- 2026-04-27 [CODE] Created `.planning/ROADMAP.md` with 8 phases mapped to all requirements.
- 2026-04-27 [CODE] Created `.planning/STATE.md`, `.planning/MILESTONES.md`, `.planning/config.json`, and `.planning/research/SUMMARY.md`.
- 2026-04-27 [CODE] Created Phase 1 context and discussion log under `.planning/phases/01-opsx-naming-and-cli-surface/`.
- 2026-04-27 [TOOL] `gsd-sdk state.update` corrupted two trailing lines in `.planning/STATE.md`; repaired them with a focused patch.
- 2026-04-06 [CODE] Previous major work was v2.0.1 OpenSpec runtime/advisory-review patch release preparation and verification.

## Working set
- /Users/xubo/x-skills/openspec/.planning/PROJECT.md
- /Users/xubo/x-skills/openspec/.planning/REQUIREMENTS.md
- /Users/xubo/x-skills/openspec/.planning/ROADMAP.md
- /Users/xubo/x-skills/openspec/.planning/STATE.md
- /Users/xubo/x-skills/openspec/.planning/MILESTONES.md
- /Users/xubo/x-skills/openspec/.planning/config.json
- /Users/xubo/x-skills/openspec/.planning/research/SUMMARY.md
- /Users/xubo/x-skills/openspec/.planning/phases/01-opsx-naming-and-cli-surface/01-CONTEXT.md
- /Users/xubo/x-skills/openspec/.planning/phases/01-opsx-naming-and-cli-surface/01-DISCUSSION-LOG.md
- /Users/xubo/x-skills/openspec/.planning/phases/01-opsx-naming-and-cli-surface/01-RESEARCH.md
- /Users/xubo/x-skills/openspec/CONTINUITY.md
- /Users/xubo/x-skills/openspec/.gitignore

## Decisions
- 2026-04-27 [CODE] D001 ACTIVE: Treat v3.0 as a breaking OpsX rename and workflow-state upgrade.
- 2026-04-27 [CODE] D002 ACTIVE: Use `.opsx/` and `~/.opsx/` as canonical future workflow directories; keep old OpenSpec paths only in migration/history notes.
- 2026-04-27 [CODE] D003 ACTIVE: Keep the full OpsX command set; do not add Lite/Advanced profiles.
- 2026-04-27 [CODE] D004 ACTIVE: Use disk-backed state (`state.yaml`, `context.md`, `drift.md`, artifact hashes) as the anti-drift mechanism.
- 2026-04-27 [CODE] D005 ACTIVE: Add TDD-light and `spec-split-checkpoint` as quality gates without turning OpsX into a full autonomous agent engine.
- 2026-04-27 [CODE] D006 ACTIVE: Phase 1 should ship `opsx` identity without an `openspec` binary alias in `@xenonbyte/opsx@3.0.0`; any bridge belongs to a separate `@xenonbyte/openspec@2.x` compatibility package.
- 2026-04-27 [CODE] D007 ACTIVE: Phase 1 may perform coarse generated asset/skill path renames for package coherence, while Phase 3 owns detailed command/skill preflight semantics.

## Receipts
- 2026-04-27 [TOOL] `gsd-sdk query init.new-milestone` reported `project_exists: false`, `roadmap_exists: false`, `state_exists: false`, and `research_enabled: true`.
- 2026-04-27 [TOOL] Phase 1 changed `package.json` to `@xenonbyte/opsx` version `3.0.0` with binary `opsx`.
- 2026-04-27 [TOOL] Phase 1 rewrote public README/docs/commands/skills/templates to OpsX surface; remaining legacy tokens are allowlisted deferred-runtime/history references.
- 2026-04-27 [TOOL] Phase 1 research confirmed a planning conflict: the strict repo-wide `openspec` grep gate still hits live runtime/test workspace paths that are otherwise deferred to Phase 2, so the planner must choose an allowlist or broaden scope.
- 2026-04-27 [TOOL] `schemas/spec-driven/schema.json` currently has `spec-checkpoint`, `task-checkpoint`, and `execution-checkpoint`, but not `spec-split-checkpoint`.
- 2026-04-27 [TOOL] Global gitignore ignored `.planning/`; repo `.gitignore` now explicitly tracks `.planning/**`.
- 2026-04-27 [TOOL] Phase 1 context committed as `9a2aae4 docs(01): capture phase context`.
- 2026-04-27 [TOOL] `gsd-sdk query verify.plan-structure` passed for `01-01-PLAN.md` through `01-06-PLAN.md`.
- 2026-04-27 [TOOL] Final `gsd-plan-checker` result for Phase 1 was `CHECKER PASS`.
- 2026-04-27 [TOOL] `gsd-sdk query state.planned-phase --phase "1" --name "OpsX Naming and CLI Surface" --plans "6"` updated `.planning/STATE.md`.
- 2026-04-27 [TOOL] Phase 1 verification report status is `passed`; runtime suite passed 23/23, legacy allowlist passed, and `npm pack --dry-run` produced `@xenonbyte/opsx@3.0.0`.
- 2026-04-27 [TOOL] Latest Phase 1 `01-REVIEW-FIX.md` reports `status: all_fixed` for all review findings; `02f6795` updated language alias docs and `9a8e719` recorded the all-scope fix report. Runtime suite remains 25/25 and legacy allowlist passes.
- 2026-04-27 [CODE] Next executable step: `$gsd-discuss-phase 2` for Phase 2: `.opsx/` Workspace and Migration.
