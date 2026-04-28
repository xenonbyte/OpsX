---
phase: 06-tdd-light-workflow
reviewed: 2026-04-28T10:57:43Z
depth: standard
files_reviewed: 25
files_reviewed_list:
  - commands/claude/opsx/apply.md
  - commands/claude/opsx/continue.md
  - commands/claude/opsx/ff.md
  - commands/claude/opsx/propose.md
  - commands/codex/prompts/opsx-apply.md
  - commands/codex/prompts/opsx-continue.md
  - commands/codex/prompts/opsx-ff.md
  - commands/codex/prompts/opsx-propose.md
  - commands/gemini/opsx/apply.toml
  - commands/gemini/opsx/continue.toml
  - commands/gemini/opsx/ff.toml
  - commands/gemini/opsx/propose.toml
  - lib/change-capsule.js
  - lib/change-store.js
  - lib/config.js
  - lib/generator.js
  - lib/runtime-guidance.js
  - lib/workflow.js
  - scripts/test-workflow-runtime.js
  - skills/opsx/SKILL.md
  - skills/opsx/references/action-playbooks.md
  - skills/opsx/references/action-playbooks-zh.md
  - skills/opsx/references/artifact-templates.md
  - skills/opsx/references/artifact-templates-zh.md
  - templates/project/config.yaml.tmpl
findings:
  critical: 0
  warning: 2
  info: 0
  total: 2
status: issues_found
---

# Phase 6: Code Review Report

**Reviewed:** 2026-04-28T10:57:43Z
**Depth:** standard
**Files Reviewed:** 25
**Status:** issues_found

## Summary

Reviewed Phase 6 TDD-light runtime, persistence, generated prompts, skill guidance, templates, and workflow regression coverage. Generated prompt parity and the existing runtime suite are green, but strict TDD enforcement has two runtime gaps: unclassified behavior-changing groups can avoid RED/VERIFY enforcement, and explicit exemptions are accepted without the required reason.

Verification performed:
- `npm run test:workflow-runtime` -> passed (`77 test(s) passed`)
- Targeted runtime probes confirmed both TDD bypass cases described below.

## Warnings

### WR-01: Strict TDD Can Miss Ordinary Behavior-Change Groups

**File:** `lib/workflow.js:1112`
**Issue:** `inferTddGroupClass()` only classifies required work when text contains literal `behavior-change` / `bugfix` tokens, and `classifyTaskGroupTdd()` only sets `required` when that class is found. A normal behavior-changing task such as "Add retry logic" with a spec saying the system SHALL retry transient HTTP failures is returned as `classSource: "unclassified"`, `required: false`; missing `RED` and `VERIFY` then produce no TDD findings in strict mode. This contradicts the strict-by-default Phase 6 contract and the playbook requirement that each top-level group declare `TDD Class:` or `TDD Exemption:`.
**Fix:**
```js
// In appendTddTaskCheckpointFindings(), before RED/VERIFY checks:
const classificationMissing = tddGroups
  .filter((group) => group.classSource === 'unclassified')
  .map((group) => group.heading)
  .filter(Boolean);

if (classificationMissing.length > 0) {
  addFinding(findings, {
    severity: tddConfig.mode === 'strict' ? 'BLOCK' : 'WARN',
    code: 'tdd-classification-missing',
    message: `Task groups must declare TDD Class or TDD Exemption: ${classificationMissing.join(', ')}.`,
    patchTargets: ['tasks']
  });
}
```
Add regression coverage for a strict-mode task group named like `Add retry logic` that lacks `TDD Class:` / `TDD Exemption:` and omits `RED` / `VERIFY`.

### WR-02: TDD Exemptions Are Accepted Without Reasons

**File:** `lib/workflow.js:1147`
**Issue:** `parseTddGroupMetadata()` captures `exemptionReason`, but `classifyTaskGroupTdd()` treats an explicit exemption as valid based only on the exemption class. As a result, `- TDD Exemption: docs-only` with no reason bypasses RED/VERIFY enforcement in strict mode. This conflicts with `skills/opsx/references/artifact-templates.md:92`, which requires an exemption reason after the class, and with generated guidance that says visible exemption reasons are accepted.
**Fix:**
```js
const hasValidExemptionReason = Boolean(metadata.exemptionReason && metadata.exemptionReason.trim());
const explicitlyExempt = Boolean(metadata.exemptionClass)
  && hasValidExemptionReason
  && (visibleExemptSet.has(metadata.exemptionClass) || exemptSet.has(metadata.exemptionClass));

if (metadata.exemptionClass && !hasValidExemptionReason) {
  // Add a tdd-exemption-reason-missing finding in appendTddTaskCheckpointFindings().
}
```
Use `BLOCK` in strict mode and `WARN` in light mode, and add tests for an exemption line without a reason.

---

_Reviewed: 2026-04-28T10:57:43Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
