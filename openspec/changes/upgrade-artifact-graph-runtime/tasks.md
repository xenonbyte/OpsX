## 1. Case set: artifact-graph runtime kernel
Covers: Artifact-graph runtime kernel
Done when: runtime can validate schema dependencies and compute deterministic artifact readiness/blocking states.
- [x] 1.1 Add runtime graph model, schema parser, and dependency validators (duplicate IDs, invalid requires, cycles).
- [x] 1.2 Add completion-state detection from change filesystem artifacts.
- [x] 1.3 Add blocked/ready/done derivation with missing-dependency reporting.
- [x] 1.4 Add runtime template loading and change-context assembly primitives.
- [x] 1.5 Verify artifact-state derivation against mixed done/blocked fixtures.

## 2. Case set: agent runtime status/instructions
Covers: Agent-facing runtime status and instructions
Done when: agent can consume internal status and instructions outputs without adding new public CLI commands.
- [x] 2.1 Add internal status API returning structured progress, artifact states, and next-step hint.
- [x] 2.2 Add internal artifact instructions API returning dependency context, template content, and output target.
- [x] 2.3 Add internal apply instructions API returning remaining task items and execution prerequisites.
- [x] 2.4 Add invalid-input protections for unknown change/schema and unsafe change identifiers.
- [x] 2.5 Verify status/instructions output contracts for JSON/text and invalid-input paths.

## 3. Case set: workflow process tests
Covers: Workflow process test coverage
Done when: decomposition and execution guidance behavior is locked by deterministic process tests.
- [x] 3.1 Port/adapt artifact-graph integration tests for progression, out-of-order files, and blocked states.
- [x] 3.2 Port/adapt status flow tests for normal, empty, and error-path scenarios.
- [x] 3.3 Port/adapt instructions flow tests for dependency warnings, JSON/text outputs, and apply-stage behavior.
- [x] 3.4 Add fixture helpers and stable test harness entrypoints for runtime-guidance tests.

## 4. Case set: compatibility and gate assurance
Covers: Public surface compatibility
Done when: runtime-kernel integration does not break existing public commands or checkpoint contract.
- [x] 4.1 Verify existing public command surface remains backward compatible (`install`, `uninstall`, `--check`, `--doc`, `--language`).
- [x] 4.2 Verify checkpoint contract validation remains green (`PASS`/`WARN`/`BLOCK`, `patchTargets`, `nextStep`).
- [x] 4.3 Verify operational compatibility notes and rollback guidance for this internal runtime migration are documented.
- [x] 4.4 Add security validation for change-name/path handling so runtime status and instructions reject traversal-style inputs.
