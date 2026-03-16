---
description: OpenSpec workflow - AI-native spec-driven development (explore, propose, new, continue, ff, apply, batch-apply, verify, sync, archive, bulk-archive, resume, status, onboard)
---

# OpenSpec Workflow (v1.0.0)

You are the **OpenSpec** entry point — an AI-native spec-driven development system.

## Meta-Command Router

Parse the argument after `/openspec` and route accordingly:

### `--help` or `-h` or no argument

Display the command reference card:

```
## OpenSpec v1.0.0 — Command Reference

**Core workflow:**

| Command | What it does |
|---------|--------------|
| `/opsx:propose <name>` | Create a change and generate all artifacts in one step |
| `/opsx:explore` | Think through problems before/during work |
| `/opsx:apply <name>` | Implement tasks from a change |
| `/opsx:archive <name>` | Archive a completed change |

**Step-by-step workflow:**

| Command | What it does |
|---------|--------------|
| `/opsx:new <name>` | Start a new change, step through artifacts one at a time |
| `/opsx:continue <name>` | Continue working on an existing change |
| `/opsx:ff <name>` | Fast-forward: create all artifacts at once |

**Quality & maintenance:**

| Command | What it does |
|---------|--------------|
| `/opsx:verify <name>` | Verify implementation matches artifacts |
| `/opsx:sync <name>` | Sync delta specs to main specs |
| `/opsx:bulk-archive` | Archive multiple changes at once |
| `/opsx:batch-apply` | Select multiple changes, execute serial or parallel |
| `/opsx:status <name>` | Check current progress |

**Session management:**

| Command | What it does |
|---------|--------------|
| `/opsx:resume` | Resume a previous change — list active changes and pick up |

**Getting started:**

| Command | What it does |
|---------|--------------|
| `/opsx:onboard` | Guided tutorial — walk through a complete cycle |

**Settings:**

| Command | What it does |
|---------|--------------|
| `/openspec --help` | Show this reference card |
| `/openspec --version` | Show current version |
| `/openspec --language <en\|zh>` | Switch output language |
| `/openspec --doc` | Show the embedded guide |
```

### `--version` or `-v`

Read `~/.openspec/.opsx-config.yaml` and display:

```
OpenSpec Local Skill v<version>
Language: <language>
Platform: <platform>
RuleFile: <ruleFile>
```

### `--check`

Validate the current OpenSpec installation and workspace configuration:

1. **Check shared config** — verify `~/.openspec/.opsx-config.yaml` exists and is readable
2. **Check platform files** — verify commands/prompts and skill files exist for the configured platform
3. **Check workspace** — verify the workspace has the required rule file (`CLAUDE.md`, `AGENTS.md`, or `GEMINI.md`)
4. **Check openspec directory** — if workspace has an `openspec/` directory, verify its structure

Output format:

```
## OpenSpec Installation Check

**Config**: ✓ Found (~/.openspec/.opsx-config.yaml)
  - version: 1.0.0
  - platform: claude
  - language: en

**Platform Files**:
  ✓ ~/.claude/commands/openspec.md
  ✓ ~/.claude/commands/opsx/
  ✓ ~/.claude/skills/openspec/

**Workspace**: /path/to/project
  ✓ CLAUDE.md (rule file)
  ✓ openspec/ directory found
  ✓ openspec/changes/ exists

**Summary**: All checks passed ✓
```

If any check fails, show `✗` with the issue and suggest fixes:

```
**Config**: ✗ Not found
  → Run: ./install.sh --platform <claude|codex|gemini>

**Workspace**: /path/to/project
  ✗ CLAUDE.md (rule file missing)
  → Re-run install with --workspace /path/to/project
```

### `--language <en|zh>`

1. Read `~/.openspec/.opsx-config.yaml`
2. Update the `language` field to the specified value (`en` or `zh`)
3. Write the file back
4. Confirm:
   - If `zh`: "语言已切换为中文。所有 `/opsx:*` 命令将以中文响应。"
   - If `en`: "Language switched to English. All `/opsx:*` commands will respond in English."

### `--doc`

Display the embedded OpenSpec guide **in the current language**.

1. Read `~/.openspec/.opsx-config.yaml` for the `language` field
2. Determine the guide file:
   - If `language: zh` → read `~/.openspec/skills/openspec/GUIDE-zh.md`
   - If `language: en` or missing → read `~/.openspec/skills/openspec/GUIDE-en.md`
3. Output the full contents of the guide file

If the file does not exist, display:
```
文档未找到。请确认 ~/.openspec/skills/openspec/GUIDE-<lang>.md 存在。
Guide not found. Please verify ~/.openspec/skills/openspec/GUIDE-<lang>.md exists.
```

### Unknown flags

If the argument starts with `--` and is not one of:
- `--help`
- `--version`
- `--check`
- `--doc`
- `--language`

Then report it as unsupported and show `/openspec --help`.

### Any other non-flag argument

Treat the argument as a change description and route to `/opsx:propose`. For example:

- `/openspec add dark mode` → execute as `/opsx:propose add-dark-mode`
- `/openspec fix login bug` → execute as `/opsx:propose fix-login-bug`

Derive a kebab-case name from the description and proceed with the propose workflow.

## Philosophy

```
→ fluid not rigid
→ iterative not waterfall
→ easy not complex
→ built for brownfield not just greenfield
→ scalable from personal projects to enterprises
```
