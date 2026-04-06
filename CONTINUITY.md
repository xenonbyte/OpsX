## Snapshot
- 2026-04-06 [USER] Goal: Finish the advisory-review/runtime bugfix work as a formal `v2.0.1` release by updating release metadata, committing the repo state, tagging the release, and publishing npm.
- 2026-04-06 [CODE] Constraint: This repository uses OpenSpec as the workflow source of truth; implementation changes should keep `openspec/changes/*` artifacts aligned.
- 2026-04-06 [TOOL] Current branch is `main`; worktree was clean before the fix.
- 2026-04-06 [TOOL] Core verification passed: runtime workflow tests, CLI help/check/doc, syntax checks, and dry-run package build.
- 2026-04-06 [TOOL] Defects confirmed: advisory review (`waived` or `recommended`) can still surface as actionable next-step guidance or summary output, runtime kernel can drop caller-provided source text before heuristic/checkpoint/preview-group evaluation, and apply readiness can be overstated by in-memory planning previews.
- 2026-04-06 [CODE] Durable fix target: make advisory review non-actionable across runtime/workflow/summary APIs while preserving hard-gated/completed behavior, caller-provided source text for heuristic/preview flows, and file-based apply readiness.

## Done (recent)
- 2026-04-06 [CODE] Bumped package metadata from `2.0.0` to `2.0.1` and refreshed `README.md`, `README-zh.md`, and `CHANGELOG.md` for the advisory-review/runtime patch release.
- 2026-04-06 [TOOL] Confirmed both npm registry and git tags currently top out at `2.0.0`, so the next safe release version is `2.0.1`.
- 2026-04-06 [TOOL] Re-ran release verification after metadata updates: workflow runtime tests passed (`19/19`), JS syntax checks passed, `openspec --version` reports `2.0.1`, and `npm pack --dry-run --cache .npm-cache` succeeded.
- 2026-04-06 [TOOL] Read `openspec/config.yaml`, schema, runtime modules, and active change metadata.
- 2026-04-06 [TOOL] Ran `node scripts/test-workflow-runtime.js` and got 14 passing tests before the fix.
- 2026-04-06 [TOOL] Ran `node bin/openspec.js --check` and `node bin/openspec.js --doc` successfully.
- 2026-04-06 [TOOL] Ran `npm pack --dry-run --cache .npm-cache` successfully after bypassing a host-level npm cache permission issue.
- 2026-04-06 [CODE] Added change `fix-waived-security-review-next-step` with aligned proposal/spec/design/security-review/tasks artifacts.
- 2026-04-06 [CODE] Updated review activation so waived security review no longer stays active in workflow state.
- 2026-04-06 [CODE] Added regression coverage for waived next-step behavior and workflow validation.
- 2026-04-06 [TOOL] Verified the original bug is fixed: waived changes now report `next.stage = "apply"` and `next.artifactId = null`.
- 2026-04-06 [TOOL] Re-ran runtime workflow tests and got 14 passing tests after the fix.
- 2026-04-06 [TOOL] New change `fix-waived-security-review-next-step` now passes both `spec checkpoint` and `task checkpoint`.
- 2026-04-06 [CODE] Extended the runtime fix so recommended review is also non-actionable in next-step guidance and caller-provided request text survives heuristic review detection.
- 2026-04-06 [TOOL] Added runtime tests covering request-only heuristic input and recommended review advisory behavior; suite now has 15 passing tests.
- 2026-04-06 [CODE] Aligned workflow-level `review.active` semantics so recommended review is inactive there too.
- 2026-04-06 [CODE] Refined source merging so caller-provided artifact text survives when files are absent, while on-disk file content still wins when present.
- 2026-04-06 [TOOL] Added unsaved-buffer preview regression coverage; suite now has 16 passing tests.
- 2026-04-06 [TOOL] Final project health check passed: runtime tests, syntax checks, package dry-run, installation check, and per-change checkpoints are all green.
- 2026-04-06 [CODE] Refined source merging again so whitespace-only files do not erase caller-provided preview text.
- 2026-04-06 [CODE] Aligned summarized workflow output with advisory-review inactivity and normalized array-backed task sources for apply previews.
- 2026-04-06 [TOOL] Added regression coverage for whitespace-only source merges, summary inactivity, and array-backed preview tasks; suite now has 18 passing tests.
- 2026-04-06 [CODE] Kept `buildApplyInstructions()` readiness bound to file-based artifact completion so preview-only planning text cannot bypass unsaved artifacts.
- 2026-04-06 [TOOL] Added apply-readiness regression coverage; suite now has 19 passing tests.

