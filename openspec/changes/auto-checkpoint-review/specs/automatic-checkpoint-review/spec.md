## ADDED Requirements

### Requirement: Automatic checkpoint review evidence model
The checkpoint runtime SHALL evaluate planning and execution checkpoints from normalized review evidence so callers do not have to provide manual drift booleans for core review cases.

#### Scenario: Planning evidence is normalized from workflow artifacts
- **WHEN** the runtime evaluates proposal, specs, design, and tasks for checkpoint review
- **THEN** it derives normalized planning evidence that includes requirement coverage, scenario coverage, rollout or migration constraints, design decisions, task groups, and checklist items
- **AND** planning drift logic reads that evidence instead of requiring caller-only drift flags

#### Scenario: Execution evidence is normalized from completed work
- **WHEN** the runtime evaluates a completed top-level task group
- **THEN** it derives normalized execution evidence that includes task-group scope, implementation evidence, changed-behavior summary, and verification evidence
- **AND** execution review logic reads that evidence instead of requiring caller-only drift flags

#### Scenario: Execution evidence exposes minimum comparable fields
- **WHEN** normalized execution evidence is produced for a completed top-level task group
- **THEN** it includes at least the task-group identifier, completed checklist items, changed file or artifact summary, behavior-change classification, referenced spec or design commitments, and verification evidence summary
- **AND** execution review uses those minimum fields to determine `PASS`, `WARN`, or `BLOCK`

#### Scenario: Docs-only work is classified from evidence
- **WHEN** normalized execution evidence shows only documentation, comments, or non-runtime metadata changes and does not indicate a behavior change
- **THEN** the runtime classifies the task group as non-behavioral work
- **AND** docs-only classification does not depend on an external caller-only flag

### Requirement: Automatic planning drift detection
The checkpoint runtime SHALL detect common planning drift by comparing proposal, specs, design, and tasks without requiring caller-provided drift flags for core mismatch cases.

#### Scenario: Tasks introduce out-of-scope work
- **WHEN** `tasks.md` contains implementation work that is not supported by the approved proposal, specs, or design
- **THEN** `task checkpoint` returns `BLOCK`
- **AND** patch targets include `tasks` plus the authoritative planning artifacts that need alignment

#### Scenario: Planning artifacts omit rollout detail without contradiction
- **WHEN** a planning artifact omits rollout, migration, rollback, or compatibility detail but the remaining planning artifacts do not contradict each other
- **THEN** `spec checkpoint` returns `WARN`
- **AND** the checkpoint result cites the planning artifact that needs more rollout detail

#### Scenario: Planning artifacts directly contradict rollout intent
- **WHEN** proposal, specs, or design directly disagree about whether rollout, migration, rollback, or compatibility work is required
- **THEN** `spec checkpoint` returns `BLOCK`
- **AND** the checkpoint result cites the conflicting planning artifacts

#### Scenario: Tasks omit required implementation work
- **WHEN** specs or design require implementation, migration, rollback, compatibility, or verification work that is missing from `tasks.md`
- **THEN** `task checkpoint` returns `BLOCK`
- **AND** patch targets include `tasks` plus the planning artifact that established the missing requirement

#### Scenario: Tasks add allowed supporting work
- **WHEN** `tasks.md` adds supporting tasks for testing, verification, rollback, migration, compatibility, or security controls that are necessary to satisfy existing proposal, specs, or design intent
- **THEN** the planning drift review does not classify those supporting tasks as out-of-scope work
- **AND** the checkpoint result remains driven by actual mismatches instead of the presence of supporting tasks

### Requirement: Checkpoint compatibility with legacy review flags
The checkpoint runtime MUST preserve compatibility for callers that still provide legacy review flags while making automatic evidence the primary source for core drift detection.

#### Scenario: Automatic evidence is available
- **WHEN** normalized planning or execution evidence is available for a checkpoint
- **THEN** automatic evidence drives core drift detection and gating decisions
- **AND** legacy flags may add stricter findings but do not downgrade a `BLOCK` detected from automatic evidence

