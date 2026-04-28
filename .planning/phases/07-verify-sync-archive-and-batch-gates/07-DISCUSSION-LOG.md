# Phase 7: Verify, Sync, Archive, and Batch Gates - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `07-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-04-28T12:58:56Z
**Phase:** 07-verify-sync-archive-and-batch-gates
**Areas discussed:** quality gate strictness, drift blocking semantics, sync strategy, archive behavior, batch failure strategy, implementation boundary

---

## Quality Gate Strictness

| Option | Description | Selected |
|--------|-------------|----------|
| Default hard gates | `opsx-verify` blocks forbidden paths, incomplete tasks, missing execution checkpoints, missing strict TDD evidence, unresolved drift, and unsafe archive prerequisites. | ✓ |
| Mostly warnings | Most findings warn and leave final choice to the user. | |

**User's choice:** Follow recommended default hard gates.
**Notes:** Lower-risk docs/config/manual-verification issues may remain `WARN`, but completion correctness should not silently pass.

---

## Drift Blocking Semantics

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit blocker plus high-risk drift blocks | `User approval needed`, forbidden-path changes, scope changes, and discovered requirements block unless resolved or approved in artifacts/state. | ✓ |
| Only explicit approval requests block | Only `User approval needed` blocks; other drift categories warn. | |

**User's choice:** Follow recommended blocker plus high-risk drift semantics.
**Notes:** New scope discovered during apply must be reconciled into proposal/spec/design/tasks/state before verify/archive can pass.

---

## Sync Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Strict conservative sync | Detect omissions and conflicts before writing; write only safe replacements/appends; block on conflict. | ✓ |
| Smart section merge | Attempt section-level automatic merges. | |

**User's choice:** Follow recommended conservative sync.
**Notes:** Avoid clever merge behavior that can hide requirement conflicts.

---

## Archive Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Archive includes safe sync check | `opsx-archive` accepts `VERIFIED` or `SYNCED`; if only `VERIFIED`, run sync check internally before moving the change. | ✓ |
| Require explicit sync first | `opsx-archive` only accepts `SYNCED`; users must run `$opsx-sync` separately. | |

**User's choice:** Follow recommended internal safe sync check.
**Notes:** Archive should stay ergonomic but must block if sync is unsafe.

---

## Batch Failure Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Skip failed changes and continue | Process each change independently; record skipped/blocked reasons and continue with later changes. | ✓ |
| Stop on first per-change failure | Abort the batch at the first change failure. | |

**User's choice:** Follow recommended skip-and-continue strategy for per-change failures.
**Notes:** Global unsafe conditions can still stop the whole batch.

---

## Implementation Boundary

| Option | Description | Selected |
|--------|-------------|----------|
| Library-first gate modules | Add testable `verify` / `sync` / `archive` / `batch` modules and update prompts/skills around them. | ✓ |
| Prompt/playbook only | Strengthen guidance text without shared runtime gate helpers. | |

**User's choice:** Follow recommended library-first implementation.
**Notes:** Node CLI should not become a full workflow runner; modules should provide deterministic gate logic and safe report/state/spec/archive operations.

---

## the agent's Discretion

- Planner may choose exact module names if cohesion suggests a slightly different split, as long as the implementation remains library-first and testable.
- Planner may decide which prompt refresh slices to batch together, but should preserve generated parity discipline.

## Deferred Ideas

- Clean `opsx status --json` stdout behavior is Phase 8.
- Path/glob hardening is Phase 8 unless narrowly needed for Phase 7 gate correctness.
