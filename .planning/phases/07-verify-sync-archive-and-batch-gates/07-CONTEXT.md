# Phase 7: Verify, Sync, Archive, and Batch Gates - Context

**Gathered:** 2026-04-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 7 turns the durable workflow evidence created in Phases 4-6 into hard completion gates for `opsx-verify`, `opsx-sync`, `opsx-archive`, `opsx-batch-apply`, and `opsx-bulk-archive`.

This phase owns:
- `opsx-verify` quality gates for artifact alignment, task completion, execution checkpoint completeness, TDD-light records, drift, changed-file scope, and configured verification commands.
- `opsx-sync` behavior for merging change specs into `.opsx/specs/**` while detecting omitted or conflicting requirements.
- `opsx-archive` blocking behavior for unverified, unsynced, incomplete, unresolved-drift, or out-of-scope changes.
- Batch apply and bulk archive orchestration rules that keep each change isolated by state/context and report skipped changes with reasons.
- Source-of-truth guidance and generated prompt refreshes for verify/sync/archive/batch routes.

This phase does not own clean `opsx status --json`, path/glob utility hardening, package release coverage, or final expanded v3.0 test suite. Those remain Phase 8 work.

</domain>

<decisions>
## Implementation Decisions

### Verify Gate Strictness
- **D-01:** `opsx-verify` should default to hard gates for completion correctness. It should `BLOCK` forbidden-path changes, incomplete tasks, missing execution checkpoints, missing strict-mode RED/VERIFY records, unresolved drift blockers, and unsynced specs when an archive path depends on synced specs.
- **D-02:** `opsx-verify` may return `WARN` for lower-risk issues such as docs/config-only extra files, manual verification with an explicit rationale, or non-blocking advisory findings. `WARN` must be visible in the report but must not silently become a pass.
- **D-03:** `opsx-verify` should produce a structured result with `PASS`, `WARN`, or `BLOCK`, severity-classified findings, patch targets, and next action. The result should be usable by prompts, tests, and archive gates.

### Drift Blocking Semantics
- **D-04:** Entries under `User approval needed` in `drift.md` are unresolved blockers unless explicitly marked resolved or approved in the change artifacts/state.
- **D-05:** `Files changed outside allowed paths` blocks when the changed file matches `forbiddenPaths` or clearly exceeds the approved scope. Additional docs/config changes may warn if they are not forbidden and are explainable.
- **D-06:** `Scope changes detected` and `Requirements discovered during apply` default to `BLOCK` because they indicate the implementation may have outrun approved proposal/spec/task artifacts. They may pass only after the corresponding proposal/spec/design/tasks/state evidence is updated or explicitly approved.

### Sync Strategy
- **D-07:** `opsx-sync` should be conservative and deterministic. Do not attempt clever section-level automatic merges that can hide requirement conflicts.
- **D-08:** For each change spec under `.opsx/changes/<change>/specs/**`, compare the target `.opsx/specs/**` capability file for omitted requirements, duplicate requirement IDs, conflicting normative language, and likely behavior conflicts before writing.
- **D-09:** If no conflict is detected, `opsx-sync` may replace or append the clearly scoped delta into the canonical spec file. If conflict or omission is detected, return `BLOCK` with patch targets and do not write a partial sync.

### Archive Behavior
- **D-10:** `opsx-archive` accepts `VERIFIED` or `SYNCED` changes. If the change is only `VERIFIED`, archive should run the same sync check internally before moving the change.
- **D-11:** If internal sync is safe, `opsx-archive` can update `.opsx/specs/**`, advance state through `SYNCED`, then archive the change. If sync is unsafe, archive returns `BLOCK` and leaves the change in place.
- **D-12:** `opsx-archive` must block incomplete tasks, missing execution checkpoints, unresolved drift, forbidden-path changes, failed verification, and unsafe sync. It must not archive incomplete changes through implicit user acceptance.

### Batch Failure Strategy
- **D-13:** `opsx-batch-apply` and `opsx-bulk-archive` should process each change independently. For each change, read its own `state.yaml`, `context.md`, `drift.md`, artifacts, and checkpoints; never mix multiple changes into one shared execution context.
- **D-14:** Per-change failure should skip that change, record a clear reason, and continue to the next change. The final report should summarize `applied` / `archived` / `skipped` / `blocked` counts and reasons.
- **D-15:** Global failures may stop the entire batch: missing `.opsx/` workspace, ambiguous target set, unsafe command arguments, broken generation/runtime environment, or any condition that means the batch itself cannot be evaluated safely.

### Implementation Boundary
- **D-16:** Phase 7 should add testable library-first gate modules instead of only changing prompt text. Preferred modules are `lib/verify.js`, `lib/sync.js`, `lib/archive.js`, and `lib/batch.js` or similarly scoped equivalents.
- **D-17:** The Node CLI should not become a full workflow runner. Modules should compute gates, reports, state updates, and safe file operations that prompts/skills can rely on; product-code implementation remains agent-driven through `/opsx-*` and `$opsx-*`.
- **D-18:** Generated command prompts, `skills/opsx/SKILL.md`, and bilingual playbooks must stop saying verify/archive hard gates are deferred after Phase 7. They should describe the actual gate behavior and route-specific outputs.
- **D-19:** Runtime tests should cover verify blocking, sync conflict blocking, archive preconditions, internal archive sync, batch isolation, skipped-change reporting, and generated prompt parity for the affected routes.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone Scope
- `.planning/PROJECT.md` — OpsX v3.0 milestone scope, constraints, and current active requirements.
- `.planning/REQUIREMENTS.md` — QUAL-01 through QUAL-04 requirements and traceability.
- `.planning/ROADMAP.md` — Phase 7 goal, dependencies, and success criteria.

