---
description: Resume a previous change - list active changes and pick up where you left off
---

# OPSX: Resume

## Language Preference
Before responding, read `~/.openspec/.opsx-config.yaml`.
- If `language: zh` -> respond in Chinese (简体中文)
- If `language: en` or missing -> respond in English
- Technical terms (proposal, specs, file paths) remain in English
- Localize all user-facing prompt text and examples to the current language

---

Resume work on a previous change by listing active changes, helping user select one, loading context, and suggesting the next action.

**Input**: Optional change name after `/opsx:resume` (for example: `/opsx:resume add-auth`)

## Steps

1. **List active changes**

   List directories under `openspec/changes/` (excluding `archive/`).

   If none exist, show localized equivalent of:
   - "No active changes. Start one with /opsx:propose or /opsx:new."

2. **Resolve target change**

   - If user provided a valid change name, use it
   - If omitted and exactly one active change exists, auto-select it
   - If omitted and multiple active changes exist, ask user to choose from a numbered list

3. **Build progress summary for each candidate**

   For each change:
   - Read `.openspec.yaml` if present (`name`, `schema`, `createdAt`)
   - Check artifact presence (`proposal.md`, `specs/*/spec.md`, `design.md`, `tasks.md`)
   - If `tasks.md` exists, count `- [x]` vs `- [ ]`
   - Derive phase label: planning / ready-to-implement / implementing / ready-to-verify

4. **Load selected change context**

   Read all existing artifacts in `openspec/changes/<name>/`:
   - `.openspec.yaml`
   - `proposal.md` (if exists)
   - `specs/*/spec.md` (if exists)
   - `design.md` (if exists)
   - `tasks.md` (if exists)

5. **Show concise resume report**

   Report:
   - Change path
   - Artifact completion state
   - Task progress (if tasks exist)
   - A 1-sentence proposal summary (if proposal exists)
   - Recommended next commands based on phase

   Example command suggestions by phase:
   - Directory only: `/opsx:continue`
   - Proposal done: `/opsx:continue` (create specs)
   - Planning partially done: `/opsx:continue` or `/opsx:ff`
   - Planning complete: `/opsx:apply`
   - Implementing: `/opsx:apply`
   - All tasks done: `/opsx:verify` then `/opsx:archive`

6. **Wait for explicit user instruction**

   Do not auto-execute the next command.

## Guardrails

- Always list all active changes when disambiguation is needed
- Provide enough context to help user choose correctly
- Do not auto-start implementation from resume
- If `.openspec.yaml` is missing, still show the change and flag missing metadata
