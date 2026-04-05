## Scope
Review state: completed

This review covers the automatic checkpoint review upgrade, with emphasis on `security-review` gating behavior and the risk of accidentally weakening planning-to-apply enforcement.

## Sensitive Surfaces
- Required `security-review.md` gating at `spec checkpoint` and `task checkpoint`
- Waiver handling and canonical review states
- Automatic review outcomes that can unblock or block `apply`

## Risks
- A runtime regression could allow `apply` to proceed without a required `security-review.md`.
- Automatic review heuristics could under-report or over-report security-sensitive planning drift.
- Contract validation could miss regressions and leave the workflow falsely marked as complete.

## Required Controls
- Add explicit validation coverage for missing required review at `task checkpoint`.
- Preserve canonical review states: `required`, `recommended`, `waived`, `completed`.
- Keep blocker propagation and checkpoint patch targets explicit in runtime results.
- Verify compatibility so prompt and runtime callers see the same blocking behavior.

## Waiver
Not waived. Review completed for this workflow/runtime upgrade.
