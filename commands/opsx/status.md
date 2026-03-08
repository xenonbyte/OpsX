---
description: Show the current status of a change - what's done, what's ready, what's blocked
---

# OPSX: Status

## Language Preference
Before responding, read `~/.openspec/.opsx-config.yaml`.
- If `language: zh` → respond in Chinese (简体中文)
- If `language: en` or missing → respond in English
- Technical terms (proposal, specs, file paths) remain in English

---

You are executing the **OPSX Status** command to check the current state of a change.

## Your Task

1. **Identify the current change**:
   - Use specified change name
   - Or find most recent change in `openspec/changes/` (excluding `archive/`)
   - If multiple active changes, ask user to choose

2. **Check what exists**:
   - List files in change directory
   - Check for: `.openspec.yaml`, `proposal.md`, `specs/`, `design.md`, `tasks.md`

3. **Determine artifact status**:

   ```
   ✓ proposal (done) — file exists
   ○ specs (ready) — dependencies met, doesn't exist
   ○ design (ready) — dependencies met, doesn't exist
   ○ tasks (blocked) — waiting for specs, design
   ```

4. **Check task progress** (if tasks.md exists):
   - Parse checkboxes: `- [x]` = done, `- [ ]` = pending
   - Count: total tasks, completed, pending
   - Show percentage complete

5. **Display status report**:
   ```
   Change: add-dark-mode
   Created: 2026-01-23
   Schema: spec-driven

   Artifacts:
   ✓ proposal (done)
   ✓ specs (done) — 2 capabilities
   ✓ design (done)
   ○ tasks (done) — 8/12 tasks complete (67%)

   Ready to: /opsx:apply (implementation in progress)

   Next steps:
   - Complete remaining tasks: 2.3, 2.4, 3.1
   - Or use /opsx:apply to continue implementation
   ```

## Status Display Format

### Artifact Status Legend
- ✓ done — artifact exists and complete
- ○ ready — all dependencies met, ready to create
- ○ blocked — waiting for dependencies

### Task Progress
```
tasks.md: 8/12 complete (67%)

Completed:
  ✓ 1.1 Create theme context
  ✓ 1.2 Create toggle component
  ✓ 1.3 Add CSS variables
  [... etc ...]

Pending:
  ○ 2.3 Add localStorage persistence
  ○ 2.4 Create theme switcher
  ○ 3.1 Add tests
```

## Available Commands Display

Show available commands based on current state:

| State | Suggested Commands |
|-------|-------------------|
| Just started | `/opsx:continue`, `/opsx:ff`, `/opsx:propose` |
| Planning in progress | `/opsx:continue`, `/opsx:ff` |
| Planning complete | `/opsx:apply` |
| Implementation in progress | `/opsx:apply` |
| All tasks complete | `/opsx:verify`, `/opsx:archive` |

## Examples

### Example 1: New Change (nothing done)

```
Change: add-user-auth
Created: 2026-01-23
Status: Just started

Artifacts:
  ○ proposal (ready) ← Start here!

Next steps:
- Use /opsx:continue to create proposal
- Or /opsx:ff to create all planning artifacts
- Or /opsx:propose to start fresh with all artifacts
```

### Example 2: Planning Complete

```
Change: export-api-feature
Created: 2026-01-23
Status: Ready for implementation

Artifacts:
  ✓ proposal (done)
  ✓ specs (done) — 3 capabilities, 8 requirements
  ✓ design (done)
  ✓ tasks (done) — 15 tasks planned

Ready to: /opsx:apply (start implementation)
```

### Example 3: Complete

```
Change: add-dark-mode
Created: 2026-01-23
Status: Complete ✓

Artifacts:
  ✓ proposal (done)
  ✓ specs (done) — 2 capabilities
  ✓ design (done)
  ✓ tasks (done) — 12/12 tasks (100%)

All tasks completed! Ready to verify and archive.

Next steps:
- /opsx:verify to validate implementation
- /opsx:archive to complete this change
```

## Special Cases

**No change specified**:
- List all active changes in `openspec/changes/` (excluding `archive/`)
- Ask user which one to check

**Change doesn't exist**:
- Ask if they meant a different name
- Suggest using `/opsx:new` to create it

**Empty change directory**:
- Only .openspec.yaml exists
- Suggest starting with `/opsx:continue`

## Notes

- Status is about visibility — help user understand where they are
- Show what's done, what's next, what's blocked
- Clear status helps users decide what to do
- This command is lightweight — just reading files, not creating anything
- Use emoji for visual clarity (✓ ○)
