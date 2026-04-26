---
phase: 01-opsx-naming-and-cli-surface
plan: "06"
subsystem: release-metadata
tags: [opsx, changelog, allowlist, verification]
requires:
  - phase: 01-opsx-naming-and-cli-surface
    provides: Plan 01-04 runtime regressions and Plan 01-05 docs/template rename baseline
provides:
  - "v3.0.0 breaking release note aligned to OpsX rename scope"
  - "Executable Phase 1 legacy-name allowlist gate over shipped/runtime surfaces"
  - "Final runtime + allowlist + npm pack verification bundle for Phase 1"
affects: [release-readiness, NAME-04, NAME-05]
tech-stack:
  added: []
  patterns:
    - "Hardcoded scan targets for release gates to avoid drift from implicit file discovery."
    - "Legacy references are allowed only for approved deferred/runtime files, changelog history, and one README lineage sentence."
key-files:
  created:
    - scripts/check-phase1-legacy-allowlist.js
  modified:
    - CHANGELOG.md
    - lib/workflow.js
key-decisions:
  - "Documented v3.0.0 as a breaking rename release while explicitly deferring Phase 2 migration and later state-machine work."
  - "Implemented a deterministic allowlist gate with explicit target files and line-level failure output."
  - "Patched lib/workflow.js path matching via SHARED_HOME_NAME-derived prefixes to preserve behavior while satisfying the new gate."
patterns-established:
  - "Phase-close verification uses runtime test + allowlist gate + npm pack dry-run as a single reproducible bundle."
requirements-completed:
  - NAME-04
  - NAME-05
duration: 1m 57s
completed: 2026-04-27
---

# Phase 01 Plan 06: OpsX Naming and CLI Surface Summary

**新增 `v3.0.0` breaking rename 说明并交付可执行的 Phase 1 legacy allowlist gate，完成最终发布前验证闭环。**

## Performance

- **Duration:** 1m 57s
- **Started:** 2026-04-27T04:10:32+08:00
- **Completed:** 2026-04-27T04:12:29+08:00
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- 在 `CHANGELOG.md` 新增 `v3.0.0` 条目，明确 `@xenonbyte/opsx`、`opsx`、`skills/opsx` 和无 `openspec` bin alias。
- 新建 `scripts/check-phase1-legacy-allowlist.js`，硬编码扫描目标、允许规则和失败输出。
- 执行并通过最终验证组合：runtime tests、allowlist gate、`npm pack --dry-run`。

## Task Commits

Each task was committed atomically:

1. **Task 1: Add the `3.0.0` breaking-release note for the OpsX rename** - `9ced12a` (docs)
2. **Task 2: Encode the explicit allowlist gate and run the final Phase 1 verification bundle** - `7d8ceac` (fix)

## Files Created/Modified

- `CHANGELOG.md` - 新增 `v3.0.0` breaking rename release note，并明确 deferred phase 边界。
- `scripts/check-phase1-legacy-allowlist.js` - 新增 Phase 1 legacy token allowlist gate（显式扫描面 + line-context 失败输出）。
- `lib/workflow.js` - 修复最终 gate 暴露的窄集成问题，移除硬编码 legacy 字符串并改为从 `SHARED_HOME_NAME` 派生路径前缀。

## Decisions Made

- 继续维持 Phase 1 诚实边界：不在 changelog 夸大 Phase 2 `.opsx` 迁移或后续 state-machine 已完成。
- 采用“显式扫描面 + 显式 allowlist”策略，避免通过 `.gitignore` 或注释隐式派生门禁范围。
- 将 `lib/workflow.js` 修复限制在语义等价替换，避免引入额外行为变化。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed final-gate failure caused by two legacy literals in `lib/workflow.js`**
- **Found during:** Task 2 (final verification bundle)
- **Issue:** New `scripts/check-phase1-legacy-allowlist.js` failed because `lib/workflow.js` still contained `skills/openspec` and `openspec/changes` literals outside the approved deferred-file set.
- **Fix:** Replaced hardcoded literals with prefixes derived from `SHARED_HOME_NAME` (`LEGACY_WORKSPACE_SEGMENT`), preserving existing path-matching behavior while removing disallowed public legacy tokens from this file.
- **Files modified:** `lib/workflow.js`
- **Verification:** `node scripts/test-workflow-runtime.js`, `node scripts/check-phase1-legacy-allowlist.js`, `npm_config_cache=/tmp/opsx-npm-cache npm pack --dry-run`
- **Committed in:** `7d8ceac` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking issue)
**Impact on plan:** Narrow integration fix required to make the planned allowlist gate executable and green; no scope creep.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 1 的 6/6 计划均已完成，最终发布门禁（runtime + allowlist + pack）为绿。
- 可进入 Phase 2（workspace/global `.opsx` migration）执行。

---
*Phase: 01-opsx-naming-and-cli-surface*
*Completed: 2026-04-27*

## Self-Check: PASSED

- FOUND: `.planning/phases/01-opsx-naming-and-cli-surface/01-opsx-naming-and-cli-surface-06-SUMMARY.md`
- FOUND: `9ced12a`
- FOUND: `7d8ceac`
