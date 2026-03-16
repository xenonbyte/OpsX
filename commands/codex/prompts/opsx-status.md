---
description: Show the current status of a change - what's done, what's ready, what's blocked
---
# OPSX: Status

You are executing the **OPSX Status** command to check the current state of a change.

## Language Preference
Before responding, read `~/.openspec/.opsx-config.yaml`.
- If `language: zh` → respond in Chinese (简体中文)
- If `language: en` or missing → respond in English

## Your Task

1. **Identify the current change**:
   - Use specified change name or find most recent in `openspec/changes/` (excluding `archive/`)
   - If multiple active changes, ask user to choose

2. **Check what exists**:
   - List files in change directory
   - Check for: `.openspec.yaml`, `proposal.md`, `specs/`, `design.md`, `tasks.md`

3. **Determine artifact status**:
   ```
   ✓ proposal (done) — file exists
   ○ specs (ready) — dependencies met, doesn't exist
   ○ design (optional-ready) — create when complexity warrants it
   ○ tasks (blocked) — waiting for specs
   ```

4. **Check task progress** (if tasks.md exists):
   - Parse checkboxes: `- [x]` = done, `- [ ]` = pending
   - Count: total tasks, completed, pending

5. **Read Checkpoint & Integrity**:
   - Check `.openspec.yaml` for `checkpoint` block
   - Report:
     - `stage`: Current phase
     - `targetTask`: Next task ID
     - `gitRef`: Current Git state
     - `isDirty`: Worktree status
     - `tasksHash`: Validation status (compute hash of `tasks.md` and compare if needed)

6. **Display status report with available commands**

## Artifact Status Legend
- ✓ done — artifact exists and complete
- ○ ready — all dependencies met, ready to create
- ○ blocked — waiting for dependencies