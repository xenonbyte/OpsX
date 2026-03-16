---
description: Propose a new change - create it and generate all artifacts in one step
---
# OPSX: Propose

Propose a new change - create the change and generate all artifacts in one step.

## Language Preference
Before responding, read `~/.openspec/.opsx-config.yaml`.
- If `language: zh` → respond in Chinese (简体中文)
- If `language: en` or missing → respond in English

## Input

The argument after `/opsx:propose` is the change name (kebab-case), OR a description of what the user wants to build.

## Steps

1. **If no input provided, ask what they want to build**

2. **Create the change directory**:
   ```bash
   mkdir -p openspec/changes/<name>/specs
   ```

3. **Create `.openspec.yaml`**:
   Initialize with full schema:
   ```yaml
   name: <name>
   schema: spec-driven
   createdAt: <ISO-8601>
   stage: propose
   artifacts:
     proposal: { path: proposal.md }
   assumptions: []
   openQuestions: []
   ```

4. **Create artifacts in dependency order**:
   - proposal.md (what & why)
   - specs/<capability>/spec.md (requirements and scenarios)
   - design.md (how)
   - tasks.md (implementation steps)

5. **Update `.openspec.yaml` as artifacts are created**:
   - Add paths to `artifacts` block
   - Update `stage` to `tasks` when tasks.md is done

6. **Show final status**:
   - Change name and location
   - List of artifacts created
   - Prompt: "Run `/opsx:apply` to start implementing."

## Artifact Creation Guidelines

- **proposal.md**: Focus on WHY and WHAT — include Why, What Changes, Capabilities, Impact sections
- **specs/**: Use ADDED/MODIFIED/REMOVED format with WHEN/THEN scenarios
- **design.md**: Include Context, Goals/Non-Goals, Decisions, Risks sections
- **tasks.md**: Use numbered checkbox format `- [ ] X.Y Task description`


## Phase Boundary Guard (MANDATORY)

⚠️ You are in PLANNING phase. You MUST:
1. Only create/modify artifact files under `openspec/changes/<name>/`
2. NOT modify code files outside of artifact directories
3. Ask clarification questions if boundaries are unclear

Allowed: `openspec/changes/**/*.md`, `openspec/changes/**/*.yaml`
Forbidden: `src/**/*`, `lib/**/*`, `**/*.ts`, `**/*.js` (except in openspec/)