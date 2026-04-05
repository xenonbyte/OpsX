## 1. Shared change state
Covers: Shared runtime change state
Done when: runtime code can read artifact presence, task completion, and next-step recommendations from a shared module.
- [x] 1.1 Add a shared runtime module for project/change paths and state.
- [x] 1.2 Add next-step logic that does not regress completed changes back to planning.
- [x] 1.3 Ensure shared runtime state includes `security-review` status/waiver awareness.
- [x] 1.4 Verify shared runtime state transitions with fixture-based checks.

## 2. Runtime commands
Covers: Executable runtime workflow commands
Done when: common workflow operations are executable through the CLI/runtime layer.
- [x] 2.1 Add `openspec new`, `propose`, and `continue`.
- [x] 2.2 Add `openspec status` and `resume`.
- [x] 2.3 Add `openspec sync` and `archive`.
- [x] 2.4 Verify runtime command routing and backward compatibility behavior.

## 3. Release metadata
Covers: Executable release metadata update
Done when: release metadata can be updated through a single runtime command and compatibility of the release path remains explicit.
- [x] 3.1 Add `openspec release-bump --version <x.y.z> [--date YYYY-MM-DD]`.
- [x] 3.2 Update command docs to include the new runtime command surface.
- [x] 3.3 Validate runtime commands and release metadata changes.
- [x] 3.4 Verify rollback/compatibility expectations for the runtime release path.
- [x] 3.5 Document rollout migration-impact handling and compatibility rollback notes for runtime command adoption.
