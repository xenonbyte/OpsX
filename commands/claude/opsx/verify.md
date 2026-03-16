---
description: Verify implementation matches change artifacts before archiving
---
# OPSX: Verify

Verify that an implementation matches the change artifacts (specs, tasks, design).

## Language Preference
Before responding, read `~/.openspec/.opsx-config.yaml`.
- If `language: zh` → respond in Chinese (简体中文)
- If `language: en` or missing → respond in English

## Input

Optionally specify a change name after `/opsx:verify`. If omitted, prompt for selection.

## Steps

1. **If no change name provided, prompt for selection**
   - List directories under `openspec/changes/` (excluding `archive/`)
   - Show changes that have implementation tasks (tasks.md exists)

2. **Check status to understand what artifacts exist**

3. **Load all available artifacts**

4. **Initialize verification report structure**:
   - **Completeness**: Track tasks and spec coverage
   - **Correctness**: Track requirement implementation and scenario coverage
   - **Coherence**: Track design adherence and pattern consistency

5. **Verify Completeness**:
   - Parse checkboxes: `- [ ]` (incomplete) vs `- [x]` (complete)
   - Check spec coverage

6. **Verify Correctness**:
   - For each requirement from delta specs, search codebase for implementation evidence
   - Check if scenarios are covered

7. **Verify Coherence**:
   - Check design adherence
   - Check code pattern consistency

8. **Generate Verification Report**:
   ```
   ## Verification Report: <change-name>

   ### Summary
   | Dimension    | Status           |
   |--------------|------------------|
   | Completeness | X/Y tasks, N reqs|
   | Correctness  | M/N reqs covered |
   | Coherence    | Followed/Issues  |

   **Issues by Priority**: CRITICAL / WARNING / SUGGESTION
   **Final Assessment**: Ready for archive / Fix before archiving
   ```