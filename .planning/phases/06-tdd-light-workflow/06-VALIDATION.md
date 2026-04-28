---
phase: 06
slug: tdd-light-workflow
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-28
---

# Phase 06 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| Framework | Custom Node.js regression script using built-in `assert` |
| Config file | none |
| Quick run command | `npm run test:workflow-runtime` |
| Full suite command | `npm run test:workflow-runtime` |
| Estimated runtime | under 10 seconds |

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
| 06-01-01 | 01 | 1 | TDD-01 | T-06-01 | Normalize invalid or missing TDD config before checkpoint code consumes it | integration | `npm run test:workflow-runtime` | yes | pending |
| 06-02-01 | 02 | 1 | TDD-02 | T-06-03 | Preserve visible exemption reasons and explicit TDD markers in task guidance | integration | `npm run test:workflow-runtime` | yes | pending |
| 06-03-01 | 03 | 2 | TDD-03 | T-06-01 / T-06-02 | Enforce RED and VERIFY only for required task classes and by configured mode | integration | `npm run test:workflow-runtime` | yes | pending |
| 06-04-01 | 04 | 2 | TDD-04 | T-06-04 | Persist execution proof without a separate TDD artifact | integration | `npm run test:workflow-runtime` | yes | pending |
| 06-05-01 | 05 | 3 | TDD-02 / TDD-03 / TDD-04 | T-06-02 / T-06-04 | Keep generated guidance in sync with runtime behavior | integration | `npm run test:workflow-runtime` | yes | pending |

---

## Wave 0 Requirements

- [ ] `scripts/test-workflow-runtime.js` - add `normalizeConfig()` coverage for default `rules.tdd`, invalid modes, and merged `requireFor` / `exempt` lists.
- [ ] `scripts/test-workflow-runtime.js` - add task-structure coverage for `## Test Plan`, explicit RED/GREEN/REFACTOR/VERIFY labels, visible exemptions, and manual-verification rationale.
- [ ] `scripts/test-workflow-runtime.js` - add `runTaskCheckpoint()` matrix tests for `off`, `light`, and `strict`, plus required versus exempt task classes.
- [ ] `scripts/test-workflow-runtime.js` - add `runExecutionCheckpoint()` and `recordTaskGroupExecution()` assertions for richer verification entries and `context.md` rendering.
- [ ] `scripts/test-workflow-runtime.js` - add wording/parity assertions for `skills/opsx/SKILL.md`, `lib/generator.js`, and checked-in prompts so deferred-TDD text is removed.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| None | TDD-01 to TDD-04 | All Phase 6 behavior is covered by runtime regression assertions | N/A |

---

## Threat References

| Threat Ref | Threat | Mitigation |
|------------|--------|------------|
| T-06-01 | Invalid or unnormalized `rules.tdd.mode` values alter checkpoint behavior | Normalize mode and lists in `lib/config.js`; test invalid, missing, and override inputs |
| T-06-02 | Silent or spoofed exemption text hides required TDD work | Require visible exemption reasons and give explicit task markers precedence over heuristics |
| T-06-03 | `## Test Plan` is mistaken for an executable task group or ignored by enforcement | Parse Test Plan separately and keep numbered headings as apply groups |
| T-06-04 | Execution proof is too thin for resume, review, or later verify/archive gates | Extend `verificationLog` and context capsule with TDD steps, diff summary, and drift evidence |

---

## Validation Sign-Off

- [x] All tasks have automated verification through `npm run test:workflow-runtime`
- [x] Sampling continuity: no 3 consecutive tasks without automated verification
- [x] Wave 0 covers all missing references
- [x] No watch-mode flags
- [x] Feedback latency target under 10 seconds
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
