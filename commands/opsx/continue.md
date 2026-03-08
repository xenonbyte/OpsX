---
description: Create the next artifact in the OpenSpec workflow based on what's ready
---

# OPSX: Continue

## Language Preference
Before responding, read `~/.openspec/.opsx-config.yaml`.
- If `language: zh` → respond in Chinese (简体中文)
- If `language: en` or missing → respond in English
- Technical terms (proposal, specs, file paths) remain in English

---

You are executing the **OPSX Continue** command to create the next artifact in the OpenSpec workflow.

## Your Task

1. **Identify the current change**:
   - If user specified a change name, use that
   - Otherwise: Look for most recent change in `openspec/changes/` (excluding `archive/`)
   - If multiple active changes, ask user to choose

2. **Check current state**:
   - List all artifacts in the change directory
   - Determine which are complete (file exists)
   - Identify what's ready to create based on dependencies

3. **Dependency rules**:
   ```
   proposal: requires []
   specs: requires [proposal]
   design: requires [proposal]
   tasks: requires [specs, design]
   ```

4. **Show status**:
   ```
   Current change: <name>

   Status:
   ✓ proposal (done)
   ✓ specs (done)
   ○ design (ready)
   ○ tasks (blocked - waiting for design)
   ```

5. **Create the next ready artifact**:
   - Read completed artifacts for context
   - Get the appropriate template
   - Apply instructions from schema or defaults
   - Inject project context if config.yaml exists

6. **Create the artifact**:
   - Write the file
   - Mark it complete
   - Show what's unlocked

7. **Display next steps**:
   ```
   ✓ Created design.md

   Now ready: tasks
   Run /opsx:continue to create tasks, or /opsx:ff to create all remaining artifacts.
   ```

## Artifact Creation Guide

### Creating proposal.md
- Template: Basic why/what/capabilities/impact structure
- Focus: WHY this change is needed
- Length: 1-2 pages, concise

### Creating specs
- Read proposal.md for capabilities list
- Create one spec per capability
- Use delta operations: ADDED, MODIFIED, REMOVED
- Format: SHALL/MUST requirements, WHEN/THEN scenarios
- Critical: Use exactly 4 hashtags (####) for scenarios

### Creating design.md
- Check if needed (cross-cutting, new dependencies, complexity)
- If not needed, skip and mark as N/A
- Focus: HOW to implement
- Include: Context, Decisions, Risks, Migration plan

### Creating tasks.md
- MUST use checkbox format: `- [ ] X.Y Task description`
- Group under ## numbered headings
- Small, completable tasks
- Order by dependency

## Example Flow

**User says**: `/opsx:continue`

**State**: proposal.md exists, nothing else

**Your response**:
```
Current change: add-dark-mode

Status:
✓ proposal (done)
○ specs (ready)
○ design (ready)
○ tasks (blocked - waiting for specs, design)

Creating specs...

[Read proposal.md for capabilities]
[Create spec files based on capabilities]

✓ Created specs/dark-mode-toggle/spec.md
✓ Created specs/theme-persistence/spec.md

Now ready: design, tasks

Run /opsx:continue to create the next artifact.
```

## Special Cases

**Nothing is ready**:
- This shouldn't happen if workflow is followed
- Ask user if they want to start with `/opsx:new`

**All artifacts done**:
- Suggest using `/opsx:apply` to start implementation

**User wants to skip design**:
- Allowed if design isn't needed
- Create tasks directly after specs
- Note in change that design was skipped

## Notes

- Always read completed artifacts before creating new ones
- Respect dependencies — don't skip ahead
- Be helpful and guide the user
- Show clear progress indicators
