---
phase: 04
slug: change-state-machine-and-drift-control
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-27
---

# Phase 04 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Custom Node `assert` harness |
| **Config file** | none |
| **Quick run command** | `npm run test:workflow-runtime` |
| **Full suite command** | `npm run test:workflow-runtime` |
| **Estimated runtime** | < 10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:workflow-runtime`
- **After every plan wave:** Run `npm run test:workflow-runtime`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 0 | STATE-01 | T-04-01 | Placeholder skeleton files do not mark planning stages accepted. | integration | `npm run test:workflow-runtime` | yes | pending |
| 04-01-02 | 01 | 0 | STATE-03 | T-04-02 | Hash drift warns and does not silently refresh stored hashes. | integration | `npm run test:workflow-runtime` | yes | pending |
| 04-01-03 | 01 | 0 | STATE-04 | T-04-03 | Sparse Phase 2 state normalizes safely before decisions. | unit | `npm run test:workflow-runtime` | yes | pending |
| 04-02-01 | 02 | 1 | STATE-04 | T-04-03 | Full state shape persists arrays, checkpoints, logs, warnings, blockers, and path lists. | unit | `npm run test:workflow-runtime` | yes | pending |
| 04-02-02 | 02 | 1 | STATE-01 | T-04-01 | `opsx-new` skeleton creation updates `.opsx/active.yaml` and creates complete change files. | integration | `npm run test:workflow-runtime` | yes | pending |
| 04-03-01 | 03 | 2 | STATE-02 | T-04-03 | Status/resume read normalized disk state without mutating missing or partial state. | integration | `npm run test:workflow-runtime` | yes | pending |
| 04-03-02 | 03 | 2 | STATE-07 | T-04-04 | `opsx-continue` routes from persisted stage to the next valid action. | integration | `npm run test:workflow-runtime` | yes | pending |
| 04-04-01 | 04 | 3 | STATE-03 | T-04-02 | Artifact hashes cover proposal, specs, design, security-review, and tasks deterministically. | unit | `npm run test:workflow-runtime` | yes | pending |
| 04-04-02 | 04 | 3 | STATE-05 | T-04-05 | `context.md` is regenerated as a bounded capsule from normalized state. | unit | `npm run test:workflow-runtime` | yes | pending |
| 04-04-03 | 04 | 3 | STATE-06 | T-04-06 | `drift.md` records assumptions, scope changes, out-of-bound paths, discovered requirements, and approval needs. | unit | `npm run test:workflow-runtime` | yes | pending |
| 04-04-04 | 04 | 3 | STATE-08 | T-04-07 | Apply guidance advances exactly one top-level task group and records verification evidence. | integration | `npm run test:workflow-runtime` | yes | pending |
| 04-05-01 | 05 | 4 | STATE-02 | T-04-03 | Generated prompts and skill guidance describe the new state/hash/context/drift preflight contract. | integration | `npm run test:workflow-runtime` | yes | pending |

---

## Threat Model

| ID | Threat | Mitigation | Verification |
|----|--------|------------|--------------|
| T-04-01 | Placeholder artifact files are mistaken for accepted planning output. | Persist accepted stage/checkpoint state separately from file presence. | Fixture where `proposal.md`, `design.md`, and `tasks.md` exist but stage remains `INIT`. |
| T-04-02 | Hash drift is silently accepted by refreshing stored hashes too early. | Split drift detection from accepted state writes. | Fixture verifies drift warning appears and stored hashes remain unchanged after read-only status. |
| T-04-03 | Malformed, sparse, or missing state crashes status/resume or triggers writes. | Normalize sparse state and keep read-only selectors non-mutating. | Partial-state and missing-active fixtures. |
| T-04-04 | Invalid mutation actions advance the workflow. | Strict mutation transition validation. | `INIT` + apply event returns BLOCK. |
| T-04-05 | `context.md` diverges from `state.yaml`. | Generate capsule from normalized state after accepted writes. | State fixture regenerates expected stage, next action, warnings, and active task group. |
| T-04-06 | Drift ledger misses approval-relevant scope changes. | Append stable drift sections and expose unresolved warnings/blockers. | Drift fixture checks all required sections and new entries. |
| T-04-07 | Apply guidance consumes multiple task groups in one run. | Persist active/next top-level group and advance one group per accepted execution checkpoint. | Multi-group tasks fixture advances from group 1 to group 2 only. |

---

## Wave 0 Requirements

- [ ] `scripts/test-workflow-runtime.js` - failing cases for placeholder artifacts not implying accepted lifecycle state.
- [ ] `scripts/test-workflow-runtime.js` - sparse Phase 2 state normalization cases.
- [ ] `scripts/test-workflow-runtime.js` - hash drift warn-and-reload cases that do not update stored hashes on read-only inspection.
- [ ] `scripts/test-workflow-runtime.js` - one-group apply persistence cases covering `active.taskGroup`, `verificationLog`, `context.md`, and `drift.md`.
- [ ] `scripts/test-workflow-runtime.js` - read-only status/resume cases for missing active state and partial state recovery.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dependency choice for any new runtime package | STATE-04 | Package introduction is an architectural decision, not just behavior. | Review plan and implementation diff for dependency rationale before execution completes. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all missing references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10 seconds
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
