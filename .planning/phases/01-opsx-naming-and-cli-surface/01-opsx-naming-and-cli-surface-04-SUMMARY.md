---
phase: 01-opsx-naming-and-cli-surface
plan: "04"
subsystem: testing
tags: [opsx, regression, runtime, command-bundle]
requires:
  - phase: 01-opsx-naming-and-cli-surface
    provides: Plan 01-01/01-02/01-03 delivered renamed CLI, skills/opsx install plumbing, and opsx command assets.
provides:
  - "Runtime regression assertions for skills/opsx install targets and shared command copy outputs"
  - "Runtime regression assertions for OpsX generated bundle content and checked-in entry files"
  - "Runtime guard that legacy commands/*/openspec* entry files remain removed"
affects: [01-05, 01-06, NAME-02, NAME-03]
tech-stack:
  added: []
  patterns:
    - "Keep public rename regressions in scripts/test-workflow-runtime.js as fast Node assert checks."
    - "Validate generated bundle output and checked-in command assets in one runtime pass."
key-files:
  created: []
  modified:
    - scripts/test-workflow-runtime.js
key-decisions:
  - "Kept c8541a1 integration fix behavior intact and added only missing 01-04 regression assertions."
  - "Retained deferred Phase 2 fixtures (openspec/changes, .openspec.yaml, .openspec shared-home) while tightening public-surface rename checks."
patterns-established:
  - "Runtime naming regressions must assert both generated bundle output and checked-in command entry files."
requirements-completed:
  - NAME-02
  - NAME-03
duration: 2m 13s
completed: 2026-04-27
---

# Phase 01 Plan 04: OpsX Naming and CLI Surface Summary

**补齐 runtime 回归脚本对 OpsX 技能安装目标、命令 bundle 产物与 legacy 入口删除状态的断言，确保命名面回退能被一次测试直接拦截。**

## Performance

- **Duration:** 2m 13s
- **Started:** 2026-04-26T19:52:10Z
- **Completed:** 2026-04-26T19:54:23Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- 在 `scripts/test-workflow-runtime.js` 增加了 `runtime suite locks renamed skill targets, generated bundles, and checked-in command entries` 测试用例。
- 回归覆盖新增了 `install()` 结果路径与落盘目录断言，确保 `skills/opsx` 是唯一安装目标。
- 回归覆盖新增了 `buildPlatformBundle()` 与 checked-in `commands/*/opsx*` 入口文件断言，并确保 `commands/*/openspec*` 顶层入口持续缺失。

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend runtime regression coverage for renamed skill and command bundle surfaces** - `ad04ed4` (test)

## Files Created/Modified

- `scripts/test-workflow-runtime.js` - 补充 OpsX rename 关键断言（skills/opsx 安装目标、bundle 产物、legacy 入口移除）并保持 deferred 内部路径 fixture 覆盖。

## Decisions Made

- 以 `c8541a1` 为既有基线，不回退其 integration 修复，仅补齐 01-04 计划缺失的命名面断言。
- 将回归聚焦在“公开命名面”而非提前迁移 Phase 2 内部路径语义，保持阶段边界清晰。

## Verification

- `node scripts/test-workflow-runtime.js` ✅（23 tests passed）

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 01-04 的 runtime rename regression 已闭环，可继续执行 01-05 的 README/docs/templates 公共命名面收敛。
- deferred Phase 2 fixture 覆盖仍保留在同一脚本中，未发生提前迁移或语义漂移。

---
*Phase: 01-opsx-naming-and-cli-surface*
*Completed: 2026-04-27*

## Self-Check: PASSED

- FOUND: `.planning/phases/01-opsx-naming-and-cli-surface/01-opsx-naming-and-cli-surface-04-SUMMARY.md`
- FOUND: `ad04ed4`
