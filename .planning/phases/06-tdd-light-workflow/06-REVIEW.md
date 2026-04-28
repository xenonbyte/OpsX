---
phase: 06-tdd-light-workflow
reviewed: 2026-04-28T11:56:34Z
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
  - skills/opsx/references/action-playbooks-zh.md
  - skills/opsx/references/action-playbooks.md
  - skills/opsx/references/artifact-templates-zh.md
  - skills/opsx/references/artifact-templates.md
  - templates/project/config.yaml.tmpl
findings:
  critical: 0
  warning: 1
  info: 0
  total: 1
status: issues_found
---

# Phase 6: Code Review Report

**Reviewed:** 2026-04-28T11:56:34Z
**Depth:** standard
**Files Reviewed:** 25
**Status:** issues_found

## Summary

Reviewed the Phase 6 runtime, persistence, generator, generated command/prompt slices, skill/playbook guidance, templates, and regression tests at standard depth. The most recent fix covers missing visible reasons for configured exempt classes (`TDD Class: docs-only` without `TDD Exemption:` and `TDD Exemption: docs-only` without a reason).

One strict-mode bypass remains: an explicit `TDD Exemption:` using an unconfigured class and a non-empty reason is accepted as neither required nor exempt, so it emits no TDD blocker and bypasses RED/VERIFY.

Verification performed:
- `npm run test:workflow-runtime` -> passed (`82 test(s) passed`)

## Warnings

### WR-01: Unconfigured TDD Exemption Classes Bypass Strict RED/VERIFY

**File:** `lib/workflow.js:1148`

**Issue:** `classifyTaskGroupTdd()` only sets `exempt` when `metadata.exemptionClass` is in `visibleExemptSet` or `rules.tdd.exempt`, but it does not flag an explicit exemption class that is not allowed. A group like `- TDD Exemption: not-configured — custom reason` gets `classSource: "explicit-exemption"`, `required: false`, `exempt: false`, and no `tdd-*` finding. In strict mode this bypasses RED/VERIFY even though the class is not configured as exempt.

**Fix:**
```js
const exemptionClassAllowed = Boolean(metadata.exemptionClass)
  && (visibleExemptSet.has(metadata.exemptionClass) || exemptSet.has(metadata.exemptionClass));
const explicitlyExempt = exemptionClassAllowed && hasValidExemptionReason;
const exemptionClassInvalid = Boolean(metadata.exemptionClass) && !exemptionClassAllowed;

// include exemptionClassInvalid on the returned group, then add a
// mode-aware tdd-exemption-class-invalid finding in appendTddTaskCheckpointFindings().
```

Also add a regression test where strict mode receives `TDD Exemption: not-configured — custom reason` with no RED/VERIFY steps and must emit a blocking TDD finding.

---

_Reviewed: 2026-04-28T11:56:34Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
