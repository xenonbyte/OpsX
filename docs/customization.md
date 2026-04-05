# Customization

## Project config

Create or edit `openspec/config.yaml`:

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

1. change metadata (`openspec/changes/<name>/.openspec.yaml`)
2. project config (`openspec/config.yaml`)
3. global config (`~/.openspec/.opsx-config.yaml`)
4. package defaults

## Global config semantics

`~/.openspec/.opsx-config.yaml` is installation/runtime shared config.

- `platform` stores the last selected install target (not a single source of truth for installed platforms).
- Installed platform state is derived from manifest files under `~/.openspec/manifests/*.manifest`.
- `openspec --check` reports both views so partial uninstall states are explicit and non-blocking.

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

## Automatic checkpoint evidence

Checkpoint runtime now derives normalized evidence directly from artifacts and runtime inputs.

Planning evidence includes:
- proposal/spec/design presence
- requirement and scenario counts
- rollout/migration/rollback/compatibility signals
- task groups and checklist items
- required commitment categories from specs/design and task coverage

Execution evidence includes:
- top-level task-group identifier and completed checklist items
- implementation summary and changed files
- behavior classification (`behavior changed` vs docs-only/non-behavioral)
- referenced spec/design commitments
- verification or test evidence summary
- newly discovered constraints requiring artifact updates

Minimum execution evidence fields:
- `group id/title`
- `completed checklist items`
- `changed files or implementation summary`
- `behavior classification`
- `referenced commitments`
- `verification summary`

Derivation rules:
- docs-only/non-behavioral classification is automatically derived from changed files and evidence text when no explicit override is supplied
- template-only headings are ignored for rollout/migration inference (for example `## Migration Plan` without body detail)
- changed-files-only evidence is valid; automatic drift blocking depends on semantic implementation summary, not filename token overlap
- `commands/**` and `skills/openspec/**` changes are treated as behavior-changing by default
- behavior-changing work defaults to requiring verification evidence

## Legacy flag compatibility

Legacy review flags remain supported during migration. Compatibility rules:
- automatic normalized evidence is the primary source for core drift detection
- legacy flags can add stricter findings (`WARN`/`BLOCK`)
- legacy flags cannot downgrade a `BLOCK` produced by automatic evidence
- canonical checkpoint output remains stable for prompt and runtime callers

## Rollout and rollback expectations

- Rollout, migration, rollback, and compatibility detail should stay aligned across proposal/spec/design/tasks.
- Missing detail without contradiction should produce `WARN`.
- Direct contradiction should produce `BLOCK`.
- If required `security-review.md` is still missing at `task checkpoint`, handoff to `apply` remains blocked.
