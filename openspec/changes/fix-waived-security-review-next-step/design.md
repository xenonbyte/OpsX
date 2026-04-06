## Context
The current runtime already distinguishes `required`, `recommended`, `waived`, and `completed` review states, but runtime guidance still mixes review visibility with workflow actionability. That leaves several bad outcomes: advisory review (`waived` or `recommended`) can still show up as the next planning step, workflow APIs can still report recommended review as active or actionable-looking, caller-provided runtime source text can be dropped before heuristic or checkpoint evaluation when files are absent or whitespace-only, apply-preview group derivation can ignore array-backed task sources, and apply readiness can drift away from file-based workflow completion when preview planning content exists only in memory.

## Goals / Non-Goals
### Goals
- Make advisory review remain visible in status output without being treated as actionable planning work.
- Preserve current behavior for required and completed review states.
- Preserve caller-provided heuristic inputs such as `sources.request` across status and apply-instruction flows.
- Preserve caller-provided in-memory artifact content for preview flows when files have not yet been written or contain only whitespace.
- Keep summarized workflow output and apply-preview task grouping aligned with the same advisory-review and in-memory-source semantics.
- Keep apply readiness aligned with file-based artifact completion even when checkpoint evaluation uses richer preview sources.
- Add regression coverage at both runtime-kernel and workflow-contract levels.

### Non-Goals
- Do not change public CLI surface or add new commands.
- Do not redefine when heuristic security review is triggered.
- Do not add fallback behavior that silently auto-completes security review.

## Decisions
- Keep `review.state` canonical for callers (`required`, `recommended`, `waived`, `completed`), but treat runtime artifact actionability separately from review visibility.
- Change runtime artifact activation so advisory review (`recommended` or `waived`) does not participate in next-step selection, and mirror that same inactive semantics in exported workflow review state.
- Merge caller-provided `options.sources` with filesystem-derived artifact text so file content wins only when it contains meaningful non-whitespace content, while caller-provided in-memory content survives when the file is absent or whitespace-only.
- Normalize task source blocks before apply-preview task-group derivation so array-backed preview inputs behave the same as string-backed sources.
- Keep apply readiness driven by artifact completion on disk; preview sources may shape checkpoint diagnostics, but they must not mark missing required artifacts as execution-ready.
- Add regression assertions in the runtime workflow test suite and workflow contract validator.

## Risks / Trade-offs
- If any downstream caller incorrectly depended on advisory review being surfaced as the next planning step, its local interpretation may change after this fix.
- Separating review visibility from artifact actionability is lower risk than special-casing only one next-step branch, but it requires clear tests for both advisory and hard-gated review states.
- Source merging must preserve caller-provided inputs for preview flows without letting them override meaningful artifact-file contents when those files already exist.
- Summary/output alignment adds fields rather than changing canonical states, so callers must consume the new `active` signal to distinguish advisory review from actionable review.
- Apply previews can still show high-quality checkpoint feedback from in-memory text, but callers must not mistake that for permission to skip writing planning artifacts.

## Migration Plan
Rollout / migration: none, because the fix is internal runtime guidance only.
Compatibility: none. Existing hard-gated and completed review states remain unchanged, and recommended review remains visible while no longer blocking apply handoff.
Rollback: none for operators; if downstream compatibility issues appear, maintainers can revert the waived-state activation change and its regression tests.
1. Update runtime artifact activation semantics so advisory review becomes non-actionable.
2. Mirror that inactive advisory-review semantics in exported workflow review state.
3. Merge caller-provided sources with file-derived artifact text before heuristic review resolution, preserving in-memory content when files are absent or whitespace-only.
4. Normalize array-backed task sources before apply-preview task-group derivation.
5. Keep apply readiness bound to file-based artifact completion even when preview sources improve checkpoint evaluation.
6. Add runtime regression coverage for waived, recommended, request-only, whitespace-only, unsaved-buffer, and apply-readiness behavior.
7. Run runtime tests, CLI checks, syntax checks, and checkpoint verification for the new change.
