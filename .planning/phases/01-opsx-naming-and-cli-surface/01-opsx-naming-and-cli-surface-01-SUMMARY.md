---
phase: 01-opsx-naming-and-cli-surface
plan: "01"
subsystem: cli
tags: [opsx, cli, npm, naming]
requires:
  - phase: 00-planning
    provides: Phase 1 context and execution plans
provides:
  - "@xenonbyte/opsx@3.0.0 package identity and opsx-only bin mapping"
  - "OpsX-branded help/version surface with Phase 1 migrate/status placeholders"
  - "Runtime regression tests for renamed CLI surface and compatibility aliases"
affects: [01-02, 01-03, 01-04, release-metadata]
tech-stack:
  added: []
  patterns:
    - "Public CLI identity constants in lib/constants.js"
    - "Primary subcommands with secondary legacy flag aliases in lib/cli.js"
key-files:
  created:
    - bin/opsx.js
  modified:
    - package.json
    - install.sh
    - uninstall.sh
    - scripts/postinstall.js
    - lib/constants.js
    - lib/cli.js
    - scripts/test-workflow-runtime.js
key-decisions:
  - "Removed bin/openspec.js alias entirely to satisfy D-06 and T-01-01 mitigation."
  - "Implemented migrate/status as explicit Phase 1 placeholders to avoid over-claiming deferred behavior."
patterns-established:
  - "Help text lists opsx command-first UX while retaining --check/--doc/--language as compatibility aliases."
  - "Placeholder commands must reference owning phase numbers (Phase 2 and Phase 4) explicitly."
requirements-completed:
  - NAME-01
  - NAME-02
duration: 5m 4s
completed: 2026-04-27
---

# Phase 01 Plan 01: OpsX Naming and CLI Surface Summary

**将 npm/CLI 公共标识切换到 `@xenonbyte/opsx` + `opsx`，并交付 Phase 1 诚实占位的 `migrate/status` 命令输出**

## Performance

- **Duration:** 5m 4s
- **Started:** 2026-04-26T19:10:08Z
- **Completed:** 2026-04-26T19:15:12Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- 完成包元数据重命名到 `@xenonbyte/opsx@3.0.0`，并移除 `openspec` 二进制发布别名。
- 新增 `bin/opsx.js` 并统一 `install.sh`、`uninstall.sh`、`postinstall` 对外入口为 `opsx`。
- 将 CLI 帮助/版本改为 OpsX 品牌，增加 `check/doc/language` 子命令，以及 Phase 1 的 `migrate/status` 占位行为和对应回归测试。

## Task Commits

Each task was committed atomically:

1. **Task 1: Rename package metadata and published executable wrappers** - `0d1a968` (feat)
2. **Task 2: Rebrand CLI help/version and add truthful Phase 1 `migrate` and `status` commands** - `308596d` (feat)

## Files Created/Modified

- `bin/opsx.js` - 新的公开 CLI wrapper（调用 `runCli(process.argv.slice(2))`）。
- `package.json` - 包名/版本/描述/仓库 URL 与 bin 映射改为 OpsX。
- `install.sh` - 安装入口改为 `node "$SCRIPT_DIR/bin/opsx.js" install "$@"`。
- `uninstall.sh` - 卸载入口改为 `node "$SCRIPT_DIR/bin/opsx.js" uninstall "$@"`。
- `scripts/postinstall.js` - 安装提示改为 OpsX 与 `opsx install --platform ...`。
- `lib/constants.js` - 新增 `PRODUCT_NAME` / `PRODUCT_SHORT_NAME` / `PRODUCT_LONG_NAME` 常量。
- `lib/cli.js` - 重写 help/version/unknown-command 文案；新增 `check/doc/language` 子命令与 `migrate/status` Phase 占位输出。
- `scripts/test-workflow-runtime.js` - 增加 CLI 品牌、主命令/兼容别名、`migrate/status` 占位输出回归用例。

## Decisions Made

- 按 D-06 不保留 `openspec` 发布别名，`package.json` 的 `bin` 仅保留 `opsx`。
- `migrate/status` 在 Phase 1 仅提供诚实占位信息，明确指向 Phase 2/Phase 4，避免误导用户认为后续阶段能力已落地。

## Verification

- `node scripts/test-workflow-runtime.js` ✅（22 tests passed）
- `node bin/opsx.js --version` ✅（输出 `OpsX v3.0.0`）
- `node bin/opsx.js --help` ✅（主命令为 `opsx check|doc|language`，兼容别名保留在 secondary 区域，且无 `openspec/$openspec//prompts:openspec`）
- `node bin/opsx.js migrate` ✅（输出包含 `Phase 2`）
- `node bin/opsx.js status` ✅（输出包含 `Phase 4` 且显示当前版本/Phase 1 占位提示）

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

- `lib/cli.js:65` — `migrate` 输出为 Phase 1 placeholder，按 D-08 明确将真实迁移实现延后到 Phase 2。
- `lib/cli.js:73` — `status` 输出为 Phase 1 placeholder，按 D-08 明确将持久状态报告实现延后到 Phase 4。

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 计划 01-01 的 NAME-01/NAME-02 已完成，后续 01-02/01-03 可在 `opsx` 公共命名面上继续推进技能/生成资产和文档迁移。
- 未发现阻塞下一计划执行的问题。

---
*Phase: 01-opsx-naming-and-cli-surface*
*Completed: 2026-04-27*

## Self-Check: PASSED

- FOUND: `.planning/phases/01-opsx-naming-and-cli-surface/01-opsx-naming-and-cli-surface-01-SUMMARY.md`
- FOUND: `0d1a968`
- FOUND: `308596d`
