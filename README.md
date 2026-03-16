# OpenSpec

OpenSpec is an AI-native spec-driven workflow skill with unified command semantics across:
- Claude
- Codex
- Gemini

Use `/openspec` as the entry point and `/opsx:*` for workflow commands.

Command surface by platform:
- Claude/Gemini: `/openspec ...` and `/opsx:*`
- Codex: `/prompts:openspec ...` and `/prompts:opsx-*`

## 🚀 Quick Start

The easiest way to install is using `npx`:

```bash
# Install for Claude
npx @xenonbyte/openspec install --platform claude

# Install for all platforms (Claude, Gemini, Codex)
npx @xenonbyte/openspec install --platform claude,gemini,codex
```

After installation, verify with:

```bash
# Verify installation
openspec --check
```

### Entry Point

OpenSpec commands can be used in your shell (CLI) or directly within your AI agent (AI Commands).

**AI Commands (Claude/Gemini):**
- `/openspec --help`
- `/opsx:onboard`

**AI Commands (Codex):**
- `/prompts:openspec --help`
- `/prompts:opsx-onboard`

## 🏗️ Architecture & Project Structure

This repository contains the source code for both the CLI tool and the AI Skill files. If you are exploring the source code or wish to contribute, here is how the project is organized:

- **`bin/openspec.js`**: The Node.js CLI entry point. It handles meta-commands (like `--check`, `--doc`, `--language`) and delegates to the shell scripts for installation.
- **`install.sh` & `uninstall.sh`**: Core bash scripts that manage the deployment of the skill. They copy the necessary prompt and skill files into the specific platform directories (`~/.claude/`, `~/.codex/`, `~/.gemini/`) and configure the shared `~/.openspec/.opsx-config.yaml`.
- **`commands/`**: Contains platform-specific TOML command definitions.
  - `gemini/opsx/*.toml`: Commands for Gemini CLI.
  - `claude/opsx/*.toml`: Commands for Claude Code.
  - `codex/prompts/opsx-*.toml`: Prompts for Codex.
- **`skills/openspec/`**: The core AI agent skill definition.

## 🛠️ Development & Contribution

To modify the OpenSpec skill or test changes locally:

```bash
# 1. Link the package locally so `openspec` uses your local source
npm link

# 2. Test installation changes safely using dry-run
./install.sh --platform claude --dry-run

# 3. Apply your local changes to your AI agent
openspec install --platform claude
```

## 💻 Command Reference

### Meta Commands

Codex note:
- Replace `/openspec ...` with `/prompts:openspec ...`

| Command | Explanation | Practical Example |
|---|---|---|
| `/openspec --help` | Show the full command reference card. | Use when onboarding a new teammate to the workflow. |
| `/openspec --version` | Show current local skill version and config summary. | Verify that a platform install picked up v1.1.0. |
| `/openspec --language zh` | Switch output language to Chinese. | Use in Chinese-speaking team channels. |
| `/openspec --language en` | Switch output language to English. | Use when writing specs in English for global teams. |
| `/openspec --doc` | Print the embedded practical guide. | Open docs in-session without leaving the terminal. |
| `/openspec <description>` | Shortcut route to propose a change from natural language. | `/openspec add offline cache for dashboard` |

### Workflow Commands

Codex mapping rule:
- `/opsx:<action>` -> `/prompts:opsx-<action>`
- Example: `/opsx:new add-invoice-export` -> `/prompts:opsx-new add-invoice-export`

| Command | Explanation | Practical Example |
|---|---|---|
| `/opsx:explore` | Explore solution ideas before committing to a change. | Compare JWT vs session auth before writing artifacts. |
| `/opsx:new <name>` | Create an empty change container and metadata. | `/opsx:new add-invoice-export` |
| `/opsx:continue [name]` | Generate the next artifact based on current state. | After proposal is done, run continue to create specs. |
| `/opsx:ff [name]` | Fast-forward and generate all planning artifacts at once. | Use for well-understood internal tooling tasks. |
| `/opsx:propose <name or desc>` | Create change + proposal/specs/design/tasks in one go. | `/opsx:propose add-tenant-rate-limit` |
| `/opsx:status [name]` | Show artifact progress and task completion. | Check if a resumed change is ready for apply. |
| `/opsx:resume [name]` | List active changes and restore context. | Start a new chat and continue a half-finished feature. |
| `/opsx:apply [name]` | Implement tasks in order and mark completed items. | Execute tasks for `add-tenant-rate-limit`. |
| `/opsx:verify [name]` | Verify completeness/correctness/coherence before archive. | Confirm scenarios and tests are covered. |
| `/opsx:sync [name]` | Merge delta specs into main `openspec/specs`. | Sync updated auth requirements after implementation. |
| `/opsx:archive [name]` | Archive a completed change with date prefix. | Archive `add-tenant-rate-limit` after verify. |
| `/opsx:batch-apply` | Execute multiple selected changes serially or in parallel. | Push two independent backend tasks in one session. |
| `/opsx:bulk-archive` | Archive multiple completed changes together. | Clean up all done changes at sprint end. |
| `/opsx:onboard` | Guided tutorial through a full OpenSpec cycle. | Train a new engineer on your project workflow. |

