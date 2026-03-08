# OpenSpec Skill（多平台版）

OpenSpec 是一套规范驱动（spec-driven）工作流技能，统一支持以下平台：
- Claude
- Codex
- OpenCode
- Gemini
- OpenClaw

入口使用 `/openspec`，工作流命令使用 `/opsx:*`。

## 快速开始

一次只安装到一个平台：

```bash
chmod +x install.sh uninstall.sh
./install.sh --platform claude
```

安装后建议先执行：

```bash
/openspec --help
/openspec --version
/openspec --doc
```

## 平台约束文件映射

- Claude -> `CLAUDE.md`
- Codex -> `AGENTS.md`
- OpenCode -> `AGENTS.md`
- OpenClaw -> `AGENTS.md`
- Gemini -> `GEMINI.md`

使用 `/opsx:rules` 时可通过 `--file <name>` 覆盖默认文件名。

## 命令说明

### 元命令

| 命令 | 说明 | 实战例子 |
|---|---|---|
| `/openspec --help` | 查看完整命令参考卡片。 | 新成员第一次接触工作流时先看命令总览。 |
| `/openspec --version` | 查看本地技能版本和配置摘要。 | 验证平台安装是否已经切换到 v2.0.0。 |
| `/openspec --language zh` | 切换中文输出。 | 团队中文协作时统一输出语言。 |
| `/openspec --language en` | 切换英文输出。 | 面向海外团队写 specs 时切换英文。 |
| `/openspec --doc` | 打开内置实战指南。 | 在终端里直接查看完整使用文档。 |
| `/openspec <描述>` | 用自然语言快速路由到 propose。 | `/openspec 增加仪表盘离线缓存` |

兼容说明：
- v2.0.0 已移除 `/openspec --update`，调用时会静默回落到 help 输出。

### 工作流命令

| 命令 | 说明 | 实战例子 |
|---|---|---|
| `/opsx:explore` | 在立项前先探索问题和方案。 | 在选 JWT 还是 Session 之前先探索。 |
| `/opsx:new <name>` | 创建空变更目录和元数据。 | `/opsx:new add-invoice-export` |
| `/opsx:continue [name]` | 按当前状态生成下一个工件。 | proposal 写完后继续生成 specs。 |
| `/opsx:ff [name]` | 一次性补齐全部规划工件。 | 对边界清晰的内部工具需求直接快进。 |
| `/opsx:propose <name or desc>` | 一步创建变更 + 全部规划工件。 | `/opsx:propose add-tenant-rate-limit` |
| `/opsx:status [name]` | 查看工件与任务进度状态。 | 恢复会话后先确认是否可直接 apply。 |
| `/opsx:resume [name]` | 列出活跃变更并恢复上下文。 | 新会话继续上次做到一半的需求。 |
| `/opsx:apply [name]` | 按任务顺序实施并打勾。 | 执行 `add-tenant-rate-limit` 的 tasks。 |
| `/opsx:verify [name]` | 从完整性/正确性/一致性验证实现。 | 实施后确认场景和测试是否覆盖。 |
| `/opsx:sync [name]` | 将 delta specs 合并回主 specs。 | 完成 auth 改造后同步主规范。 |
| `/opsx:archive [name]` | 将完成变更按日期归档。 | verify 完成后归档该变更。 |
| `/opsx:batch-apply` | 一次执行多个变更（串行或并行）。 | 同时推进两个互不依赖的后端任务。 |
| `/opsx:bulk-archive` | 批量归档多个完成变更。 | 迭代结束后集中清理 changes。 |
| `/opsx:onboard` | 引导式教学，走完整个 OpenSpec 周期。 | 用于新同学上手项目流程。 |

### 约束文档命令

| 命令 | 说明 | 实战例子 |
|---|---|---|
| `/opsx:rules <type> [profile] [--file <name>]` | 按 Base + Type Pack + Project Signals 生成项目约束文档。 | `/opsx:rules tech android` |

#### Type 体系

顶层 `type`：
- `tech`
- `ux`
- `writing`
- `other`

`profile`：
- `tech`: `web | api | fullstack | android | ios | harmony | desktop | general`
- `ux`: `product | design-system | research | general`
- `writing`: `docs | blog | spec | proposal | general`
- `other`: `general`

别名行为：
- `/opsx:rules android` 等价于 `/opsx:rules tech android`。

兼容行为：
- `mobile` 已移除，请改用 `android | ios | harmony`。

## 实战示例（端到端）

### 示例 1：技术需求（Android）

```bash
/opsx:rules tech android
/opsx:propose add-biometric-login
/opsx:apply add-biometric-login
/opsx:verify add-biometric-login
/opsx:archive add-biometric-login
```

### 示例 2：UX 需求（设计系统）

```bash
/opsx:rules ux design-system
/opsx:propose redesign-button-states
/opsx:ff redesign-button-states
/opsx:apply redesign-button-states
/opsx:verify redesign-button-states
```

### 示例 3：写作需求（文档）

```bash
/opsx:rules writing docs --file AGENTS.md
/opsx:propose improve-api-error-guide
/opsx:continue improve-api-error-guide
/opsx:apply improve-api-error-guide
/opsx:archive improve-api-error-guide
```

## 配置文件

共享配置路径：
- `~/.openspec/.opsx-config.yaml`

示例：

```yaml
version: "2.0.0"
platform: "claude"
language: "zh"
ruleFile: "CLAUDE.md"
```

字段说明：
- `version`：已安装技能版本
- `platform`：当前目标平台
- `language`：默认输出语言
- `ruleFile`：该平台默认约束文件名

## 安装与卸载

安装：

```bash
./install.sh --platform <claude|codex|opencode|gemini|openclaw> [--workspace <path>] [--dry-run]
```

卸载：

```bash
./uninstall.sh --platform <claude|codex|opencode|gemini|openclaw> [--dry-run]
```

## 许可证

MIT（继承上游 OpenSpec 许可模型）
