# Customization

This document is the configuration reference for OpsX. The README owns install
and command usage; this file explains how `.opsx/config.yaml`, global config,
and per-change metadata affect workflow behavior.

## Configuration Layers

OpsX resolves configuration in this order:

1. change metadata: `.opsx/changes/<name>/change.yaml`
2. project config: `.opsx/config.yaml`
3. global config: `~/.opsx/config.yaml`
4. package defaults

Later layers provide defaults; earlier layers override or extend them. Use
project config for team-wide workflow policy, and use change metadata only for
exceptions that apply to one change.

## Recommended Project Config

`$opsx-new` / `/opsx-new` and `$opsx-propose` / `/opsx-propose` initialize
`.opsx/config.yaml` when starting the first change in an uninitialized
workspace. The agent should ask briefly before writing it: confirm schema,
whether to lock project language, and whether to add stable context/rules now.
If the user chooses defaults, OpsX writes an intentionally sparse schema-only
config. Add team-wide language, context, rules, and security policy only when
the project wants to lock them in. You can also create or edit
`.opsx/config.yaml` in the project workspace:

```yaml
schema: spec-driven
language: "zh"
context: |
  Project: your project
  Tech stack: TypeScript, React, Node.js
  Constraints: keep public APIs stable, update docs with behavior changes
rules:
  proposal: "Call out user impact, migration impact, and rollback impact."
  design: "Explain operational tradeoffs, data flow, and failure modes."
  tasks: "Keep tasks small, dependency-ordered, and grouped by top-level milestone."
  tdd:
    mode: "strict"
    requireFor:
      - "behavior-change"
      - "bugfix"
    exempt:
      - "docs-only"
      - "copy-only"
      - "config-only"
securityReview:
  mode: "heuristic"
  required: false
  allowWaiver: true
  heuristicHint: "auth, permission, token, session, cookie, upload, payment, admin, pii, secret, tenant, webhook, callback, encryption, signature"
```

## Project Config Fields

| Field | Type | Default | Meaning |
| --- | --- | --- | --- |
| `schema` | string | `spec-driven` | Workflow schema to use. The shipped schema is `spec-driven`. |
| `language` | `en` or `zh` | `en` | Preferred agent response language for OpsX guidance. Invalid values fall back to `en`. |
| `context` | multiline string | empty | Durable project background that should influence proposals, designs, specs, tasks, and verification. |
| `rules.proposal` | string | empty | Extra instructions applied when writing `proposal.md`. |
| `rules.design` | string | empty | Extra instructions applied when writing `design.md`. |
| `rules.tasks` | string | empty | Extra instructions applied when writing `tasks.md`. |
| `rules.tdd` | object | strict defaults | Task-checkpoint policy for test planning and evidence. |
| `securityReview` | object | heuristic defaults | Security-review gate policy. |

`context` should contain facts that are stable for the whole project: product
goals, stack, deployment model, compliance constraints, owner preferences, or
architectural invariants. Keep request-specific details in the active change
artifacts instead of the project config.

## TDD Policy

`rules.tdd` controls the task checkpoint before `apply`.

```yaml
rules:
  tdd:
    mode: "strict"
    requireFor:
      - "behavior-change"
      - "bugfix"
    exempt:
      - "docs-only"
      - "copy-only"
      - "config-only"
```

Modes:
- `strict`: missing required TDD evidence produces `BLOCK`.
- `light`: missing required TDD evidence produces `WARN`.
- `off`: skips TDD findings.

Required classes:
- Defaults are `behavior-change` and `bugfix`.
- A required task group must expose `RED` and `VERIFY` evidence.
- `REFACTOR` is optional.

Exempt classes:
- Defaults are `docs-only`, `copy-only`, and `config-only`.
- Exempt task groups should include a visible `TDD Exemption:` reason.
- Custom `requireFor` and `exempt` values extend the defaults; they do not
  remove the built-in classes.

Use `strict` for product behavior, runtime behavior, migrations, and bug fixes.
Use `light` when a team wants guidance without hard blocking. Use `off` only for
repositories where tests are handled outside OpsX.

