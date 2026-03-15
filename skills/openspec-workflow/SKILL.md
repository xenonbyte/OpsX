---
name: OpenSpec Workflow
description: AI-native spec-driven development system - manage proposals, specs, designs, and tasks with structured workflows
license: MIT
compatibility: Works standalone (no CLI required)
metadata:
  author: OpenSpec (packaged for local use)
  version: "1.0.0"
  generatedBy: "OpenSpec-Local-Skill"
---

# OpenSpec Workflow Skill (v1.0.0)

You are an expert in **OpenSpec** — an AI-native spec-driven development system that adds a lightweight spec layer between ideas and code generation.

## Language Preference

Before responding, read `~/.openspec/.opsx-config.yaml`.
- If `language: zh` → respond in Chinese (简体中文)
- If `language: en` or missing → respond in English
- Technical terms (proposal, specs, file paths) remain in English

## Core Philosophy

```text
→ fluid not rigid
→ iterative not waterfall
→ easy not complex
→ built for brownfield not just greenfield
→ scalable from personal projects to enterprises
```

## OpenSpec Overview

**OpenSpec** helps you and your AI assistant agree on what to build before any code is written, then provides a structured workflow for implementation and tracking.

## Platform Invocation Notes

- Canonical workflow names are `openspec` and `opsx`.
- Claude/Gemini invocation:
  - `/openspec ...`
  - `/opsx:*`
- Codex invocation:
  - `/prompts:openspec ...`
  - `/prompts:opsx-*`
- When showing command examples to Codex users, adapt command text to the `/prompts:` form.

### Key Benefits

- **Agree before you build** — human and AI align on specs before code gets written
- **Stay organized** — each change gets its own folder with proposal, specs, design, and tasks
- **Work fluidly** — update any artifact anytime, no rigid phase gates
- **Track progress** — clear status on what's ready, what's done, what's blocked

## OpenSpec Directory Structure

```
openspec/
├── config.yaml              # Project configuration (optional)
├── project.md              # AGENTS.md (auto-generated)
├── changes/                # Active changes
│   └── <change-name>/
│       ├── .openspec.yaml  # Change metadata
│       ├── proposal.md      # WHY this change
│       ├── specs/           # WHAT the system should do
│       │   └── <capability>/spec.md
│       ├── design.md        # HOW to implement (optional)
│       └── tasks.md         # Implementation checklist
├── specs/                  # Main specs directory
└── schemas/                # Custom workflow schemas (optional)
```

## The OPSX Workflow

OPSX is the standard workflow for OpenSpec — **fluid, iterative, no rigid phases**.

### Available Actions

| Action | Command | Purpose | When to Use |
|--------|---------|---------|-------------|
| **propose** | `/opsx:propose` | Create change + all artifacts in one step | Quick start with clear picture |
| **explore** | `/opsx:explore` | Think through ideas, investigate problems | Before committing to a change |
| **new** | `/opsx:new` | Start a new change | When you know what you want to build |
| **continue** | `/opsx:continue` | Create the next artifact | Building artifacts incrementally |
| **ff** | `/opsx:ff` | Create all planning artifacts at once | When you have clear picture |
| **apply** | `/opsx:apply` | Implement tasks | When ready to code |
| **verify** | `/opsx:verify` | Validate implementation against specs | Before archiving |
| **sync** | `/opsx:sync` | Sync delta specs to main specs | When specs need updating |
| **archive** | `/opsx:archive` | Archive completed changes | When work is done |
| **bulk-archive** | `/opsx:bulk-archive` | Archive multiple changes | Batch cleanup |
| **batch-apply** | `/opsx:batch-apply` | Select multiple changes, execute serial or parallel | Multiple changes ready to implement |
| **resume** | `/opsx:resume` | List active changes and pick up where you left off | New session, resuming work |
| **status** | `/opsx:status` | Show current state | Anytime |
| **onboard** | `/opsx:onboard` | Guided tutorial | First-time users |

### Workflow Example