#### Scenario: Only legacy flags are available
- **WHEN** a caller cannot yet provide normalized review evidence but does provide legacy drift or quality flags
- **THEN** the checkpoint runtime still produces canonical `PASS`, `WARN`, or `BLOCK` output from those compatibility inputs
- **AND** prompt and runtime callers remain backward compatible during migration

### Requirement: Automatic execution drift detection
The execution checkpoint SHALL evaluate completed task groups against implementation evidence and verification evidence without relying only on external boolean flags.

#### Scenario: Implementation diverges from design
- **WHEN** implementation evidence contradicts accepted design decisions or task-group scope
- **THEN** `execution checkpoint` returns `BLOCK`
- **AND** patch targets include `specs`, `design`, and `tasks`

#### Scenario: Verification evidence is missing
- **WHEN** a completed task group changes behavior but does not include sufficient test or verification evidence
- **THEN** `execution checkpoint` returns `WARN`
- **AND** patch targets include `tasks`

#### Scenario: New implementation constraints are discovered
- **WHEN** implementation evidence for a completed task group introduces new constraints or follow-up decisions not captured in specs, design, or tasks
- **THEN** `execution checkpoint` returns `BLOCK`
- **AND** patch targets include the artifacts that must be updated before the next task group begins

#### Scenario: Docs-only or non-behavioral work completes
- **WHEN** a completed task group changes documentation, comments, or non-behavioral metadata without changing runtime behavior
- **THEN** missing test execution alone does not trigger a verification warning
- **AND** execution review may return `PASS` if no other drift or quality findings are present

## MODIFIED Requirements

### Requirement: Required security review gating
The workflow MUST block progression from planning into `apply` when `security-review.md` is required and missing, including at `task checkpoint` time.

#### Scenario: Required review is still missing after tasks are written
- **WHEN** `security-review.md` is required and `tasks.md` exists without a completed review artifact
- **THEN** `task checkpoint` returns `BLOCK`
- **AND** patch targets include `security-review`

#### Scenario: Completed required review unblocks apply handoff
- **WHEN** `security-review.md` is required and the review artifact is present
- **THEN** `task checkpoint` does not block `apply` on security-review gating

#### Scenario: Heuristic review stays recommended
- **WHEN** security heuristics recommend review but there is no explicit hard gate
- **THEN** `spec checkpoint` or `task checkpoint` may return `WARN`
- **AND** the workflow does not block `apply` solely because the review state is `recommended`

#### Scenario: Approved waiver stays non-blocking
- **WHEN** security review is heuristically recommended and the waiver is approved with a recorded reason
- **THEN** the workflow resolves the review state to `waived`
- **AND** planning handoff to `apply` is not blocked on security-review gating

### Requirement: Checkpoint contract validation coverage
The workflow MUST validate automatic review scenarios that cover planning drift detection, execution drift detection, and required-review gating regressions.

#### Scenario: Validation catches a missing task-checkpoint security gate
- **WHEN** workflow contract validation runs against a runtime that does not block missing required review at `task checkpoint`
- **THEN** validation fails

#### Scenario: Validation covers automatic execution review
- **WHEN** workflow contract validation runs against automatic execution review scenarios
- **THEN** it verifies reachable `PASS`, `WARN`, and `BLOCK` outcomes for execution checkpoint results

#### Scenario: Validation covers compatibility fallbacks
- **WHEN** workflow contract validation runs against callers that still rely on legacy review flags
- **THEN** it verifies that canonical checkpoint output remains stable during the migration to normalized evidence

#### Scenario: Validation covers planning severity thresholds
- **WHEN** workflow contract validation runs against automatic planning review scenarios
- **THEN** it verifies a `PASS` outcome for allowed supporting tasks, a `WARN` outcome for missing rollout detail without contradiction, and a `BLOCK` outcome for omitted required work or direct rollout contradiction
