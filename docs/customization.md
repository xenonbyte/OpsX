# Customization

## Project config

Create or edit `openspec/config.yaml`:

```yaml
schema: spec-driven
language: "zh"
profile: "expanded"
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

1. change metadata (`openspec/changes/<name>/.openspec.yaml`)
2. project config (`openspec/config.yaml`)
3. global config (`~/.openspec/.opsx-config.yaml`)
4. package defaults

## Profiles

- `core` keeps the command surface small
- `expanded` enables all workflow actions

## Security review policy

- `securityReview.required: true` means `security-review.md` is a hard gate before `tasks`
- `securityReview.mode: "heuristic"` means the workflow should recommend `security-review.md` on common security-sensitive changes even if the user does not know to ask for it
- `securityReview.allowWaiver: true` allows skipping the review only when the artifacts record the waiver reason
- Security-review state is surfaced as `required`, `recommended`, `waived`, or `completed`

## Change metadata

Use `openspec/changes/<name>/.openspec.yaml` for per-change overrides.

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
- `securityWaiver.approved: true` is only valid when the workflow allows waiver and the reason is written into artifacts
- leave `securitySensitive` absent for normal changes and let heuristics decide whether to recommend a review

## Checkpoints

- `spec checkpoint` runs after `design` and before `tasks`
- `task checkpoint` runs after `tasks` and before `apply`
- `execution checkpoint` runs after each top-level task group during `apply`
- Checkpoints use `PASS`, `WARN`, and `BLOCK`
- Checkpoints patch existing artifacts instead of creating `spec-review.md`, `task-review.md`, or `execution-review.md`