```
User: /opsx:propose add-dark-mode
AI:  Created openspec/changes/add-dark-mode/
     ✓ proposal.md — why we're doing this, what's changing
     ✓ specs/ — requirements and scenarios
     ✓ design.md — technical approach
     ✓ tasks.md — implementation checklist
     Ready for implementation!

User: /opsx:apply
AI:  Implementing tasks...
     ✓ 1.1 Add theme context provider
     ✓ 1.2 Create toggle component
     All tasks complete!

User: /opsx:verify
AI:  ✓ Completeness: 12/12 tasks done
     ✓ Correctness: All requirements covered
     ✓ Coherence: Design followed
     Ready for archive!

User: /opsx:archive
AI:  Archived to openspec/changes/archive/2026-01-23-add-dark-mode/
     Specs synced. Ready for next feature.
```

## CLI-Free Operation

This local skill operates **without the OpenSpec CLI**. All operations use direct file system access:

| CLI Command | Local Equivalent |
|-------------|-----------------|
| `openspec new change "<name>"` | `mkdir -p openspec/changes/<name>/specs` + write `.openspec.yaml` |
| `openspec status --change "<name>" --json` | Read change directory, check which artifact files exist |
| `openspec instructions <artifact>` | Use templates defined in this skill |
| `openspec list --json` | List directories under `openspec/changes/` (excluding `archive/`) |
| `openspec archive "<name>"` | `mv openspec/changes/<name> openspec/changes/archive/YYYY-MM-DD-<name>` |

### Creating a Change Directory

```bash
mkdir -p openspec/changes/<name>/specs
```

Then write `.openspec.yaml`:
```yaml
name: <name>
schema: spec-driven
createdAt: <YYYY-MM-DDTHH:mm:ss>
```

### Checking Change Status

Read the change directory and check for:
- `proposal.md` → proposal done
- `specs/*/spec.md` → specs done
- `design.md` → design done
- `tasks.md` → tasks done

Apply dependency rules:
```
proposal: requires []
specs: requires [proposal]
design: requires [proposal]
tasks: requires [specs, design]
```

### Listing Active Changes

```bash
ls openspec/changes/
```
Exclude `archive/` from the list.

## Artifact Types

### 1. Proposal (`proposal.md`)

**Purpose**: Establishes WHY this change is needed

**Structure**:
```markdown
## Why
<!-- 1-2 sentences on the problem or opportunity -->

## What Changes
<!-- Bullet list of changes. Mark breaking changes with **BREAKING** -->

## Capabilities

### New Capabilities
<!-- List capabilities being introduced -->
- `<name>`: <kebab-case name and description>

### Modified Capabilities
<!-- Existing capabilities whose requirements are changing -->
- `<existing-name>`: <what requirement is changing>

## Impact
<!-- Affected code, APIs, dependencies, systems -->
```

**Key Points**:
- Keep concise (1-2 pages)
- Focus on "why" not "how"
- The Capabilities section creates the contract between proposal and specs

### 2. Specs (`specs/**/*.md`)

**Purpose**: Defines WHAT the system should do

**Structure**:
```markdown
## ADDED Requirements

### Requirement: User can export data
The system SHALL allow users to export their data in CSV format.

#### Scenario: Successful export
- **WHEN** user clicks "Export" button
- **THEN** system downloads a CSV file with all user data

## MODIFIED Requirements
<!-- Use only when changing existing behavior -->

## REMOVED Requirements
<!-- Deprecated features - include Reason and Migration -->
```

**Critical Rules**:
- Use SHALL/MUST for normative requirements
- Every requirement MUST have at least one scenario
- Scenarios MUST use exactly 4 hashtags (`#### Scenario:`)
- Use WHEN/THEN format for scenarios

**Delta Operations**:
- **ADDED**: New capabilities
- **MODIFIED**: Changed behavior — must include full updated content
- **REMOVED**: Deprecated features — must include Reason and Migration

### 3. Design (`design.md` — Optional)

**Purpose**: Explains HOW to implement the change

**When to include**:
- Cross-cutting changes (multiple services/modules)
- New external dependency or data model changes
- Security, performance, or migration complexity
- Ambiguity that benefits from technical decisions

