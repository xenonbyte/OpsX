## Context
This repository currently provides strong checkpoint gating and platform installation flows, but decomposition and execution guidance still depend heavily on prompts instead of a shared runtime workflow kernel. Upstream already has stronger artifact-graph modeling and process tests that can be selectively adopted.

## Goals / Non-Goals
### Goals
- Introduce artifact-graph runtime primitives for dependency validation and readiness derivation.
- Introduce internal status/instructions runtime APIs for agent consumption.
- Bring in process-oriented tests that lock workflow decomposition and execution guidance behavior.
- Preserve compatibility for the existing public CLI surface and checkpoint contracts.

### Non-Goals
- Do not import upstream multi-tool adapter breadth.
- Do not expand public user-facing CLI command surface in this change.
- Do not replace current checkpoint model with a separate review subsystem.

## Decisions
- Build a local runtime kernel module under `lib/` that ports and adapts upstream artifact-graph logic into current repository conventions.
- Expose status/instructions as internal runtime APIs for agents and tests rather than mandatory new public commands.
- Port only high-value process tests: artifact-graph integration, status flow, instructions flow, and invalid-input handling.
- Keep checkpoint modules as the quality gate layer; runtime kernel adds decomposition/execution orchestration under that gate.
- Keep compatibility explicit by retaining existing public command behavior and checkpoint result contract.

## Risks / Trade-offs
- Porting from upstream TypeScript to current local JavaScript modules can introduce subtle behavior drift if test parity is incomplete.
- Internal API introduction without public CLI commands improves control but requires strong docs for maintainers and agent authors.
- Selective migration lowers risk but may defer useful upstream features to later batches.

## Migration Plan
1. Add artifact-graph runtime kernel and schema/dependency validation primitives.
2. Add internal status/instructions runtime APIs and fixture-based process execution paths.
3. Port and adapt core workflow process tests (graph progression, status, instructions, error handling).
4. Verify public CLI compatibility and checkpoint-contract stability before implementation rollout.
