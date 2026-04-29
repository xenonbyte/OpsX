# OpsX

OpsX 是一套面向 Claude、Codex、Gemini 的 AI 原生 operational spec execution 工作流。

## 快速开始

```bash
npm install -g @xenonbyte/opsx
opsx install --platform claude,codex,gemini
opsx check
```

当前版本：`3.0.0`

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

## Codex 使用

使用显式 action 路由：
```text
$opsx-onboard
$opsx-propose
$opsx-status
$opsx-apply
```

其余工作流命令也遵循同一显式模式（例如：
`$opsx-explore`、`$opsx-continue`、`$opsx-verify`、`$opsx-archive`）。
仅使用上方展示的显式 action 路由；避免 dispatcher 或 wildcard 路由形式。

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
- `spec checkpoint` 在 `tasks` 前
- `task checkpoint` 在 `apply` 前
- `execution checkpoint` 在 `apply` 中每个顶层任务组完成后执行
- Security-review 状态：`required`、`recommended`、`waived`、`completed`
- Checkpoint 状态：`PASS`、`WARN`、`BLOCK`

## 文档

- [命令参考](docs/commands.md)
- [Codex 使用指南](docs/codex.md)
- [自定义配置](docs/customization.md)
- [Runtime Guidance 内核](docs/runtime-guidance.md)
- [平台支持](docs/supported-tools.md)

## 仓库结构

- `lib/`: 运行时模块（config、workflow、install、CLI、runtime-guidance）
- `schemas/`: 工作流 schema 定义
- `templates/`: 命令与项目模板
- `commands/`: 生成的平台适配命令
- `skills/opsx/`: 分发的技能包
- `.opsx/`: 工作流工作区（在采用 OpsX 的项目中创建）

## 许可证

MIT（保留上游许可链路与归属声明）
