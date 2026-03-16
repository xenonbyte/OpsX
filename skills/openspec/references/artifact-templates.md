# Artifact Templates

Use this file when creating or editing `proposal.md`, `specs/**/*.md`, `design.md`, or `tasks.md`.

## 1) Proposal (`proposal.md`)

Purpose: explain why the change is needed and what capabilities are affected.

Template:

```markdown
## Why
<!-- 1-2 sentences on problem/opportunity -->

## What Changes
<!-- Bulleted change summary. Mark breaking changes with **BREAKING** -->

## Capabilities

### New Capabilities
- `<capability-name>`: <short description>

### Modified Capabilities
- `<existing-capability>`: <what changes>

## Impact
<!-- Affected code, APIs, data, dependencies, teams -->
```

Rules:

- Keep concise (usually 1-2 pages).
- Focus on intent and scope, not implementation detail.
- Ensure capabilities listed here match specs later.

## 2) Specs (`specs/<capability>/spec.md`)

Purpose: define required behavior (WHAT).

Template:

```markdown
## ADDED Requirements

### Requirement: User can export data
The system SHALL allow users to export their data in CSV format.

#### Scenario: Successful export
- **WHEN** user clicks "Export"
- **THEN** system downloads a CSV containing the user's data

## MODIFIED Requirements
<!-- Include full updated requirement text -->

## REMOVED Requirements
<!-- Include reason and migration path -->
```

Rules:

- Use normative language (`SHALL`/`MUST`) for requirements.
- Give every requirement at least one scenario.
- Use exactly `#### Scenario:` heading format.
- Use clear `WHEN`/`THEN` steps in scenarios.

Delta semantics:

- `ADDED`: new capability behavior
- `MODIFIED`: changed existing behavior (full replacement text)
- `REMOVED`: deleted behavior with reason and migration guidance

## 3) Design (`design.md`, optional)

Purpose: explain implementation approach (HOW) for non-trivial changes.

Add design when change includes one or more:

- Cross-module or cross-service impact
- New dependency or data model changes
- Security/performance/migration complexity
- Major trade-offs requiring explicit decisions

Template:

```markdown
## Context

## Goals / Non-Goals

## Decisions

## Risks / Trade-offs

## Migration Plan
```

Rules:

- Document key decisions and rationale.
- Record risks with mitigation.
- Keep non-goals explicit to limit scope creep.

## 4) Tasks (`tasks.md`)

Purpose: break implementation into checkable units.

Template:

```markdown
## 1. Setup
- [ ] 1.1 Create module structure
- [ ] 1.2 Add dependencies

## 2. Core Implementation
- [ ] 2.1 Implement feature logic
- [ ] 2.2 Add tests
```

Rules:

- Use exact checkbox syntax: `- [ ] X.Y Description`
- Mark completion with `- [x]`
- Keep tasks small enough for one focused session
- Order tasks by dependency

## Artifact Quality Checklist

Before completing a planning phase, verify:

- Proposal capabilities map cleanly to specs
- Specs are testable and scenario-complete
- Design decisions cover major technical uncertainty
- Tasks cover implementation and validation work
