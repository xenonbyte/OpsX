---
phase: 04-change-state-machine-and-drift-control
verified_at: 2026-04-27T17:04:43Z
status: passed
score: 5/5
requirements_verified: 8/8
overrides_applied: 0
summary: Durable change-state machine, drift control, and one-group apply foundations are implemented and verified.
---

# Phase 04: Change State Machine and Drift Control Verification Report

**Phase Goal:** Persist workflow progress per change so commands can resume from disk after context compaction or a fresh agent session.
**Verified:** 2026-04-27T17:04:43Z
**Status:** passed
**Re-verification:** No

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Persisted change-state modules store/load normalized state, validate lifecycle transitions, compute tracked hashes, render bounded capsules, and record verification events. | VERIFIED | [lib/change-state.js](/Users/xubo/x-skills/openspec/lib/change-state.js#L230), [lib/change-store.js](/Users/xubo/x-skills/openspec/lib/change-store.js#L236), [lib/change-artifacts.js](/Users/xubo/x-skills/openspec/lib/change-artifacts.js#L29), [lib/change-capsule.js](/Users/xubo/x-skills/openspec/lib/change-capsule.js#L98), [scripts/test-workflow-runtime.js](/Users/xubo/x-skills/openspec/scripts/test-workflow-runtime.js#L526) |
| 2 | `opsx-new` creates a complete change skeleton and updates `.opsx/active.yaml`, while leaving the new change at `INIT`. | VERIFIED | [lib/workspace.js](/Users/xubo/x-skills/openspec/lib/workspace.js#L180), [lib/change-store.js](/Users/xubo/x-skills/openspec/lib/change-store.js#L296), [scripts/test-workflow-runtime.js](/Users/xubo/x-skills/openspec/scripts/test-workflow-runtime.js#L581) |
| 3 | `opsx-propose`, `opsx-ff`, `opsx-continue`, `opsx-apply`, `opsx-status`, and `opsx-resume` all read persisted state consistently, and the read-only paths stay read-only. | VERIFIED | [lib/runtime-guidance.js](/Users/xubo/x-skills/openspec/lib/runtime-guidance.js#L589), [lib/runtime-guidance.js](/Users/xubo/x-skills/openspec/lib/runtime-guidance.js#L633), [lib/runtime-guidance.js](/Users/xubo/x-skills/openspec/lib/runtime-guidance.js#L705), [lib/runtime-guidance.js](/Users/xubo/x-skills/openspec/lib/runtime-guidance.js#L775), [lib/runtime-guidance.js](/Users/xubo/x-skills/openspec/lib/runtime-guidance.js#L817), [lib/runtime-guidance.js](/Users/xubo/x-skills/openspec/lib/runtime-guidance.js#L950), [lib/cli.js](/Users/xubo/x-skills/openspec/lib/cli.js#L77), [lib/cli.js](/Users/xubo/x-skills/openspec/lib/cli.js#L121) |
| 4 | Artifact hash drift surfaces a visible warning and reloads from disk before any further read-only action. | VERIFIED | [lib/change-artifacts.js](/Users/xubo/x-skills/openspec/lib/change-artifacts.js#L62), [lib/runtime-guidance.js](/Users/xubo/x-skills/openspec/lib/runtime-guidance.js#L633), [commands/claude/opsx/status.md](/Users/xubo/x-skills/openspec/commands/claude/opsx/status.md#L26), [commands/codex/prompts/opsx-resume.md](/Users/xubo/x-skills/openspec/commands/codex/prompts/opsx-resume.md#L26), [commands/gemini/opsx/status.toml](/Users/xubo/x-skills/openspec/commands/gemini/opsx/status.toml#L28) |
| 5 | `opsx-apply` defaults to exactly one top-level task group per run and records execution evidence, `verificationLog`, `context.md`, and `drift.md` after the checkpoint. | VERIFIED | [lib/runtime-guidance.js](/Users/xubo/x-skills/openspec/lib/runtime-guidance.js#L950), [lib/change-store.js](/Users/xubo/x-skills/openspec/lib/change-store.js#L428), [commands/codex/prompts/opsx-apply.md](/Users/xubo/x-skills/openspec/commands/codex/prompts/opsx-apply.md#L25), [commands/gemini/opsx/apply.toml](/Users/xubo/x-skills/openspec/commands/gemini/opsx/apply.toml#L27), [scripts/test-workflow-runtime.js](/Users/xubo/x-skills/openspec/scripts/test-workflow-runtime.js#L1537) |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| [lib/change-state.js](/Users/xubo/x-skills/openspec/lib/change-state.js) | Strict lifecycle transition table and continue router | VERIFIED | `applyMutationEvent()` and `resolveContinueAction()` implement the stage/event contract. |
| [lib/change-store.js](/Users/xubo/x-skills/openspec/lib/change-store.js) | Persisted state load/save, normalization, active pointer writes, checkpoint logging, and task-group execution recording | VERIFIED | `normalizeChangeState()`, `writeChangeState()`, and `recordTaskGroupExecution()` are wired together. |
| [lib/workspace.js](/Users/xubo/x-skills/openspec/lib/workspace.js) | New-change skeleton creation and fallback scaffolds | VERIFIED | `createChangeSkeleton()` writes the full `INIT` skeleton and updates the active pointer. |
| [lib/change-artifacts.js](/Users/xubo/x-skills/openspec/lib/change-artifacts.js) | Deterministic tracked-artifact hashing and drift detection | VERIFIED | `hashTrackedArtifacts()` and `detectArtifactHashDrift()` are present and covered. |
| [lib/change-capsule.js](/Users/xubo/x-skills/openspec/lib/change-capsule.js) | Bounded `context.md` rendering and stable `drift.md` updates | VERIFIED | `renderContextCapsule()` and `appendDriftLedger()` preserve the Phase 4 sidecar contract. |
| [lib/runtime-guidance.js](/Users/xubo/x-skills/openspec/lib/runtime-guidance.js) | State-aware status, resume, continue, and apply guidance | VERIFIED | `buildStatusText()`, `buildResumeInstructions()`, `buildContinueInstructions()`, and `buildApplyInstructions()` consume persisted state. |
| [lib/cli.js](/Users/xubo/x-skills/openspec/lib/cli.js) | Thin CLI status route that delegates to persisted state | VERIFIED | `showStatus()` keeps missing-workspace and missing-active-change guidance truthful. |
| [scripts/test-workflow-runtime.js](/Users/xubo/x-skills/openspec/scripts/test-workflow-runtime.js) | End-to-end runtime coverage and parity gate | VERIFIED | The runtime suite ends at 49/49 and locks the generated bundle parity contract. |
| [skills/opsx/SKILL.md](/Users/xubo/x-skills/openspec/skills/opsx/SKILL.md) and [skills/opsx/references/action-playbooks.md](/Users/xubo/x-skills/openspec/skills/opsx/references/action-playbooks.md) | Source-of-truth guidance aligned to Phase 4 state semantics | VERIFIED | The distributed skill and playbooks require strict preflight, read-only status/resume, and one-group apply semantics. |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| [lib/change-state.js](/Users/xubo/x-skills/openspec/lib/change-state.js#L230) | [lib/runtime-guidance.js](/Users/xubo/x-skills/openspec/lib/runtime-guidance.js#L628) | Persisted stage routing drives read-only selectors and continue routing | VERIFIED | `resolveContinueAction()` feeds `buildContinueInstructions()` and the persisted-state view. |
| [lib/change-store.js](/Users/xubo/x-skills/openspec/lib/change-store.js#L428) | [context.md](/Users/xubo/x-skills/openspec/lib/change-capsule.js#L98) and [drift.md](/Users/xubo/x-skills/openspec/lib/change-capsule.js#L240) | Accepted writes refresh the sidecars after checkpoint recording | VERIFIED | `recordTaskGroupExecution()` writes `verificationLog`, `context.md`, and `drift.md`. |
| [lib/change-artifacts.js](/Users/xubo/x-skills/openspec/lib/change-artifacts.js#L29) | [lib/change-store.js](/Users/xubo/x-skills/openspec/lib/change-store.js#L350) | Accepted checkpoint writes refresh hashes only on accepted writes | VERIFIED | `recordCheckpointResult()` updates stored hashes from the tracked-artifact hash set. |
| [lib/runtime-guidance.js](/Users/xubo/x-skills/openspec/lib/runtime-guidance.js#L705) | [lib/cli.js](/Users/xubo/x-skills/openspec/lib/cli.js#L77) | CLI status delegates to state-aware runtime guidance | VERIFIED | `showStatus()` uses `buildStatusText()` after loading the active change pointer. |
| [lib/workflow.js](/Users/xubo/x-skills/openspec/lib/workflow.js#L129) | [commands/**](/Users/xubo/x-skills/openspec/scripts/test-workflow-runtime.js#L1947) | Source-of-truth fallback copy and bundle parity stay synchronized | VERIFIED | The runtime suite checks `buildPlatformBundle()` parity and the exact stateful wording. |

### Data-Flow Trace

No browser/UI artifact was in scope for this phase. The dynamic-data path was still verified through utility outputs that consume persisted state and real task sources, not hardcoded literals.

| Artifact | Data Variable | Source | Produces Real Data | Status |
| --- | --- | --- | --- | --- |
| [lib/cli.js](/Users/xubo/x-skills/openspec/lib/cli.js#L77) | `stateAwareText` from `buildStatusText()` | `.opsx/active.yaml`, `state.yaml`, tracked artifacts, and hash drift inspection | Yes | VERIFIED |
| [lib/runtime-guidance.js](/Users/xubo/x-skills/openspec/lib/runtime-guidance.js#L950) | `remainingTaskGroups` and `nextTaskGroup` | Parsed `tasks.md` plus persisted `active.taskGroup` / `nextTaskGroup` | Yes | VERIFIED |
| [lib/change-capsule.js](/Users/xubo/x-skills/openspec/lib/change-capsule.js#L98) | Rendered context capsule and last verification summary | Normalized state plus `verificationLog` | Yes | VERIFIED |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| `opsx-new` creates the complete skeleton and leaves the change at `INIT`. | `npm run test:workflow-runtime` | `49 test(s) passed` | PASS |
| Read-only `status` / `resume` warn on hash drift and do not refresh hashes. | `npm run test:workflow-runtime` | `49 test(s) passed` | PASS |
| `opsx-continue` follows persisted stage and `opsx-apply` advances exactly one top-level task group. | `npm run test:workflow-runtime` | `49 test(s) passed` | PASS |
| Final generated-bundle parity is restored across Claude, Codex, and Gemini. | `npm run test:workflow-runtime` | `49 test(s) passed` | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| STATE-01 | Phase 4 | `opsx-new` creates a complete change skeleton. | SATISFIED | [lib/workspace.js](/Users/xubo/x-skills/openspec/lib/workspace.js#L180), [scripts/test-workflow-runtime.js](/Users/xubo/x-skills/openspec/scripts/test-workflow-runtime.js#L526) |
| STATE-02 | Phase 4 | Every public route reads the persisted workspace state before acting. | SATISFIED | [skills/opsx/SKILL.md](/Users/xubo/x-skills/openspec/skills/opsx/SKILL.md#L117), [commands/claude/opsx/status.md](/Users/xubo/x-skills/openspec/commands/claude/opsx/status.md#L18), [commands/codex/prompts/opsx-status.md](/Users/xubo/x-skills/openspec/commands/codex/prompts/opsx-status.md#L18) |
| STATE-03 | Phase 4 | Commands compute artifact hashes and warn/reload on drift. | SATISFIED | [lib/change-artifacts.js](/Users/xubo/x-skills/openspec/lib/change-artifacts.js#L29), [lib/runtime-guidance.js](/Users/xubo/x-skills/openspec/lib/runtime-guidance.js#L633), [commands/gemini/opsx/resume.toml](/Users/xubo/x-skills/openspec/commands/gemini/opsx/resume.toml#L28) |
| STATE-04 | Phase 4 | `state.yaml` tracks stage, next action, checkpoint states, artifact paths, hashes, active task group, verification log, blockers, warnings, allowed paths, and forbidden paths. | SATISFIED | [lib/change-store.js](/Users/xubo/x-skills/openspec/lib/change-store.js#L236), [lib/change-store.js](/Users/xubo/x-skills/openspec/lib/change-store.js#L428) |
| STATE-05 | Phase 4 | `context.md` stays bounded and supports clean-context resume. | SATISFIED | [lib/change-capsule.js](/Users/xubo/x-skills/openspec/lib/change-capsule.js#L98), [scripts/test-workflow-runtime.js](/Users/xubo/x-skills/openspec/scripts/test-workflow-runtime.js#L817) |
| STATE-06 | Phase 4 | `drift.md` records assumptions, scope changes, out-of-bound file changes, discovered requirements, and approval needs. | SATISFIED | [lib/change-capsule.js](/Users/xubo/x-skills/openspec/lib/change-capsule.js#L240), [scripts/test-workflow-runtime.js](/Users/xubo/x-skills/openspec/scripts/test-workflow-runtime.js#L874) |
| STATE-07 | Phase 4 | `opsx-continue` resumes the next valid action without re-planning unrelated work. | SATISFIED | [lib/change-state.js](/Users/xubo/x-skills/openspec/lib/change-state.js#L230), [lib/runtime-guidance.js](/Users/xubo/x-skills/openspec/lib/runtime-guidance.js#L817), [commands/claude/opsx/continue.md](/Users/xubo/x-skills/openspec/commands/claude/opsx/continue.md#L26) |
| STATE-08 | Phase 4 | `opsx-apply` defaults to exactly one top-level task group and records an execution checkpoint afterward. | SATISFIED | [lib/runtime-guidance.js](/Users/xubo/x-skills/openspec/lib/runtime-guidance.js#L950), [lib/change-store.js](/Users/xubo/x-skills/openspec/lib/change-store.js#L428), [commands/codex/prompts/opsx-apply.md](/Users/xubo/x-skills/openspec/commands/codex/prompts/opsx-apply.md#L25) |

### Anti-Patterns Found

No blocker anti-patterns were found. The only matches were intentional placeholder scaffolds and test fixtures that are paired with `INIT` state, placeholder-specific regression tests, and explicit non-progression checks.

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| [lib/workspace.js](/Users/xubo/x-skills/openspec/lib/workspace.js#L133) | 133 | Placeholder migration note | Info | Intentional migration scaffold for `opsx migrate`. |
| [lib/workspace.js](/Users/xubo/x-skills/openspec/lib/workspace.js#L241) | 241 | Placeholder task text in new-change skeleton | Info | Intentional `INIT`-stage skeleton, covered by `opsx-new` tests. |
| [scripts/test-workflow-runtime.js](/Users/xubo/x-skills/openspec/scripts/test-workflow-runtime.js#L581) | 581 | Placeholder-specific regression coverage | Info | Intentional test fixtures that lock the non-progression contract. |
| [skills/opsx/references/action-playbooks.md](/Users/xubo/x-skills/openspec/skills/opsx/references/action-playbooks.md#L39) | 39 | Placeholder skeleton wording | Info | Intentional user guidance for new changes. |

### Human Verification Required

None. The phase is library/CLI-only, and the remaining checks are fully covered by automated tests.

### Gaps Summary

None. The phase goal is achieved, the review is clean, and the runtime suite passed 49/49.

---

_Verified: 2026-04-27T17:04:43Z_
_Verifier: Claude (gsd-verifier)_
