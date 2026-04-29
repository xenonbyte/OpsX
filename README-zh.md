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

| Action | Claude / Gemini | Codex | 作用 | 适用场景 |
| --- | --- | --- | --- | --- |
| onboard | `/opsx-onboard` | `$opsx-onboard` | 引导最小安装/初始化路径，并给出下一步 workflow route。 | 第一次在仓库里使用 OpsX、检查安装状态，或不确定应该先跑哪个 route。 |
| new | `/opsx-new` | `$opsx-new` | 创建空 change scaffold，包含 metadata 与 state 文件。 | 已经知道 change 名称或主题，但想稍后再补 proposal/spec/design/tasks。 |
| propose | `/opsx-propose` | `$opsx-propose` | 创建 change，并一次性起草初始 planning artifacts。 | 已经能描述目标行为，希望 OpsX 直接进入规划。 |
| explore | `/opsx-explore` | `$opsx-explore` | 探索想法、风险、约束和取舍，不直接提交 artifacts。 | 问题还比较模糊，需要先做 discovery，再决定是否创建正式 change。 |
| continue | `/opsx-continue` | `$opsx-continue` | 读取持久化 state，只创建下一个合法 artifact。 | change 已在进行中，需要按依赖顺序推进一步。 |
| ff | `/opsx-ff` | `$opsx-ff` | 按依赖顺序 fast-forward 剩余 planning artifacts。 | scope 足够简单，适合一次性生成剩余规划栈。 |
| status | `/opsx-status` | `$opsx-status` | 展示 workspace、active change、ready 状态、drift 和 blockers。 | 需要只读快照，再决定下一步做什么。 |
| resume | `/opsx-resume` | `$opsx-resume` | 恢复 active changes 上下文，并推荐下一步动作。 | 中断或上下文重置后回来，需要重新定位，但不想改文件。 |
| apply | `/opsx-apply` | `$opsx-apply` | 实现一个顶层 task group，并记录 execution evidence。 | tasks 已 ready，需要受控实现一步并更新 checkpoint state。 |
| verify | `/opsx-verify` | `$opsx-verify` | 按已批准 specs/tasks 检查实现，并输出 PASS/WARN/BLOCK findings。 | 实现已经完成或接近完成，需要在 sync/archive 前过门禁。 |
| sync | `/opsx-sync` | `$opsx-sync` | 将已验证的 change-local specs 合入 canonical `.opsx/specs/`。 | verify 已通过，项目 spec 集需要吸收该 change。 |
| archive | `/opsx-archive` | `$opsx-archive` | 归档已验证且已 sync 的 change directory。 | change 已完成，需要移出 active change set。 |
| batch-apply | `/opsx-batch-apply` | `$opsx-batch-apply` | 对多个 ready changes 做隔离执行，并报告 skipped/blocked 原因。 | 多个 changes 已 ready，需要受控串行执行。 |
| bulk-archive | `/opsx-bulk-archive` | `$opsx-bulk-archive` | 对多个 completed changes 做 precondition checks 后批量归档。 | verify 与 sync 门禁已通过后，需要清理一批已完成工作。 |

只使用表格里的显式 action 路由，避免 dispatcher 或 wildcard 路由形式。

## 能力提升

- 统一 Claude、Codex、Gemini 的安装与卸载：
  `opsx install --platform claude,codex,gemini`。
- 为每个 workflow action 生成显式 agent 命令；Codex 使用 `$opsx-*`，Claude/Gemini 使用 `/opsx-*`。
- Claude/Gemini 命令文件以扁平 `opsx-<action>` 形式安装；Codex 为每个 `$opsx-<action>` 路由安装一个生成的 action skill。
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
- `commands/`: 生成的平台适配命令与 Codex action-skill 源文件
- `skills/opsx/`: 共享 skill contract，会被复制进生成的 action skills
- `.opsx/`: 工作流工作区（在采用 OpsX 的项目中创建）

## 许可证

MIT（保留上游许可链路与归属声明）
