---
description: Guided onboarding - walk through a complete OpenSpec workflow cycle with narration
---

# OPSX: Onboard

## Language Preference
Before responding, read `~/.openspec/.opsx-config.yaml`.
- If `language: zh` → respond in Chinese (简体中文)
- If `language: en` or missing → respond in English
- Technical terms (proposal, specs, file paths) remain in English

---

Guide the user through their first complete OpenSpec workflow cycle. This is a teaching experience — you'll do real work in their codebase while explaining each step.

---

## Phase 1: Welcome

Display:

```
## Welcome to OpenSpec!

I'll walk you through a complete change cycle — from idea to implementation — using a real task in your codebase. Along the way, you'll learn the workflow by doing it.

**What we'll do:**
1. Pick a small, real task in your codebase
2. Explore the problem briefly
3. Create a change (the container for our work)
4. Build the artifacts: proposal → specs → design → tasks
5. Implement the tasks
6. Archive the completed change

Let's start by finding something to work on.
```

---

## Phase 2: Task Selection

### Codebase Analysis

Scan the codebase for small improvement opportunities. Look for:

1. **TODO/FIXME comments** — Search for `TODO`, `FIXME`, `HACK`, `XXX` in code files
2. **Missing error handling** — `catch` blocks that swallow errors
3. **Functions without tests** — Cross-reference `src/` with test directories
4. **Debug artifacts** — `console.log`, `debugger` statements in non-debug code
5. **Missing validation** — User input handlers without validation

Also check recent git activity:
```bash
git log --oneline -10 2>/dev/null || echo "No git history"
```

### Present Suggestions

From your analysis, present 3-4 specific suggestions:

```
## Task Suggestions

Based on scanning your codebase, here are some good starter tasks:

**1. [Most promising task]**
   Location: `src/path/to/file.ts:42`
   Scope: ~1-2 files, ~20-30 lines
   Why it's good: [brief reason]

**2. [Second task]**
   Location: `src/another/file.ts`
   Scope: ~1 file, ~15 lines

**3. [Third task]**
   Location: [location]
   Scope: [estimate]

**4. Something else?**
   Tell me what you'd like to work on.

Which task interests you? (Pick a number or describe your own)
```

**If nothing found:** Fall back to asking what the user wants to build.

### Scope Guardrail

If the user picks something too large (major feature, multi-day work):

```
That's a valuable task, but it's probably larger than ideal for your first OpenSpec run-through.

For learning the workflow, smaller is better.

**Options:**
1. **Slice it smaller** — What's the smallest useful piece?
2. **Pick something else** — One of the other suggestions?
3. **Do it anyway** — If you really want to, we can.

What would you prefer?
```

Let the user override if they insist — this is a soft guardrail.

---

## Phase 3: Explore Demo

Once a task is selected, briefly demonstrate explore mode:

```
Before we create a change, let me quickly show you **explore mode** — it's how you think through problems before committing to a direction.
```

Spend 1-2 minutes investigating the relevant code:
- Read the file(s) involved
- Draw a quick ASCII diagram if it helps
- Note any considerations

```
Explore mode (`/opsx:explore`) is for this kind of thinking — investigating before implementing. You can use it anytime.

Now let's create a change to hold our work.
```

**PAUSE** — Wait for user acknowledgment before proceeding.

---

## Phase 4: Create the Change

**EXPLAIN:**
```
## Creating a Change

A "change" in OpenSpec is a container for all the thinking and planning around a piece of work. It lives in `openspec/changes/<name>/` and holds your artifacts.
```

**DO:** Create the change directory and `.openspec.yaml`:
```bash
mkdir -p openspec/changes/<derived-name>/specs
```
Write `.openspec.yaml` with name, schema, and createdAt.

**SHOW:** Display the created folder structure.

---

## Phase 5: Proposal

**EXPLAIN:**
```
## The Proposal

The proposal captures **why** we're making this change and **what** it involves at a high level.
```

**DO:** Draft the proposal content, show it to the user.

**PAUSE** — Wait for user approval/feedback before saving to `openspec/changes/<name>/proposal.md`.

