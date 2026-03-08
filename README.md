# OpenSpec Skill (Multi-Platform)

OpenSpec is a spec-driven workflow skill with unified command semantics across:
- Claude
- Codex
- OpenCode
- Gemini
- OpenClaw

Use `/openspec` as the entry point and `/opsx:*` for workflow commands.

## Quick Start

Install for one platform at a time:

```bash
chmod +x install.sh uninstall.sh
./install.sh --platform claude
```

First checks:

```bash
/openspec --help
/openspec --version
/openspec --doc
```

## Platform Rule File Mapping

- Claude -> `CLAUDE.md`
- Codex -> `AGENTS.md`
- OpenCode -> `AGENTS.md`
- OpenClaw -> `AGENTS.md`
- Gemini -> `GEMINI.md`

Override target filename with `--file <name>` when using `/opsx:rules`.

## Command Reference

### Meta Commands

| Command | Explanation | Practical Example |
|---|---|---|
| `/openspec --help` | Show the full command reference card. | Use when onboarding a new teammate to the workflow. |
| `/openspec --version` | Show current local skill version and config summary. | Verify that a platform install picked up v2.0.0. |
| `/openspec --language zh` | Switch output language to Chinese. | Use in Chinese-speaking team channels. |
| `/openspec --language en` | Switch output language to English. | Use when writing specs in English for global teams. |
| `/openspec --doc` | Print the embedded practical guide. | Open docs in-session without leaving the terminal. |
| `/openspec <description>` | Shortcut route to propose a change from natural language. | `/openspec add offline cache for dashboard` |

Compatibility note:
- `/openspec --update` was removed in v2.0.0 and now silently falls back to help output.

### Workflow Commands

| Command | Explanation | Practical Example |
|---|---|---|
| `/opsx:explore` | Explore solution ideas before committing to a change. | Compare JWT vs session auth before writing artifacts. |
| `/opsx:new <name>` | Create an empty change container and metadata. | `/opsx:new add-invoice-export` |
| `/opsx:continue [name]` | Generate the next artifact based on current state. | After proposal is done, run continue to create specs. |
| `/opsx:ff [name]` | Fast-forward and generate all planning artifacts at once. | Use for well-understood internal tooling tasks. |
| `/opsx:propose <name or desc>` | Create change + proposal/specs/design/tasks in one go. | `/opsx:propose add-tenant-rate-limit` |
| `/opsx:status [name]` | Show artifact progress and task completion. | Check if a resumed change is ready for apply. |
| `/opsx:resume [name]` | List active changes and restore context. | Start a new chat and continue a half-finished feature. |
| `/opsx:apply [name]` | Implement tasks in order and mark completed items. | Execute tasks for `add-tenant-rate-limit`. |
| `/opsx:verify [name]` | Verify completeness/correctness/coherence before archive. | Confirm scenarios and tests are covered. |
| `/opsx:sync [name]` | Merge delta specs into main `openspec/specs`. | Sync updated auth requirements after implementation. |
| `/opsx:archive [name]` | Archive a completed change with date prefix. | Archive `add-tenant-rate-limit` after verify. |
| `/opsx:batch-apply` | Execute multiple selected changes serially or in parallel. | Push two independent backend tasks in one session. |
| `/opsx:bulk-archive` | Archive multiple completed changes together. | Clean up all done changes at sprint end. |
| `/opsx:onboard` | Guided tutorial through a full OpenSpec cycle. | Train a new engineer on your project workflow. |

### Constraint Command

| Command | Explanation | Practical Example |
|---|---|---|
| `/opsx:rules <type> [profile] [--file <name>]` | Generate a project constraint document using Base + Type Pack + Project Signals. | `/opsx:rules tech android` |

#### Type System

Top-level `type`:
- `tech`
- `ux`
- `writing`
- `other`

Profiles:
- `tech`: `web | api | fullstack | android | ios | harmony | desktop | general`
- `ux`: `product | design-system | research | general`
- `writing`: `docs | blog | spec | proposal | general`
- `other`: `general`

Alias behavior:
- `/opsx:rules android` is treated as `/opsx:rules tech android`.

Legacy behavior:
- `mobile` is removed. Use `android | ios | harmony`.

## Practical End-to-End Examples

### Example 1: Tech Feature (Android)

```bash
/opsx:rules tech android
/opsx:propose add-biometric-login
/opsx:apply add-biometric-login
/opsx:verify add-biometric-login
/opsx:archive add-biometric-login
```

### Example 2: UX Work (Design System)

```bash
/opsx:rules ux design-system
/opsx:propose redesign-button-states
/opsx:ff redesign-button-states
/opsx:apply redesign-button-states
/opsx:verify redesign-button-states
```

### Example 3: Writing Work (Docs)

```bash
/opsx:rules writing docs --file AGENTS.md
/opsx:propose improve-api-error-guide
/opsx:continue improve-api-error-guide
/opsx:apply improve-api-error-guide
/opsx:archive improve-api-error-guide
```

## Config

Shared config path:
- `~/.openspec/.opsx-config.yaml`

Example:

```yaml
version: "2.0.0"
platform: "claude"
language: "zh"
ruleFile: "CLAUDE.md"
```

Field meanings:
- `version`: installed skill version
- `platform`: current target platform
- `language`: output language preference
- `ruleFile`: default rule filename for the platform

## Install / Uninstall

Install:

```bash
./install.sh --platform <claude|codex|opencode|gemini|openclaw> [--workspace <path>] [--dry-run]
```

Uninstall:

```bash
./uninstall.sh --platform <claude|codex|opencode|gemini|openclaw> [--dry-run]
```

## License

MIT (inherits upstream OpenSpec licensing model)
