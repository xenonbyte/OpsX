# OpsX for Codex

## Preferred Entrypoint

Use the skill directly:

```text
$opsx <request>
```

## Explicit Routing

Use these when you want a fixed workflow action:

```text
$opsx-propose
$opsx-apply
$opsx-status
```

If the selected route still needs a change name or description, provide it in the next message.

Install note:
- Use `opsx install --platform codex` (or comma-separated multi-platform values).
- Install always deploys the full workflow command surface; there is no profile split.

## Why this model

Codex is more reliable when natural-language intent goes through the skill entrypoint. Explicit action routes remain available for deterministic execution.

## Workflow Semantics

- `security-review` is required on explicit security-sensitive changes and recommended on heuristic matches
- `spec checkpoint` runs before `tasks`
- `task checkpoint` runs before `apply`
- `execution checkpoint` runs after each top-level task group during `apply`
- Security-review states: `required`, `recommended`, `waived`, `completed`
- Checkpoint states: `PASS`, `WARN`, `BLOCK`
