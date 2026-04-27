---
name: opsx
description: Run OpsX spec-driven development without the OpsX CLI by creating and maintaining `.opsx/changes/*` artifacts, implementing tasks, verifying against requirements, syncing deltas, and archiving changes. Use when users ask for `/opsx-*` or explicit `$opsx-*` workflow actions.
---

# OpsX Workflow

Use OpsX as a schema-driven workflow system. Keep one change per folder and keep artifacts aligned.

## Resolve Config

Read config in this target order before replying:
1. `.opsx/changes/<name>/change.yaml` when a specific change is active
2. `.opsx/config.yaml` if present
3. `~/.opsx/config.yaml`

Use the resolved config for:
- `schema`
- `language`
- `context`
- `rules`
- `securityReview`

If `language: zh`, respond in Chinese (简体中文). Otherwise respond in English.
Keep file paths, artifact names, and command tokens in English.

## Invocation Model

Canonical workflow name is `opsx`.

- Claude/Gemini public routes: `/opsx-*`
- Codex public routes: `$opsx-*`

On Codex, treat explicit action routes as command selection hints, not a reliable inline-argument transport. Use request details already present in the conversation.

## Work Directly On Files

Operate without the OpsX CLI. Use the repository files under `.opsx/`.

Typical structure:

```text
.opsx/
├── config.yaml
├── active.yaml
├── changes/
│   └── <change-name>/
│       ├── change.yaml
│       ├── proposal.md
│       ├── specs/<capability>/spec.md
│       ├── design.md
│       ├── state.yaml
│       ├── context.md
│       ├── drift.md
│       └── tasks.md
└── specs/
```

## Schema Runtime

Read `schemas/<schema>/schema.json` to determine artifacts and dependencies.
For the default `spec-driven` schema, the artifacts are proposal, specs, design, optional `security-review`, and tasks.

## Phase 3 Preflight

Before acting, read workspace state in this order when files exist:
1. `.opsx/config.yaml`
2. `.opsx/active.yaml`
3. `.opsx/changes/<active-change>/state.yaml` when an active change exists
4. `.opsx/changes/<active-change>/context.md` when an active change exists
5. Current artifacts (`proposal.md`, `specs/`, `design.md`, optional `security-review.md`, and `tasks.md`) when an active change exists

If required files are missing, report the missing workspace/active-change state honestly and follow route-specific fallback guidance. Do not auto-create workspace or active-change files from status-style routes.

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

1. Identify the workflow action and target change.
2. Resolve config from change metadata, project config, then global config.
3. Run the strict preflight reads (`.opsx/config.yaml`, `.opsx/active.yaml`, active `state.yaml`, active `context.md`, and current artifacts when present).
4. Read persisted runtime state (`stage`, `nextAction`, `warnings`, `blockers`, and artifact hash status) from `state.yaml`; treat `context.md` and `drift.md` as persisted sidecars, not chat memory.
5. For `status` and `resume`, keep behavior read-only: warn on hash drift, reload from disk, and do not refresh stored hashes from read-only routes.
6. Apply project context, per-artifact rules, and `securityReview` policy before writing.
7. Read dependency artifacts before writing a new artifact.
8. Run `spec checkpoint` before entering `tasks`, and `task checkpoint` before entering `apply`.
9. During `apply`, execute one top-level task group, run `execution checkpoint`, persist verification command/result plus changed files, refresh `context.md` / `drift.md`, then stop.
10. Report changed files, current state, next step, and blockers.

## Guardrails

- Ask concise clarification questions when missing scope can materially change behavior.
- Keep `status` and `resume` strictly read-only; do not mutate `.opsx/active.yaml`, `state.yaml`, `context.md`, or `drift.md` from those routes.
- When artifact hash drift is detected, warn and reload from disk first; refresh stored hashes only after accepted checkpoint/state writes.
- Treat `allowedPaths` / `forbiddenPaths` as warnings during Phase 4. Do not hard-block `verify` or `archive` yet.
- Hard enforcement for `verify` / `archive` path and drift gates is deferred to Phase 7.
- Do not skip dependency checks silently.
- Do not archive incomplete changes unless the user explicitly accepts the risk.
- Keep outputs concise and action-oriented.

## Resources

- Docs: `docs/commands.md`, `docs/codex.md`, `docs/customization.md`
- Schema: `schemas/spec-driven/schema.json`
