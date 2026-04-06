## ADDED Requirements

### Requirement: Advisory security review must not remain actionable
The system SHALL keep canonical advisory review states visible without treating `security-review.md` as the next actionable artifact.

#### Scenario: Runtime status skips waived security-review artifact
- **WHEN** a change triggers heuristic security review signals
- **AND** the change metadata contains an approved waiver with a non-empty reason
- **THEN** runtime status reports review state `waived`
- **AND** the `security-review` artifact is inactive for workflow progression
- **AND** next-step guidance does not recommend `security-review.md`
- **AND** no rollout migration is required for callers beyond consuming the corrected waived-state guidance

#### Scenario: Runtime status skips recommended security-review artifact
- **WHEN** heuristic security review signals are present
- **AND** no valid waiver exists
- **THEN** runtime status reports review state `recommended`
- **AND** the `security-review` artifact is inactive for workflow progression
- **AND** next-step guidance proceeds to `apply` instead of recommending `security-review.md`

#### Scenario: Workflow API reports recommended review as inactive
- **WHEN** heuristic security review signals are present
- **AND** no valid waiver exists
- **THEN** exported workflow state reports review state `recommended`
- **AND** workflow-level `review.active` is `false`
- **AND** the workflow artifact entry for `security-review` is inactive

#### Scenario: Workflow summary exposes advisory review inactivity
- **WHEN** heuristic security review signals are present
- **AND** no valid waiver exists
- **THEN** summarized workflow output exposes advisory review as inactive
- **AND** the summarized `security-review` artifact entry is also inactive

#### Scenario: Request-only heuristic input is preserved
- **WHEN** the schema review heuristic includes `request`
- **AND** the caller passes security-sensitive request text only via `sources.request`
- **THEN** runtime status preserves that input when resolving review guidance
- **AND** runtime instructions still surface the recommended review warning without blocking `apply`

#### Scenario: In-memory artifact text survives when files are absent
- **WHEN** the caller passes `proposal`, `specs`, `design`, or `tasks` content via runtime sources
- **AND** the corresponding files do not yet exist on disk
- **THEN** runtime guidance preserves that in-memory content for checkpoint and heuristic evaluation
- **AND** unsaved-buffer previews do not regress into artifact-missing findings purely because files are absent

#### Scenario: Whitespace-only files do not erase in-memory artifact text
- **WHEN** the caller passes runtime source content for an artifact
- **AND** the on-disk file exists but contains only whitespace
- **THEN** runtime guidance treats that file content as absent for merge purposes
- **AND** the caller-provided in-memory artifact text remains available for heuristic and checkpoint evaluation

#### Scenario: Array-backed task sources drive apply preview groups
- **WHEN** the caller passes `sources.tasks` as an array-backed source block
- **THEN** apply-preview guidance derives remaining task groups from that content
- **AND** `remainingTaskGroups` and `nextTaskGroup` stay aligned with task-checkpoint evaluation

#### Scenario: Apply readiness still requires on-disk planning artifacts
- **WHEN** the caller passes preview `proposal`, `specs`, or `design` content via runtime sources
- **AND** those required planning artifacts are not yet completed on disk
- **THEN** apply instructions keep `ready` as `false`
- **AND** prerequisites still identify the missing on-disk artifacts
- **AND** preview content may improve findings, but it must not bypass file-based workflow progression

### Requirement: Non-advisory review states remain stable
The system MUST preserve existing behavior for `required` and `completed` review states while applying the advisory-review fix.

#### Scenario: Required security review still blocks tasks
- **WHEN** a change is explicitly security-sensitive and `security-review.md` is still missing
- **THEN** workflow state blocks gated artifacts until `security-review.md` exists
- **AND** next-step guidance still recommends `security-review.md`
- **AND** compatibility with existing hard-gate behavior remains unchanged

#### Scenario: Completed security review remains active and done
- **WHEN** `security-review.md` already exists for the change
- **THEN** runtime status reports review state `completed`
- **AND** the security-review artifact remains done in the runtime graph
- **AND** rollback remains a simple revert of the advisory-state actionability fix if compatibility regresses
