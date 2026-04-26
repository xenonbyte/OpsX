# Runtime Guidance Kernel

## Purpose
`lib/runtime-guidance.js` adds internal runtime primitives for artifact-graph decomposition and execution guidance, without changing the public CLI command surface.

## Internal APIs
- `buildRuntimeKernel(options)`  
  Loads schema + change context, validates dependencies, computes completion/readiness state, and resolves the next artifact/stage.
- `buildStatus(options)`  
  Returns machine-readable progress/state output for agent status flows.
- `buildArtifactInstructions(options)`  
  Returns dependency context, output target path, template content, and readiness for a specific artifact.
- `buildApplyInstructions(options)`  
  Returns remaining task groups and execution prerequisites for apply-stage flows.

## Security Guardrails
- `changeName` rejects separators and traversal markers (`/`, `\\`, `..`).
- parameterized `capability` values use the same traversal-safe validation.
- unknown schemas and unknown artifacts fail with explicit runtime error codes.

## Runtime Semantics
- Artifact readiness respects workflow security-review gating; if security review is required and missing, gated artifacts stay blocked.
- `buildArtifactInstructions()` loads template indexes from the package reference bundle (`skills/opsx/references/*`) instead of the caller repo root.
- Parameterized artifact paths (for example `specs/<capability>/spec.md`) are not writable until `capability` resolves a concrete `targetPath`.
- `readyForWrite` is true only when dependencies are satisfied and a concrete output path exists.

## Compatibility Notes
- Existing public CLI usage remains unchanged:
  - `opsx install`
  - `opsx uninstall`
  - `opsx check`
  - `opsx doc`
  - `opsx language`
  - `opsx migrate`
  - `opsx status`
- Existing checkpoint contracts stay canonical (`PASS`, `WARN`, `BLOCK`, `patchTargets`, `nextStep`).

## Rollback Guidance
If runtime-guidance behavior needs rollback:
1. Stop importing `lib/runtime-guidance.js` in any new integration caller.
2. Revert `lib/runtime-guidance.js` and `scripts/test-workflow-runtime.js`.
3. Re-run `validatePhaseOneWorkflowContract()` and `validateCheckpointContracts()` to ensure checkpoint gates stay stable.
4. Confirm install/check/doc/language smoke flow still passes.
