---
name: openspec
description: Run OpenSpec spec-driven development without the OpenSpec CLI by creating and maintaining `openspec/changes/*` artifacts (proposal, specs, design, tasks), implementing tasks, verifying against requirements, syncing deltas, and archiving changes. Use when users ask for `/openspec`, `/opsx:*`, or Codex `/prompts:opsx-*` workflows, or when they need help authoring or operating OpenSpec change lifecycle files.
---

# OpenSpec Workflow

Use OpenSpec as a fluid, iterative workflow. Keep one change per folder and keep artifacts consistent with each other.

## Resolve Language

Read `~/.openspec/.opsx-config.yaml` before replying.

- If `language: zh`, respond in Chinese (简体中文).
- If `language: en` or config is missing, respond in English.
- Keep file paths, artifact names, and command tokens in English.

## Map Invocation Format

Canonical workflow names are `openspec` and `opsx`.

- Claude/Gemini examples: `/openspec ...`, `/opsx:*`
- Codex examples: `/prompts:openspec ...`, `/prompts:opsx-*`

When user platform is Codex, always adapt displayed command text to `/prompts:` format.

## Work Directly On Files

Operate without the OpenSpec CLI. Use filesystem reads/writes under `openspec/`.

Typical structure:

```text
openspec/
├── config.yaml
├── changes/
│   └── <change-name>/
│       ├── .openspec.yaml
│       ├── proposal.md
│       ├── specs/<capability>/spec.md
│       ├── design.md
│       └── tasks.md
└── specs/
```

Initialize a new change with:

```bash
mkdir -p openspec/changes/<name>/specs
```

Then write `.openspec.yaml`:

```yaml
name: <name>
schema: spec-driven
createdAt: <YYYY-MM-DDTHH:mm:ss>
```

## Artifact Dependency Model

Use these readiness rules:

- `proposal`: requires `[]`
- `specs`: requires `[proposal]`
- `design`: requires `[proposal]`
- `tasks`: requires `[specs, design]`

Default state model:

- `BLOCKED`: missing dependencies
- `READY`: dependencies satisfied
- `DONE`: artifact file exists

## Load References On Demand

Keep context lean. Load only the needed reference file and section.

If `language: zh`:

- For artifact templates and normative writing rules, read: [references/artifact-templates-zh.md](references/artifact-templates-zh.md)
- For command workflows (`propose`, `apply`, `verify`, `sync`, `archive`, etc.), read: [references/action-playbooks-zh.md](references/action-playbooks-zh.md)

If `language: en` or missing:

- For artifact templates and normative writing rules, read: [references/artifact-templates.md](references/artifact-templates.md)
- For command workflows (`propose`, `apply`, `verify`, `sync`, `archive`, etc.), read: [references/action-playbooks.md](references/action-playbooks.md)

## Default Execution Loop

1. Identify target change name.
2. Inspect current artifact presence and dependency readiness.
3. Determine next valid action for user intent.
4. Read dependency artifacts before writing new artifacts.
5. Create or update files using required template/rules.
6. Report what changed, what is unlocked, and what is blocked.

## Route By User Intent

- User asks to start quickly: use `propose` playbook.
- User asks to start step by step: use `new` then `continue` playbook.
- User asks to generate all planning docs: use `ff` playbook.
- User asks to code: use `apply` playbook.
- User asks to validate: use `verify` playbook.
- User asks to merge delta specs: use `sync` playbook.
- User asks to finish: use `archive` or `bulk-archive` playbook.
- User asks to resume: use `resume` playbook.
- User asks for progress: use `status` playbook.
- User is new to workflow: use `onboard` playbook.

## Guardrails

- Keep workflow fluid; allow artifact edits at any time.
- Do not skip dependency checks silently.
- Do not archive incomplete changes unless user explicitly accepts the risk.
- If requirements are ambiguous, ask focused clarifying questions before implementation.
- Keep outputs concise and action-oriented.

## Output Requirements

When mutating files, always report:

- Files created or updated
- Current completion state (`proposal/specs/design/tasks`)
- Next available command or step
- Any blockers that require user input

## Resources

- GitHub: https://github.com/xenonbyte/openspec
- Docs: https://github.com/xenonbyte/openspec#readme
