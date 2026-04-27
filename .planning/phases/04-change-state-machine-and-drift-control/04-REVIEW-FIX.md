---
phase: 04-change-state-machine-and-drift-control
fixed_at: 2026-04-27T17:31:30Z
review_path: .planning/phases/04-change-state-machine-and-drift-control/04-REVIEW.md
iteration: 1
findings_in_scope: 2
fixed: 2
skipped: 0
status: all_fixed
---

# Phase 04: Code Review Fix Report

**Fixed at:** 2026-04-27T17:31:30Z
**Source review:** `.planning/phases/04-change-state-machine-and-drift-control/04-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 2
- Fixed: 2
- Skipped: 0
- Verification: `npm run test:workflow-runtime` passed, 51/51 tests

## Fixed Issues

### WR-01: Blocked Execution Checkpoints Still Refresh Hashes And Advance The Active Group

**Files modified:** `lib/change-store.js`, `scripts/test-workflow-runtime.js`
**Commit:** 3cc0084
**Status:** fixed: requires human verification
**Applied fix:** Blocked execution checkpoints now keep the existing active task group and stored hash baseline, add a blocker entry, and still record verification/checkpoint metadata. Added regression coverage for `checkpointStatus: 'BLOCK'` after artifact drift.

### WR-02: New Change Creation Accepts Names That Runtime Status Later Rejects

**Files modified:** `lib/workspace.js`, `scripts/test-workflow-runtime.js`
**Commit:** 935a656
**Status:** fixed: requires human verification
**Applied fix:** `createChangeSkeleton()` now validates change names before deriving or writing scaffold paths, rejecting traversal, path separators, and unsupported characters. Added regression coverage confirming invalid names fail before files or active pointers are written.

---

_Fixed: 2026-04-27T17:31:30Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
