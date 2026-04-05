## ADDED Requirements

### Requirement: Shared runtime change state
The system MUST provide a shared runtime model for reading OpenSpec change state.

#### Scenario: Status reads artifact and task state
- **WHEN** runtime status inspects a change
- **THEN** it reads artifact presence, security-review state, and task completion from shared code
- **AND** it returns a stable next-step recommendation

### Requirement: Executable runtime workflow commands
The system MUST provide executable runtime commands for common workflow operations.

#### Scenario: Runtime commands scaffold and inspect changes
- **WHEN** a user runs `openspec new`, `propose`, `continue`, `status`, `resume`, `sync`, or `archive`
- **THEN** the command executes through shared runtime code instead of prompt-only behavior

### Requirement: Executable release metadata update
The system MUST provide a runtime command for updating release metadata.

#### Scenario: Release bump updates versioned files
- **WHEN** a user runs `openspec release-bump --version <x.y.z>`
- **THEN** runtime updates `package.json`
- **AND** runtime updates `CHANGELOG.md`
- **AND** runtime updates the current release marker in `README.md`

### Requirement: Runtime rollout compatibility
The system MUST preserve operational compatibility while adopting runtime workflow commands.

#### Scenario: Runtime command rollout includes migration impact handling
- **WHEN** runtime workflow commands are enabled
- **THEN** rollout includes explicit migration impact assessment and command adoption steps
- **AND** rollback can return to prompt-driven routing without breaking existing change artifacts
