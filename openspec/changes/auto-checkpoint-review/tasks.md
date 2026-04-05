## 1. Review evidence model
Covers: Shared automatic review inputs
Done when: checkpoint runtime accepts normalized evidence for planning artifacts and execution artifacts without breaking canonical result output.
- [x] 1.1 Define normalized planning review evidence for proposal scope, spec requirements/scenarios, design decisions, rollout or migration constraints, and task groups.
- [x] 1.2 Define normalized execution review evidence for completed task-group scope, implementation evidence, changed-behavior summary, referenced spec/design commitments, and verify/test evidence.
- [x] 1.3 Define minimum execution evidence fields and derivation rules for docs-only versus behavior-changing work.
- [x] 1.4 Add evidence normalizers that can derive planning and execution evidence from existing workflow files and runtime inputs.
- [x] 1.5 Preserve compatibility by mapping legacy flags into the new evidence model and documenting severity precedence when automatic evidence and legacy flags disagree.

## 2. Planning checkpoint automation
Covers: Automatic planning review and hard-gate enforcement
Done when: planning checkpoints automatically detect common drift and block missing required security review before apply handoff.
- [x] 2.1 Implement automatic detection of missing required work when specs or design commitments are absent from `tasks.md`.
- [x] 2.2 Implement automatic out-of-scope task detection across proposal, specs, design, and tasks.
- [x] 2.3 Implement automatic detection of missing rollout, migration, rollback, or compatibility detail that should produce `WARN` without blocking.
- [x] 2.4 Implement automatic detection of direct rollout, migration, rollback, or compatibility contradictions that should produce `BLOCK`.
- [x] 2.5 Teach planning review to allow supporting tasks for test, verify, rollback, migration, compatibility, and security controls when they support approved scope.
- [x] 2.6 Enforce required `security-review.md` gating in `task checkpoint`, not only in `spec checkpoint`.
- [x] 2.7 Add validator coverage for required, recommended, waived, and completed review states plus planning `PASS`, `WARN`, and `BLOCK` compatibility scenarios.

## 3. Execution checkpoint automation
Covers: Automatic implementation review
Done when: execution checkpoint can detect implementation drift, new constraints, and missing verification from evidence attached to a completed top-level task group.
- [x] 3.1 Implement automatic comparison between completed task-group scope and implementation evidence.
- [x] 3.2 Implement automatic comparison between implementation evidence and accepted design decisions or spec commitments.
- [x] 3.3 Implement automatic detection of newly introduced constraints that require artifact updates before the next task group.
- [x] 3.4 Implement docs-only and non-behavioral classification from execution evidence rather than caller-only flags.
- [x] 3.5 Implement automatic verify/test gap detection with an explicit PASS path for docs-only or non-behavioral work.
- [x] 3.6 Add validator coverage for execution checkpoint `PASS`, `WARN`, and `BLOCK` scenarios, plus compatibility fallback from legacy flags.

## 4. Rollout and docs
Covers: Migration, rollback, and operator clarity
Done when: the automatic review behavior is documented and rollout/rollback expectations are explicit for runtime and prompt callers.
- [x] 4.1 Document the automatic checkpoint review evidence model and the compatibility path for legacy flag-based callers.
- [x] 4.2 Document rollout, rollback, and compatibility expectations for prompt and runtime callers consuming canonical checkpoint outputs.
- [x] 4.3 Verify status/resume surfaces still present accurate checkpoint output and next-step recommendations after the migration.
