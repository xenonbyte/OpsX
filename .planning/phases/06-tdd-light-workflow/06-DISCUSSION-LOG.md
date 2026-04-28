# Phase 6: TDD-Light Workflow - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-28
**Phase:** 6-TDD-Light Workflow
**Areas discussed:** TDD mode semantics, task template shape, classification and exemptions, execution checkpoint evidence

---

## TDD Mode Semantics

| Option | Description | Selected |
|--------|-------------|----------|
| Default light | `light` is default; missing RED or VERIFY warns but does not block. | |
| Default strict for behavior work | `strict` is default; behavior-change and bugfix work must include RED and VERIFY, while REFACTOR stays optional. | yes |
| Verify-only enforcement | Only VERIFY is checked; RED is recommended but not enforced. | |

**User's choice:** Default strict for behavior-change and bugfix work.
**Notes:** User raised that default `light` could mean the workflow never truly follows RED/GREEN. Decision changed from the initial recommendation to default `strict`, with limited scope so non-behavior tasks are not forced into formal TDD.

---

## Task Template Shape

| Option | Description | Selected |
|--------|-------------|----------|
| Test Plan plus TDD child tasks | Add `## Test Plan`; behavior-change and bugfix groups use RED/GREEN/REFACTOR/VERIFY child tasks. | yes |
| Test Plan only | Add `## Test Plan` but do not require child task naming. | |
| Every group gets all four steps | Require RED/GREEN/REFACTOR/VERIFY for every top-level group, including docs and config. | |

**User's choice:** Test Plan plus TDD child tasks for behavior-change and bugfix work.
**Notes:** The selected shape keeps the workflow explicit while avoiding ceremony for docs-only, copy-only, config-only, and similar work.

---

## Classification and Exemptions

| Option | Description | Selected |
|--------|-------------|----------|
| Config plus explicit visible exemptions | Use `rules.tdd.requireFor` and `rules.tdd.exempt`; combine with lightweight heuristics; require visible exemption reason in `tasks.md`. | yes |
| Heuristics only | Infer everything from text and do not require visible exemption reasons. | |
| Metadata only | Require explicit metadata and avoid heuristics. | |

**User's choice:** Config plus explicit visible exemptions.
**Notes:** Explicit exemption reasons prevent silent downgrades and give downstream reviewers a stable artifact to inspect.

---

## Execution Checkpoint Evidence

| Option | Description | Selected |
|--------|-------------|----------|
| Record full TDD evidence | Record completed TDD steps, verification command/result, diff summary, and drift after each top-level group. | yes |
| Record only verification and changed files | Keep execution checkpoints minimal and omit named TDD steps. | |
| Record only, do not enforce | Execution checkpoint stores data but does not WARN/BLOCK based on TDD mode. | |

**User's choice:** Record full TDD evidence and enforce by mode.
**Notes:** In `light` mode missing evidence should warn. In `strict` mode missing RED or VERIFY for required task classes should block. Manual verification needs a stated reason when automated verification is not practical.

---

## the agent's Discretion

- Exact parser implementation details are left to planning, but should stay lightweight and deterministic.
- Exact finding code names are left to implementation, but should be stable enough for tests.

## Deferred Ideas

- Phase 7 owns final verify/sync/archive quality gates and hard archive blocking.
- Phase 8 owns clean JSON output and path/glob stability hardening.
