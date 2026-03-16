---
description: Resume a previous change - list active changes and pick up where you left off
---
# OPSX: Resume

Resume work on a previous change by listing active changes, helping user select one, loading context, and suggesting the next action.

## Language Preference
Before responding, read `~/.openspec/.opsx-config.yaml`.
- If `language: zh` → respond in Chinese (简体中文)
- If `language: en` or missing → respond in English

## Steps

1. **List active changes**
   - List directories under `openspec/changes/` (excluding `archive/`)
   - If none exist: "No active changes. Start one with /prompts:opsx-propose or /prompts:opsx-new."

2. **Resolve target change**:
   - If user provided a valid change name, use it
   - If omitted and exactly one active change exists, auto-select it
   - If omitted and multiple active changes exist, ask user to choose

3. **Build progress summary for each candidate**:
   - Read `.openspec.yaml` if present
   - Check artifact presence (`proposal.md`, `specs/*/spec.md`, `design.md`, `tasks.md`)
   - **Source of Truth**: If `tasks.md` exists, parse `[x]` vs `[ ]` to determine ACTUAL progress.
   - **Integrity Check**: Compare computed hash of `tasks.md` with `checkpoint.integrity.tasksHash` in `.openspec.yaml`.
   - If hash mismatch: "检测到任务列表手动变更，正在重新校验进度"

4. **Load selected change context**
   - Read all existing artifacts
   - Sync `stage` and `checkpoint` information from `.openspec.yaml`

5. **Show concise resume report**:
   - Change path
   - Artifact completion state
   - Task progress (based on `tasks.md`)
   - `checkpoint` status (targetTask, gitRef, isDirty)
   - A 1-sentence proposal summary (if proposal exists)
   - Recommended next commands

6. **Wait for explicit user instruction**
   - Do not auto-execute the next command