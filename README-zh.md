# OpsX

OpsX 是一套面向 Claude、Codex、Gemini 的 AI 原生 operational spec execution 工作流。

OpsX 是 [Fission-AI/OpenSpec](https://github.com/Fission-AI/OpenSpec) 的下游改造版本。
它保留轻量 spec-driven workflow 的核心思路，并补上更严格的 OpsX 公共命令面、多 agent 安装流和状态感知执行门禁。

## 快速开始

```bash
npm install -g @xenonbyte/opsx
opsx install --platform claude,codex,gemini
opsx check
```

## CLI 命令面

```bash
opsx install --platform <claude|codex|gemini[,...]>
opsx uninstall --platform <claude|codex|gemini[,...]>
opsx check
opsx doc
opsx language <en|zh>
opsx migrate
opsx status
opsx status --json
opsx --help
opsx --version
```

兼容别名（次要）：
- `opsx --check`
- `opsx --doc`
- `opsx --language <en|zh>`

## Agent 命令

Claude 和 Gemini 使用 `/opsx-<action>`，Codex 使用 `$opsx-<action>`。

| Action | Claude / Gemini | Codex |
| --- | --- | --- |
| onboard | `/opsx-onboard` | `$opsx-onboard` |
| new | `/opsx-new` | `$opsx-new` |
| propose | `/opsx-propose` | `$opsx-propose` |
| explore | `/opsx-explore` | `$opsx-explore` |
| continue | `/opsx-continue` | `$opsx-continue` |
| ff | `/opsx-ff` | `$opsx-ff` |
| status | `/opsx-status` | `$opsx-status` |
| resume | `/opsx-resume` | `$opsx-resume` |
| apply | `/opsx-apply` | `$opsx-apply` |
| verify | `/opsx-verify` | `$opsx-verify` |
| sync | `/opsx-sync` | `$opsx-sync` |
| archive | `/opsx-archive` | `$opsx-archive` |
| batch-apply | `/opsx-batch-apply` | `$opsx-batch-apply` |
| bulk-archive | `/opsx-bulk-archive` | `$opsx-bulk-archive` |

只使用表格里的显式 action 路由，避免 dispatcher 或 wildcard 路由形式。

## 能力提升

- 统一 Claude、Codex、Gemini 的安装与卸载：
  `opsx install --platform claude,codex,gemini`。
- 为每个 workflow action 生成显式 agent 命令；Codex 使用 `$opsx-*`，Claude/Gemini 使用 `/opsx-*`。
- 使用规范的 `.opsx/` 工作区布局管理项目配置、active change state、change artifacts、synced specs 和 archive output。
- `status`、`resume`、`continue`、`apply`、`verify`、`sync`、`archive` 具备状态感知能力，并由 `state.yaml`、`context.md`、`drift.md` 支撑。
- 增加 security-review 与 checkpoint 门禁：
  `spec-split-checkpoint`、`spec checkpoint`、`task checkpoint`、
  `execution checkpoint`、`implementation-consistency-checkpoint`。
- 提供稳定的 `opsx status --json` envelope，方便自动化和工具集成。
- 通过 `opsx migrate` 和 `opsx migrate --dry-run` 支持旧工作区布局迁移。
- 用拆分后的 runtime tests、package-surface checks 和单一 `npm test` preflight 强化发布可靠性。

## 发布前预检

发布前使用一个总入口：

```bash
npm test
```

该命令会通过聚合测试器执行 Phase 8 已拆分的 package、generation、state、paths、gates 覆盖。

## 项目配置

OpsX 的项目级工作流默认配置当前位于 `.opsx/config.yaml`。
先运行 `opsx migrate --dry-run` 查看精确的 `MOVE`/`CREATE` 映射（不会写入文件），再运行 `opsx migrate` 执行同一迁移计划；如果 `.opsx/` 已存在，默认会直接 abort。

优先级：
- change metadata (`.opsx/changes/<name>/change.yaml`)
- project config (`.opsx/config.yaml`)
- global config (`~/.opsx/config.yaml`)
- package defaults

工作区跟踪策略：
- Tracked：`.opsx/config.yaml`、`.opsx/active.yaml`、`.opsx/changes/**`、`.opsx/specs/**`、`.opsx/archive/**`
- Ignored：`.opsx/cache/**`、`.opsx/tmp/**`、`.opsx/logs/**`

## 工作流检查点

- `security-review` 位于 `design` 与 `tasks` 之间
- `spec-split-checkpoint` 在 `specs` 之后、`design` 之前
- `spec checkpoint` 在 `design` 之后、`tasks` 之前
- `task checkpoint` 在 `tasks` 之后、`apply` 之前
- `execution checkpoint` 在 `apply` 中每个顶层任务组完成后执行
- `implementation-consistency-checkpoint` 在实现完成后、verify acceptance 之前执行
- Security-review 状态：`required`、`recommended`、`waived`、`completed`
- Checkpoint 状态：`PASS`、`WARN`、`BLOCK`

change-local specs 表示每个 capability 的完整目标 spec。`sync` 会把这些完整 spec 写入 `.opsx/specs/`，不要把它们当作 delta-only patch。

## 文档

- [自定义配置](docs/customization.md)
- [Agent harness map](docs/agent-harness.md)

## 仓库结构

- `lib/`: 运行时模块（config、workflow、install、CLI、runtime-guidance）
- `schemas/`: 工作流 schema 定义
- `templates/`: 命令与项目模板
- `commands/`: 生成的平台适配命令
- `skills/opsx/`: 分发的技能包
- `.opsx/`: 工作流工作区（在采用 OpsX 的项目中创建）

## 许可证

MIT（保留上游许可链路与归属声明）
