# Phase 5: Spec-Split Checkpoint - Context

**Gathered:** 2026-04-27T18:28:58Z
**Status:** Ready for planning

<domain>
## Phase Boundary

Catch split-spec errors after specs are written and before design or tasks depend on them. This phase adds the `spec-split-checkpoint` schema definition, validator logic for split-spec quality problems, and generated/skill guidance that runs the checkpoint between specs and design. It does not implement TDD-light, final verify/archive gates, or a standalone spec-review artifact.

</domain>

<decisions>
## Implementation Decisions

### Checkpoint Placement
- **D-01:** Add `spec-split-checkpoint` to `schemas/spec-driven/schema.json` with trigger `after-specs-before-design`, phase `planning`, states `PASS`, `WARN`, and `BLOCK`, and insertion after `specs` before `design`.
- **D-02:** Treat this checkpoint as an earlier planning gate than the existing `spec-checkpoint`. `spec-split-checkpoint` validates proposal/spec alignment and split-spec integrity before design is generated; `spec-checkpoint` remains the later design-before-tasks gate.
- **D-03:** Persist checkpoint state using the Phase 4 checkpoint/state infrastructure instead of creating a new artifact type. State keys may use a normalized `specSplit` / `spec-split` mapping, but downstream output must keep the canonical checkpoint id `spec-split-checkpoint`.

### Validator Scope
- **D-04:** Implement a reusable validator module rather than burying all logic inside generated prompts. The planner should prefer a small module such as `lib/spec-validator.js` or `lib/spec-split-review.js`, with `lib/workflow.js` exposing the checkpoint runner.
- **D-05:** Validator coverage must include proposal in-scope coverage gaps, unapproved scope expansion, duplicate requirement IDs, likely duplicate behavior across specs, conflicting requirements, empty specs, missing scenarios, and requirements hidden in fenced code blocks.
- **D-06:** Hidden requirement detection should flag formal requirement headings or normative requirement language inside fenced code blocks; those should not silently count as valid requirements.
- **D-07:** Use stable finding codes and patch targets. Findings should point back to existing artifacts such as `proposal`, `specs`, and the affected spec path, not to a new review report.

### Review Behavior
- **D-08:** Simple single-spec changes can be reviewed inline by the checkpoint runner.
- **D-09:** Multi-spec, cross-capability, security-sensitive, or larger requirement sets may escalate to read-only reviewer behavior in generated guidance, but the reviewer must not write files directly and must not create a separate `spec-review.md` artifact.
- **D-10:** Checkpoint failures update or request patches to existing proposal/spec/design/task artifacts. Phase 5 should preserve the existing checkpoint output contract: `checkpoint`, `phase`, `status`, `findings`, `patchTargets`, and `nextStep`.

### Integration Boundaries
- **D-11:** Generated `/opsx-propose`, `$opsx-propose`, `/opsx-continue`, `$opsx-continue`, `/opsx-ff`, and `$opsx-ff` guidance should mention `spec-split-checkpoint` in the specs-before-design path.
- **D-12:** Do not add TDD-light rules in this phase. RED/GREEN/REFACTOR/VERIFY task planning belongs to Phase 6.
- **D-13:** Do not add hard verify/archive gates in this phase. Final quality gates, allowed/forbidden path blocking, and archive blocking belong to Phase 7 and Phase 8.

### the agent's Discretion
The planner may choose exact module names and function boundaries, provided the implementation stays modular, testable, and aligned with `lib/workflow.js` checkpoint conventions. The planner may choose whether state checkpoint keys are stored as `specSplit`, `spec-split`, or the full checkpoint id, provided public output and schema ids remain canonical and tests lock the mapping.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone Scope
- `.planning/ROADMAP.md` - Phase 5 goal, requirements, success criteria, and boundaries from adjacent phases.
- `.planning/REQUIREMENTS.md` - SPEC-01 through SPEC-04, plus later TEST coverage expectations that mention spec review.
- `.planning/PROJECT.md` - Milestone-level requirement for early spec-split review and hidden requirement detection.
- `.planning/STATE.md` - Current project status and active Phase 5 focus.

