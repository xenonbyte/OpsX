---
phase: 05-spec-split-checkpoint
reviewed: 2026-04-28T07:30:10Z
depth: standard
files_reviewed: 18
files_reviewed_list:
  - commands/claude/opsx/continue.md
  - commands/claude/opsx/ff.md
  - commands/claude/opsx/propose.md
  - commands/codex/prompts/opsx-continue.md
  - commands/codex/prompts/opsx-ff.md
  - commands/codex/prompts/opsx-propose.md
  - commands/gemini/opsx/continue.toml
  - commands/gemini/opsx/ff.toml
  - commands/gemini/opsx/propose.toml
  - lib/change-store.js
  - lib/generator.js
  - lib/spec-validator.js
  - lib/workflow.js
  - schemas/spec-driven/schema.json
  - scripts/test-workflow-runtime.js
  - skills/opsx/SKILL.md
  - skills/opsx/references/action-playbooks-zh.md
  - skills/opsx/references/action-playbooks.md
findings:
  critical: 0
  warning: 2
  info: 0
  total: 2
status: issues_found
---

# Phase 05: Code Review Report

**Reviewed:** 2026-04-28T07:30:10Z
**Depth:** standard
**Files Reviewed:** 18
**Status:** issues_found

## Summary

Reviewed the Phase 05 schema, workflow/checkpoint runtime, generated command prompts, skill guidance, and regression tests. Existing `npm run test:workflow-runtime` passes with 64 tests, and generated command parity is locked, but two pre-design gate regressions remain untested: the new split-spec checkpoint can continue without any specs, and the artifact dependency graph still exposes `design` before specs/checkpoint completion.

## Warnings

### WR-01: Spec-split checkpoint does not block when specs are absent

**File:** `lib/workflow.js:1120`
**Issue:** `runSpecSplitCheckpoint()` accepts an empty `specFiles` list from `normalizeSpecSplitSpecFiles()` and delegates directly to `reviewSpecSplitEvidence()`. With no proposal and no specs, this returns `PASS` with `nextStep: "Proceed to design."`; with a proposal but no specs, it only returns `WARN`. That violates the checkpoint trigger `after-specs-before-design` and can let `/opsx-continue` or `/opsx-ff` proceed to design without a real spec artifact.
**Fix:**
```js
function runSpecSplitCheckpoint(options = {}) {
  const schema = resolveSchema(options);
  const specFiles = normalizeSpecSplitSpecFiles(options);
  const evidence = collectSpecSplitEvidence({
    proposalText: getSourceBlock(options.sources || {}, 'proposal'),
    specFiles
  });
  const findings = [];

  if (!specFiles.length || !evidence.counts.specFileCount) {
    findings.push({
      severity: 'BLOCK',
      code: 'specs-missing',
      message: 'Specs are required before spec-split-checkpoint can pass.',
      patchTargets: ['specs']
    });
  } else {
    findings.push(...reviewSpecSplitEvidence(evidence, options));
  }

  // Preserve existing escalation and buildCheckpointResult() handling below.
}
```
Add a regression test asserting `runSpecSplitCheckpoint({ sources: {} }).status === 'BLOCK'` and another for proposal-only input.

### WR-02: Design remains ready before specs despite the new checkpoint ordering

**File:** `schemas/spec-driven/schema.json:58`
**Issue:** The schema inserts `spec-split-checkpoint` after `specs` and before `design`, but the `design` artifact still only requires `proposal`. Both workflow/runtime readiness paths derive blocking from artifact `requires`, so a state with `proposal: true`, `specs: false`, and `design: false` marks both `specs` and `design` as READY. That undermines the Phase 05 contract because direct artifact guidance or stale persisted stage routing can still move to design before specs are accepted and the split checkpoint has passed.
**Fix:**
```json
{
  "id": "design",
  "path": "design.md",
  "requires": ["proposal", "specs"]
}
```
Also add a regression covering `summarizeWorkflowState()` or `buildRuntimeKernel()` for `proposal=true/specs=false/design=false`, expecting `design` to be blocked by `specs`. If lifecycle routing is intended to enforce the checkpoint separately, update the `SPECS_READY` continue route to require the split checkpoint before returning `design`.

---

_Reviewed: 2026-04-28T07:30:10Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
