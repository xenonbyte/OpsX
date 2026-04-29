---
name: opsx-continue
description: "Create the next ready artifact based on dependencies."
---
# OpsX route: Continue

Use this `opsx-continue` skill for this request. The shared OpsX workflow contract is embedded below, and detailed templates live in `references/` next to this file.

Workflow action: `continue`
Primary workflow entry: `$opsx-* (explicit routes only)`
Explicit action route: `$opsx-continue`

Execution rules:
- Follow the `continue` playbook from shared OpsX guidance and its referenced files.
- CLI quick checks: `opsx check`, `opsx doc`, and `opsx language <en|zh>`.
- Preflight before acting:
- Read `.opsx/config.yaml` if present to confirm schema, language, and workspace rules.
- Read `.opsx/active.yaml` if present to locate the active change pointer.
- When an active change exists, read `.opsx/changes/<active-change>/state.yaml` before acting.
- When an active change exists, read `.opsx/changes/<active-change>/context.md` before acting.
- When an active change exists, read current artifacts (`proposal.md`, `specs/`, `design.md`, optional `security-review.md`, and `tasks.md`) before mutating files.
- If required artifacts are missing, report that honestly and apply route-specific fallback guidance.
- Route fallback guidance:
- If `.opsx/config.yaml` is missing, stop and redirect to `$opsx-onboard`.
- If `.opsx/active.yaml` is missing or points to a missing change, stop and ask the user to run `$opsx-new` or `$opsx-propose`.
- Read persisted `stage` and route only to the next valid action without re-planning unrelated work.
- When `stage === APPLYING_GROUP`, continue the persisted `active.taskGroup` via apply guidance.
- Use request details already present in the conversation.
- Do not assume text typed after a `$opsx-*` command is reliably available as an inline argument in Codex.
- Security-review states are `required`, `recommended`, `waived`, `completed`.
- If config or heuristics indicate a security-sensitive change, create or recommend `security-review.md` after `design` and before `tasks`; if the user waives it, record the waiver in artifacts.
- `spec-split-checkpoint` runs after `specs` and before `design`; `spec checkpoint` runs after `design` and before `tasks`; `task checkpoint` runs after `tasks` and before `apply`, applies `rules.tdd.mode`, requires `RED` and `VERIFY` for `behavior-change` and `bugfix` groups, and accepts visible `TDD Exemption:` reasons for exempt work.
- `execution checkpoint` runs after each top-level task group during `apply`.
- Checkpoint outcomes use `PASS`, `WARN`, `BLOCK` and update existing artifacts instead of creating new review files.
- If the required change name, description, or selection is missing, ask for the minimum clarification needed.
- Read the current change state first and create only the next valid artifact.
- When files are mutated, report changed files, current state, next step, and blockers.

## Shared OpsX Workflow Contract

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

- `spec-split-checkpoint`: after `specs`, before `design`
- `spec checkpoint`: after `design`, before `tasks`
- `task checkpoint`: after `tasks`, before `apply`
- `execution checkpoint`: after each top-level task group during `apply`
- `implementation-consistency-checkpoint`: after all active task groups are implemented, before verify acceptance
- Canonical checkpoint states are `PASS`, `WARN`, and `BLOCK`.
- Checkpoints do not create `spec-review.md`, `task-review.md`, or `execution-review.md`.
- When a checkpoint finds issues, update existing artifacts such as `proposal.md`, `specs/*.md`, `design.md`, `security-review.md`, or `tasks.md`.
- Simple single-spec changes can pass `spec-split-checkpoint` inline within existing planning actions.
- Risky split-spec sets (multi-spec, cross-capability, security-sensitive, or larger requirement sets) may require a read-only reviewer pass before `design`.
- Read-only reviewer behavior is inspection-only: reviewer may read artifacts and report findings, but must not write files directly and must not create `spec-review.md`.

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
8. Run `spec-split-checkpoint` after `specs` and before `design`; run `spec checkpoint` before entering `tasks`, and run `task checkpoint` before entering `apply` using `rules.tdd.mode` (`off|light|strict`) with RED/VERIFY enforcement for `behavior-change` and `bugfix`, visible `TDD Exemption:` reasons for exempt work, and optional `REFACTOR`.
9. During `apply`, execute one top-level task group, run `execution checkpoint`, persist completed TDD steps, verification command/result, diff summary, and drift through existing state paths, refresh `context.md` / `drift.md`, then stop.
10. During `verify`, run `implementation-consistency-checkpoint` for `IMPLEMENTED` changes to confirm approved specs/tasks have evidence and unresolved drift is absent.
11. Report changed files, current state, next step, and blockers.

## Guardrails

- Ask concise clarification questions when missing scope can materially change behavior.
- Keep `status` and `resume` strictly read-only; do not mutate `.opsx/active.yaml`, `state.yaml`, `context.md`, or `drift.md` from those routes.
- When artifact hash drift is detected, warn and reload from disk first; refresh stored hashes only after accepted checkpoint/state writes.
- `verify` must emit `PASS` / `WARN` / `BLOCK`; unresolved `BLOCK` findings stop `sync`, `archive`, and bulk archive eligibility.
- `sync` must compute a conservative in-memory plan first; when findings include `BLOCK`, do not write partial sync output.
- Change-local specs are full target specs for each capability, not delta-only patches; `sync` writes those full specs into `.opsx/specs/`.
- `task checkpoint` uses `rules.tdd.mode`; required groups must expose `RED` and `VERIFY`, `REFACTOR` stays optional, and exempt groups must include visible `TDD Exemption:` reasons.
- `archive` must require verify and sync preconditions; when the stage is only `VERIFIED`, run the same safe sync check before moving to `.opsx/archive/<change-name>/`.
- `batch-apply` / `bulk-archive` must run each change in per-change isolation and report skipped/blocked reasons; global precondition failures stop the run.
- Do not skip dependency checks silently.
- Keep outputs concise and action-oriented.

## Resources

- Docs: `README.md`, `docs/customization.md`
- Schema: `schemas/spec-driven/schema.json`