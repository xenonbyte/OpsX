---
phase: 04-change-state-machine-and-drift-control
fixed_at: 2026-04-27T17:55:34Z
review_path: .planning/phases/04-change-state-machine-and-drift-control/04-REVIEW.md
iteration: 1
findings_in_scope: 2
fixed: 2
skipped: 0
status: all_fixed
---

# Phase 04: Code Review Fix Report

**Fixed at:** 2026-04-27T17:55:34Z
**Source review:** `.planning/phases/04-change-state-machine-and-drift-control/04-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 2
- Fixed: 2
- Skipped: 0
- Verification: `npm run test:workflow-runtime` passed, 53/53 tests

## Fixed Issues

### WR-01: Lowercase Or Alternate Rejected Execution Checkpoints Still Advance State

**Files modified:** `lib/change-store.js`, `scripts/test-workflow-runtime.js`
**Commit:** f99aa58
**Status:** fixed: requires human verification
**Applied fix:** `recordTaskGroupExecution()` now normalizes checkpoint status to uppercase before recording, computes checkpoint acceptance from that normalized status, and reuses the same acceptance decision when deciding whether to advance the active task group or refresh hashes. Added regression coverage for lowercase `block` and `ERROR` rejected execution checkpoints.

### WR-02: Invalid `createdAt` Leaves A Partial New Change Directory

**Files modified:** `lib/workspace.js`, `scripts/test-workflow-runtime.js`
**Commit:** 49f3840
**Status:** fixed: requires human verification
**Applied fix:** `createChangeSkeleton()` now validates and normalizes `createdAt` before creating `.opsx/changes/<changeName>` or writing active state. Added regression coverage confirming invalid `createdAt` throws before the change directory or `.opsx/active.yaml` exists.

---

_Fixed: 2026-04-27T17:55:34Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