## Security Review Policy

`securityReview` controls whether `security-review.md` is required before
`tasks`.

```yaml
securityReview:
  mode: "heuristic"
  required: false
  allowWaiver: true
  heuristicHint: "auth, permission, token, session, cookie, upload, payment, admin, pii, secret, tenant, webhook, callback, encryption, signature"
```

Fields:
- `mode: "heuristic"` recommends `security-review.md` when request/proposal/spec/design text contains security-sensitive hints.
- `mode: "off"` disables heuristic recommendations.
- `required: true` makes `security-review.md` a hard gate before `tasks`.
- `allowWaiver: false` prevents waived security review from satisfying the gate.
- `heuristicHint` is a comma-separated keyword list added to the built-in security signal set.

Notes:
- `mode: "required"` is accepted as legacy input and normalized to
  `required: true` plus `mode: "heuristic"`.
- Security-review state is reported as `required`, `recommended`, `waived`, or
  `completed`.
- A waiver is valid only when the artifacts record the reason.

## Global Config

`~/.opsx/config.yaml` is the shared-home config used by install/runtime
commands. It is best for personal defaults such as preferred language.

The global config does not store selected platforms or rule-file names.
Installed platform state is derived from manifest files under
`~/.opsx/manifests/*.manifest`; run `opsx check` to inspect both canonical paths
and any legacy migration candidates.

Recommended use:
- Keep `language` here if you want the same response language across projects.
- Keep project-specific `context`, `rules`, and `securityReview` in
  `.opsx/config.yaml`.
- Do not use global config to encode repository-specific policy.

## Change Metadata

Use `.opsx/changes/<name>/change.yaml` for per-change metadata and overrides.

```yaml
name: add-admin-bulk-delete
schema: spec-driven
createdAt: 2026-03-26T21:30:00Z
securitySensitive: true
securityWaiver:
  approved: false
  reason: ""
```

Common fields:
- `name`: change directory name.
- `schema`: workflow schema, usually `spec-driven`.
- `createdAt`: ISO-8601 timestamp.
- `securitySensitive: true`: forces `security-review.md` as a hard gate.
- `securityWaiver.approved: true`: valid only when waiver is allowed and
  `reason` explains the decision.

Because change metadata is the highest-priority layer, it can also override
project config fields for one change:

```yaml
name: docs-refresh
schema: spec-driven
createdAt: 2026-03-26T21:30:00Z
rules:
  tdd:
    mode: "light"
securityReview:
  mode: "off"
```

Use per-change overrides sparingly. If the same override appears repeatedly,
move it into `.opsx/config.yaml`.

## Checkpoint Effects

Configuration affects these gates:

- `spec-split-checkpoint`: after `specs`, before `design`.
- `spec checkpoint`: after `design`, before `tasks`.
- `task checkpoint`: after `tasks`, before `apply`; applies `rules.tdd`.
- `execution checkpoint`: after each top-level task group during `apply`.
- `implementation-consistency-checkpoint`: after implementation, before verify acceptance.

Checkpoint statuses are `PASS`, `WARN`, and `BLOCK`. Checkpoints patch existing
artifacts and state instead of creating separate review files.

## Practical Profiles

Strict product work:

```yaml
rules:
  tdd:
    mode: "strict"
securityReview:
  mode: "heuristic"
  required: false
```

Docs-heavy repository:

```yaml
rules:
  tdd:
    mode: "light"
    exempt:
      - "docs-only"
      - "copy-only"
      - "config-only"
      - "examples-only"
securityReview:
  mode: "heuristic"
  required: false
```

Security-sensitive project:

```yaml
securityReview:
  mode: "heuristic"
  required: true
  allowWaiver: false
```

## Rollout And Rollback Expectations

When a change affects behavior, APIs, data, deployment, or operator workflow,
keep rollout, migration, rollback, compatibility, and verification details
aligned across proposal, specs, design, and tasks.

- Missing detail without contradiction should produce `WARN`.
- Direct contradiction should produce `BLOCK`.
- If required `security-review.md` is missing at `task checkpoint`, handoff to
  `apply` remains blocked.
