---
phase: 01-opsx-naming-and-cli-surface
plan: "05"
subsystem: docs
tags: [opsx, docs, templates, naming]
requires:
  - phase: 01-opsx-naming-and-cli-surface
    provides: Plan 01-02/01-03 established OpsX skill and command surfaces for docs/template alignment.
provides:
  - "OpsX-first README and docs command guidance using `opsx` and `@xenonbyte/opsx`."
  - "Shipped project templates rewritten to OpsX-only public guidance."
  - "Legacy public tokens removed from docs/templates, with lineage sentence restricted to README files."
affects: [01-06, NAME-03, NAME-04]
tech-stack:
  added: []
  patterns:
    - "Public docs list `opsx` subcommands as primary syntax; `--check/--doc/--language` shown only as secondary aliases."
    - "Project templates avoid legacy naming and point operators to `.opsx/*` and `$opsx` routes."
key-files:
  created:
    - .planning/phases/01-opsx-naming-and-cli-surface/01-opsx-naming-and-cli-surface-05-SUMMARY.md
  modified:
    - README.md
    - README-zh.md
    - docs/commands.md
    - docs/codex.md
    - docs/customization.md
    - docs/runtime-guidance.md
    - docs/supported-tools.md
    - templates/project/config.yaml.tmpl
    - templates/project/rule-file.md.tmpl
key-decisions:
  - "Kept the only allowed lineage sentence (`OpsX was originally adapted from Fission-AI/OpenSpec.`) exclusively in README.md and README-zh.md."
  - "Documented `opsx check|doc|language` as primary command syntax while retaining `--check|--doc|--language` as secondary compatibility aliases."
patterns-established:
  - "Docs and templates are now OpsX-first and avoid exposing legacy public entrypoints."
requirements-completed:
  - NAME-03
  - NAME-04
duration: 7m
completed: 2026-04-27
---

# Phase 01 Plan 05: OpsX Naming and CLI Surface Summary

**将 README、docs 与项目模板统一为 OpsX 公共命名面，移除 legacy public tokens，并把 lineage 文案收敛到两个 README 文件。**

## Performance

- **Duration:** 7m
- **Started:** 2026-04-26T19:57:00Z
- **Completed:** 2026-04-26T20:03:49Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- README 与 README-zh 改为 `OpsX`/`opsx`/`@xenonbyte/opsx` 主叙事，并列出 Phase 1 公开命令面。
- `docs/*.md` 全部改为 OpsX-first，移除 `/openspec`、`$openspec`、`/prompts:openspec`、`skills/openspec`、`@xenonbyte/openspec` 与 `~/.openspec` 等旧公开 token。
- `templates/project/*.tmpl` 迁移为 OpsX-only 指引，路径与入口更新到 `.opsx/*` 和 `$opsx <request>`。

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite README and docs to the OpsX public surface** - `b2229ce` (docs)
2. **Task 2: Rewrite shipped project templates to OpsX-only guidance** - `35166fe` (docs)

## Files Created/Modified

- `README.md` - 公共安装/命令面改为 OpsX，并保留唯一 lineage 句。
- `README-zh.md` - 中文公共文档改为 OpsX，并保留唯一 lineage 句。
- `docs/commands.md` - 命令参考改为 `/opsx-*`、`$opsx-*` 与 `opsx` CLI 主命令。
- `docs/codex.md` - Codex 入口改为 `$opsx <request>` 与 `$opsx-*` action routes。
- `docs/customization.md` - 配置与元数据路径改为 `.opsx/*` 与 `~/.opsx/*` 指引。
- `docs/runtime-guidance.md` - 运行时说明中的 skill/CLI 示例更新为 OpsX 命名。
- `docs/supported-tools.md` - 三平台入口统一到 OpsX 路由约定。
- `templates/project/config.yaml.tmpl` - 模板上下文与规则描述切换到 OpsX。
- `templates/project/rule-file.md.tmpl` - 项目 hand-off 指南切换到 OpsX 与 `.opsx` 路径。

## Decisions Made

- 仅在两个 README 文件保留允许的 lineage 句，其他 docs/templates 不再出现 legacy public tokens。
- 将 `opsx check/doc/language` 作为主语法写入文档，同时把 `--check/--doc/--language` 限制为次要兼容别名。

## Verification

- `rg -n "@xenonbyte/opsx|OpsX|opsx (install|uninstall|check|doc|language|migrate|status)" README.md README-zh.md docs` ✅
- `! rg -n "OpenSpec|openspec|\\.openspec|\\$openspec|/openspec|/prompts:openspec|skills/openspec|@xenonbyte/openspec|~/.openspec" docs` ✅
- `rg -n "OpsX|@xenonbyte/opsx|opsx " templates/project` ✅
- `! rg -n "OpenSpec|openspec|\\.openspec|\\$openspec|/openspec|/prompts:openspec|skills/openspec|@xenonbyte/openspec|~/.openspec" templates/project` ✅
- Plan-level verification (`docs + templates/project` negative gate) ✅

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `git commit` 在默认沙箱下触发 `.git/index.lock` 权限错误；使用提权重试后完成 Task 2 提交，未影响代码产物。

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 01-05 已完成 README/docs/templates 的 OpsX 命名面收敛，可继续执行 01-06 的 release metadata 与最终 allowlist gate。
- 当前工作区仅保留用户要求不触碰的未跟踪文件 `openspec/changes/.DS_Store`，未被修改。

---
*Phase: 01-opsx-naming-and-cli-surface*
*Completed: 2026-04-27*

## Self-Check: PASSED

- FOUND: `.planning/phases/01-opsx-naming-and-cli-surface/01-opsx-naming-and-cli-surface-05-SUMMARY.md`
- FOUND: `b2229ce`
- FOUND: `35166fe`