**Structure**:
```markdown
## Context
<!-- Background, current state, constraints -->

## Goals / Non-Goals
**Goals:**
<!-- What this design achieves -->

**Non-Goals:**
<!-- What is explicitly out of scope -->

## Decisions
<!-- Key technical choices with rationale -->

## Risks / Trade-offs
<!-- [Risk] → Mitigation -->

## Migration Plan
<!-- Steps to deploy, rollback strategy -->
```

### 4. Tasks (`tasks.md`)

**Purpose**: Breaks down implementation work

**CRITICAL**: Follow checkbox format exactly for progress tracking

```markdown
## 1. Setup

- [ ] 1.1 Create new module structure
- [ ] 1.2 Add dependencies to package.json

## 2. Core Implementation

- [ ] 2.1 Implement data export function
- [ ] 2.2 Add CSV formatting utilities
```

**Guidelines**:
- Each task MUST be a checkbox: `- [ ] X.Y Task description`
- Group related tasks under ## numbered headings
- Tasks should be small enough to complete in one session
- Order by dependency

## Dependency Graph

Artifacts form a DAG (Directed Acyclic Graph):

```
                    proposal
                       │
         ┌─────────────┴─────────────┐
         │                           │
         ▼                           ▼
      specs                       design
   (requires:                  (requires:
    proposal)                   proposal)
         │                           │
         └─────────────┬─────────────┘
                       │
                       ▼
                    tasks
                (requires:
                specs, design)
                       │
                       ▼
              ┌──────────────┐
              │  APPLY PHASE │
              └──────────────┘
                       │
                       ▼
              ┌──────────────┐
              │ VERIFY PHASE │
              └──────────────┘
                       │
                       ▼
              ┌──────────────┐
              │ ARCHIVE/SYNC │
              └──────────────┘
```

**State transitions**:
```
BLOCKED ───► READY ───► DONE
  │           │           │
Missing      All deps    File exists
dependencies are DONE
```

## Working with Changes

### Starting a New Change

1. **User says**: "I want to add X"
2. **You should**:
   - Ask clarifying questions if needed
   - Derive a kebab-case name (e.g., "add-dark-mode")
   - Create directory: `openspec/changes/<name>/specs`
   - Create `.openspec.yaml` with metadata
   - Show what's ready to create: `proposal`
   - Display the proposal template

### Creating Artifacts (Continue Workflow)

When user says "continue" or you're ready for next artifact:

1. **Check current state** — what artifacts exist?
2. **Determine what's ready** — based on dependencies
3. **Read dependencies** — understand context from completed artifacts
4. **Create the artifact** — follow the template
5. **Show what's unlocked** — what becomes available next

### Fast-Forward Workflow

When user says "ff" or wants to create all planning artifacts:

1. Create all artifacts in dependency order:
   - proposal.md
   - specs/**/*.md
   - design.md (if applicable)
   - tasks.md
2. Show what was created
3. Indicate readiness for implementation

### Propose Workflow (v1.0.0)

When user says "propose" or wants to quickly create everything:

1. Same as fast-forward but designed for one-shot creation
2. Asks for input if not clear what the user wants
3. Creates change directory and all artifacts in one step
4. Shows summary and prompts for `/opsx:apply`

### Apply Workflow (Implementation)

When user says "apply" or starts implementation:

1. **Read all context files** — proposal, specs, design, tasks
2. **Work through tasks** in order, checking them off as you go
3. **Update artifacts** if implementation reveals design issues
4. **Mark tasks complete** using `- [x]` format
5. **Pause if blockers** — ask for clarification when needed

### Verify Workflow (v1.0.0)

When user says "verify" or wants to validate implementation:

1. **Check three dimensions**: Completeness, Correctness, Coherence
2. **Completeness**: Are all tasks done? Are all requirements implemented?
3. **Correctness**: Does implementation match specs? Are scenarios covered?
4. **Coherence**: Does implementation follow design decisions?
5. **Generate report** with CRITICAL/WARNING/SUGGESTION issues

### Sync Workflow (v1.0.0)

When user says "sync" or wants to update main specs:

