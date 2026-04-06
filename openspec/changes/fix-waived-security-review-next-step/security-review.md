## Scope
- State: completed
- Scope: runtime review-state activation, workflow-state consistency, summary output alignment, source preservation, and apply-readiness integrity for advisory `security-review`

## Sensitive Surfaces
- Workflow review-state resolution in `lib/workflow.js`
- Runtime artifact activation and next-step guidance in `lib/runtime-guidance.js`
- Regression tests that protect security-review gating behavior

## Risks
- Over-broad deactivation could accidentally hide advisory review guidance instead of only removing it from workflow actionability.
- Regressions in hard-gated `required` review would allow tasks or apply handoff without an actual `security-review.md`.
- Source merging could accidentally let caller-provided text override actual artifact files if precedence is implemented incorrectly.
- Apply-preview normalization could drift from checkpoint normalization if task-source parsing is not kept consistent across code paths.
- Apply-preview guidance could accidentally allow execution before required planning artifacts are written if readiness stops following file-based completion.

## Required Controls
- Keep `required` review blocking semantics unchanged.
- Keep `recommended` review visible even when it is no longer actionable in workflow progression.
- Preserve caller-provided `request` heuristic input without overriding artifact-file contents.
- Preserve caller-provided in-memory artifact content when files are absent.
- Preserve caller-provided in-memory artifact content when matching files contain only whitespace.
- Add regression tests that assert advisory review is non-actionable while required/completed behavior remains intact.
- Keep apply readiness blocked until required planning artifacts are completed on disk.

## Waiver
- State decision: completed
- Waiver used: no
- Reason: This change modifies workflow security-review handling, so review was completed explicitly in-project instead of waived.
