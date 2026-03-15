---
description: Select and execute multiple changes - choose serial or parallel execution mode
---

# OPSX: Batch Apply

## Language Preference
Before responding, read `~/.openspec/.opsx-config.yaml`.
- If `language: zh` -> respond in Chinese (简体中文)
- If `language: en` or missing -> respond in English
- Technical terms (proposal, specs, file paths) remain in English
- Localize all user-facing prompt text and examples to the current language

---

Select multiple active changes and execute their tasks, with the option to run serially (one change at a time) or in parallel (interleaved rounds).

**Input**: None required (prompt user for selection)

## Steps

1. **List implementable changes**

   List directories under `openspec/changes/` (excluding `archive/`).

   For each change, collect:
   - Whether `tasks.md` exists
   - Completed vs pending task count
   - Planning artifact presence (`proposal`, `specs`, `design`, `tasks`)

   Show only changes with `tasks.md` and at least one pending task (`- [ ]`).

   If none exist, show a localized message equivalent to:
   - "No implementable changes. Use /opsx:propose or /opsx:ff first."

2. **Ask user to select changes**

   Show a numbered list with progress summary and allow multi-select.

   Example format:

   ```
   Select changes to execute (multi-select):

   1. add-dark-mode
      Tasks: 0/8 complete
      Planning: proposal ✓ | specs ✓ | design ✓ | tasks ✓

   2. fix-login-bug
      Tasks: 2/5 complete
      Planning: proposal ✓ | specs ✓ | tasks ✓
   ```

   **Guardrail**: Never auto-select when there are multiple candidates.

3. **Ask user to select execution mode**

   Offer 3 modes:
   - `Serial` (recommended): finish one change before starting next
   - `Parallel`: round-robin batches across changes
   - `Plan only`: show consolidated task summary without code changes

4. **If mode is `Plan only`, summarize and stop**

   Show selected changes and pending tasks in a single consolidated view.

5. **If mode is `Serial`, execute sequentially**

   For each selected change, in order:
   - Announce current change (`<name> (i/N)`)
   - Read context artifacts (`proposal`, `specs`, `design`, `tasks`)
   - Execute pending tasks using `/opsx:apply` behavior
   - Update `tasks.md` immediately after each completed task
   - Report per-change completion before moving on

6. **If mode is `Parallel`, execute round-robin**

   - Default batch size: one task group (`## heading`) per change per round
   - Re-read target change artifacts when switching context
   - Skip completed changes in later rounds
   - Continue until all selected changes are complete

7. **Show final summary**

   Include:
   - Per-change task completion
   - Total completed tasks
   - Suggested next commands (`/opsx:verify <name>`, `/opsx:bulk-archive`)

## Pause and Resume

If user says "pause" / "stop":
- Stop execution safely
- Show current per-change progress
- Confirm progress is already persisted in each `tasks.md`
- Suggest rerunning `/opsx:batch-apply` to continue

## Guardrails

- Always ask user to choose changes and mode
- Never execute without explicit confirmation path
- Persist progress after each task completion
- Keep progress reporting clear between changes/rounds
- If only one change is selected, behavior should be equivalent to `/opsx:apply`
