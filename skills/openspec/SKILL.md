---
name: openspec
description: Run OpenSpec spec-driven development without the OpenSpec CLI by creating and maintaining `openspec/changes/*` artifacts, implementing tasks, verifying against requirements, syncing deltas, and archiving changes. Use when users ask for `/openspec`, `/opsx:*`, Codex `/prompts:openspec`, Codex `/prompts:opsx-*`, or explicit `$openspec` workflow help.
---

# OpenSpec Workflow

Use OpenSpec as a schema-driven workflow system. Keep one change per folder and keep artifacts aligned.

## Resolve Config

Read config in this order before replying:
1. `openspec/changes/<name>/.openspec.yaml` when a specific change is active
2. `openspec/config.yaml` if present
3. `~/.openspec/.opsx-config.yaml`

Use the resolved config for:
- `schema`
- `language`
- `profile`
- `context`
- `rules`
- `securityReview`

If `language: zh`, respond in Chinese (简体中文). Otherwise respond in English.
Keep file paths, artifact names, and command tokens in English.

## Invocation Model

Canonical workflow names are `openspec` and `opsx`.

- Claude/Gemini preferred: `/openspec <request>` and `/opsx:*`
- Codex preferred: `$openspec <request>`
- Codex explicit routes: `/prompts:openspec` and `/prompts:opsx-*`

On Codex, treat `/prompts:*` as routing commands, not a reliable inline-argument transport.

## Work Directly On Files

Operate without the OpenSpec CLI. Use the repository files under `openspec/`.

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

## Schema Runtime

Read `schemas/<schema>/schema.json` to determine artifacts and dependencies.
For the default `spec-driven` schema, the artifacts are proposal, specs, design, optional `security-review`, and tasks.

## Security Review Triggering

- If change metadata or project config explicitly marks a change as security-sensitive, treat `security-review.md` as required before `tasks`.
- If the change touches authentication, authorization, tokens, sessions, cookies, uploads, payments, admin flows, PII, secrets, tenant isolation, webhooks, callbacks, encryption, or signatures, recommend `security-review.md` even if the user did not ask for it.
- If the user chooses to skip a recommended security review, record the waiver and the reason in artifacts before continuing.
- Canonical security-review states are `required`, `recommended`, `waived`, and `completed`.

Recommended change metadata shape:

```yaml
name: <change-name>
schema: spec-driven
createdAt: <ISO-8601>
securitySensitive: true
securityWaiver:
  approved: false
  reason: ""
```

## Checkpoints

- `spec checkpoint`: after `design`, before `tasks`
- `task checkpoint`: after `tasks`, before `apply`
- `execution checkpoint`: after each top-level task group during `apply`
- Canonical checkpoint states are `PASS`, `WARN`, and `BLOCK`.
- Checkpoints do not create `spec-review.md`, `task-review.md`, or `execution-review.md`.
- When a checkpoint finds issues, update existing artifacts such as `proposal.md`, `specs/*.md`, `design.md`, `security-review.md`, or `tasks.md`.

## Load References On Demand

If `language: zh`:
- Read `references/artifact-templates-zh.md` for artifact writing rules.
- Read `references/action-playbooks-zh.md` for action behavior.

If `language: en`:
- Read `references/artifact-templates.md` for artifact writing rules.
- Read `references/action-playbooks.md` for action behavior.

## Default Execution Loop

1. Identify the active change name.
2. Inspect artifact presence and dependency readiness from the active schema.
3. Apply project context, per-artifact rules, and `securityReview` policy from `openspec/config.yaml`.
4. Read dependency artifacts before writing a new artifact.
5. Run `spec checkpoint` before entering `tasks`, and `task checkpoint` before entering `apply`.
6. During `apply`, run `execution checkpoint` after each top-level task group.
7. Create or update files using the schema and template rules.
8. Report changed files, current state, next step, and blockers.

## Profile Guidance

- `core`: focus on `propose`, `explore`, `apply`, `archive`
- `expanded`: allow the full command surface including `new`, `continue`, `ff`, `verify`, `sync`, `resume`, `status`, and onboarding

## Guardrails

- Ask concise clarification questions when missing scope can materially change behavior.
- Do not skip dependency checks silently.
- Do not archive incomplete changes unless the user explicitly accepts the risk.
- Keep outputs concise and action-oriented.

## Resources

- Docs: `docs/commands.md`, `docs/codex.md`, `docs/customization.md`
- Schema: `schemas/spec-driven/schema.json`
