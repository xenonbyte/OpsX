---
phase: 06-tdd-light-workflow
reviewed: 2026-04-28T11:34:16Z
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

**Reviewed:** 2026-04-28T11:34:16Z
**Depth:** standard
**Files Reviewed:** 25
**Status:** issues_found

## Summary

Reviewed the Phase 6 source, generated prompts, skill/playbook guidance, templates, and runtime tests at standard depth. The prior `tdd-classification-missing` path is present, and explicit `TDD Exemption:` lines without a reason now produce `tdd-exemption-reason-missing`.

One exemption-reason gap remains: exempt classes can still bypass RED/VERIFY through `TDD Class: docs-only` or heuristic exempt classification without a visible `TDD Exemption:` reason.

Verification performed:
- `npm run test:workflow-runtime` -> passed (`80 test(s) passed`)

## Warnings

### WR-01: Exempt Classes Can Still Bypass Visible Exemption Reasons

**File:** `lib/workflow.js:1148`

**Issue:** `classifyTaskGroupTdd()` requires a reason only when an explicit `TDD Exemption:` line is present, but `exemptByClass` still marks any class in `rules.tdd.exempt` as exempt without requiring a visible reason. That means a strict-mode group with `- TDD Class: docs-only` and no `TDD Exemption: docs-only — <reason>` skips RED/VERIFY and emits no TDD finding. This contradicts the shipped guidance in `skills/opsx/SKILL.md:136` and `skills/opsx/references/artifact-templates.md:92`, which require exempt groups to carry visible `TDD Exemption:` reasons.

**Fix:**
```js
const exemptClassWithoutReason = !metadata.exemptionClass && Boolean(tddClass) && exemptSet.has(tddClass);
const exempt = explicitlyExempt;
const exemptionReasonMissing = (
  (Boolean(metadata.exemptionClass) || exemptClassWithoutReason)
  && !hasValidExemptionReason
);
```

Also add a regression test where strict mode receives a group containing `- TDD Class: docs-only` with no `TDD Exemption:` reason and must emit `tdd-exemption-reason-missing`.

---

_Reviewed: 2026-04-28T11:34:16Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
