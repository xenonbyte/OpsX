# Phase 4: Change State Machine and Drift Control - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-04-27T13:55:16Z
**Phase:** 04-Change State Machine and Drift Control
**Areas discussed:** Runtime boundary, state transition strictness, artifact hash drift, one-group apply flow, drift and scope guards

---

## Runtime Boundary

| Option | Description | Selected |
|--------|-------------|----------|
| A | Library/state-store first; prompts consume it; keep public Node CLI limited except richer `opsx status`. | yes |
| B | Add Node CLI subcommands `opsx new/status/resume/continue` now. | |
| C | Full CLI for all workflow actions including `apply/propose/ff`. | |

**User's choice:** Confirmed recommended option A.
**Notes:** Phase 4 should establish durable state infrastructure, not create a second workflow execution engine.

---

## State Transition Strictness

| Option | Description | Selected |
|--------|-------------|----------|
| A | Strict transition table for all lifecycle actions. | |
| B | Advisory warnings only for invalid transitions. | |
| C | Strict for mutation commands, advisory/readable for read-only `status` and `resume`. | yes |

**User's choice:** Confirmed recommended option C.
**Notes:** Invalid mutation actions should block. Status/resume should remain useful even for empty or partial state.

---

## Artifact Hash Drift

| Option | Description | Selected |
|--------|-------------|----------|
| A | Warn and reload from disk; update stored hashes only when the current command completes a valid checkpoint/state write. | yes |
| B | Warn and auto-refresh hashes immediately. | |
| C | Block on all drift until explicit user approval. | |

**User's choice:** Confirmed recommended option A.
**Notes:** This prevents unreviewed artifact edits from being silently accepted into `state.yaml`.

---

## One-Group Apply Flow

| Option | Description | Selected |
|--------|-------------|----------|
| A | Runtime identifies and records active/next top-level task group; prompt executes exactly one group; state records checkpoint afterward. | yes |
| B | Runtime only records after-the-fact verification log; prompt chooses group. | |
| C | Node CLI mutates `tasks.md` automatically. | |

**User's choice:** Confirmed recommended option A.
**Notes:** Runtime should guide and persist task-group state. It should not implement product code itself.

---

## Drift and Scope Guards

| Option | Description | Selected |
|--------|-------------|----------|
| A | Persist `allowedPaths` / `forbiddenPaths` and warn during status/apply guidance; hard enforcement deferred to Phase 7. | yes |
| B | Hard-block writes outside allowed paths in Phase 4 prompt guidance/tests. | |
| C | Only record fields, no warnings until Phase 7. | |

**User's choice:** Confirmed recommended option A.
**Notes:** Phase 4 creates durable data and warning plumbing. Phase 7 owns final verify/archive hard gates.

---

## the agent's Discretion

- Exact module names and internal function boundaries are left to planning/implementation.
- The narrow implementation surface for `opsx-new` can be chosen during planning, as long as STATE-01 is satisfied without broad CLI workflow-engine scope creep.

## Deferred Ideas

- Full verify/archive hard gates are deferred to Phase 7.
- Spec-split checkpoint implementation is deferred to Phase 5.
- TDD-light checkpoint implementation is deferred to Phase 6.
- Full path/glob/JSON release hardening is deferred to Phase 8.
