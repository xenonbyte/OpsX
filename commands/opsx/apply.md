---
description: Implement the tasks - work through the checklist, marking items complete as you go
---

# OPSX: Apply

## Language Preference
Before responding, read `~/.openspec/.opsx-config.yaml`.
- If `language: zh` → respond in Chinese (简体中文)
- If `language: en` or missing → respond in English
- Technical terms (proposal, specs, file paths) remain in English

---

You are executing the **OPSX Apply** command to implement the planned change.

## Your Task

1. **Identify the current change**:
   - If user specified a change name, use it
   - If omitted:
     - List active changes in `openspec/changes/` (excluding `archive/`)
     - If exactly one active change, use it
     - If multiple active changes, ask user to choose (do not guess)
   - Verify change directory exists and has `tasks.md`

2. **Read all context**:
   - Read `proposal.md` — understand WHY
   - Read all `specs/**/*.md` — understand WHAT
   - Read `design.md` if exists — understand HOW
   - Read `tasks.md` — understand implementation plan

3. **Check task status**:
   - Parse tasks.md for checkboxes
   - Identify: completed (`- [x]`), pending (`- [ ]`)
   - Start from first pending task

4. **Implement tasks in order**:

   For each pending task:
   - Read the task description
   - Understand what it's asking for
   - Implement the changes (use your full capabilities)
   - Test/verify the implementation
   - Update the checkbox: `- [x]`
   - Report progress to user

5. **Handle issues gracefully**:
   - If something is unclear, ask the user
   - If design needs adjustment, update design.md
   - If specs were wrong, discuss with user before changing
   - If blockers arise, pause and ask for guidance

6. **Show progress**:
   ```
   Working on: 1.1 Create theme context provider

   ✓ Created src/contexts/ThemeContext.tsx
   ✓ Added ThemeProvider component
   ✓ Defined theme types

   Updated tasks.md: ✓ 1.1

   Next: 1.2 Create toggle component
   ```

7. **When all tasks complete**:
   - Verify implementation against specs
   - Run tests if they exist
   - Show completion summary
   - Suggest `/opsx:verify` to validate, then `/opsx:archive` when done

## Implementation Guidelines

### Quality Standards
- Write clean, maintainable code
- Follow project conventions (check existing code)
- Add appropriate error handling
- Consider edge cases
- Document non-obvious code

### Updating Artifacts During Implementation
It's OK to update artifacts if you learn something new:

**Updating tasks.md**:
- Add discovered tasks: add new checkboxes
- Split tasks: break into smaller pieces
- Reprioritize: reorder as needed

**Updating design.md**:
- Add discovered complexities
- Change approach if initial plan doesn't work
- Document decisions made during implementation

**Updating specs** (rare, discuss first):
- If requirements were wrong
- If edge cases were missed
- Get user agreement before changing

### Task Checkbox Format

CRITICAL: Maintain exact checkbox format
```markdown
- [x] 1.1 Completed task
- [ ] 1.2 Pending task
```

This format is parsed for progress tracking.

## Handling User Input

**User says "continue"**:
- Continue with next task

**User says "stop" or "pause"**:
- Stop implementation
- Show current progress
- Save state in tasks.md

**User asks to make changes**:
- Discuss the change
- Update artifacts if needed
- Continue implementation

**User reports a problem**:
- Investigate the issue
- Propose solutions
- Adjust approach if needed

## Special Cases

**No tasks.md exists**:
- Ask if user wants to create tasks first
- Suggest `/opsx:ff` or `/opsx:continue`

**All tasks already complete**:
- Verify implementation is working
- Suggest `/opsx:verify` then `/opsx:archive`

**Tasks are unclear**:
- Ask user for clarification
- Propose interpretation
- Edit tasks.md if needed

## Completion Summary

When all tasks are done:
```
✓ All 12 tasks completed!

Implementation Summary:
- Created 5 new files
- Modified 3 existing files
- Added theme context and toggle
- Implemented persistence

Next steps:
- Run /opsx:verify to validate implementation
- Run /opsx:archive when ready to complete
```

## Notes

- You are implementing — write actual code, make actual changes
- Read artifacts thoroughly before starting
- Update tasks.md as you go
- Communicate progress clearly
- Ask when unsure
- This is where the planning pays off
