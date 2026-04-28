# Phase 8: Stability, JSON, and Release Coverage - Context

**Gathered:** 2026-04-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 8 is the v3.0 release-hardening pass. It delivers stable `opsx status --json` output, robust path/glob behavior for workflow artifacts, a reorganized test suite with a release gate, and release-facing documentation/checklist updates.

This phase does not add new OpsX workflow capabilities. It hardens the behavior shipped in Phases 1-7 and makes the breaking v3.0 release testable before publication.

</domain>

<decisions>
## Implementation Decisions

### `opsx status --json` Contract
- **D-01:** `opsx status --json` must emit a complete JSON envelope, not just the active change status. The envelope should include at least `ok`, `version`, `command`, `workspace`, `migration`, `activeChange`, `changeStatus`, `warnings`, and `errors`.
- **D-02:** Expected workflow states such as missing workspace, missing active change, warnings, blocked state, or migration candidates should exit `0` in `--json` mode and be expressed inside the JSON envelope.
- **D-03:** stdout must contain only parseable JSON for `opsx status --json`. stderr is reserved for true exceptional failures such as invalid CLI arguments, filesystem read failures, or internal exceptions.
- **D-04:** `migration` in the status envelope should include summary plus diagnostic fields: canonical/legacy root presence, `pendingMoves`, `pendingCreates`, `abortReason`, and `legacyCandidates[]`. It should not embed the full `opsx migrate --dry-run` move/create mapping.

### Path and Glob Stability
- **D-05:** Phase 8 may introduce an additional path/glob dependency, but the research step must validate Node `>=14.14.0` compatibility, maintenance state, API stability, and fit with existing `picomatch@4.0.4` before locking a package/version.
- **D-06:** Planning should prefer a centralized path/glob utility layer rather than continuing to grow isolated helpers. Candidate modules may include `lib/path-utils.js` and `lib/glob-utils.js`.
- **D-07:** The stabilization scope covers all artifact/path-related runtime surfaces: `runtime-guidance` artifact matching, `change-artifacts` hashing, `migrate` path guards, `sync` canonical spec path guards, `path-scope` allowed/forbidden matching, and test fixtures for glob-special path cases.
- **D-08:** Utilities should provide canonical path normalization, safe base containment checks, glob-special escaping, safe glob pattern construction, and predictable glob artifact output parsing.

### Test Suite Organization
- **D-09:** Phase 8 should split the current monolithic runtime test coverage into multiple topic-focused scripts, while preserving a single release-ready total entrypoint.
- **D-10:** `npm test` should become the release/preflight total entrypoint. `npm run test:workflow-runtime` should remain available as a compatibility or runtime-focused entrypoint.
- **D-11:** The existing `scripts/test-workflow-runtime.js` should be split cleanly in Phase 8, not merely wrapped. Planning must decompose the split into reviewable steps to avoid one giant risky rewrite.
- **D-12:** Test scripts should cover command/package metadata, command generation parity, migration, state machine, spec review, TDD checkpointing, path guards, archive blocking, status JSON, and release smoke checks.

### Release Verification Gate
- **D-13:** Phase 8 final verification must run the complete release gate: `npm test`, CLI `--help` / `--version` / `check` / `doc` / `status` / `status --json` smoke tests, generated command parity, legacy public-surface grep, package dry-run, schema drift, code review, and final phase verification.
- **D-14:** Package dry-run must use `npm pack --dry-run --json` so package contents, metadata, bin mapping, README, command files, skills, schemas, templates, config, and docs can be asserted without publishing.
- **D-15:** Release-facing documentation should be updated as part of Phase 8. At minimum, planning should consider `CHANGELOG.md`, release checklist material, and README sections affected by `status --json`, path/glob stability, and test/release commands.

### Carry-Forward Constraints
- **D-16:** Preserve the hard clean break: do not reintroduce legacy public entrypoints or standalone `$opsx`.
- **D-17:** Preserve Node `>=14.14.0` compatibility unless a later explicit release decision changes the engine floor.
- **D-18:** Keep implementation library-first. Phase 8 hardens CLI/status helpers, utilities, and tests; it should not turn the Node CLI into a full workflow runner.
- **D-19:** Generated commands remain source-of-truth driven through `lib/workflow.js`, `lib/generator.js`, and templates; do not hand-edit generated files as the primary fix.

### the agent's Discretion
- Exact JSON field ordering is left to the implementation, but it should be deterministic in tests.
- Exact dependency choice for path/glob utilities is left to Phase 8 research, provided it satisfies Node `>=14.14.0`.
- Exact test-file names are left to planning, provided the suite is split by meaningful topic and `npm test` remains the total entrypoint.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and Phase Scope
- `.planning/ROADMAP.md` - Phase 8 goal, requirements, and success criteria.
- `.planning/REQUIREMENTS.md` - QUAL-05, QUAL-06, TEST-01, TEST-02, TEST-03, and TEST-04.
- `.planning/PROJECT.md` - Milestone constraints, current validated requirements, and release boundary.
- `.planning/STATE.md` - Current progress and next action.

