# OpsX for Codex

## Public Routes (Explicit Only)

Use explicit routes for workflow actions:

```text
$opsx-onboard
$opsx-propose
$opsx-status
$opsx-apply
```

Additional routes follow the same pattern (for example: `$opsx-explore`,
`$opsx-new`, `$opsx-continue`, `$opsx-ff`, `$opsx-verify`, `$opsx-sync`,
`$opsx-archive`, `$opsx-batch-apply`, `$opsx-bulk-archive`).

If the selected route still needs a change name or description, provide it in
the next message.

## Internal Route Catalog

`commands/codex/prompts/opsx.md` is an internal generated catalog. Public Codex
usage remains explicit `$opsx-*` routes.

Install note:
- Use `opsx install --platform codex` (or comma-separated multi-platform values).
- Install always deploys the full workflow command surface; there is no profile split.

## Why this model

Explicit action routing keeps Codex execution deterministic and aligned with the
generated command bundle contract.

## Workflow Semantics

- `security-review` is required on explicit security-sensitive changes and recommended on heuristic matches
- `spec checkpoint` runs before `tasks`
- `task checkpoint` runs before `apply`
- `execution checkpoint` runs after each top-level task group during `apply`
- Security-review states: `required`, `recommended`, `waived`, `completed`
- Checkpoint states: `PASS`, `WARN`, `BLOCK`
