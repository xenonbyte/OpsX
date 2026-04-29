# Customization

## Project Config

Create or edit `.opsx/config.yaml` in your project workspace:

```yaml
schema: spec-driven
language: "zh"
context: |
  Project: your project
  Tech stack: TypeScript, React, Node.js
rules:
  proposal: "Call out rollback impact."
  design: "Explain operational tradeoffs."
  tasks: "Keep tasks small and dependency-ordered."
securityReview:
  mode: "heuristic"
  required: false
  allowWaiver: true
  heuristicHint: "auth, permission, token, session, cookie, upload, payment, admin, pii, secret, tenant, webhook, callback, encryption, signature"
```

## Precedence

1. change metadata (`.opsx/changes/<name>/change.yaml`)
2. project config (`.opsx/config.yaml`)
3. global config (`~/.opsx/config.yaml`)
4. package defaults

## Global Config Semantics

`~/.opsx/config.yaml` is the current shared-home config for install/runtime
commands. Shared install state is currently derived from
`~/.opsx/manifests/*.manifest`; run `opsx check` to inspect both canonical
paths and legacy migration candidates in the installed build.

- `platform` stores the last selected install target (not a single source of truth for installed platforms).
- Installed platform state is derived from manifest files under `~/.opsx/manifests/*.manifest`.
- `opsx check` reports both views so partial uninstall states are explicit and non-blocking.

## Security Review Policy

- `securityReview.required: true` means `security-review.md` is a hard gate before `tasks`
- `securityReview.mode: "heuristic"` means the workflow should recommend `security-review.md` on common security-sensitive changes
- `securityReview.allowWaiver: true` allows skipping the review only when the artifacts record the waiver reason
- Security-review state is surfaced as `required`, `recommended`, `waived`, or `completed`

## Change Metadata

Use `.opsx/changes/<name>/change.yaml` for per-change overrides.

Recommended template:

```yaml
name: add-admin-bulk-delete
schema: spec-driven
createdAt: 2026-03-26T21:30:00
securitySensitive: true
securityWaiver:
  approved: false
  reason: ""
```

Rules:
- `securitySensitive: true` is a hard gate and requires `security-review.md` before `tasks`
- `securityWaiver.approved: true` is valid only when the workflow allows waiver and the reason is written into artifacts
- Leave `securitySensitive` absent for normal changes and let heuristics decide whether to recommend a review

## Checkpoints

- `spec-split-checkpoint` runs after `specs` and before `design`
- `spec checkpoint` runs after `design` and before `tasks`
- `task checkpoint` runs after `tasks` and before `apply`
- `execution checkpoint` runs after each top-level task group during `apply`
- `implementation-consistency-checkpoint` runs after implementation and before verify acceptance
- Checkpoints use `PASS`, `WARN`, and `BLOCK`
- Checkpoints patch existing artifacts instead of creating separate review files

## Rollout and Rollback Expectations

- Rollout, migration, rollback, and compatibility detail should stay aligned across proposal/spec/design/tasks.
- Missing detail without contradiction should produce `WARN`.
- Direct contradiction should produce `BLOCK`.
- If required `security-review.md` is still missing at `task checkpoint`, handoff to `apply` remains blocked.
