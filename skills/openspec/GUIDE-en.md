# OpenSpec Practical Guide (v1.0.0)

## 1. Overview

OpenSpec is a spec-driven workflow with unified commands:
- Entry: `/openspec`
- Subcommands: `/opsx:*`

Supported platforms: Claude, Codex, Gemini.

Platform invocation:
- Claude/Gemini: use `/openspec ...` and `/opsx:*`
- Codex: use `/prompts:openspec ...` and `/prompts:opsx-*`

## 2. Meta Commands

- `/openspec --help` — Show command reference
- `/openspec --version` — Show installed version and config
- `/openspec --language zh|en` — Switch output language
- `/openspec --doc` — Display this guide
- `/openspec --check` — Validate installation and workspace config

Codex equivalents:
- `/prompts:openspec --help`
- `/prompts:openspec --version`
- `/prompts:openspec --language zh|en`
- `/prompts:openspec --doc`
- `/prompts:openspec --check`

## 3. Install and Config

Install:

```bash
./install.sh --platform <claude|codex|gemini> [--workspace <path>]
```

Uninstall:

```bash
./uninstall.sh --platform <claude|codex|gemini>
```

Shared config:
- `~/.openspec/.opsx-config.yaml`

## 4. Workflow Commands Quick Reference

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `/opsx:propose` | Create change + all artifacts | Quick start with clear picture |
| `/opsx:explore` | Think through ideas | Before committing to a change |
| `/opsx:new` | Start a new change | Step-by-step artifact creation |
| `/opsx:continue` | Create next artifact | Building incrementally |
| `/opsx:ff` | Create all planning artifacts | Clear requirements, fast track |
| `/opsx:apply` | Implement tasks | Ready to code |
| `/opsx:verify` | Validate implementation | Before archiving |
| `/opsx:sync` | Update main specs | Specs need syncing |
| `/opsx:archive` | Archive completed change | Work is done |
| `/opsx:status` | Show current state | Check progress |
| `/opsx:resume` | Resume previous work | New session |
| `/opsx:onboard` | Guided tutorial | First-time users |

Codex mapping: Replace `/opsx:<action>` with `/prompts:opsx-<action>`

## 5. Choosing the Right Workflow

### When to use `/opsx:propose`
- You have a clear idea of what you want to build
- You want all artifacts generated in one step
- Quick start for well-defined features

### When to use `/opsx:new` + `/opsx:continue`
- You want to think through each artifact
- Requirements may evolve as you write
- Learning the workflow for the first time

### When to use `/opsx:ff`
- You have clear requirements but want to review before implementation
- Similar to propose but gives you a checkpoint before apply

### When to use `/opsx:explore`
- You're not sure about the approach
- Comparing multiple solutions
- Investigating a complex problem

## 6. Writing Good Specs

### Proposal Best Practices
- Keep the "Why" section to 1-2 sentences
- List all affected capabilities explicitly
- Mark breaking changes with **BREAKING**

### Spec Best Practices
- Use SHALL/MUST for normative requirements
- Every requirement needs at least one scenario
- Scenarios use WHEN/THEN format
- Keep scenarios testable and specific

### Design Best Practices
- Include when: cross-cutting changes, new dependencies, security/performance implications
- State decisions with rationale, not just what but why
- Include rollback plan for risky changes

### Tasks Best Practices
- Each task should be completable in one session
- Use checkbox format exactly: `- [ ] X.Y Task description`
- Order by dependency

## 7. Common Patterns

### Feature Development
```
/opsx:propose add-feature-x
/opsx:apply add-feature-x
/opsx:verify add-feature-x
/opsx:archive add-feature-x
```

### Bug Fix with Investigation
```
/opsx:explore
(understand the problem)
/opsx:propose fix-bug-y
/opsx:apply fix-bug-y
/opsx:archive fix-bug-y
```

### Refactoring
```
/opsx:new refactor-module-z
/opsx:continue refactor-module-z
(maybe skip design for simple refactors)
/opsx:ff refactor-module-z
/opsx:apply refactor-module-z
/opsx:verify refactor-module-z
```

### Multi-change Sprint
```
/opsx:status
/opsx:batch-apply
(select multiple changes)
/opsx:bulk-archive
```

## 8. Troubleshooting

### "Change not found"
- Check spelling of the change name
- Use `/opsx:status` to list active changes
- Use `/opsx:resume` to pick up previous work

### "Dependency not satisfied"
- Artifacts must be created in order: proposal → specs → design → tasks
- Use `/opsx:continue` to create the next artifact

### "Tasks not updating"
- Ensure checkbox format is exact: `- [ ]` and `- [x]`
- Check that you're editing the correct change's tasks.md

### Installation Issues
- Run `/openspec --check` to diagnose
- Check `~/.openspec/.opsx-config.yaml` exists
- Verify platform directory has expected files
