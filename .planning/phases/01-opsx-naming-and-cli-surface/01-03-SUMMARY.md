---
phase: 01-opsx-naming-and-cli-surface
plan: "03"
subsystem: cli
tags: [opsx, command-bundle, templates, generator]
requires:
  - phase: 01-opsx-naming-and-cli-surface
    provides: Plan 01-01/01-02 delivered opsx package identity and skills/opsx install surface.
provides:
  - "OpsX-first command generation rules using `/opsx-*` and `$opsx <request>`"
  - "Regenerated Claude/Codex/Gemini checked-in command bundles with legacy openspec top-level entries removed"
affects: [01-04, 01-05, 01-06, NAME-03, NAME-04]
tech-stack:
  added: []
  patterns:
    - "Generator/templates are the single source for checked-in command bundle text."
    - "Codex explicit action routes use `$opsx-*`; Claude/Gemini action routes use `/opsx-*`."
key-files:
  created: []
  modified:
    - lib/generator.js
    - lib/workflow.js
    - templates/commands/action.md.tmpl
    - templates/commands/codex-entry.md.tmpl
    - templates/commands/index.md.tmpl
    - templates/commands/shared-entry.md.tmpl
    - commands/claude/opsx.md
    - commands/codex/prompts/opsx.md
    - commands/gemini/opsx.toml
key-decisions:
  - "Public action syntax is normalized to `/opsx-*` for Claude/Gemini and `$opsx-*` for Codex."
  - "Top-level legacy entries (`commands/*/openspec*` + `commands/openspec.md`) are deleted instead of dual-shipping."
patterns-established:
  - "Command assets are regenerated directly from `buildPlatformBundle()` output and committed verbatim."
  - "Phase-accurate prompt text explicitly avoids claiming `.opsx/active.yaml`, per-change `state.yaml`, spec-split, or TDD-light already shipped."
requirements-completed:
  - NAME-03
duration: 12m
completed: 2026-04-27
---

# Phase 01 Plan 03: OpsX Naming and CLI Surface Summary

**将命令生成层和已提交命令资产统一到 OpsX 公共命名面（`/opsx-*`、`$opsx <request>`），并移除所有 `commands/*/openspec*` 顶层入口文件。**

## Performance

- **Duration:** 12m
- **Started:** 2026-04-26T19:34:58Z
- **Completed:** 2026-04-26T19:46:58Z
- **Tasks:** 2
- **Files modified:** 55

## Accomplishments

- 重写 `lib/workflow.js` 和 `lib/generator.js` 的公开语法输出：弃用 `/opsx:action`、`$openspec`、`/prompts:openspec`，改为 `/opsx-*` 与 `$opsx` 系列。
- 重写 `templates/commands/*.tmpl` 的公开文案到 OpsX，并补充 `opsx check|doc|language` 示例与“后续阶段能力未落地”的诚实提示。
- 重新生成并提交 Claude/Codex/Gemini 全量命令资产，删除 `commands/openspec.md` 与三平台 `openspec` 顶层入口文件。

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite workflow syntax and command templates to OpsX naming** - `7b18f7e` (feat)
2. **Task 2: Regenerate checked-in command assets and delete legacy top-level entry files** - `4936e8a` (feat)

## Files Created/Modified

- `lib/workflow.js` - 统一 action route 形态到 `/opsx-*` / `$opsx-*`，并将 onboarding 文案改为 OpsX。
- `lib/generator.js` - 切换生成占位字段与描述文本到 OpsX，停止输出 `openspec` 顶层资产。
- `templates/commands/action.md.tmpl` - 改为 `opsx` skill 语义，新增 `opsx check|doc|language` 示例与延后能力说明。
- `templates/commands/codex-entry.md.tmpl` - Codex 主入口改为 `$opsx <request>`，显式路由改为 `$opsx-*`。
- `templates/commands/index.md.tmpl` - 统一 OpsX 文案并加入 phase-accurate deferred 说明。
- `templates/commands/shared-entry.md.tmpl` - 统一共享入口文案为 OpsX。
- `commands/claude/opsx.md`、`commands/codex/prompts/opsx.md`、`commands/gemini/opsx.toml` 及对应 action 文件 - 由新模板重新生成，全部对齐 OpsX 命名面。
- 删除 `commands/openspec.md`、`commands/claude/openspec.md`、`commands/codex/prompts/openspec.md`、`commands/gemini/openspec.toml`。

## Decisions Made

- `opsx` 公共语法采用连字符路由（`/opsx-*`）而非冒号路由（`/opsx:*`），保持三平台一致认知。
- Codex 文案从 `/prompts:*` 主叙事切换到 `$opsx` 主叙事，避免继续放大旧入口模型。
- 按任务边界仅改 generator/workflow/templates/commands，不触碰 `lib/config.js`、`lib/install.js` 与 skill bundle 文件。

## Verification

- `rg -n "OpsX|\\$opsx <request>|/opsx-|opsx check|opsx doc|opsx language" lib/generator.js lib/workflow.js templates/commands` ✅
- `! rg -n "/openspec|/prompts:openspec|\\$openspec|skills/openspec|@xenonbyte/openspec" templates/commands` ✅
- `rg -n "OpsX|\\$opsx <request>|/opsx-|opsx check|opsx doc|opsx language" commands/claude commands/codex/prompts commands/gemini` ✅
- `! rg -n "OpenSpec|/openspec|/prompts:openspec|\\$openspec|skills/openspec|@xenonbyte/openspec|~/.openspec" commands` ✅
- `test ! -e commands/openspec.md` / `commands/claude/openspec.md` / `commands/codex/prompts/openspec.md` / `commands/gemini/openspec.toml` ✅

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `git commit` 在默认沙箱下出现 `.git/index.lock` 权限错误；改为提权执行提交后完成，不影响产物内容。

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 01-03 已完成 NAME-03 范围内的 command generation/assets 收敛；可在 01-04 继续 runtime regression 与边界验证。
- 旧 `commands/*/openspec*` 顶层入口已移除，后续文档与发布门禁可基于单一 OpsX 面收敛。

---
*Phase: 01-opsx-naming-and-cli-surface*
*Completed: 2026-04-27*

## Self-Check: PASSED

- FOUND: `.planning/phases/01-opsx-naming-and-cli-surface/01-opsx-naming-and-cli-surface-03-SUMMARY.md`
- FOUND: `7b18f7e`
- FOUND: `4936e8a`
