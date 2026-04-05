## Context
OpenSpec already has canonical review states and checkpoint result objects, but the runtime still depends on caller-supplied flags for many of the most valuable review decisions. That makes automatic review weaker than the workflow contract suggests, especially for task decomposition drift, implementation drift, and required security-review enforcement after `tasks.md` is authored.

## Goals / Non-Goals
### Goals
- Make planning checkpoints detect common artifact drift automatically from existing workflow files.
- Make execution checkpoints evaluate implementation and verification evidence automatically for completed task groups.
- Keep required `security-review.md` gating enforced through the planning handoff into `apply`.
- Extend validation coverage so rollout and compatibility regressions in checkpoint behavior are caught automatically.

### Non-Goals
- Do not build a full semantic code-review engine for arbitrary repositories in this change.
- Do not replace prompt guidance with a remote review service.

## Decisions
- Introduce normalized review evidence for planning and execution checkpoints so automatic review can compare artifact content and implementation evidence consistently.
- Keep legacy boolean flags as compatibility overrides, but make them secondary to automatic detection for core drift cases.
- Add explicit `task checkpoint` enforcement for required `security-review.md` so planning cannot hand off to `apply` with a missing hard gate.
- Expand workflow contract validation to cover missed-gate regressions and automatic review scenarios.
- Keep rollout compatibility explicit: callers that only consume canonical checkpoint outputs should not need to change.

## Risks / Trade-offs
- Automatic drift detection will initially catch only common structural mismatches; deeper semantic review still depends on future iterations.
- Richer execution evidence increases runtime complexity and may require adapters for callers that currently provide only simple flags.
- Compatibility-first rollout reduces migration risk but means the runtime may temporarily support both automatic evidence and legacy overrides.

## Migration Plan
1. Add normalized planning and execution review evidence models.
2. Implement automatic planning drift detection and required-review gating at `task checkpoint`.
3. Implement automatic execution drift detection and verification checks for completed task groups.
4. Extend contract validation, update docs, and verify rollout compatibility plus rollback expectations.
