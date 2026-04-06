## Why
Runtime guidance currently mishandles `security-review` and preview flows in several related edge cases: waived review can remain actionable, recommended review can still be routed back as the next planning step, workflow summary output can still look actionable for advisory review, whitespace-only scaffold files can erase caller-provided preview text, array-backed `tasks` sources can be ignored when deriving remaining task groups, and apply-preview inputs can incorrectly make execution look ready before required planning artifacts are actually written to disk. That makes `status`, workflow APIs, and instruction surfaces disagree with the intended non-blocking advisory-review contract and file-based workflow progression.

## What Changes
- Treat waived and recommended `security-review` states as visible review guidance, but not as actionable workflow artifacts in runtime progression.
- Make workflow-level review state report recommended review as inactive so exported workflow summaries match runtime next-step behavior.
- Preserve caller-provided in-memory artifact sources and heuristic inputs when runtime guidance builds review state and apply guidance, especially when files are missing or only contain whitespace.
- Normalize array-backed `tasks` sources before deriving remaining task groups in apply-preview flows.
- Keep `buildApplyInstructions()` file-based for readiness so in-memory preview sources cannot bypass unsaved planning artifacts.
- Add regression coverage for runtime status, workflow state, next-step guidance, and apply instructions across waived, recommended, request-only, whitespace-only, and unsaved-buffer scenarios.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `security-review-state-resolution`: waived and recommended review states stay visible in review status while dropping out of actionable artifact progression.
- `workflow-review-state`: exported workflow state now reports recommended review as inactive so callers do not treat advisory review as actionable.
- `workflow-summary-output`: summarized workflow output now exposes advisory-review inactivity instead of looking actionable by omission.
- `runtime-next-step-guidance`: `status` and runtime kernel no longer route advisory `security-review.md` back as the next planning step.
- `runtime-review-heuristics`: runtime guidance now preserves caller-provided request text and in-memory artifact text when schema heuristics include those sources, while treating whitespace-only files as absent.
- `apply-preview-group-derivation`: apply-preview flows now respect array-backed `tasks` sources when deriving remaining task groups.
- `apply-readiness-contract`: apply instructions now require required planning artifacts to be completed on disk even when preview sources are available in memory.
- `workflow-contract-validation`: self-checks and runtime tests now assert non-actionable advisory review behavior and request-source preservation.

## Impact
- Affected directories: `lib/`, `scripts/`, `openspec/`
- Compatibility: none. Existing hard-gated and completed review behavior remains unchanged; recommended review stays visible but no longer becomes the next actionable artifact.
- Rollout / migration: none. The change is runtime-only and takes effect as soon as the package code is updated.
- Rollback: none for operators. Maintainers can revert the runtime state-resolution change and associated regression tests if downstream callers unexpectedly relied on the old incorrect recommendation.
