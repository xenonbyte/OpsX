---
description: Fast-forward - create all planning artifacts (proposal, specs, design, tasks) at once
---

# OPSX: Fast-Forward

## Language Preference
Before responding, read `~/.openspec/.opsx-config.yaml`.
- If `language: zh` → respond in Chinese (简体中文)
- If `language: en` or missing → respond in English
- Technical terms (proposal, specs, file paths) remain in English

---

You are executing the **OPSX Fast-Forward** command to create all planning artifacts at once.

## Your Task

1. **Identify the current change**:
   - Use specified change name or find most recent
   - Verify change directory exists

2. **Check current state**:
   - See what artifacts already exist
   - Only create missing ones

3. **Create all planning artifacts in order**:

   ### Step 1: Proposal (if not exists)
   - Create `proposal.md`
   - Focus on WHY, what changes, capabilities, impact
   - Keep concise (1-2 pages)

   ### Step 2: Specs (if not exists)
   - Read proposal.md for capabilities list
   - Create `specs/<capability>/spec.md` for each capability
   - Use proper delta operations (ADDED, MODIFIED, REMOVED)
   - Follow SHALL/MUST format with WHEN/THEN scenarios

   ### Step 3: Design (if not exists and needed)
   - Assess if design.md is needed:
     - Cross-cutting change?
     - New external dependencies?
     - Security/performance concerns?
     - If no, skip and note it
   - If yes, create `design.md` with context, decisions, risks

   ### Step 4: Tasks (if not exists)
   - Read proposal, specs, design for context
   - Create `tasks.md` with checkboxes
   - MUST use format: `- [ ] X.Y Task description`
   - Group under ## numbered headings

4. **Show summary**:
   ```
   ✓ Created proposal.md — why we're doing this, what's changing
   ✓ Created specs/
     ✓ dark-mode-toggle/spec.md
     ✓ theme-persistence/spec.md
   ✓ Created design.md — technical approach
   ✓ Created tasks.md — 12 implementation tasks

   Ready for implementation!

   Run /opsx:apply to start implementing tasks.
   ```

5. **Display tasks preview**:
   ```
   Tasks to implement:
   ## 1. Setup
   - [ ] 1.1 Create theme context
   - [ ] 1.2 Add toggle component

   ## 2. Implementation
   - [ ] 2.1 Implement CSS variables
   - [ ] 2.2 Add localStorage persistence

   [and so on...]
   ```

## When to Use Fast-Forward

Use /opsx:ff when:
- User has a clear picture of what they're building
- Requirements are well-understood
- User wants to move quickly to implementation
- No need for iterative exploration

Don't use /opsx:ff when:
- User is still exploring ideas (use `/opsx:explore` instead)
- Requirements are unclear or ambiguous
- User wants to review each artifact before moving on

## Special Cases

**Some artifacts already exist**:
- Only create missing ones
- Show what was created vs what already existed

**Design not needed**:
- Skip design.md creation
- Note: "Design document not needed for this change"
- Continue to tasks

**Change name not specified**:
- Ask user what they want to build
- Then proceed with creation

## Quality Checks

Before creating each artifact:
1. **Proposal**: Is the "Why" clear? Are capabilities listed?
2. **Specs**: Does each capability have a spec? Are requirements testable?
3. **Design**: Is there a technical approach? Are risks addressed?
4. **Tasks**: Are tasks small and verifiable? Is checkbox format correct?

## Notes

- Fast-forward is about speed, not skipping quality
- Still create complete, thoughtful artifacts
- User can edit artifacts later before implementation
- This is the "I know what I want" workflow
- For one-shot creation from scratch, `/opsx:propose` is similar but also creates the change directory
