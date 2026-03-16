---
description: Start a new OpenSpec change - creates change directory and prepares for proposal creation
---
# OPSX: New Change

You are executing the **OPSX New** command to start a new OpenSpec change.

## Language Preference
Before responding, read `~/.openspec/.opsx-config.yaml`.
- If `language: zh` → respond in Chinese (简体中文)
- If `language: en` or missing → respond in English
- Technical terms (proposal, specs, file paths) remain in English

## Your Task

1. **Ask what to build** if user hasn't specified:
   - "What would you like to build or change?"
   - "Describe the feature, bug fix, or change you want to make."

2. **Derive change name**:
   - Convert description to kebab-case
   - Examples: "add dark mode" → "add-dark-mode"
   - "Fix login bug" → "fix-login-bug"

3. **Create change structure**:
   ```bash
   mkdir -p "openspec/changes/<change-name>/specs"
   ```

4. **Create metadata file** (`openspec/changes/<change-name>/.openspec.yaml`):
   ```yaml
   name: <change-name>
   schema: spec-driven
   createdAt: <timestamp in ISO 8601 format>
   ```

5. **Show success message and display proposal template**

Ready to create the proposal? Use `/prompts:opsx-continue` or tell me to proceed.

## Phase Boundary Guard (MANDATORY)

⚠️ You are in PLANNING phase. You MUST:
1. Only create/modify artifact files under `openspec/changes/<name>/`
2. NOT modify code files outside of artifact directories
3. Ask clarification questions if boundaries are unclear
4. Wait for user confirmation before phase transition

Allowed: `openspec/changes/**/*.md`, `openspec/changes/**/*.yaml`
Forbidden: `src/**/*`, `lib/**/*`, `**/*.ts`, `**/*.js` (except in openspec/)