# Artifact Templates

Apply these rules after resolving project context and per-artifact rules from `.opsx/config.yaml`.

## proposal.md

```markdown
## Why

## What Changes

## Capabilities

### New Capabilities

### Modified Capabilities

## Impact
```

## specs/<capability>/spec.md

```markdown
## ADDED Requirements

### Requirement: Example requirement
The system SHALL ...

#### Scenario: Example scenario
- **WHEN** ...
- **THEN** ...
```

Rules:
- Use `SHALL` or `MUST` in requirements.
- Every requirement needs at least one scenario.
- Use `ADDED`, `MODIFIED`, and `REMOVED` sections as needed.

## design.md

```markdown
## Context
## Goals / Non-Goals
## Decisions
## Risks / Trade-offs
## Migration Plan
```

## security-review.md

```markdown
## Scope
## Sensitive Surfaces
## Risks
## Required Controls
## Waiver
```

Rules:
- Use this after `design` and before `tasks` for security-sensitive changes.
- If the review is waived, fill `## Waiver` with the reason and decision context.
- Make it explicit whether the review is `required`, `recommended`, `waived`, or `completed`.

## tasks.md

```markdown
## 1. Setup
- [ ] 1.1 Example task
```

Rules:
- Use exact checkbox format `- [ ] X.Y Description`.
- Mark completed work with `- [x]`.
- Order tasks by dependency.
- Organize work under top-level task groups such as `## 1. Setup`; `execution checkpoint` runs after each top-level group.
- If a checkpoint finds drift or missing coverage, patch `tasks.md` instead of creating a separate review artifact.
