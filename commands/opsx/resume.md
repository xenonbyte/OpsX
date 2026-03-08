---
description: Resume a previous change - list active changes and pick up where you left off
---

# OPSX: Resume

## Language Preference
Before responding, read `~/.openspec/.opsx-config.yaml`.
- If `language: zh` → respond in Chinese (简体中文)
- If `language: en` or missing → respond in English
- Technical terms (proposal, specs, file paths) remain in English

---

Resume working on a previous change. Lists all active (unarchived) changes with their progress, lets you pick one, then loads context and continues.

**Input**: Optionally specify a change name after `/opsx:resume` (e.g., `/opsx:resume add-auth`). If omitted, shows a selection list.

**Steps**

1. **List all active changes**

   List directories under `openspec/changes/` (excluding `archive/`).

   If no active changes exist:
   ```
   没有活跃的变更。使用 /opsx:propose 或 /opsx:new 开始一个新变更。
   ```
   Stop here.

   If only one active change exists, auto-select it (skip step 2).

2. **Show selection with progress summary**

   For each active change, quickly assess its state:
   - Read `.openspec.yaml` if exists (for name, schema, createdAt)
   - Check which artifact files exist: `proposal.md`, `specs/*/spec.md`, `design.md`, `tasks.md`
   - If `tasks.md` exists, count `- [x]` vs `- [ ]` checkboxes
   - Determine phase: "规划中" / "待实施" / "实施中 (X/Y)" / "待验证"

   Ask the user directly to select one:

   Example display:
   ```
   选择要恢复的变更：

   1. add-dark-mode
      阶段: 实施中 (5/12 任务完成)
      创建: 2026-02-25

   2. fix-login-bug
      阶段: 规划中 (proposal 已完成)
      创建: 2026-02-26

   3. redesign-home
      阶段: 待实施 (所有规划完成)
      创建: 2026-02-27
   ```

3. **Load context for selected change**

   Read all existing artifact files in the change directory:
   - `.openspec.yaml`
   - `proposal.md` (if exists)
   - `specs/*/spec.md` (if exists)
   - `design.md` (if exists)
   - `tasks.md` (if exists)

4. **Show status and suggest next action**

   Display a brief summary of what's been done and what's next:

   ```
   ## 恢复变更: <change-name>

   路径: openspec/changes/<change-name>/

   工件状态:
   ✓ proposal (done)
   ✓ specs (done) — 2 capabilities
   ○ design (ready)
   ○ tasks (blocked)

   上次进度:
   - proposal 已完成：[1-2 sentence summary from proposal]
   - specs 定义了 N 个需求

   建议下一步:
   - /opsx:continue — 创建 design
   - /opsx:ff — 一次完成剩余规划
   ```

   **Phase-specific suggestions**:

   | 状态 | 建议 |
   |------|------|
   | 仅有目录，无工件 | `/opsx:continue` 从 proposal 开始 |
   | proposal 已完成 | `/opsx:continue` 创建 specs |
   | 规划部分完成 | `/opsx:continue` 或 `/opsx:ff` 补全 |
   | 所有规划完成 | `/opsx:apply` 开始实施 |
   | 实施进行中 | `/opsx:apply` 继续实施 |
   | 所有任务完成 | `/opsx:verify` 验证，然后 `/opsx:archive` |

5. **Wait for user instruction**

   Don't automatically start executing. Show the context and wait for the user to tell you what to do next. They might:
   - Say "继续" → execute the suggested next step
   - Use a specific command like `/opsx:apply`
   - Ask questions about the change
   - Want to modify existing artifacts

**Guardrails**
- Always list ALL active changes, don't filter
- Show enough context for user to identify which change they want
- Read artifacts to provide meaningful summary, not just file existence
- If proposal.md exists, extract a 1-sentence summary to help user recall
- Don't auto-execute next steps — this is a "restore context" command, not an action command
- If change directory has no `.openspec.yaml`, still show it but note it's missing metadata
