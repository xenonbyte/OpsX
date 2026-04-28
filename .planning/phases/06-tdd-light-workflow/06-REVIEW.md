---
phase: 06-tdd-light-workflow
reviewed: 2026-04-28T12:17:32Z
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
  warning: 2
  info: 0
  total: 2
status: issues_found
---

# Phase 6: Code Review Report

**Reviewed:** 2026-04-28T12:17:32Z
**Depth:** standard
**Files Reviewed:** 25
**Status:** issues_found

## Summary

Reviewed Phase 6 runtime, persistence, generator, generated command/prompt slices, skill guidance, bilingual playbooks, artifact templates, project config template, and runtime tests at standard depth.

The latest fixes for missing exemption reasons and unknown `TDD Exemption:` classes are partially covered: `not-configured` now emits `tdd-exemption-class-invalid` in strict/light tests. Two inconsistencies remain.

Verification performed:
- `npm run test:workflow-runtime` -> passed (`84 test(s) passed`)
- Direct runtime probe confirmed default strict config accepts `TDD Exemption: migration-only -- custom reason` without a TDD finding.

## Warnings

### WR-01: Hidden Exemption Allowlist Lets Unconfigured Classes Bypass Strict TDD

**File:** `lib/workflow.js:1133`

**Issue:** `classifyTaskGroupTdd()` accepts an explicit `TDD Exemption:` when the class is either in `rules.tdd.exempt` or in the hardcoded `VISIBLE_TDD_EXEMPT_CLASSES` list. That list includes `migration-only` and `generated-refresh-only` at `lib/workflow.js:186`, but those classes are not configured by default in `templates/project/config.yaml.tmpl:16`. With default strict config, `TDD Exemption: migration-only -- custom reason` becomes `exempt: true` and skips RED/VERIFY with no `tdd-exemption-class-invalid` finding. This conflicts with the Phase 6 requirement that unconfigured explicit exemption classes must not silently bypass strict TDD.

**Fix:**
```js
const exemptionClassAllowed = Boolean(metadata.exemptionClass)
  && exemptSet.has(metadata.exemptionClass);
const exemptionClassInvalid = Boolean(metadata.exemptionClass) && !exemptionClassAllowed;
```

Then add regression coverage proving:
- default strict config blocks `TDD Exemption: migration-only -- custom reason` with `tdd-exemption-class-invalid`;
- adding `migration-only` to `rules.tdd.exempt` makes the same group a valid exemption.

### WR-02: Apply Playbooks Omit Required Execution Proof Fields

**File:** `skills/opsx/references/action-playbooks.md:84`

**Issue:** The generated apply prompts and generator say the execution checkpoint records completed TDD steps, verification command/result, diff summary, and drift status. `runExecutionCheckpoint()` warns when these proof fields are missing, and `recordTaskGroupExecution()` persists them. The English and Chinese apply playbooks still tell agents to record only verification command/result plus changed files (`skills/opsx/references/action-playbooks-zh.md:84` has the same gap). Agents following the playbook directly can under-record execution evidence and trigger incomplete proof warnings despite following shipped guidance.

**Fix:** Update both playbooks to require the same proof fields as runtime and generated prompts:

```markdown
- Record completed TDD steps, verification command/result, changed files, diff summary, and drift status; refresh `context.md` / `drift.md`, then stop for the next run.
```

Also add a runtime-suite assertion that both `action-playbooks.md` and `action-playbooks-zh.md` include `completed TDD steps`, `diff summary`, and `drift status` or their approved bilingual equivalents.

---

_Reviewed: 2026-04-28T12:17:32Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
