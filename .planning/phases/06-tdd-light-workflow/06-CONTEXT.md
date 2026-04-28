# Phase 6: TDD-Light Workflow - Context

**Gathered:** 2026-04-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 6 adds TDD-light planning and checkpoint enforcement for OpsX task artifacts. It should make behavior-change and bugfix work include explicit RED/GREEN/REFACTOR/VERIFY planning, with durable execution checkpoint evidence after each top-level task group.

This phase owns:
- `rules.tdd` config shape and default semantics.
- `tasks.md` Test Plan and RED/GREEN/REFACTOR/VERIFY guidance.
- `task-checkpoint` WARN/BLOCK behavior for missing TDD evidence.
- `execution-checkpoint` recording of completed steps, verification command/result, diff summary, and drift.

This phase does not own final `opsx-verify`, `opsx-sync`, `opsx-archive`, path guard, batch workflow, clean JSON, or path/glob hardening gates. Those remain Phase 7 and Phase 8 work.

</domain>

<decisions>
## Implementation Decisions

### TDD Mode Semantics
- **D-01:** Default `rules.tdd.mode` should be `strict`, not `light`, so behavior-change and bugfix tasks actually follow the RED/VERIFY discipline by default.
- **D-02:** `off` disables TDD checkpoint enforcement. `light` emits WARN findings for missing required TDD evidence. `strict` emits BLOCK findings for missing required RED or VERIFY evidence.
- **D-03:** Strict mode requires RED and VERIFY for behavior-change and bugfix work. GREEN is expected in generated task structure but should not be a separate BLOCK condition if the task plan is otherwise coherent. REFACTOR is always optional and must not block.
- **D-04:** The workflow should still be called TDD-light because enforcement is scoped to behavior-change and bugfix work, not every task type and not every top-level group.

### Task Template Shape
- **D-05:** `tasks.md` templates should add a top-level `## Test Plan` section with behavior under test, linked requirement/scenario when known, verification method, TDD mode, and exemption reason when applicable.
- **D-06:** Behavior-change and bugfix top-level task groups should use explicit child tasks named `RED`, `GREEN`, optional `REFACTOR`, and `VERIFY`.
- **D-07:** Docs-only, copy-only, config-only, migration-only, and generated-refresh-only groups may be exempt from RED/GREEN/VERIFY when the task plan states an exemption reason and still provides an appropriate verification action.

### Classification and Exemptions
- **D-08:** `.opsx/config.yaml` should define `rules.tdd.requireFor` and `rules.tdd.exempt` lists. Default `requireFor` should include `behavior-change` and `bugfix`; default `exempt` should include `docs-only`, `copy-only`, and `config-only`.
- **D-09:** Checkpoint logic may use simple heuristics from proposal/design/tasks text to classify task groups, but explicit `tasks.md` markers or exemption text should take precedence over heuristics.
- **D-10:** Exemptions should be visible in `tasks.md`; silent exemptions make downstream planning and review less reliable.

### Checkpoint Evidence
- **D-11:** `task-checkpoint` should report missing RED or VERIFY as WARN in `light` mode and BLOCK in `strict` mode for required task classes.
- **D-12:** `execution-checkpoint` should record completed TDD steps, verification command/result, diff summary, and drift for each top-level task group.
- **D-13:** Manual verification is acceptable only when the task plan explains why automated verification is not practical. In `light` mode unsupported manual-only verification should WARN; in `strict` mode missing RED or missing VERIFY still BLOCKS.
- **D-14:** Phase 6 should reuse existing state/checkpoint storage where possible instead of introducing a separate TDD record artifact.

### Carry-Forward Constraints
- **D-15:** Keep the implementation library-first and bounded. Do not build a full Node workflow runner or autonomous agent engine.
- **D-16:** Preserve Phase 4 one-top-level-task-group apply guidance; Phase 6 only strengthens the task and execution evidence attached to each group.
- **D-17:** Keep generated command/skill/docs surfaces source-of-truth driven. Update templates/playbooks/generators and verify generated parity rather than hand-editing only generated files.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone Scope
- `.planning/PROJECT.md` — OpsX v3.0 milestone scope, constraints, and current phase status.
- `.planning/REQUIREMENTS.md` — TDD-01 through TDD-04 requirements and traceability.
- `.planning/ROADMAP.md` — Phase 6 goal, dependencies, and success criteria.