### Prior Phase Context
- `.planning/phases/03-skill-and-command-surface-rewrite/03-CONTEXT.md` - Generated command surfaces are source-of-truth driven and public entrypoints are explicit `/opsx-*` and `$opsx-*`.
- `.planning/phases/04-change-state-machine-and-drift-control/04-CONTEXT.md` - Phase 4 checkpoint/state infrastructure, artifact hashes, context capsule, drift ledger, and one-group apply boundaries that Phase 5 must build on.

### Existing Implementation
- `schemas/spec-driven/schema.json` - Current schema has `spec-checkpoint`, `task-checkpoint`, and `execution-checkpoint`, but not `spec-split-checkpoint`.
- `lib/workflow.js` - Existing checkpoint result contract, planning evidence extraction, `runSpecCheckpoint`, `runTaskCheckpoint`, `runExecutionCheckpoint`, and workflow validation tests.
- `lib/change-store.js` - Phase 4 checkpoint persistence through `recordCheckpointResult()` and normalized change state.
- `lib/change-artifacts.js` - Tracks `specs/**/spec.md` artifact hashes and should remain compatible with new spec-split validation.
- `lib/schema.js` - Schema loading boundary for `schemas/spec-driven/schema.json`.
- `scripts/test-workflow-runtime.js` - Existing runtime regression suite and checkpoint contract tests; Phase 5 should extend it for spec-split cases.
- `skills/opsx/SKILL.md` - Skill-level workflow instructions where specs-before-design checkpoint guidance must be reflected.
- `skills/opsx/references/action-playbooks.md` - English action playbooks for generated workflow behavior.
- `skills/opsx/references/action-playbooks-zh.md` - Chinese action playbooks for generated workflow behavior.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `buildCheckpointResult()` in `lib/workflow.js`: Already returns the required checkpoint output fields and should be reused for `spec-split-checkpoint`.
- `resolvePlanningEvidence()` in `lib/workflow.js`: Already extracts proposal/spec/design/task text, requirement counts, scenario counts, terms, and legacy flags; Phase 5 can reuse or split this logic for spec-only validation.
- `appendPlanningScopeFindings()` and `appendPlanningLegacyFindings()` in `lib/workflow.js`: Existing scope-drift and cross-spec conflict concepts can inform but should not fully replace more precise split-spec checks.
- `recordCheckpointResult()` in `lib/change-store.js`: Existing persistence path for checkpoint state and accepted-hash refreshes.
- `hashTrackedArtifacts()` in `lib/change-artifacts.js`: Already includes `specs/**/spec.md`, which is the artifact set this phase validates.

### Established Patterns
- Checkpoint statuses are canonical `PASS`, `WARN`, and `BLOCK`.
- Checkpoint results must update existing artifacts only and keep `createsArtifacts: []`.
- Runtime tests live in `scripts/test-workflow-runtime.js` and currently cover schema validation, checkpoint output contract validation, state persistence, command generation, and generated parity.
- Generated command files under `commands/**` should be regenerated from source-of-truth templates/metadata rather than hand edited.

### Integration Points
- Schema validation should include the new checkpoint id and its insertion ordering.
- `runSpecSplitCheckpoint` or equivalent should be exported from `lib/workflow.js` so tests, generated guidance, and future runtime integration share one contract.
- `opsx-propose`, `opsx-continue`, and `opsx-ff` guidance need the new specs-before-design step without changing the explicit-only command model from Phase 3.
- Phase 6 TDD-light and Phase 7 verify/archive will consume the cleaner spec state produced here, but their enforcement remains out of scope.

</code_context>

<specifics>
## Specific Ideas

- Keep the checkpoint early and light: catch split-spec quality issues before design, not after task planning.
- Prefer deterministic local validation first, with read-only reviewer behavior only for higher-risk changes.
- Do not create `spec-review.md`; the checkpoint result itself is the review record.
- Hidden requirements inside fenced code blocks should be flagged because they are easy for humans and agents to miss during spec parsing.

</specifics>

<deferred>
## Deferred Ideas

- TDD-light task template and task-checkpoint enforcement belong to Phase 6.
- Final `opsx-verify`, `opsx-sync`, and `opsx-archive` quality gates belong to Phase 7.
- Path/glob/clean JSON release hardening and broad release coverage belong to Phase 8.
- Supervised checkpoint retry loops remain a future/backlog automation idea and should not be built into Phase 5.

</deferred>

---

*Phase: 05-spec-split-checkpoint*
*Context gathered: 2026-04-27T18:28:58Z*
