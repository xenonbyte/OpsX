---
phase: 08-stability-json-and-release-coverage
fixed_at: 2026-04-29T02:15:08Z
review_path: .planning/phases/08-stability-json-and-release-coverage/08-REVIEW.md
iteration: 1
findings_in_scope: 2
fixed: 2
skipped: 0
status: all_fixed
---

# Phase 08: Code Review Fix Report

**Fixed at:** 2026-04-29T02:15:08Z
**Source review:** `.planning/phases/08-stability-json-and-release-coverage/08-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 2
- Fixed: 2
- Skipped: 0

## Fixed Issues

### WR-01: Public README Docs Still Expose Banned Route Forms

**Files modified:** `README.md`, `README-zh.md`, `scripts/test-workflow-generation.js`, `scripts/test-workflow-shared.js`
**Commit:** 7e8d336
**Applied fix:** Reworded README route guidance without spelling forbidden dispatcher/wildcard forms, then added public-surface route scanning for README, docs, templates, commands, skills, postinstall output/source, CLI help, and markdown-wrapped dispatcher/wildcard variants.

### WR-02: Release Checklist Presents Non-Shell GSD Routes as Bash Commands

**Files modified:** `docs/release-checklist.md`, `scripts/test-workflow-generation.js`
**Commit:** 1a12a2f
**Applied fix:** Split the release checklist schema-drift shell command from GSD/Codex workflow steps while preserving `$gsd-code-review 8` and `$gsd-verify-work 8`, then moved release-gate preservation coverage to `docs/release-checklist.md` with assertions that workflow steps are outside bash blocks.

## Verification

- `node -c scripts/test-workflow-generation.js` passed for both fixes.
- `node -c scripts/test-workflow-shared.js` passed for WR-01 and remained passing after WR-02.
- `node scripts/test-workflow-generation.js` passed 7/7 after each fix.
- `npm test` passed 128/128 after both fixes.

---

_Fixed: 2026-04-29T02:15:08Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
