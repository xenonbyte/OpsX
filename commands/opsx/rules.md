---
description: Generate project constraint documents using unified type packs and repository signals
---

# OPSX: Rules

## Language Preference
Before responding, read `~/.openspec/.opsx-config.yaml`.
- If `language: zh` → respond in Chinese (简体中文)
- If `language: en` or missing → respond in English
- Technical terms (rule file, profiles, file paths) remain in English

---

Generate a platform-aware project constraint document from a unified rules model.

## Command Interface

```bash
/opsx:rules <type> [profile] [--file <name>]
```

### Type (required unless auto-detected)
- `tech`
- `ux`
- `writing`
- `other`

### Profile
- `tech`: `web | api | fullstack | android | ios | harmony | desktop | general`
- `ux`: `product | design-system | research | general`
- `writing`: `docs | blog | spec | proposal | general`
- `other`: `general` only

### Alias mapping
If first argument is one of:
- `web | api | fullstack | android | ios | harmony | desktop`

Treat it as:
- `tech <that-profile>`

### Invalid legacy input
If user uses `mobile`, stop and return:
- "`mobile` type has been removed. Use `/opsx:rules android|ios|harmony` instead."

### Default behavior (no args)
1. Detect repository signals
2. Infer `type/profile`
3. If inference fails, use `other general`

## Output file mapping by platform

Read `~/.openspec/.opsx-config.yaml` field `platform`:
- `claude` → output `CLAUDE.md`
- `codex` → output `AGENTS.md`
- `opencode` → output `AGENTS.md`
- `openclaw` → output `AGENTS.md`
- `gemini` → output `GEMINI.md`

If `--file` is provided, it overrides platform default.

## Generation model (3 layers)

### Layer 1: Base rules (always include)
Include actionable, testable rules for:
- project goals and boundaries
- change workflow and review flow
- commit/PR standards
- quality gates
- prohibited actions
- Definition of Done

### Layer 2: Type Pack rules
Inject rules based on selected `type`:

- `tech`: architecture constraints, coding standards, test strategy, dependency/security controls, release/rollback
- `ux`: design principles, accessibility/usability checks, design review checkpoints, consistency rules, delivery contract
- `writing`: audience and tone, structure templates, factual validation, citation standards, editorial workflow
- `other`: work breakdown, deliverable templates, review rubric, collaboration cadence

### Layer 3: Project signals
Scan project files (non-destructive) and strengthen rules using detected evidence:
- build/test/lint config
- directory structure
- existing standards files
- language/framework indicators

Priority:
- explicit user args > repository facts > type defaults

## Rule quality requirements

Every generated rule must be:
- executable (contains concrete action)
- verifiable (has observable check)
- classified as `MUST` or `SHOULD`

Avoid generic slogans without checks.

## Suggested document structure

```markdown
# Project Constraints

## 1. Scope and Boundaries
## 2. Workflow Rules
## 3. Quality Gates
## 4. Type-Specific Rules
## 5. Project-Signal Overrides
## 6. Definition of Done
```

## Examples

```bash
/opsx:rules tech android
/opsx:rules ux design-system
/opsx:rules writing docs
/opsx:rules other
/opsx:rules android
/opsx:rules tech api --file AGENTS.md
```

## Completion message

After writing file, report:
- resolved `type/profile`
- target filename and absolute path
- key rule packs included (Base + Type + Signals)
