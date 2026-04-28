---
phase: 06-tdd-light-workflow
fixed_at: 2026-04-28T12:29:28Z
review_path: .planning/phases/06-tdd-light-workflow/06-REVIEW.md
iteration: 1
findings_in_scope: 2
fixed: 2
skipped: 0
status: all_fixed
---

# Phase 6: Code Review Fix Report

**Fixed at:** 2026-04-28T12:29:28Z
**Source review:** .planning/phases/06-tdd-light-workflow/06-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 2
- Fixed: 2
- Skipped: 0

## Fixed Issues

### WR-01: Hidden Exemption Allowlist Lets Unconfigured Classes Bypass Strict TDD

**Status:** fixed: requires human verification
**Files modified:** `lib/workflow.js`, `scripts/test-workflow-runtime.js`
**Commits:** e9c8082, 4c07d6c
**Applied fix:** Restricted explicit `TDD Exemption:` authorization to the configured `rules.tdd.exempt` set, updated the invalid-class finding message, and added regression coverage for default `migration-only` rejection plus configured `migration-only` acceptance.

**Verification:**
- `node -c lib/workflow.js`
- `node -c scripts/test-workflow-runtime.js`
- `npm run test:workflow-runtime` (86/86 passed)

### WR-02: Apply Playbooks Omit Required Execution Proof Fields

**Status:** fixed
**Files modified:** `skills/opsx/references/action-playbooks.md`, `skills/opsx/references/action-playbooks-zh.md`, `scripts/test-workflow-runtime.js`
**Commit:** d6f05f7
**Applied fix:** Updated English and Chinese apply playbooks to require completed TDD steps, verification command/result, changed files, diff summary, and drift status before refreshing `context.md` / `drift.md`; added runtime assertions for the machine-readable marker tokens in both playbooks.

**Verification:**
- `node -c scripts/test-workflow-runtime.js`
- `npm run test:workflow-runtime` (86/86 passed)

## Skipped Issues

None - all in-scope findings were fixed.

---

_Fixed: 2026-04-28T12:29:28Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
