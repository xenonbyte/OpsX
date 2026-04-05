## Why
Upstream OpenSpec already has stronger artifact-graph workflow decomposition and execution guidance, while this repository is currently strongest in checkpoint gating. We need to import the decomposition and implementation runtime capabilities without pulling in unrelated tool adapters or expanding user-facing CLI complexity.

## What Changes
- Add a local artifact-graph runtime kernel for schema dependency validation, readiness detection, and instruction assembly.
- Add agent-facing runtime entry points for `status` and `instructions` (including apply instructions) through internal modules.
- Add process-focused workflow tests ported and adapted from upstream artifact-graph and workflow command coverage.
- Keep public command compatibility unchanged for existing install/uninstall/check/doc/language flows.

## Capabilities

### New Capabilities
- `artifact-graph-runtime-kernel`: schema-driven dependency graph, blocked/ready/done state, and template loading.
- `agent-runtime-status-instructions`: structured status and instruction payloads for agents without requiring new public CLI commands.
- `workflow-process-test-suite`: reusable tests for decomposition flow, instruction flow, and dependency-state transitions.

### Modified Capabilities
- `workflow-execution-guidance`: shift from prompt-only decomposition hints to runtime-generated workflow state and instruction outputs.
- `compatibility-contract`: preserve current public CLI surface and existing checkpoint output contract while adding internal runtime strength.

## Impact
- Affected directories: `lib/`, `schemas/`, `docs/`, `openspec/`
- Compatibility: public user CLI remains unchanged; agent/runtime internals gain stronger decomposition and execution primitives.
- Test impact: introduce workflow-kernel and runtime instruction regression suites as required coverage for this upgrade.
