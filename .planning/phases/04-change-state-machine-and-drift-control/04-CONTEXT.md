# Phase 4: Change State Machine and Drift Control - Context

**Gathered:** 2026-04-27T13:55:16Z
**Status:** Ready for planning

<domain>
## Phase Boundary

Persist workflow progress per change so `/opsx-*` and `$opsx-*` commands can resume from `.opsx/` after context compaction or a fresh agent session. This phase delivers durable state, context capsules, drift ledger support, artifact hashes, state transitions, and one-top-level-task-group apply flow. It does not turn the Node CLI into a full implementation engine.

</domain>

<decisions>
## Implementation Decisions

### Runtime Boundary
- **D-01:** Phase 4 is library-first. Build reusable modules for active-change loading, per-change state load/save, transition validation, artifact hashing, context capsule updates, drift ledger updates, and verification event recording.
- **D-02:** Keep public workflow execution in the generated `/opsx-*` and `$opsx-*` command/prompt surfaces. Do not implement full Node CLI equivalents for `opsx propose`, `opsx apply`, `opsx verify`, or archive execution in this phase.
- **D-03:** The Node CLI should be enhanced only where it supports state inspection and recovery, especially `opsx status` and `opsx status --json`. Any new CLI helpers must reflect on-disk state rather than acting as a second workflow engine.
- **D-04:** `opsx-new` skeleton behavior belongs in this phase, but planning should decide the narrowest implementation surface that satisfies STATE-01 without creating a broad command-execution framework.

### State Transitions
- **D-05:** Use a strict transition table for mutation actions. Invalid mutation actions should produce a blocking result rather than silently continuing.
- **D-06:** Read-only actions such as status and resume should remain readable from any stage, including missing or partial state, and should return concrete next steps instead of creating active state implicitly.
- **D-07:** Use disk-backed state as the source of truth. Commands must not rely on previous chat history when `.opsx/active.yaml`, `state.yaml`, `context.md`, and current artifacts exist.
- **D-08:** Recommended stage vocabulary for planning: `INIT`, `PROPOSAL_READY`, `SPECS_READY`, `SPEC_SPLIT_REVIEWED`, `DESIGN_READY`, `SECURITY_REVIEW_REQUIRED`, `SECURITY_REVIEWED`, `SPEC_REVIEWED`, `TASKS_READY`, `APPLYING_GROUP`, `GROUP_VERIFIED`, `IMPLEMENTED`, `VERIFIED`, `SYNCED`, `ARCHIVED`, and `BLOCKED`.

### Artifact Hash Drift
- **D-09:** Each state-aware command should compute hashes for `proposal.md`, `specs/**`, `design.md`, `security-review.md`, and `tasks.md` where present.
- **D-10:** When hashes differ from `state.yaml`, emit a visible warning and reload workflow context from disk before further action.
- **D-11:** Do not silently refresh stored hashes immediately on drift detection. Update hashes only when the current command completes its accepted checkpoint or state update.
- **D-12:** Hash drift should not by itself approve changed scope. If the drift implies new assumptions, changed scope, or missing approval, record it in `drift.md` and expose it through state warnings/blockers as appropriate.

### One-Group Apply Flow
- **D-13:** Runtime support should identify and record the active or next top-level task group from `tasks.md` and `state.yaml`.
- **D-14:** Generated `opsx-apply` command guidance should execute exactly one top-level task group by default. The Node CLI should not attempt to implement product code or automatically mark arbitrary tasks complete.
- **D-15:** After a task group, state updates should record the execution checkpoint, verification command/result, changed files summary when available, `active.taskGroup` progression, and refreshed `context.md` / `drift.md`.
- **D-16:** `opsx-continue` should route from the current state to the next valid action without re-planning unrelated work. For `APPLYING_GROUP`, continue the active group; for planning states, continue the next planning checkpoint.

### Drift and Scope Guards
- **D-17:** Phase 4 should persist `allowedPaths` and `forbiddenPaths` in `state.yaml` and surface warnings in status/apply guidance when available.
- **D-18:** Hard archive/verify enforcement for forbidden-path changes belongs to Phase 7. Phase 4 should create the durable fields and warning plumbing needed by that later gate.
- **D-19:** `drift.md` should capture new assumptions, detected scope changes, out-of-bound file changes, discovered requirements, and unresolved approval needs in a stable format that can be read by later verify/archive commands.

