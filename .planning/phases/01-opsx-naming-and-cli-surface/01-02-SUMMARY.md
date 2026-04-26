---
phase: 01-opsx-naming-and-cli-surface
plan: "02"
subsystem: cli
tags: [opsx, skills, install, naming]
requires:
  - phase: 01-opsx-naming-and-cli-surface
    provides: Plan 01-01 established opsx package and CLI identity.
provides:
  - "OpsX-only distributed skill entry bundle under skills/opsx"
  - "Install/check/doc plumbing resolved to skills/opsx paths"
affects: [01-03, 01-04, NAME-03]
tech-stack:
  added: []
  patterns:
    - "Install/check/doc reads bundled skill content from a single skills/opsx source."
key-files:
  created:
    - skills/opsx/GUIDE-en.md
    - skills/opsx/GUIDE-zh.md
  modified:
    - skills/opsx/SKILL.md
    - skills/opsx/references/action-playbooks.md
    - skills/opsx/references/action-playbooks-zh.md
    - skills/opsx/references/artifact-templates.md
    - skills/opsx/references/artifact-templates-zh.md
    - lib/config.js
    - lib/install.js
key-decisions:
  - "Removed shipped skills/openspec entry files instead of keeping dual public identities."
  - "Kept deferred .openspec shared-home and openspec/config.yaml semantics unchanged while repointing only skill bundle paths."
patterns-established:
  - "Repo skill lookup, installed guide lookup, and copied skill assets now consistently target skills/opsx."
requirements-completed:
  - NAME-03
duration: 13m
completed: 2026-04-27
---

# Phase 01 Plan 02: OpsX Skill Bundle and Install Plumbing Summary

**将分发技能入口统一迁移到 `skills/opsx`，并把 install/check/doc 的技能路径解析改为 `skills/opsx`。**

## Performance

- **Duration:** 13m
- **Started:** 2026-04-26T19:17:20Z
- **Completed:** 2026-04-26T19:30:11Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments

- 将 shipped skill bundle 从 `skills/openspec/**` 迁移为 `skills/opsx/**`，并删除旧入口文件。
- 将 `skills/opsx` 内对外指引统一为 OpsX-only public entrypoints（`opsx`、`$opsx`、`/opsx-*`）。
- 将 `lib/config.js` / `lib/install.js` 的技能源路径、安装路径、文档读取路径及安装检查标题统一改到 OpsX 身份。

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite the distributed skill bundle as `skills/opsx` only** - `1c29d4f` (feat)
2. **Task 2: Repoint repo skill lookup and install/check/doc plumbing to `skills/opsx`** - `44d98b3` (feat)

## Files Created/Modified

- `skills/opsx/SKILL.md` - 将 skill frontmatter 和工作流入口改为 `opsx`、`$opsx`、`/opsx-*`。
- `skills/opsx/GUIDE-en.md` - 英文安装与命令面文案切换为 OpsX-only。
- `skills/opsx/GUIDE-zh.md` - 中文安装与命令面文案切换为 OpsX-only。
- `skills/opsx/references/action-playbooks.md` - playbook 路径 token 切换到 `.opsx`/`change.yaml`。
- `skills/opsx/references/action-playbooks-zh.md` - 中文 playbook 路径 token 切换到 `.opsx`/`change.yaml`。
- `skills/opsx/references/artifact-templates.md` - 模板配置路径更新为 `.opsx/config.yaml`。
- `skills/opsx/references/artifact-templates-zh.md` - 中文模板配置路径更新为 `.opsx/config.yaml`。
- `lib/config.js` - `getRepoSkillDir()` 改为返回 `skills/opsx`，global config 注释改为 OpsX。
- `lib/install.js` - install/check/doc 的 skill path 与标题统一指向 OpsX 身份。

## Decisions Made

- 采用单一分发身份：移除 `skills/openspec` 的 shipped entry 文件，避免双命名并存。
- 遵守 D-13 deferred 边界：本计划仅改 skill bundle 与 install/check/doc 路径，不提前迁移 `.openspec` shared-home 或 `openspec/config.yaml` 语义。

## Verification

- `rg -n "name: opsx|OpsX|\\$opsx|/opsx-" skills/opsx` ✅
- `! rg -n "OpenSpec|openspec|\\.openspec|\\$openspec|/openspec|/prompts:openspec|skills/openspec|@xenonbyte/openspec|~/.openspec" skills/opsx` ✅
- `test ! -e skills/openspec/SKILL.md` ✅
- `rg -n "skills', 'opsx'|skills/opsx|OpsX Installation Check" lib/config.js lib/install.js` ✅
- `node bin/opsx.js check` ✅（输出包含 `## OpsX Installation Check`，且检查流程不依赖 `skills/openspec`）

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- 首次执行 `git mv` 时遇到 `.git/index.lock` 写权限报错；改为提权重试后完成迁移。

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 01-02 范围内的 `skills/opsx` 与 install/config 路径切换已完成，可继续执行 01-03 的 command generator/assets 收敛。
- 未触碰 `openspec/changes/.DS_Store`，且未修改 01-03 ownership 范围外代码。

---
*Phase: 01-opsx-naming-and-cli-surface*
*Completed: 2026-04-27*

## Self-Check: PASSED

- FOUND: `.planning/phases/01-opsx-naming-and-cli-surface/01-opsx-naming-and-cli-surface-02-SUMMARY.md`
- FOUND: `1c29d4f`
- FOUND: `44d98b3`
