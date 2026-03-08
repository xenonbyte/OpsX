---
description: Select and execute multiple changes - choose serial or parallel execution mode
---

# OPSX: Batch Apply

## Language Preference
Before responding, read `~/.openspec/.opsx-config.yaml`.
- If `language: zh` → respond in Chinese (简体中文)
- If `language: en` or missing → respond in English
- Technical terms (proposal, specs, file paths) remain in English

---

Select multiple active changes and execute their tasks, with the option to run them serially (one change at a time) or in parallel (interleaved).

**Input**: None required (prompts for selection)

**Steps**

1. **List implementable changes**

   List directories under `openspec/changes/` (excluding `archive/`).
   For each change, check:
   - Does `tasks.md` exist? (required for implementation)
   - How many tasks are complete vs pending?
   - Are all planning artifacts done?

   Filter to only show changes that have `tasks.md` with at least one pending task (`- [ ]`).

   If no implementable changes exist:
   ```
   没有可执行的变更。请先使用 /opsx:propose 或 /opsx:ff 创建规划文档。
   ```
   Stop here.

2. **Show selection with status**

   Ask the user directly to choose changes (allow multiple selections):

   Example:
   ```
   选择要执行的变更（可多选）：

   1. add-dark-mode
      任务: 0/8 完成
      规划: proposal ✓ | specs ✓ | design ✓ | tasks ✓

   2. fix-login-bug
      任务: 2/5 完成
      规划: proposal ✓ | specs ✓ | tasks ✓

   3. add-export-api
      任务: 0/12 完成
      规划: proposal ✓ | specs ✓ | design ✓ | tasks ✓
   ```

   **IMPORTANT**: Do NOT auto-select. Always let the user choose.

3. **Choose execution mode**

   Ask the user directly to choose execution mode:

   ```
   选择执行方式：

   1. 串行执行（推荐）
      按顺序逐个完成每个变更的所有任务，完成一个再开始下一个。
      适合：变更之间有依赖关系，或希望专注完成。

   2. 并行执行
      轮流推进每个变更，每个变更执行一批任务后切换到下一个。
      适合：变更相互独立，想同步推进。

   3. 仅规划（不执行）
      只显示所有选中变更的任务汇总，不执行任何代码修改。
      适合：先了解工作量再决定。
   ```

4. **If "仅规划" selected — show summary and stop**

   Display a consolidated view of all selected changes and their tasks:

   ```
   ## 批量任务汇总

   ### 1. add-dark-mode (8 tasks)
   ## 1. Setup
   - [ ] 1.1 Create theme context
   - [ ] 1.2 Add toggle component
   ## 2. Implementation
   - [ ] 2.1 Implement CSS variables
   ...

   ### 2. fix-login-bug (3 remaining tasks)
   - [ ] 2.1 Fix validation logic
   - [ ] 2.2 Add error message
   - [ ] 2.3 Update tests

   ---
   总计: 2 个变更, 11 个待完成任务

   准备好后运行 /opsx:batch-apply 开始执行。
   ```

   Stop here.

5. **If "串行执行" selected — execute sequentially**

   For each selected change, in order:

   a. **Announce current change**:
      ```
      ═══════════════════════════════════════
      开始执行: add-dark-mode (1/3)
      ═══════════════════════════════════════
      ```

   b. **Load context**: Read all artifacts (proposal, specs, design, tasks)

   c. **Execute all pending tasks**: Same behavior as `/opsx:apply`
      - Work through tasks in order
      - Mark each complete: `- [ ]` → `- [x]`
      - Show progress

   d. **Show change completion**:
      ```
      ✓ add-dark-mode 完成 (8/8 tasks)
      ───────────────────────────────────────
      ```

   e. **Move to next change**

   f. After all changes complete, show batch summary (step 7)

6. **If "并行执行" selected — execute interleaved**

   Use a round-robin approach:

   a. **Determine batch size**: Each change gets a "batch" of tasks per round.
      - Default: 1 task group (## heading) per round per change
      - If a change has very few tasks, execute all in one batch

   b. **Round-robin execution**:

      ```
      ═══════════════════════════════════════
      轮次 1
      ═══════════════════════════════════════

      【add-dark-mode】执行任务组 "1. Setup"
      ✓ 1.1 Create theme context
      ✓ 1.2 Add toggle component

      【fix-login-bug】执行任务组 "1. Investigation"
      ✓ 1.1 Reproduce the bug
      ✓ 1.2 Identify root cause

      ═══════════════════════════════════════
      轮次 1 完成: add-dark-mode 2/8 | fix-login-bug 2/5
      ═══════════════════════════════════════

      轮次 2
      ...
      ```

   c. **Continue until all changes complete**

   d. If a change finishes before others, skip it in subsequent rounds

   e. After all changes complete, show batch summary (step 7)

7. **Show batch summary**

   ```
   ## 批量执行完成

   | 变更 | 任务 | 状态 |
   |------|------|------|
   | add-dark-mode | 8/8 | ✓ 完成 |
   | fix-login-bug | 5/5 | ✓ 完成 |
   | add-export-api | 12/12 | ✓ 完成 |

   总计: 3 个变更, 25 个任务全部完成

   建议下一步:
   - /opsx:verify <name> — 逐个验证实施结果
   - /opsx:bulk-archive — 批量归档已完成的变更
   ```

**Execution Guidelines**

- **Context switching**: When switching between changes (parallel mode), briefly re-read the target change's artifacts to restore context
- **Error handling**: If a task fails or needs clarification, pause that change and move to the next (parallel) or ask the user (serial)
- **Progress persistence**: Always update tasks.md immediately after completing each task — if the session ends, progress is saved
- **User control**: After each change (serial) or each round (parallel), check if user wants to continue, pause, or switch mode

**Pause and Resume**

If user says "暂停" or "stop" during execution:

```
已暂停批量执行。

当前进度:
| 变更 | 进度 |
|------|------|
| add-dark-mode | 5/8 ✓ |
| fix-login-bug | 2/5 ✓ |
| add-export-api | 未开始 |

所有进度已保存到各自的 tasks.md。
运行 /opsx:batch-apply 可以继续执行剩余任务。
```

**Guardrails**
- Always show selection, never auto-execute
- Let user choose execution mode — don't assume
- Update tasks.md after each task completion (crash-safe)
- Show clear progress between changes and rounds
- Handle graceful pause at any point
- If only one change selected, behave like regular `/opsx:apply`
- Re-read artifacts when switching context in parallel mode
- Show consolidated summary at the end