### Prior Phase Decisions
- `.planning/phases/04-change-state-machine-and-drift-control/04-CONTEXT.md` — durable state, artifact hashes, context/drift sidecars, allowed/forbidden path fields, and one-group apply flow.
- `.planning/phases/05-spec-split-checkpoint/05-CONTEXT.md` — spec validator/checkpoint behavior that sync and verify can reuse for requirement conflict checks.
- `.planning/phases/06-tdd-light-workflow/06-CONTEXT.md` — strict-by-default TDD-light rules and execution checkpoint evidence that verify/archive must enforce.

### Current Implementation Touchpoints
- `lib/change-state.js` — lifecycle stages and transition events, including `VERIFIED`, `SYNCED`, and `ARCHIVED`.
- `lib/change-store.js` — persisted state, checkpoints, `verificationLog`, `allowedPaths`, `forbiddenPaths`, context capsule updates, and drift ledger writes.
- `lib/change-artifacts.js` — tracked artifact hashing and hash drift detection.
- `lib/change-capsule.js` — context capsule rendering and stable drift ledger headings.
- `lib/spec-validator.js` — reusable split-spec checks for duplicate/conflicting requirements and hidden requirements.
- `lib/workflow.js` — current checkpoint runners, TDD-light enforcement, execution checkpoint logic, and generated workflow metadata.
- `lib/runtime-guidance.js` — status/resume/continue/apply guidance and hash drift inspection behavior.
- `lib/generator.js` — generated prompt wording source for affected routes.
- `skills/opsx/SKILL.md` — workflow-level guardrails that currently mark hard verify/archive gates as deferred to Phase 7.
- `skills/opsx/references/action-playbooks.md` — English verify/sync/archive/batch playbook text.
- `skills/opsx/references/action-playbooks-zh.md` — Chinese verify/sync/archive/batch playbook text.
- `commands/claude/opsx/verify.md`, `commands/claude/opsx/sync.md`, `commands/claude/opsx/archive.md`, `commands/claude/opsx/batch-apply.md`, `commands/claude/opsx/bulk-archive.md` — Claude generated route outputs.
- `commands/codex/prompts/opsx-verify.md`, `commands/codex/prompts/opsx-sync.md`, `commands/codex/prompts/opsx-archive.md`, `commands/codex/prompts/opsx-batch-apply.md`, `commands/codex/prompts/opsx-bulk-archive.md` — Codex generated route outputs.
- `commands/gemini/opsx/verify.toml`, `commands/gemini/opsx/sync.toml`, `commands/gemini/opsx/archive.toml`, `commands/gemini/opsx/batch-apply.toml`, `commands/gemini/opsx/bulk-archive.toml` — Gemini generated route outputs.
- `scripts/test-workflow-runtime.js` — fast regression suite for workflow runtime and generated parity.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `normalizeChangeState()` already normalizes `verificationLog`, `allowedPaths`, `forbiddenPaths`, checkpoints, blockers, and warnings. Verify/archive gates should consume this normalized state instead of reparsing raw YAML ad hoc.
- `recordCheckpointResult()` and `recordTaskGroupExecution()` already refresh hashes and persist accepted checkpoint evidence. Verify/archive should distinguish accepted persisted evidence from incomplete or blocked evidence.
- `detectArtifactHashDrift()` already compares stored/current tracked artifacts. Verify should use this as a gate input so archive cannot proceed from stale state.
- `validateSpecSplit()` / `runSpecSplitCheckpoint()` behavior in `lib/spec-validator.js` and `lib/workflow.js` can inform sync conflict detection instead of inventing a second requirement parser.

### Established Patterns
- The project favors library-first helpers with prompt/skill guidance layered on top. Phase 7 should follow the Phase 4-6 pattern: implement deterministic modules, add runtime tests, update generator source, then refresh checked-in generated outputs.
- State mutations should use explicit lifecycle transitions. Verify should advance to `VERIFIED` only after gates pass; sync should advance to `SYNCED`; archive should advance to `ARCHIVED` only after all archive preconditions pass.
- Status/resume remain read-only. Verify/sync/archive are the routes allowed to make accepted state/spec/archive writes.
- Generated commands are checked for parity with `buildPlatformBundle()`. Any prompt changes should be source-of-truth driven and refreshed mechanically.

### Integration Points
- `skills/opsx` and playbooks currently say hard verify/archive gates are deferred to Phase 7. This wording must be replaced during the phase.
- Existing route prompts for verify/sync/archive/batch are generic and delegate to playbooks. Phase 7 should make them explicit about hard gates, safe sync, archive preconditions, per-change batch isolation, and skipped-change reporting.
- Phase 8 owns clean JSON and glob/path hardening, so Phase 7 should avoid broad path utility refactors unless directly required for gate correctness.

</code_context>

<specifics>
## Specific Ideas

- Archive should be ergonomic: users can run `$opsx-archive` on a `VERIFIED` change without first remembering `$opsx-sync`, but archive must run the same safe sync checks internally and block if sync is unsafe.
- Batch routes should prioritize isolation over throughput. They are orchestrators for repeated single-change operations, not a giant context that implements or archives multiple changes at once.
- Drift defaults should be conservative. New scope or discovered requirements during apply should force artifact/state reconciliation before verify/archive can pass.

</specifics>

<deferred>
## Deferred Ideas

- `opsx status --json` clean stdout behavior remains Phase 8.
- Path canonicalization, glob-special escaping, and glob artifact output parsing remain Phase 8 unless a narrow helper is required for Phase 7 gate correctness.
- A full autonomous fresh-context task runner remains out of scope for this milestone.

</deferred>

---

*Phase: 07-verify-sync-archive-and-batch-gates*
*Context gathered: 2026-04-28*
