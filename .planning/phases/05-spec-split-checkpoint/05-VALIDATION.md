---
phase: 05
slug: spec-split-checkpoint
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-27
---

# Phase 05 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Custom Node.js regression script using built-in `assert` |
| **Config file** | none |
| **Quick run command** | `npm run test:workflow-runtime` |
| **Full suite command** | `npm run test:workflow-runtime` |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:workflow-runtime`
- **After every plan wave:** Run `npm run test:workflow-runtime`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 0 | SPEC-01 | T-05-01 | Schema and workflow catalogs expose `spec-split-checkpoint` without dropping existing checkpoints. | integration | `npm run test:workflow-runtime` | ✅ existing | ⬜ pending |
| 05-01-02 | 01 | 0 | SPEC-04 | T-05-02 | Persisted state preserves the split-spec checkpoint slot across normalize/write/read cycles. | integration | `npm run test:workflow-runtime` | ✅ existing | ⬜ pending |
| 05-02-01 | 02 | 1 | SPEC-02 | T-05-03 | Validator detects invalid split specs deterministically without trusting hidden fenced-code requirements. | integration | `npm run test:workflow-runtime` | ✅ existing | ⬜ pending |
| 05-03-01 | 03 | 1 | SPEC-02, SPEC-04 | T-05-03 | Checkpoint runner returns canonical findings and patch targets against existing artifacts only. | integration | `npm run test:workflow-runtime` | ✅ existing | ⬜ pending |
| 05-04-01 | 04 | 2 | SPEC-03 | T-05-04 | Generated guidance recommends read-only reviewer escalation for risky cases without adding new routes or artifacts. | integration | `npm run test:workflow-runtime` | ✅ existing | ⬜ pending |

*Status: pending · green · red · flaky*

---

## Wave 0 Requirements

- [ ] `scripts/test-workflow-runtime.js` - schema-order and checkpoint catalog coverage for `spec-split-checkpoint`.
- [ ] `scripts/test-workflow-runtime.js` - state round-trip coverage proving `specSplit` survives `normalizeChangeState()` and `recordCheckpointResult()`.
- [ ] `scripts/test-workflow-runtime.js` - baseline contract assertions that existing `spec`, `task`, and `execution` checkpoint behavior remains unchanged.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| None | N/A | All Phase 5 behaviors can be covered by local regression tests and source-output parity checks. | N/A |

---

## Threat Model

| Threat ID | Category | Component | Mitigation |
|-----------|----------|-----------|------------|
| T-05-01 | Tampering | `schemas/spec-driven/schema.json` / checkpoint catalog | Test exact trigger `after-specs-before-design`, insertion after `specs` before `design`, and allowed states `PASS`, `WARN`, `BLOCK`. |
| T-05-02 | Tampering | `state.yaml` checkpoint persistence | Normalize aliases so canonical `spec-split-checkpoint` persists in a stable state key and is not dropped during writes. |
| T-05-03 | Spoofing / Tampering | Markdown spec parsing | Strip fenced blocks from normal parsing, scan them separately for hidden requirements, and require real scenarios outside fences. |
| T-05-04 | Elevation of scope | Generated reviewer guidance | Keep reviewer behavior read-only and prohibit `spec-review.md` or new public routes. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-04-27