## 📋 Practical End-to-End Examples

For Codex, replace each `/opsx:<action>` with `/prompts:opsx-<action>`.

### Example 1: Tech Feature
```bash
/opsx:propose add-biometric-login
/opsx:apply add-biometric-login
/opsx:verify add-biometric-login
/opsx:archive add-biometric-login
```

### Example 2: UX Work
```bash
/opsx:propose redesign-button-states
/opsx:ff redesign-button-states
/opsx:apply redesign-button-states
/opsx:verify redesign-button-states
```

### Example 3: Writing Work
```bash
/opsx:propose improve-api-error-guide
/opsx:continue improve-api-error-guide
/opsx:apply improve-api-error-guide
/opsx:archive improve-api-error-guide
```

## ⚙️ Config

Shared config path:
- `~/.openspec/.opsx-config.yaml`

Example:
```yaml
version: "1.1.0"
platform: "claude"
language: "zh"
ruleFile: "CLAUDE.md"
```

Field meanings:
- `version`: installed skill version
- `platform`: current target platform
- `language`: output language preference
- `ruleFile`: default rule filename for the platform

### Language Routing (Skill References)

`language` controls both response language and which reference files the skill loads by default:
- `language: zh` loads `artifact-templates-zh.md` and `action-playbooks-zh.md`
- `language: en` loads `artifact-templates.md` and `action-playbooks.md`

*Note: Language preference is read at session start. Start a new chat/session after changing `/openspec --language`.*

## 📦 Install / Uninstall

**Install Locally/Manually:**
```bash
./install.sh --platform <claude|codex|gemini> [--dry-run]
```

**Uninstall:**
```bash
./uninstall.sh --platform <claude|codex|gemini> [--dry-run]
```

## ✅ Requirements

- Bash 3.2+ (default on macOS/Linux)
- Git 2.0+
- Perl 5.x (for Codex command transformation)
- Node.js >=14.0.0

## 🧠 Context Management Best Practices

OpenSpec v1.1.0 引入简化上下文管理策略：

### 1. Source of Truth 原则
- **tasks.md 是唯一真相来源**：任务完成状态以 `[x]` 标记为准
- **YAML 只存 cursor 信息**：stage、targetTask、tasksHash（校验用）
- **不要重复记录 completedTasks**：避免同步问题

### 2. Phase Gate 执行规则

| 阶段边界 | 类型 | 行为 |
|---------|------|------|
| proposal → specs | 硬门禁 | 必须等待用户确认 |
| design → tasks | 硬门禁 | 必须等待用户确认 |
| tasks → apply | 硬门禁 | 必须等待用户确认 |
| apply 内部 | 软门禁 | 自主执行，实时勾选进度 |

### 3. Checkpoint 策略（降级兼容）
```yaml
checkpoint:
  lastActive: "2026-03-16T14:20:00Z"
  targetTask: "2.2"
  integrity:
    tasksHash: "m7a8xyz"  # 检测 tasks.md 手动修改
  environment:
    gitRef: "abc1234"     # 可选，git 可用时记录
    isDirty: true
```

- **有 git**：使用 gitRef 作为锚点
- **无 git**：使用 tasksHash + timestamp 降级
- **脏工作区**：isDirty=true，建议用户先 git stash

### 4. 三条金律

1. **文档即记忆**：重要决定立即写入 artifact，不指望 LLM 记住
2. **适时切分**：大 change 拆成小 change，减少上下文压力
3. **善用 status**：修改代码后运行 `/opsx:status` 让 LLM 重新同步理解

## 🔌 Troubleshooting

### Command not found after installation
**Symptom**: `/openspec` or `/opsx:*` commands don't work.
**Solutions**:
1. Verify the platform directory exists:
   ```bash
   ls -la ~/.claude/commands/        # for Claude
   ls -la ~/.codex/prompts/          # for Codex
   ls -la ~/.gemini/commands/        # for Gemini
   ```
2. Check if files were installed: `cat ~/.openspec/manifests/claude.manifest`
3. Re-run installation with `--dry-run` first to verify paths.

### Config file permission denied
**Symptom**: AI reports "permission denied" when reading `~/.openspec/.opsx-config.yaml`.
**Solution**: `chmod 644 ~/.openspec/.opsx-config.yaml`

### Language not switching
**Symptom**: `/openspec --language zh` doesn't change output language.
**Solution**:
1. Verify the config was updated: `cat ~/.openspec/.opsx-config.yaml`
2. **Start a new chat session** — language preference is read at the start of each session.

### Uninstall didn't remove all files
**Symptom**: Some files remain after running `uninstall.sh`.
**Solution**:
1. Manual cleanup:
   ```bash
   rm -rf ~/.openspec ~/.claude/commands/openspec.md ~/.claude/commands/opsx ~/.claude/skills/openspec
   ```
2. For Codex, also clean prompts: `rm -rf ~/.codex/prompts/openspec.md ~/.codex/prompts/opsx-*.md`

## 📄 License

MIT (inherits upstream OpenSpec licensing model)
