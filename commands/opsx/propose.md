---
description: Propose a new change - create it and generate all artifacts in one step
---

# OPSX: Propose

## Language Preference
Before responding, read `~/.openspec/.opsx-config.yaml`.
- If `language: zh` → respond in Chinese (简体中文)
- If `language: en` or missing → respond in English
- Technical terms (proposal, specs, file paths) remain in English

---

Propose a new change - create the change and generate all artifacts in one step.

I'll create a change with artifacts:
- proposal.md (what & why)
- specs/<capability>/spec.md (requirements and scenarios)
- design.md (how)
- tasks.md (implementation steps)

When ready to implement, run `/opsx:apply`

---

**Input**: The argument after `/opsx:propose` is the change name (kebab-case), OR a description of what the user wants to build.

**Steps**

1. **If no input provided, ask what they want to build**

   Ask the user directly with an open-ended question:
   > "What change do you want to work on? Describe what you want to build or fix."

   From their description, derive a kebab-case name (e.g., "add user authentication" → `add-user-auth`).

   **IMPORTANT**: Do NOT proceed without understanding what the user wants to build.

2. **Create the change directory**

   ```bash
   mkdir -p openspec/changes/<name>/specs
   ```

   Then create `.openspec.yaml`:
   ```yaml
   name: <name>
   schema: spec-driven
   createdAt: <YYYY-MM-DDTHH:mm:ss>
   ```

   Write this to `openspec/changes/<name>/.openspec.yaml`.

3. **Determine the artifact build order**

   The standard dependency order for the `spec-driven` schema is:
   - `proposal` (no dependencies)
   - `specs` (requires: proposal)
   - `design` (requires: proposal, optional)
   - `tasks` (requires: specs; design recommended when needed)

   Check which artifacts already exist by looking for the files:
   - `openspec/changes/<name>/proposal.md`
   - `openspec/changes/<name>/specs/*/spec.md`
   - `openspec/changes/<name>/design.md`
   - `openspec/changes/<name>/tasks.md`

4. **Create artifacts in dependency order**

   Loop through artifacts in dependency order (artifacts with no pending dependencies first):

   a. **For each artifact that is ready (dependencies satisfied)**:
      - Read any completed dependency files for context
      - Follow the artifact templates defined in the OpenSpec Workflow skill
      - Create the artifact file at the correct path
      - Show brief progress: "Created <artifact-id>"

   b. **Continue until all required artifacts are complete**
      - After creating each artifact, check what's now unblocked
      - Stop when `tasks.md` is created (all apply-requires satisfied)

   c. **If an artifact requires user input** (unclear context):
      - Ask the user directly to clarify
      - Then continue with creation

5. **Show final status**

   List all files in `openspec/changes/<name>/` to confirm artifacts exist.

**Output**

After completing all artifacts, summarize:
- Change name and location
- List of artifacts created with brief descriptions
- What's ready: "All artifacts created! Ready for implementation."
- Prompt: "Run `/opsx:apply` to start implementing."

**Artifact Creation Guidelines**

- Follow the artifact templates from the OpenSpec Workflow skill (SKILL.md)
- Read dependency artifacts for context before creating new ones
- **proposal.md**: Focus on WHY and WHAT — include Why, What Changes, Capabilities, Impact sections
- **specs/**: Use ADDED/MODIFIED/REMOVED format with WHEN/THEN scenarios
- **design.md**: Include Context, Goals/Non-Goals, Decisions, Risks sections
- **tasks.md**: Use numbered checkbox format `- [ ] X.Y Task description`

**Guardrails**
- Create ALL artifacts needed for implementation (proposal → specs → design → tasks)
- Always read dependency artifacts before creating a new one
- If context is critically unclear, ask the user — but prefer making reasonable decisions to keep momentum
- If a change with that name already exists, ask if user wants to continue it or create a new one
- Verify each artifact file exists after writing before proceeding to next