### Prior Phase Decisions
- `.planning/phases/04-change-state-machine-and-drift-control/04-CONTEXT.md` — state/context/drift, artifact hashes, strict mutation transitions, and one-group apply guidance.
- `.planning/phases/05-spec-split-checkpoint/05-CONTEXT.md` — split-spec checkpoint boundary and explicit deferral of TDD-light to Phase 6.

### Current Implementation Touchpoints
- `templates/project/config.yaml.tmpl` — existing project config template where `rules.tdd` should be added.
- `skills/opsx/references/artifact-templates.md` — English artifact template guidance for `tasks.md`.
- `skills/opsx/references/artifact-templates-zh.md` — Chinese artifact template guidance for `tasks.md`.
- `skills/opsx/references/action-playbooks.md` — English checkpoint and apply playbook guidance.
- `skills/opsx/references/action-playbooks-zh.md` — Chinese checkpoint and apply playbook guidance.
- `lib/workflow.js` — current `runTaskCheckpoint` and `runExecutionCheckpoint` implementation.
- `lib/change-store.js` — existing execution recording path for verification command/result, changed files, state, context capsule, and drift ledger.
- `lib/runtime-guidance.js` — apply guidance that invokes task checkpoint results before implementation.
- `schemas/spec-driven/schema.json` — checkpoint and artifact schema that may need TDD guidance updates.
- `scripts/test-workflow-runtime.js` — fast regression suite for workflow runtime behavior.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `runTaskCheckpoint()` already returns structured checkpoint results with `PASS`, `WARN`, and `BLOCK` findings. Phase 6 should extend it with TDD-specific findings instead of adding a parallel checkpoint path.
- `runExecutionCheckpoint()` already evaluates top-level task group completion and verification gaps. Phase 6 should add TDD evidence checks and richer execution checkpoint summaries there.
- `recordTaskGroupExecution()` already persists verification command/result, changed files, checkpoint status, state updates, context capsule updates, and drift updates. Reuse or extend this path for TDD step evidence.

### Established Patterns
- Config defaults live in templates and runtime helpers, not only docs. Adding `rules.tdd` should update both generated project config and code paths that read config.
- Runtime checkpoint contracts are deterministic and testable. New TDD behavior should be covered in `scripts/test-workflow-runtime.js` or a similarly focused test script.
- Generated platform command files are checked for source parity in prior phases. Any prompt/playbook changes should refresh generated outputs through the established generator path.

### Integration Points
- `tasks.md` parsing in `lib/workflow.js` is currently text-based. Phase 6 can keep parsing lightweight, but should make markers explicit enough that checks are stable.
- The existing generic warning `test-coverage-missing` is too broad for Phase 6 and should either be refined or complemented by TDD-specific codes.
- Existing execution checkpoint data includes changed files but not named TDD steps. Add the smallest durable representation needed for verification and resume.

</code_context>

<specifics>
## Specific Ideas

- User questioned whether default `light` would mean the workflow never truly follows RED/GREEN. Decision: default should be `strict` while remaining scoped to behavior-change and bugfix work.
- RED and VERIFY are the real enforcement points. GREEN is the expected implementation step, and REFACTOR is encouraged but optional.
- The default should prevent fake TDD by making missing RED/VERIFY visible as blockers for behavior changes, while still allowing explicit exemptions for non-behavior work.

</specifics>

<deferred>
## Deferred Ideas

- Final `opsx-verify`, `opsx-sync`, `opsx-archive`, path guard, unresolved drift blocking, and batch workflow enforcement remain Phase 7.
- Clean `opsx status --json`, path canonicalization, glob escaping, and broader regression hardening remain Phase 8.

</deferred>

---

*Phase: 06-tdd-light-workflow*
*Context gathered: 2026-04-28*