### the agent's Discretion
The planner may decide exact module names and function boundaries, provided the implementation stays modular and testable. The planner may decide whether `opsx-new` is implemented as a narrow CLI subcommand, a reusable library function consumed by command generation, or both, as long as STATE-01 is satisfied without adding a broad Node workflow engine.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone Scope
- `.planning/ROADMAP.md` - Phase 4 goal, success criteria, dependencies, and adjacent phase boundaries.
- `.planning/REQUIREMENTS.md` - STATE-01 through STATE-08 and related test coverage expectations.
- `.planning/PROJECT.md` - Milestone positioning and high-level OpsX product intent.
- `.planning/STATE.md` - Current project status and completed phase history.

### Prior Phase Context
- `.planning/phases/01-opsx-naming-and-cli-surface/01-CONTEXT.md` - Breaking v3.0 rename and no legacy `openspec` binary alias.
- `.planning/phases/02-opsx-workspace-and-migration/02-CONTEXT.md` - Canonical `.opsx/` and `~/.opsx/` layout, migration scaffold boundaries, and minimal state placeholder decisions.
- `.planning/phases/03-skill-and-command-surface-rewrite/03-CONTEXT.md` - Explicit-only `$opsx-*` / `/opsx-*` command surface and strict prompt preflight requirements.

### Existing Implementation
- `lib/workspace.js` - Current `.opsx` path helpers and minimal migration-time `active.yaml`, `state.yaml`, `context.md`, and `drift.md` scaffolding.
- `lib/migrate.js` - Migration flow that creates missing state/context/drift artifacts without overwriting existing `.opsx/` content.
- `lib/runtime-guidance.js` - Existing runtime guidance and artifact-state inspection logic that Phase 4 should either reuse or deliberately replace.
- `lib/cli.js` - Current `opsx status` implementation and CLI command routing.
- `scripts/test-workflow-runtime.js` - Existing runtime/generation regression suite and likely baseline for Phase 4 state tests.
- `skills/opsx/SKILL.md` - Current skill-level preflight and state-aware workflow instructions.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/workspace.js`: Already centralizes canonical project and global path names. Extend or split from this module rather than duplicating `.opsx` path construction.
- `buildInitialState`, `buildInitialContext`, and `buildInitialDrift` in `lib/workspace.js`: Useful as migration scaffolding but intentionally too shallow for the full Phase 4 state machine.
- `lib/runtime-guidance.js`: Contains existing artifact inspection and guidance output patterns. It can provide status/resume wording patterns, but should not remain the only state model.
- `scripts/test-workflow-runtime.js`: Provides the established lightweight Node test style for command/runtime assertions.

### Established Patterns
- Generated commands are source-of-truth driven. Avoid hand-editing checked-in generated command files unless the plan explicitly includes regeneration and parity verification.
- `opsx status` currently reports migration/workspace state truthfully rather than auto-creating active changes. Preserve that non-mutating behavior.
- Migration scaffolds missing state artifacts but does not enforce durable lifecycle semantics. Phase 4 should supersede scaffold shape for new changes without breaking migrated projects.

### Integration Points
- State-aware command guidance must align with the Phase 3 strict preflight wording in generated `/opsx-*` and `$opsx-*` prompts.
- `opsx status --json` must be designed so Phase 8 can later harden clean stdout/stderr JSON behavior without a major redesign.
- Phase 5 spec-split checkpoint and Phase 6 TDD-light will depend on the checkpoint and verification-log fields introduced here.
- Phase 7 verify/sync/archive gates will depend on the drift ledger and allowed/forbidden path fields introduced here.

</code_context>

<specifics>
## Specific Ideas

- Treat `.opsx/` artifacts as the only reliable workflow source after context compaction.
- Prefer warning plus reload for hash drift, followed by explicit state write only after a valid checkpoint.
- Keep Phase 4 focused on recoverability and state correctness; defer full quality gates and full autonomous execution behavior to later phases.

</specifics>

<deferred>
## Deferred Ideas

- Full hard enforcement of forbidden paths, unresolved drift, and archive blocking belongs to Phase 7.
- Spec-split validation logic belongs to Phase 5.
- TDD-light checkpoint enforcement belongs to Phase 6.
- Path/glob/clean JSON release hardening belongs to Phase 8, though Phase 4 should avoid designs that make those hardening tasks difficult.
- A complete Node CLI workflow engine for propose/apply/verify/archive is out of scope for Phase 4.

</deferred>

---

*Phase: 04-change-state-machine-and-drift-control*
*Context gathered: 2026-04-27T13:55:16Z*
