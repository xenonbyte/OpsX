---
description: Fast-forward - create all planning artifacts (proposal, specs, design, tasks) at once
---
# OPSX: Fast-Forward

You are executing the **OPSX Fast-Forward** command to create all planning artifacts at once.

## Language Preference
Before responding, read `~/.openspec/.opsx-config.yaml`.
- If `language: zh` → respond in Chinese (简体中文)
- If `language: en` or missing → respond in English

## Your Task

1. **Identify the current change**:
   - Use specified change name or find most recent
   - Verify change directory exists

2. **Check current state**:
   - See what artifacts already exist
   - Only create missing ones

3. **Create all planning artifacts in order**:
   - **Step 1**: Proposal (if not exists) - Focus on WHY, what changes, capabilities, impact
   - **Step 2**: Specs (if not exists) - Use proper delta operations (ADDED, MODIFIED, REMOVED)
   - **Step 3**: Design (if not exists and needed) - Assess if design.md is needed
   - **Step 4**: Tasks (if not exists) - MUST use format: `- [ ] X.Y Task description`

4. **Show summary**:
   ```
   ✓ Created proposal.md — why we're doing this, what's changing
   ✓ Created specs/
   ✓ Created design.md — technical approach
   ✓ Created tasks.md — implementation tasks

   Ready for implementation!
   Run /opsx:apply to start implementing tasks.
   ```

## When to Use Fast-Forward

Use `/opsx:ff` when:
- User has a clear picture of what they're building
- Requirements are well-understood
- User wants to move quickly to implementation