---
description: Archive a completed change - move to archive directory and update main specs if needed
---

# OPSX: Archive

## Language Preference
Before responding, read `~/.openspec/.opsx-config.yaml`.
- If `language: zh` → respond in Chinese (简体中文)
- If `language: en` or missing → respond in English
- Technical terms (proposal, specs, file paths) remain in English

---

You are executing the **OPSX Archive** command to archive a completed change.

## Your Task

1. **Verify completion**:
   - Check if all tasks are marked complete (`- [x]`)
   - If not, ask user: "Some tasks are incomplete. Archive anyway?"
   - Get confirmation before proceeding

2. **Check for delta specs**:
   - Look in `specs/` for MODIFIED or REMOVED requirements
   - If found, ask user: "Should specs be synced to main? (You can also use `/opsx:sync` separately)"

3. **Handle spec sync** (if user says yes):
   - Read delta specs from change directory
   - Read main specs from `openspec/specs/`
   - Apply changes:
     - **ADDED**: Add new requirement blocks
     - **MODIFIED**: Replace existing requirement blocks
     - **REMOVED**: Remove requirement blocks
   - Update main spec files

4. **Create archive directory**:
   ```bash
   mkdir -p "openspec/changes/archive"
   ```

5. **Move change to archive**:
   ```bash
   mv "openspec/changes/<change-name>" "openspec/changes/archive/<date>-<change-name>"
   ```
   - Use format: `YYYY-MM-DD-<name>`
   - Example: `2026-01-23-add-dark-mode`

6. **Show completion summary**:
   ```
   ✓ Archived to: openspec/changes/archive/2026-01-23-add-dark-mode/

   Change Summary:
   - Added: 2 capabilities
   - Modified: 0 capabilities
   - Implemented: 12 tasks

   Specs synced: Yes (2 files updated)

   Ready for the next change! Use /opsx:new or /opsx:propose to start.
   ```

## Archive Directory Structure

```
openspec/changes/archive/
└── 2026-01-23-add-dark-mode/
    ├── .openspec.yaml
    ├── proposal.md
    ├── specs/
    │   ├── dark-mode-toggle/spec.md
    │   └── theme-persistence/spec.md
    ├── design.md
    └── tasks.md
```

## Spec Sync Process

### When Sync is Needed

Sync specs to main when:
- Change has **MODIFIED** requirements
- Change has **REMOVED** requirements
- User wants to update the canonical specs

### Sync Process

1. **For each capability with delta specs**:
   - Read `openspec/specs/<capability>/spec.md` (main)
   - Read `openspec/changes/<name>/specs/<capability>/spec.md` (delta)

2. **Apply ADDED requirements**:
   - Append new requirement blocks to main spec

3. **Apply MODIFIED requirements**:
   - Find existing requirement by name
   - Replace entire requirement block

4. **Apply REMOVED requirements**:
   - Find and remove requirement block

5. **Write updated main spec**

## Best Practices

1. **Always verify completion** — don't archive incomplete work
2. **Ask about spec sync** — don't assume
3. **Preserve everything** — archive is the history
4. **Clean workspace** — active changes/ should only have WIP
5. **Show summary** — user should see what was accomplished
6. **For multiple changes** — suggest `/opsx:bulk-archive` instead

## Notes

- Archiving is the final step — it marks completion
- Syncing specs is optional but recommended for consistency
- Archive is permanent record — it's the project history
- After archiving, the workspace is ready for next change
- Preserve `.openspec.yaml` when moving to archive
