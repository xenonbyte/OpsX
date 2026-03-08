---
description: Start a new OpenSpec change - creates change directory and prepares for proposal creation
---

# OPSX: New Change

## Language Preference
Before responding, read `~/.openspec/.opsx-config.yaml`.
- If `language: zh` → respond in Chinese (简体中文)
- If `language: en` or missing → respond in English
- Technical terms (proposal, specs, file paths) remain in English

---

You are executing the **OPSX New** command to start a new OpenSpec change.

## Your Task

1. **Ask what to build** if user hasn't specified:
   - "What would you like to build or change?"
   - "Describe the feature, bug fix, or change you want to make."

2. **Derive change name**:
   - Convert description to kebab-case
   - Examples: "add dark mode" → "add-dark-mode"
   - "Fix login bug" → "fix-login-bug"
   - "Export API" → "export-api"

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

5. **Check for project config**:
   - Read `openspec/config.yaml` if it exists
   - Note the schema and context for later use

6. **Show success message**:
   ```
   ✓ Created openspec/changes/<change-name>/
   ✓ Created .openspec.yaml

   Ready to create: proposal

   Run /opsx:continue to create the proposal, or /opsx:ff to create all planning artifacts.
   ```

7. **Display proposal template**:
   ```markdown
   ## Why
   <!-- Explain the motivation. What problem does this solve? Why now? -->

   ## What Changes
   <!-- Describe what will change. Be specific. -->

   ## Capabilities

   ### New Capabilities
   - `<name>`: <description>

   ### Modified Capabilities
   - `<existing-name>`: <what's changing>

   ## Impact
   <!-- Affected code, APIs, dependencies -->
   ```

## Examples

**User input**: "add dark mode"

**Your response**:
```
Creating change: add-dark-mode

✓ Created openspec/changes/add-dark-mode/
✓ Created .openspec.yaml

Ready to create: proposal

[Display proposal template]

Ready to create the proposal? Use /opsx:continue or tell me to proceed.
```

## Notes

- If change directory already exists, ask user to choose a different name or use `/opsx:continue`
- Schema defaults to "spec-driven" unless overridden in config.yaml
- The proposal is always the first artifact to create
- For quick full creation, suggest `/opsx:propose` instead
