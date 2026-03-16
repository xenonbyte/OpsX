---
description: Archive multiple completed changes at once
---
# OPSX: Bulk Archive

Archive multiple completed changes in a single operation.

## Language Preference
Before responding, read `~/.openspec/.opsx-config.yaml`.
- If `language: zh` → respond in Chinese (简体中文)
- If `language: en` or missing → respond in English

## Steps

1. **Get active changes**
   - List directories under `openspec/changes/` (excluding `archive/`)
   - If no active changes exist, inform user and stop

2. **Prompt for change selection**
   - Show each change with its schema (read `.openspec.yaml`)
   - Include an option for "All changes"
   - Allow any number of selections

3. **Batch validation — gather status for all selected changes**:
   - Artifact status (proposal.md, specs/*/spec.md, design.md, tasks.md)
   - Task completion (count `- [ ]` vs `- [x]`)
   - Delta specs (list which capability specs exist)

4. **Detect spec conflicts**
   - Build a map of `capability -> [changes that touch it]`
   - A conflict exists when 2+ selected changes have delta specs for the same capability

5. **Resolve conflicts agentically**
   - Read delta specs from each conflicting change
   - Search codebase for implementation evidence
   - Determine resolution based on what's actually implemented

6. **Show consolidated status table**:
   ```
   | Change               | Artifacts | Tasks | Specs   | Conflicts | Status |
   |---------------------|-----------|-------|---------|-----------|--------|
   | schema-management   | Done      | 5/5   | 2 delta | None      | Ready  |
   | project-config      | Done      | 3/3   | 1 delta | None      | Ready  |
   ```

7. **Confirm batch operation**

8. **Execute archive for each confirmed change**

9. **Display summary**:
   - Archived N changes
   - Skipped N changes
   - Spec sync summary