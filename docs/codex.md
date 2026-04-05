# OpenSpec for Codex

## Preferred entrypoint

Use the skill directly:

```text
$openspec create an OpenSpec change for add-dark-mode
```

## Explicit routing

Use these when you want a fixed workflow action:

```text
/prompts:openspec
/prompts:opsx-propose
/prompts:opsx-apply
```

Codex treats `/prompts:*` as action selectors. If the selected route still needs a name or description, provide it in the next message.

Install note:
- Use `openspec install --platform codex` (or multi-platform via comma-separated `--platform`).
- Install always deploys the full workflow command surface; there is no `--profile` split.

## Why this model

Codex is more reliable when natural-language intent goes through the skill entrypoint. The prompt files remain available for command discovery and explicit action routing.

## Workflow semantics

- `security-review` is required on explicit security-sensitive changes and recommended on heuristic matches
- `spec checkpoint` runs before `tasks`
- `task checkpoint` runs before `apply`
- `execution checkpoint` runs after each top-level task group during `apply`
- Security-review states: `required`, `recommended`, `waived`, `completed`
- Checkpoint states: `PASS`, `WARN`, `BLOCK`
