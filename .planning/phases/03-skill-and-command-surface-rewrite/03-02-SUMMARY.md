---
phase: 03-skill-and-command-surface-rewrite
plan: "02"
subsystem: testing
tags: [opsx, command-surface, templates, workflow-runtime]
requires:
  - phase: 03-skill-and-command-surface-rewrite
    provides: Phase 03-01 helper inventories and revised hard-clean-break planning contract.
provides:
  - "Shared workflow metadata now defines strict Phase 3 preflight and action-level fallback guidance."
  - "Command templates now emit explicit-only Codex route guidance without standalone `$opsx`/`$opsx <request>` public UX."
  - "Wave 1 runtime tests now lock source-output routing/preflight/fallback behavior while deferring checked-in bundle parity enforcement."
affects: [03-03, 03-04, 03-05, 03-06, 03-07, 03-08, CMD-01, CMD-02, CMD-04, CMD-05]
tech-stack:
  added: []
  patterns:
    - "Keep route syntax and fallback semantics centralized in workflow metadata, then fan out via templates."
    - "Wave 1 validates generated source output directly and postpones checked-in bundle parity to refresh waves."
key-files:
  created:
    - .planning/phases/03-skill-and-command-surface-rewrite/03-02-SUMMARY.md
  modified:
    - lib/workflow.js
    - lib/generator.js
    - templates/commands/action.md.tmpl
    - templates/commands/index.md.tmpl
    - templates/commands/codex-entry.md.tmpl
    - templates/commands/shared-entry.md.tmpl
    - scripts/test-workflow-runtime.js
key-decisions:
  - "Codex primary workflow syntax now resolves to explicit `$opsx-*` routing only; `$opsx <request>` is removed from source-of-truth metadata/templates."
  - "Runtime suite keeps bundle parity inventory plumbing but does not fail on checked-in `commands/**` drift until later refresh waves."
patterns-established:
  - "Per-action fallback copy for `onboard`/`status`/`resume` is centrally managed and reused across platforms."
  - "Strict preflight path requirements (`.opsx/config.yaml`, `.opsx/active.yaml`, `state.yaml`, `context.md`) are asserted from generated source output."
requirements-completed:
  - CMD-01
  - CMD-02
  - CMD-04
  - CMD-05
duration: 6m 14s
completed: 2026-04-27
---

# Phase 03 Plan 02: Skill and Command Surface Rewrite Summary

**OpsX command generation now enforces explicit-only Codex routing plus strict Phase 3 preflight/fallback contract from shared metadata and templates.**

## Performance

- **Duration:** 6m 14s
- **Started:** 2026-04-27T09:45:22Z
- **Completed:** 2026-04-27T09:51:36Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- 在 `lib/workflow.js` 中新增 Phase 3 preflight 与 action fallback 元数据，并移除 Codex `$opsx <request>` 主入口模型。
- 在 `lib/generator.js` 与 `templates/commands/*.tmpl` 中统一渲染 preflight/fallback 文案，确保 Codex 索引仅作为内部路由目录且仅暴露 `$opsx-*`。
- 在 `scripts/test-workflow-runtime.js` 中锁定 Wave 1 source-output 合同：显式路由、严格 preflight、`onboard/status/resume` fallback 语义；同时延后 checked-in bundle parity 强制到后续波次。

## Task Commits

Each task was committed atomically:

1. **Task 1: Move explicit-only routing and strict preflight into shared workflow metadata and templates**
   - `72253c1` (test, TDD RED)
   - `6408c78` (feat, TDD GREEN)
2. **Task 2: Update Wave 1 runtime assertions to validate source output without requiring checked-in bundle parity yet**
   - `e3fdd43` (test)

_Note: Task 1 使用 TDD，包含 RED/GREEN 两个提交。_

## Files Created/Modified

- `lib/workflow.js` - 新增 Phase 3 preflight/fallback 元数据与 helper，并将 Codex 主语法改为 explicit-only。
- `lib/generator.js` - 将 preflight/fallback 渲染变量接入 action/index/codex entry 生成流程。
- `templates/commands/action.md.tmpl` - 替换旧 “planned for later phases” 文案，加入严格 preflight 与 route fallback 区块。
- `templates/commands/index.md.tmpl` - 改为强调 preflight + honest missing-file fallback，不再使用旧 Phase 4 预告式语句。
- `templates/commands/codex-entry.md.tmpl` - 改为内部路由目录语义，移除 `Preferred:`/`$opsx <request>`/主入口措辞。
- `templates/commands/shared-entry.md.tmpl` - 更新为显式路由与实际 preflight 文件读取要求。
- `scripts/test-workflow-runtime.js` - 新增 Wave 1 source-output 断言并移除当前波次对 checked-in parity 的强制失败。

## Decisions Made

- 保留 `commands/codex/prompts/opsx.md` 作为内部生成路由目录，但禁止它暴露 standalone/public 主入口文案。
- 将 parity 收敛策略改为“Wave 1 仅锁 source output，Wave 2+ 再逐片刷新 checked-in bundles”以支持并行小波次执行。

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Task 1 源变更后，旧测试中的 checked-in bundle parity 断言会立刻失败；按计划在 Task 2 中将 parity 激活延后并补齐 source-output 断言后恢复为绿。

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `03-03` 到 `03-08` 可以直接按平台切片刷新 checked-in `commands/**`，并利用本波次已稳定的 source-output 合同做对齐验证。
- Wave 1 目前已满足“先改源、后改生成产物”的执行顺序，不需要额外人工步骤。

---
*Phase: 03-skill-and-command-surface-rewrite*
*Completed: 2026-04-27*

## Self-Check: PASSED

- FOUND: `.planning/phases/03-skill-and-command-surface-rewrite/03-02-SUMMARY.md`
- FOUND: `72253c1`
- FOUND: `6408c78`
- FOUND: `e3fdd43`
