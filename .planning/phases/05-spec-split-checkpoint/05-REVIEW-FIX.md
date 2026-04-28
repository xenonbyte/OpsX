---
phase: 05-spec-split-checkpoint
fixed_at: 2026-04-28T07:34:52Z
review_path: .planning/phases/05-spec-split-checkpoint/05-REVIEW.md
iteration: 1
findings_in_scope: 2
fixed: 2
skipped: 0
status: all_fixed
---

# Phase 05: Code Review Fix Report

**Fixed at:** 2026-04-28T07:34:52Z
**Source review:** `.planning/phases/05-spec-split-checkpoint/05-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 2
- Fixed: 2
- Skipped: 0
- Verification: `npm run test:workflow-runtime` passed, 66/66 tests

## Fixed Issues

### WR-01: Spec-Split Checkpoint Does Not Block When Specs Are Absent

**Files modified:** `lib/workflow.js`, `scripts/test-workflow-runtime.js`
**Commit:** f8f3025
**Status:** fixed
**Applied fix:** `runSpecSplitCheckpoint()` now emits a `BLOCK` finding with code `specs-missing` when no spec files are present, including proposal-only input. Added regression coverage for empty and proposal-only sources.

### WR-02: Design Remains Ready Before Specs Despite The New Checkpoint Ordering

**Files modified:** `schemas/spec-driven/schema.json`, `scripts/test-workflow-runtime.js`
**Commit:** f8f3025
**Status:** fixed
**Applied fix:** The `design` artifact now requires both `proposal` and `specs`, so runtime guidance blocks design until specs exist. Added regression coverage for design readiness with proposal-only artifacts.

---

_Fixed: 2026-04-28T07:34:52Z_
_Fixer: Codex_
_Iteration: 1_