1. **Find delta specs** in the change directory
2. **Read main specs** from `openspec/specs/`
3. **Apply changes intelligently**: ADDED, MODIFIED, REMOVED, RENAMED
4. **Preserve existing content** not mentioned in delta
5. **Show summary** of what was updated

### Archiving Changes

When work is done:

1. **Verify** tasks are complete
2. **Ask about sync** — "Do specs need to sync to main?"
3. **Move to archive**: `openspec/changes/archive/<date>-<name>/`
4. **Update main specs** if delta specs were used
5. **Show completion** — what was archived

### Bulk Archive (v1.0.0)

When user wants to archive multiple changes:

1. **List active changes** and let user select
2. **Detect spec conflicts** — multiple changes touching same capability
3. **Resolve conflicts** by checking what's actually implemented
4. **Archive in order** — respecting conflict resolution
5. **Show consolidated summary**

## Project Configuration

`openspec/config.yaml` allows customization:

```yaml
# Default schema for new changes
schema: spec-driven

# Project context injected into all artifacts
context: |
  Tech stack: TypeScript, React, Node.js
  API conventions: RESTful, JSON responses
  Testing: Vitest for unit tests, Playwright for e2e

# Per-artifact rules
rules:
  proposal:
    - Include rollback plan
    - Identify affected teams
  specs:
    - Use Given/When/Then format for scenarios
  design:
    - Include sequence diagrams for complex flows
```

## Update vs New Change

### Update When:
- Same intent, refined execution
- Scope narrows (MVP first)
- Learning-driven corrections

### Start New When:
- Intent fundamentally changed
- Scope exploded
- Original is completable

## When to Use Which Workflow

| User says | You should |
|-----------|------------|
| "I have an idea..." | Suggest `/opsx:explore` or help think through it |
| "Create/change/add X" | Use `/opsx:propose` for quick start |
| "Let me think step by step" | Use `/opsx:new` then `/opsx:continue` |
| "Fast forward" or "ff" | Create all planning artifacts at once |
| "Implement this" | Read all context, work through tasks with `/opsx:apply` |
| "Is this correct?" | Validate with `/opsx:verify` |
| "Update main specs" | Use `/opsx:sync` |
| "Done" or "Finish" | Verify completeness, archive with `/opsx:archive` |
| "Clean up all done" | Use `/opsx:bulk-archive` |
| "What's the status?" | Show current state with `/opsx:status` |
| "How does this work?" | Guide with `/opsx:onboard` |

## Error Handling

**If artifacts are missing**:
- Check if change directory exists
- Verify .openspec.yaml metadata
- Ask user which change they're working on

**If dependencies are unsatisfied**:
- Show what's blocking
- Don't skip dependencies — they exist for a reason

**If user wants to go back**:
- Allow editing any artifact anytime
- No phase gates — fluid iteration is encouraged

## Best Practices

### For You (AI Assistant)

1. **Always check context** — read existing artifacts before creating new ones
2. **Follow templates exactly** — especially for tasks.md checkboxes
3. **Show progress** — indicate what's done, what's next, what's blocked
4. **Ask for clarification** — when requirements are ambiguous
5. **Stay organized** — one change per directory, clear structure

### For Users

1. **Start with explore** — think through ideas before committing
2. **Use propose for speed** — when you know what you want
3. **Be specific** — clear proposals lead to better implementations
4. **Update as you learn** — edit artifacts when implementation reveals issues
5. **Verify before archive** — catch issues early
6. **Archive when done** — keep the workspace clean

## Schema System

OpenSpec supports custom workflows through schemas:

**Default schema: spec-driven**
```
proposal → specs → design → tasks → apply → verify → archive
```

## Meta-Commands

Users can manage the skill via `/openspec`:
- `/openspec --help` — Show command reference
- `/openspec --version` — Show version
- `/openspec --language <en|zh>` — Switch language
- `/openspec --doc` — Show embedded guide

## Resources

- GitHub: https://github.com/Fission-AI/OpenSpec
- Docs: https://github.com/Fission-AI/OpenSpec/blob/main/docs

---

**Remember**: OpenSpec is about agreement before implementation. When in doubt, clarify requirements with the user before writing code. The goal is predictable, maintainable development through clear specifications.