## Working set
- /Users/xubo/x-skills/openspec/CONTINUITY.md
- /Users/xubo/x-skills/openspec/package.json
- /Users/xubo/x-skills/openspec/README.md
- /Users/xubo/x-skills/openspec/README-zh.md
- /Users/xubo/x-skills/openspec/CHANGELOG.md
- /Users/xubo/x-skills/openspec/lib/runtime-guidance.js
- /Users/xubo/x-skills/openspec/lib/workflow.js
- /Users/xubo/x-skills/openspec/scripts/test-workflow-runtime.js
- /Users/xubo/x-skills/openspec/openspec/changes/fix-waived-security-review-next-step

## Decisions
- 2026-04-06 [CODE] D001 ACTIVE: Treat advisory `security-review` (`waived` and `recommended`) as visible review state, but not as an active artifact in runtime next-step selection.
- 2026-04-06 [CODE] D002 ACTIVE: Merge caller-provided `options.sources` with file-derived artifact text so schema heuristic inputs such as `request` survive runtime-kernel construction.
- 2026-04-06 [CODE] D003 ACTIVE: File-derived artifact text takes precedence only when the file has actual content; empty file-source placeholders must not erase caller-provided preview text.
- 2026-04-06 [CODE] D004 ACTIVE: Whitespace-only file content counts as absent for runtime-source merging, and array-backed task sources must be normalized before apply-preview grouping.
- 2026-04-06 [CODE] D005 ACTIVE: Preview sources may improve checkpoint diagnostics, but `buildApplyInstructions().ready` must remain false until required planning artifacts are completed on disk.

## Receipts
- 2026-04-06 [TOOL] `npm view @xenonbyte/openspec version` returned `2.0.0`; `git tag --list --sort=-v:refname` also tops out at `v2.0.0`.
- 2026-04-06 [TOOL] `node bin/openspec.js --version` now reports `OpenSpec v2.0.1`.
- 2026-04-06 [TOOL] `npm pack --dry-run --cache .npm-cache` produced `xenonbyte-openspec-2.0.1.tgz` successfully.
- 2026-04-06 [TOOL] `buildRuntimeKernel()` showed `review.state = "waived"` but `next.artifactId = "security-review"` for `runtime-action-engine` and `upgrade-artifact-graph-runtime`.
- 2026-04-06 [TOOL] Root cause located in `resolveSecurityReviewState()` and downstream artifact activation handling.
- 2026-04-06 [TOOL] `runtime-action-engine` and `upgrade-artifact-graph-runtime` now both report waived review as inactive with `planning-artifacts-complete`.
- 2026-04-06 [TOOL] Request-only heuristic input now survives through `buildStatus()` and `buildApplyInstructions()` and still produces recommended review guidance.
- 2026-04-06 [TOOL] Exported workflow state now reports recommended review as inactive, matching runtime artifact actionability.
- 2026-04-06 [TOOL] All active changes currently resolve to `next.stage = "apply"` with `spec checkpoint = PASS` and `task checkpoint = PASS`.
- 2026-04-06 [TOOL] Summarized workflow output now exposes advisory-review inactivity, and whitespace-only scaffold files no longer erase caller preview content.
- 2026-04-06 [TOOL] Apply readiness now stays false when `status.next` still points to missing planning artifacts, even if preview `sources` provide in-memory proposal/specs/design text.
