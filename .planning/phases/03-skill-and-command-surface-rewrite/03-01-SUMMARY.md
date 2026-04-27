---
phase: 03-skill-and-command-surface-rewrite
plan: "01"
subsystem: testing
tags: [opsx, command-surface, validation, planning-docs]
requires:
  - phase: 02-opsx-workspace-and-migration
    provides: Canonical `.opsx/` migration/runtime behavior and truthful Phase 2 status/migrate semantics.
provides:
  - "Hard-clean-break wording in milestone planning docs for banned legacy public routes."
  - "Runtime validation helper inventories for banned routes, Codex explicit route set, bundle parity, and fallback-copy matchers."
  - "Narrowed public-surface scan targets so migration/runtime internals are excluded from route-regression failures."
affects: [03-02, 03-11, CMD-01, CMD-02, CMD-04, CMD-05]
tech-stack:
  added: []
  patterns:
    - "Keep hard-clean-break policy in planning docs before generated command rewrites start."
    - "Model bundle parity and fallback-copy expectations as reusable helper inventories in runtime tests."
    - "Restrict legacy-route scans to current public/help/doc/skill/generated surfaces."
key-files:
  created:
    - .planning/phases/03-skill-and-command-surface-rewrite/03-01-SUMMARY.md
  modified:
    - .planning/PROJECT.md
    - .planning/REQUIREMENTS.md
    - .planning/ROADMAP.md
    - scripts/test-workflow-runtime.js
    - scripts/check-phase1-legacy-allowlist.js
key-decisions:
  - "Rewrote NAME-04/CMD-04 and Phase 3 roadmap criteria to encode explicit banned public entrypoints, including standalone `$opsx` and `$opsx <request>`."
  - "Kept migration fixtures/assertions intact while introducing helper inventories and parity hooks, so Wave 0 remains green."
  - "Changed AGENTS handling in legacy scan from file-level allowlist to line-level authoring guidance allowlist."
patterns-established:
  - "Phase 3 tests keep route-ban/fallback expectations as explicit helper inventories before strict enforcement wave."
  - "Public-surface legacy scan now emits line-level failures only for targeted public/help/doc/skill/generated files."
requirements-completed:
  - CMD-01
  - CMD-02
  - CMD-04
  - CMD-05
duration: 7m 4s
completed: 2026-04-27
---

# Phase 03 Plan 01: Skill and Command Surface Rewrite Summary

**Wave 0 先锁定了 hard-clean-break 计划契约，并把 Phase 3 的路由禁用、bundle parity、空状态 fallback 校验库存接入 runtime 回归框架。**

## Performance

- **Duration:** 7m 4s
- **Started:** 2026-04-27T09:31:57Z
- **Completed:** 2026-04-27T09:39:01Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- 更新 `.planning/PROJECT.md`、`.planning/REQUIREMENTS.md`、`.planning/ROADMAP.md`，将旧 OpenSpec 公共入口从“可兼容说明”改为“当前 public/help/doc/skill/generated 明确禁用”。
- 在 `scripts/test-workflow-runtime.js` 新增并接线了 banned-route、Codex route inventory、`buildPlatformBundle()` 与 checked-in 命令文件 parity、`onboard/status/resume` fallback-copy matcher 库存。
- 在 `scripts/check-phase1-legacy-allowlist.js` 将扫描范围收敛到 `README*.md`、`docs/**`、`skills/opsx/**`、`templates/**`、`commands/**`、`scripts/postinstall.js`、`lib/cli.js`、`AGENTS.md`，并改为 AGENTS 行级白名单。

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite milestone planning docs around the hard clean break** - `a3a2bdd` (docs)
2. **Task 2: Establish Phase 3 public-surface validation inventories without weakening migration coverage** - `c84c0cc` (test)

## Files Created/Modified

- `.planning/PROJECT.md` - Out-of-Scope 改为明确禁用 legacy/public 路由面，并限定旧名称为迁移/归档实现细节。
- `.planning/REQUIREMENTS.md` - 重写 `NAME-04` 与 `CMD-04`，补齐完整 banned public entrypoint 列表。
- `.planning/ROADMAP.md` - 收紧 Phase 3 成功标准：Codex 显式 `$opsx-*`、严格 preflight、`status/onboard/resume` 不自动建 active state。
- `scripts/test-workflow-runtime.js` - 增加 Phase 3 helper inventories 与 parity/fallback coverage hooks，并接入现有 runtime suite。
- `scripts/check-phase1-legacy-allowlist.js` - 收窄 `SCAN_TARGETS`，移除 migration/runtime internals 扫描，保留 line-level failure 输出。

## Decisions Made

- 在 Wave 0 先完成 planning contract 收口，避免后续生成文件改写时继续沿用旧 allowlist 语义。
- 将 bundle parity 做成可复用 helper，并在当前波次就接入回归，以便后续 wave 直接启用更严格 gate。
- AGENTS 只对白名单 authoring 行放行，确保后续仍能捕获陈旧路由文案。

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- 本地 `.git/index.lock` 在沙箱下不可写，提交步骤通过提权重试后成功。

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `03-02` 可以直接在已建立的 helper inventories 与 planning contract 上推进 source-of-truth metadata/template 改写。
- `03-11` 的最终 public-surface gate 已具备目标扫描范围，不再把 migration/runtime internals 误判为 public regression。

---
*Phase: 03-skill-and-command-surface-rewrite*
*Completed: 2026-04-27*

## Self-Check: PASSED

- FOUND: `.planning/phases/03-skill-and-command-surface-rewrite/03-01-SUMMARY.md`
- FOUND: `a3a2bdd`
- FOUND: `c84c0cc`
