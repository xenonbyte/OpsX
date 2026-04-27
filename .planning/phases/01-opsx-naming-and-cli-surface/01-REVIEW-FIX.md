---
phase: 01-opsx-naming-and-cli-surface
fixed_at: 2026-04-27T02:08:19Z
review_path: .planning/phases/01-opsx-naming-and-cli-surface/01-REVIEW.md
iteration: 1
findings_in_scope: 2
fixed: 2
skipped: 0
status: all_fixed
---

# Phase 01: Code Review Fix Report

**Fixed at:** 2026-04-27T02:08:19Z
**Source review:** .planning/phases/01-opsx-naming-and-cli-surface/01-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 2
- Fixed: 2
- Skipped: 0

## Fixed Issues

### WR-01: Manifest cleanup can remove paths outside OpsX-owned install roots

**Files modified:** `lib/install.js`, `scripts/test-workflow-runtime.js`
**Commit:** ed5513d
**Applied fix:** Added manifest cleanup root validation for install and uninstall paths, validate all entries before removal, and added a regression test that corrupt manifest entries outside OpsX install roots are rejected without deleting files.

### WR-02: Invalid mixed platform values are silently ignored

**Files modified:** `lib/install.js`, `scripts/test-workflow-runtime.js`
**Commit:** 84034f7
**Applied fix:** Added strict platform resolution that rejects any unsupported platform in install and uninstall requests, and added a regression test proving mixed valid/invalid values do not partially install or uninstall.

---

_Fixed: 2026-04-27T02:08:19Z_
_Fixer: Codex (gsd-code-fixer)_
_Iteration: 1_