### Prior Phase Decisions
- `.planning/phases/03-skill-and-command-surface-rewrite/03-CONTEXT.md` - Explicit-only command surface and generated command source-of-truth.
- `.planning/phases/04-change-state-machine-and-drift-control/04-CONTEXT.md` - Library-first state/runtime boundary, `opsx status --json` expectations, and disk-backed state constraints.
- `.planning/phases/05-spec-split-checkpoint/05-CONTEXT.md` - Spec-review validator and checkpoint contract.
- `.planning/phases/06-tdd-light-workflow/06-CONTEXT.md` - Strict-by-default TDD-light test/checkpoint expectations.
- `.planning/phases/07-verify-sync-archive-and-batch-gates/07-CONTEXT.md` - Verify/sync/archive/batch hard gate behavior and path-scope constraints.
- `.planning/phases/07-verify-sync-archive-and-batch-gates/07-REVIEW-FIX.md` - Latest code-review fix report for Phase 7, including Node 14 compatibility and gate hardening regressions.
- `.planning/phases/07-verify-sync-archive-and-batch-gates/07-REVIEW.md` - Clean post-fix review state for Phase 7.

### Current Implementation Touchpoints
- `lib/cli.js` - Current CLI command dispatch and text-only `status` behavior.
- `lib/runtime-guidance.js` - Current state-aware status/resume/continue payload builders and artifact path matching.
- `lib/fs-utils.js` - Current filesystem helpers and recursive file listing.
- `lib/change-artifacts.js` - Current tracked artifact hashing behavior.
- `lib/migrate.js` - Current migration planning/status and path guard behavior.
- `lib/path-scope.js` - Current allowed/forbidden path matching with `picomatch`.
- `lib/sync.js` - Current canonical spec path guard and sync write behavior.
- `lib/generator.js` - Current generated command bundle source-of-truth.
- `scripts/test-workflow-runtime.js` - Existing monolithic runtime test suite to split.
- `package.json` - Current scripts, dependency set, Node engine, npm package metadata, and files whitelist.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/cli.js`: Already centralizes `status`, migration status output, and command parsing; this is the natural entrypoint for `status --json`.
- `lib/runtime-guidance.js`: Already exposes structured status-like payloads through `buildResumeInstructions()` and `buildContinueInstructions()`, and `buildStatus()` / `buildStatusText()` are the natural source for `changeStatus`.
- `lib/migrate.js`: Already computes canonical/legacy workspace state and migration diagnostics; status JSON should reuse this rather than recomputing migration facts.
- `lib/path-scope.js`: Already uses `picomatch@4.0.4` for Node-compatible path matching and can inform the new glob/path utility boundary.
- `scripts/test-workflow-runtime.js`: Contains the current 109-test baseline and helper patterns for CLI smoke, migration fixtures, generated parity, state, checkpoints, spec review, TDD, verify/sync/archive/batch gates, and release checks.

### Established Patterns
- Runtime implementation has stayed library-first. CLI helpers expose inspection/status behavior but do not run the full agent workflow.
- Generated command files are validated against source bundles instead of hand-maintained independently.
- Tests are plain Node scripts with local fixtures and no heavy test framework dependency.
- Path safety is currently implemented with local helpers in multiple modules; Phase 8 should reduce drift by centralizing the behavior.
- Expected non-error workflow states should be machine-readable rather than thrown as exceptions.

### Integration Points
- `opsx status --json` should integrate `getMigrationStatus()` from `lib/migrate.js`, `loadActiveChangePointer()` from `lib/change-store.js`, and state-aware status from `lib/runtime-guidance.js`.
- Path/glob utilities should be introduced under `lib/` and then adopted by runtime/status, migration, sync, path scope, and artifact hashing surfaces.
- Test splitting should preserve existing fixture behavior while moving topic groups into separate scripts and adding `npm test` as the total entrypoint.
- Release docs/checklist updates should align with the final test scripts and package dry-run behavior.

</code_context>

<specifics>
## Specific Ideas

- `status --json` should be designed for agent parsing first, with a complete envelope and clean stdout.
- Migration details in status JSON should be diagnostic, not a full migration dry-run payload.
- Path/glob dependency selection should be deferred to Phase 8 research and version-locked only after compatibility checks.
- The test suite should be split cleanly rather than only wrapped, even if that requires careful phased planning.
- Release gate should include `npm pack --dry-run --json`, not just text dry-run output.
- Release docs should be updated in the same phase as the final release gate.

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within Phase 8 scope.

</deferred>

---

*Phase: 08-stability-json-and-release-coverage*
*Context gathered: 2026-04-29*
