## Why
OpenSpec checkpoints currently provide a shared result model, but the most important review outcomes still depend on caller-supplied flags. That leaves task decomposition drift, implementation drift, and some planning gates partially manual, which is weaker than the intended "automatic review" workflow.

## What Changes
- Add automatic planning review that compares proposal, specs, design, and tasks for common drift conditions.
- Add automatic execution review that compares completed task groups against implementation evidence and verification evidence.
- Enforce required `security-review.md` gating consistently through both `spec checkpoint` and `task checkpoint`.
- Extend workflow contract validation to cover automatic review scenarios instead of only flag-driven scenarios.

## Capabilities

### New Capabilities
- `automatic-planning-review`: checkpoint runtime can detect common planning drift without caller-only drift flags.
- `automatic-execution-review`: execution checkpoint can evaluate implementation and verification evidence automatically.

### Modified Capabilities
- `security-review-gating`: required review stays blocking through planning handoff to `apply`.
- `checkpoint-contract-validation`: self-checks cover automatic review paths and missed-gate regressions.

## Impact
- Affected directories: `lib/`, `docs/`, `openspec/`
- Checkpoint runtime inputs will likely expand from simple flags to normalized evidence objects.
- Compatibility requirement: canonical checkpoint outputs (`PASS`, `WARN`, `BLOCK`, `patchTargets`, `nextStep`) must remain stable for prompts and runtime callers.
