# OpenSpec

OpenSpec 是一套 AI 原生的规范驱动（spec-driven）工作流技能，统一支持以下平台：
- Claude
- Codex
- Gemini

入口使用 `/openspec`，工作流命令使用 `/opsx:*`。

不同平台的调用入口：
- Claude/Gemini：`/openspec ...` 与 `/opsx:*`
- Codex：`/prompts:openspec ...` 与 `/prompts:opsx-*`

## 🚀 快速开始

推荐使用 `npx` 进行安装：

```bash
# 为 Claude 安装
npx @xenonbyte/openspec install --platform claude

# 为 Gemini 安装
npx @xenonbyte/openspec install --platform gemini

# 为 Codex 安装
npx @xenonbyte/openspec install --platform codex
```

安装完成后，可以通过以下方式验证：

```bash
# 验证安装
openspec --check

# 查看实战指南
openspec --doc
```

### 命令入口

OpenSpec 命令可以在你的终端（CLI）或 AI 助手（AI 命令）中直接运行。

**AI 命令 (Claude/Gemini):**
- `/openspec --help`
- `/opsx:onboard`

**AI 命令 (Codex):**
- `/prompts:openspec --help`
- `/prompts:opsx-onboard`

## 🏗️ 架构与项目结构

本仓库包含了 CLI 工具和 AI 技能配置的源代码。如果您希望阅读源码或参与贡献，以下是项目的目录结构：

- **`bin/openspec.js`**: Node.js CLI 的入口文件。它处理所有元命令（例如 `--check`, `--doc`, `--language`）并调用 Shell 脚本进行安装卸载操作。
- **`install.sh` & `uninstall.sh`**: 核心安装脚本。负责将工作流 Prompt 和技能配置复制到指定的 AI 平台目录中（如 `~/.claude/`, `~/.codex/`, `~/.gemini/`），并初始化配置文件 `~/.openspec/.opsx-config.yaml`。
- **`skills/openspec-workflow/`**: AI 技能定义的核心内容。
  - `SKILL.md`: 定义了技能的主系统提示词（System Prompt），指导 AI 如何理解和执行 OpenSpec 工作流。
  - `GUIDE-*.md`: 当用户运行 `openspec --doc` 时展示的实战指南文件。
  - `references/`: 存放按需加载的参考模板与操作剧本（Action Playbooks）。
- **`commands/opsx/`**: 存放了各工作流命令（如 `apply.md`, `propose.md`）的具体 Markdown 提示词。当触发 `/opsx:*` 时，AI 将读取对应的指令细节。

## 🛠️ 本地开发与贡献

如何本地测试并修改 OpenSpec：

```bash
# 1. 建立本地链接，使得执行 openspec 时使用当前代码
npm link

# 2. 安全地测试安装脚本（干跑模式）
./install.sh --platform claude --dry-run

# 3. 将本地修改应用到 AI 工作区
openspec install --platform claude
```

## 💻 命令说明

### 元命令

Codex 说明：
- 把 `/openspec ...` 替换为 `/prompts:openspec ...`

| 命令 | 说明 | 实战例子 |
|---|---|---|
| `/openspec --help` | 查看完整命令参考卡片。 | 新成员第一次接触工作流时先看命令总览。 |
| `/openspec --version` | 查看本地技能版本和配置摘要。 | 验证平台安装是否已经切换到 v1.0.0。 |
| `/openspec --language zh` | 切换中文输出。 | 团队中文协作时统一输出语言。 |
| `/openspec --language en` | 切换英文输出。 | 面向海外团队写 specs 时切换英文。 |
| `/openspec --doc` | 打开内置实战指南。 | 在终端里直接查看完整使用文档。 |
| `/openspec <描述>` | 用自然语言快速路由到 propose。 | `/openspec 增加仪表盘离线缓存` |

### 工作流命令

Codex 映射规则：
- `/opsx:<action>` -> `/prompts:opsx-<action>`
- 例：`/opsx:new add-invoice-export` -> `/prompts:opsx-new add-invoice-export`

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

## 📋 实战示例（端到端）

在 Codex 中，把示例里的 `/opsx:<action>` 替换为 `/prompts:opsx-<action>`。

### 示例 1：技术需求

```bash
/opsx:propose add-biometric-login
/opsx:apply add-biometric-login
/opsx:verify add-biometric-login
/opsx:archive add-biometric-login
```

### 示例 2：UX 需求

```bash
/opsx:propose redesign-button-states
/opsx:ff redesign-button-states
/opsx:apply redesign-button-states
/opsx:verify redesign-button-states
```

### 示例 3：写作需求

```bash
/opsx:propose improve-api-error-guide
/opsx:continue improve-api-error-guide
/opsx:apply improve-api-error-guide
/opsx:archive improve-api-error-guide
```

## ⚙️ 配置文件

共享配置路径：
- `~/.openspec/.opsx-config.yaml`

示例：

```yaml
version: "1.0.0"
platform: "claude"
language: "zh"
ruleFile: "CLAUDE.md"
```

字段说明：
- `version`：已安装技能版本
- `platform`：当前目标平台
- `language`：默认输出语言
- `ruleFile`：该平台默认约束文件名

### 语言路由（Skill References）

`language` 不仅影响回复语言，也会决定 skill 默认加载哪组 reference 文件：
- `language: zh` 会加载 `artifact-templates-zh.md` 与 `action-playbooks-zh.md`
- `language: en`（或缺省）会加载 `artifact-templates.md` 与 `action-playbooks.md`

*说明：语言偏好在会话启动时读取。执行 `/openspec --language` 后，请开启新会话再验证。*

## 📦 安装与卸载

**本地 / 手动安装：**
```bash
./install.sh --platform <claude|codex|gemini> [--workspace <path>] [--dry-run]
```

**卸载：**
```bash
./uninstall.sh --platform <claude|codex|gemini> [--dry-run]
```

## ✅ 环境要求

- Bash 3.2+（macOS/Linux 默认已安装）
- Git 2.0+
- Perl 5.x（用于 Codex 命令转换）
- Node.js >=14.0.0

## 🔌 故障排除

### 安装后命令找不到

**症状**：`/openspec` 或 `/opsx:*` 命令无响应。
**解决方案**：
1. 检查平台目录是否存在：
   ```bash
   ls -la ~/.claude/commands/        # Claude
   ls -la ~/.codex/prompts/          # Codex
   ls -la ~/.gemini/commands/        # Gemini
   ```
2. 检查安装清单：`cat ~/.openspec/manifests/claude.manifest`
3. 先用 `--dry-run` 测试安装路径是否正确。

### 配置文件权限错误

**症状**：AI 报告读取 `~/.openspec/.opsx-config.yaml` 时"权限被拒绝"。
**解决方案**：`chmod 644 ~/.openspec/.opsx-config.yaml`

### 语言切换不生效

**症状**：执行 `/openspec --language zh` 后输出语言未变化。
**解决方案**：
1. 确认配置已更新：`cat ~/.openspec/.opsx-config.yaml`
2. **开启新的对话会话** — 语言偏好在每个会话开始时读取。

### 卸载后文件未清理干净

**症状**：运行 `uninstall.sh` 后仍有残留文件。
**解决方案**：
1. 手动清理：
   ```bash
   rm -rf ~/.openspec ~/.claude/commands/openspec.md ~/.claude/commands/opsx ~/.claude/skills/openspec-workflow
   ```
2. Codex 还需清理 prompts：`rm -rf ~/.codex/prompts/openspec.md ~/.codex/prompts/opsx-*.md`

## 📄 许可证

MIT（继承上游 OpenSpec 许可模型）
