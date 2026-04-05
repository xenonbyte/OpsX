## ADDED Requirements

### Requirement: Artifact-graph runtime kernel
The system SHALL provide a runtime artifact-graph kernel that can load schema artifacts, validate dependency integrity, and derive change-state readiness.

#### Scenario: Runtime validates dependency graph
- **WHEN** the runtime loads the `spec-driven` schema
- **THEN** it validates duplicate IDs, invalid `requires` references, and cyclic dependencies
- **AND** it fails with explicit error detail when schema dependency integrity is broken

#### Scenario: Runtime derives blocked and ready artifacts
- **WHEN** a change directory contains partial artifacts
- **THEN** runtime computes per-artifact `done`, `ready`, or `blocked` states from dependency rules
- **AND** it returns missing dependency identifiers for blocked artifacts

### Requirement: Agent-facing runtime status and instructions
The system SHALL provide internal runtime APIs for status and instructions so agents can request next-step guidance without adding new public CLI commands.

#### Scenario: Runtime status output is machine-readable
- **WHEN** an agent requests workflow status for a change
- **THEN** runtime returns change progress, artifact states, and next-step recommendation in structured output
- **AND** the response is stable for agent consumption across repeated calls

#### Scenario: Runtime instructions include dependency context
- **WHEN** an agent requests instructions for an artifact or apply stage
- **THEN** runtime returns required dependencies, target output path, applicable rules/context, and template structure
- **AND** runtime marks unmet dependencies explicitly before write operations proceed

### Requirement: Workflow process test coverage
The system MUST include process-level tests for decomposition and execution guidance behavior introduced by the runtime kernel.

#### Scenario: Artifact-graph workflow integration is regression tested
- **WHEN** workflow runtime tests run
- **THEN** tests cover dependency progression from proposal to tasks and blocked-state transitions
- **AND** test assertions verify readiness ordering and completion detection

#### Scenario: Status and instructions runtime flows are regression tested
- **WHEN** workflow command-level process tests run against fixture changes
- **THEN** tests verify status outputs, instruction payloads, and error handling for missing or invalid change/schema inputs
- **AND** tests remain deterministic across repeated executions

### Requirement: Public surface compatibility
The system SHALL keep the current public CLI surface unchanged while adding runtime decomposition and execution primitives internally.

#### Scenario: Existing public command surface remains stable
- **WHEN** users run current public commands (`install`, `uninstall`, `--check`, `--doc`, `--language`)
- **THEN** command behavior and invocation shape remain backward compatible
- **AND** runtime kernel additions do not require new public command adoption

#### Scenario: Checkpoint contract remains stable
- **WHEN** planning and execution checkpoint validations run after runtime-kernel integration
- **THEN** checkpoint outputs remain canonical (`PASS`, `WARN`, `BLOCK`, `patchTargets`, `nextStep`)
- **AND** runtime decomposition additions do not regress checkpoint gating behavior
