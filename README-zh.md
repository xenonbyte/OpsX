# OpenSpec

OpenSpec 是一套面向 Claude、Codex、Gemini 的 AI 原生 spec-driven 工作流系统。

当前包以 Node CLI 交付，提供：
- 项目级 `openspec/config.yaml` 覆盖
- 默认安装完整命令面（不再区分 `core/expanded` profile）
- schema 驱动的工作流元数据
- 多平台命令适配生成
- 纯 Node 的安装/卸载/检查/文档/语言切换
- 内置 `security-review` 门禁与 checkpoint
- 供状态/指令集成使用的 runtime guidance 内核

## 快速开始

```bash
npm install -g @xenonbyte/openspec
openspec install --platform claude,codex,gemini
$openspec help me start an OpenSpec workflow
```

当前版本：`2.0.1`

本次版本重点：
- advisory `security-review` 在 runtime、workflow、summary API 中统一为“可见但不抢占下一步”
- runtime guidance 会保留调用方传入的 preview sources，除非磁盘工件已有有效内容
- 仅含空白的 planning 文件不再覆盖内存中的 preview 文本
- apply 预览现在会正确归一化数组形式的 `tasks` source
- apply readiness 继续以磁盘工件完成状态为准，未保存的 planning preview 不能绕过必需工件

## Codex 使用

推荐入口：
```text
$openspec create an OpenSpec change for add-dark-mode
```

显式路由：
```text
/prompts:openspec
/prompts:opsx-propose
```

若 `/prompts:*` 路由后仍缺少变更名或描述，在下一条消息补充即可。

## 项目配置

`openspec/config.yaml` 控制：
- `schema`
- `language`
- `context`
- `rules`
- `securityReview`

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

## CLI 命令

```bash
openspec install --platform claude,codex,gemini
openspec uninstall --platform codex
openspec --check
openspec --doc
openspec --language zh
openspec --help
openspec --version
```

行为说明：
- `install` / `uninstall` 的 `--platform` 支持逗号分隔多平台。
- `--check` 会扫描 `~/.openspec/manifests/*.manifest`，并将配置中的 `platform` 标注为“最后一次选择的平台”。
- `--doc` 优先读取包内 `skills/openspec/GUIDE-*.md`，若不存在再回退到共享安装目录中的 guide。

## Agent 路由

- Claude / Gemini：`/openspec`、`/opsx:*`
- Codex（推荐）：`$openspec <request>`
- Codex（显式）：`/prompts:openspec`、`/prompts:opsx-*`

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
- `skills/openspec/`: 分发的技能包
- `openspec/`: 本仓库 dogfooding 的 OpenSpec 工作区

## 许可证

MIT（保留上游许可链路与归属声明）
