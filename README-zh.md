# OpsX

OpsX 是一套面向 Claude、Codex、Gemini 的 AI 原生 operational spec execution 工作流。

OpsX was originally adapted from Fission-AI/OpenSpec.

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
opsx --help
opsx --version
```

兼容别名（次要）：
- `opsx --check`
- `opsx --doc`
- `opsx --language <en|zh>`

## Codex 使用

推荐入口：
```text
$opsx <request>
```

显式 action 路由：
```text
$opsx-propose
$opsx-apply
$opsx-status
```

## 项目配置

OpsX 的目标项目级工作流默认配置位于 `.opsx/config.yaml`。
Phase 1 先统一公开包名、CLI、skill 和命令入口；工作目录迁移由 Phase 2 的 `opsx migrate` 完成。

优先级：
- change metadata
- project config
- global config
- package defaults

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
