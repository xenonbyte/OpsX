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
## Test Plan
- Behavior: Enforce RED and VERIFY evidence for behavior-changing task groups.
- Requirement/Scenario: TDD-02 / behavior-change groups must expose deterministic TDD markers.
- Verification: Run `npm run test:workflow-runtime` and review checkpoint findings.
- TDD Mode: strict
- Exemption Reason: none

## 1. Enforce task-checkpoint TDD markers
- TDD Class: behavior-change
- Requirement Coverage: TDD-02 behavior-change groups expose deterministic TDD markers.
- Implementation Evidence:
  - lib/workflow.js
  - scripts/test-workflow-gates.js
- Verification: Run `npm run test:workflow-runtime` and record PASS/WARN/BLOCK output.
- [ ] RED: Add a failing runtime test for missing VERIFY evidence.
- [ ] GREEN: Implement checkpoint updates so the RED test passes.
- [ ] REFACTOR: Optional cleanup that preserves passing tests.
- [ ] VERIFY: Run `npm run test:workflow-runtime` and capture results.

## 2. Refresh docs-only wording
- TDD Exemption: docs-only — wording-only updates with no behavior logic change.
- Requirement Coverage: Guidance artifacts describe the shipped TDD-light contract.
- Implementation Evidence:
  - commands/
  - skills/opsx/references/
- Verification: Run `npm run test:workflow-runtime` to ensure no runtime regressions.
- [ ] Update wording in guidance artifacts for the shipped TDD-light contract.
- [ ] VERIFY: Run `npm run test:workflow-runtime` to ensure no runtime regressions.
```

Rules:
- Keep `## Test Plan` as the metadata block ahead of executable top-level groups.
- Use exact marker keys in the test plan: `Behavior`, `Requirement/Scenario`, `Verification`, `TDD Mode`, and `Exemption Reason`.
- For behavior or bugfix groups, include `- TDD Class: behavior-change` or `- TDD Class: bugfix` and explicit `RED`, `GREEN`, and `VERIFY` checklist items.
- `REFACTOR` is optional and must stay visible when used.
- For exempt groups, add a visible `- TDD Exemption: <class> — <reason>` line and still include a `VERIFY` checklist item.
- Keep executable work in numbered top-level groups such as `## 1. ...`; `execution checkpoint` runs after each top-level group.
- If a checkpoint finds drift or missing coverage, patch `tasks.md` instead of creating a separate review artifact.
