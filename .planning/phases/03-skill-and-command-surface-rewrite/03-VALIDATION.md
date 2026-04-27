---
phase: 03
slug: skill-and-command-surface-rewrite
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-27
---

# Phase 03 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Custom Node.js assert-based runtime suite |
| **Config file** | `package.json` |
| **Quick run command** | `npm run test:workflow-runtime` |
| **Full suite command** | `npm run test:workflow-runtime` plus the Phase 3 public-surface gate once added |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:workflow-runtime`
- **After every plan wave:** Run `npm run test:workflow-runtime` and the Phase 3 public-surface gate once it exists
- **Before `$gsd-verify-work`:** Full runtime suite and public-surface gate must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 0 | CMD-01, CMD-02, CMD-04 | T-03-01 | Route contract rejects banned public entrypoints while preserving migration internals | contract | `npm run test:workflow-runtime` | Partial | pending |
| 03-01-02 | 01 | 0 | CMD-05 | T-03-03 | `onboard`, `status`, and `resume` prompts describe non-mutating fallback behavior | contract | `npm run test:workflow-runtime` | Missing | pending |
| 03-02-01 | 02 | 1 | CMD-01, CMD-02, CMD-04 | T-03-01 | Generator emits `/opsx-*` and `$opsx-*` only as public routes | unit / contract | `npm run test:workflow-runtime` | Partial | pending |
| 03-03-01 | 03 | 2 | CMD-03, CMD-05 | T-03-02, T-03-03 | Skill and playbooks read state when present and do not claim Phase 4 enforcement | docs contract | `npm run test:workflow-runtime` | Partial | pending |
| 03-04-01 | 04 | 3 | CMD-01, CMD-02, CMD-03, CMD-04, CMD-05 | T-03-01 | Docs, guides, postinstall text, generated files, and installed assets expose the same current surface | integration | `npm run test:workflow-runtime` | Partial | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] `scripts/test-workflow-runtime.js` asserts no public help/doc/guide/generated Codex surface recommends `$opsx <request>`.
- [ ] `scripts/test-workflow-runtime.js` asserts generated bundles and checked-in `commands/**` outputs match.
- [ ] `scripts/test-workflow-runtime.js` asserts `onboard`, `status`, and `resume` prompts include missing workspace or no active change fallback wording.
- [ ] `scripts/check-phase1-legacy-allowlist.js` is replaced or narrowed so it validates current public surfaces without blocking legitimate migration internals.
- [ ] `npm run test:workflow-runtime` exits 0 after the new failing assertions are introduced and then satisfied by later tasks.

---

## Manual-Only Verifications

All phase behaviors have automated verification through the runtime suite and public-surface gate.

---

## Threat References

| Threat | Description | Required Mitigation |
|--------|-------------|---------------------|
| T-03-01 | Conflicting route guidance across help, docs, skill metadata, and generated prompts | Centralize route text, regenerate bundles, and assert public surfaces do not expose `$opsx <request>`, `/openspec`, `$openspec`, `/prompts:openspec`, `/opsx:*`, or `/prompts:opsx-*`. |
| T-03-02 | Prompts claim Phase 4 hash or stage enforcement exists before implementation | Preflight wording must require file reads and honest fallback behavior without claiming artifact hash comparison, transition enforcement, or durable state mutation. |
| T-03-03 | Empty `status` or `resume` route implicitly creates active state | Prompt and playbook text must state missing workspace or no active change is reported, then suggest a next action without auto-creating state. |
| T-03-04 | Legacy-route cleanup accidentally weakens migration code | Keep migration tests separate from public-surface tests and do not remove legitimate migration fixture coverage unless the plan explicitly replaces it. |

---

## Validation Sign-Off

- [x] All tasks have automated verify commands or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all missing references
- [x] No watch-mode flags
- [x] Feedback latency < 10s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-04-27