---

## Phase 6: Specs

**EXPLAIN:**
```
## Specs

Specs define **what** we're building in precise, testable terms. They use a requirement/scenario format.
```

**DO:** Create spec directory `openspec/changes/<name>/specs/<capability-name>/` and draft spec content with WHEN/THEN format. Save to `spec.md`.

---

## Phase 7: Design

**EXPLAIN:**
```
## Design

The design captures **how** we'll build it — technical decisions, tradeoffs, approach. For small changes, this might be brief.
```

**DO:** Draft and save `openspec/changes/<name>/design.md`.

---

## Phase 8: Tasks

**EXPLAIN:**
```
## Tasks

Finally, we break the work into implementation tasks — checkboxes that drive the apply phase.
```

**DO:** Generate tasks based on specs and design. Save to `openspec/changes/<name>/tasks.md`.

**PAUSE** — Wait for user to confirm they're ready to implement.

---

## Phase 9: Apply (Implementation)

**EXPLAIN:**
```
## Implementation

Now we implement each task, checking them off as we go.
```

**DO:** For each task:
1. Announce: "Working on task N: [description]"
2. Implement the change in the codebase
3. Reference specs/design naturally
4. Mark complete in tasks.md: `- [ ]` → `- [x]`
5. Brief status: "✓ Task N complete"

---

## Phase 10: Archive

**EXPLAIN:**
```
## Archiving

When a change is complete, we archive it. This moves it to `openspec/changes/archive/YYYY-MM-DD-<name>/`.
```

**DO:**
```bash
mkdir -p openspec/changes/archive
mv openspec/changes/<name> openspec/changes/archive/YYYY-MM-DD-<name>
```

---

## Phase 11: Recap & Next Steps

```
## Congratulations!

You just completed a full OpenSpec cycle:

1. **Explore** — Thought through the problem
2. **New** — Created a change container
3. **Proposal** — Captured WHY
4. **Specs** — Defined WHAT in detail
5. **Design** — Decided HOW
6. **Tasks** — Broke it into steps
7. **Apply** — Implemented the work
8. **Archive** — Preserved the record

---

## Command Reference

**Core workflow:**

| Command | What it does |
|---------|--------------|
| `/opsx:propose` | Create a change and generate all artifacts |
| `/opsx:explore` | Think through problems before/during work |
| `/opsx:apply` | Implement tasks from a change |
| `/opsx:archive` | Archive a completed change |

**Additional commands:**

| Command | What it does |
|---------|--------------|
| `/opsx:new` | Start a new change, step through artifacts one at a time |
| `/opsx:continue` | Continue working on an existing change |
| `/opsx:ff` | Fast-forward: create all artifacts at once |
| `/opsx:verify` | Verify implementation matches artifacts |
| `/opsx:sync` | Sync delta specs to main specs |
| `/opsx:bulk-archive` | Archive multiple changes at once |
| `/opsx:status` | Check current progress |

---

## What's Next?

Try `/opsx:propose` on something you actually want to build. You've got the rhythm now!
```

---

## Graceful Exit Handling

### User wants to stop mid-way

If the user says they need to stop, want to pause, or seem disengaged:

```
No problem! Your change is saved at `openspec/changes/<name>/`.

To pick up where we left off later:
- `/opsx:continue <name>` — Resume artifact creation
- `/opsx:apply <name>` — Jump to implementation (if tasks exist)

The work won't be lost. Come back whenever you're ready.
```

### User just wants command reference

If the user says they just want to see the commands or skip the tutorial, show the command reference table and exit gracefully.

---

## Guardrails

- **Follow the EXPLAIN → DO → SHOW → PAUSE pattern** at key transitions
- **Keep narration light** during implementation — teach without lecturing
- **Don't skip phases** even if the change is small — the goal is teaching the workflow
- **Pause for acknowledgment** at marked points, but don't over-pause
- **Handle exits gracefully** — never pressure the user to continue
- **Use real codebase tasks** — don't simulate or use fake examples
- **Adjust scope gently** — guide toward smaller tasks but respect user choice
