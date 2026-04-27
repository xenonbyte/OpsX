---
phase: 04-change-state-machine-and-drift-control
reviewed: 2026-04-27T17:46:13Z
depth: standard
files_reviewed: 35
files_reviewed_list:
  - commands/claude/opsx/apply.md
  - commands/claude/opsx/continue.md
  - commands/claude/opsx/ff.md
  - commands/claude/opsx/new.md
  - commands/claude/opsx/propose.md
  - commands/claude/opsx/resume.md
  - commands/claude/opsx/status.md
  - commands/codex/prompts/opsx-apply.md
  - commands/codex/prompts/opsx-continue.md
  - commands/codex/prompts/opsx-ff.md
  - commands/codex/prompts/opsx-new.md
  - commands/codex/prompts/opsx-propose.md
  - commands/codex/prompts/opsx-resume.md
  - commands/codex/prompts/opsx-status.md
  - commands/gemini/opsx/apply.toml
  - commands/gemini/opsx/continue.toml
  - commands/gemini/opsx/ff.toml
  - commands/gemini/opsx/new.toml
  - commands/gemini/opsx/propose.toml
  - commands/gemini/opsx/resume.toml
  - commands/gemini/opsx/status.toml
  - lib/change-artifacts.js
  - lib/change-capsule.js
  - lib/change-state.js
  - lib/change-store.js
  - lib/cli.js
  - lib/fs-utils.js
  - lib/runtime-guidance.js
  - lib/workflow.js
  - lib/workspace.js
  - package.json
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

# Phase 04: Code Review Report

**Reviewed:** 2026-04-27T17:46:13Z
**Depth:** standard
**Files Reviewed:** 35
**Status:** issues_found

## Summary

Reviewed the listed Phase 04 runtime libraries, generated Claude/Codex/Gemini workflow files, package metadata, runtime tests, and OpsX skill/playbook files after REVIEW-FIX commits `3cc0084` and `935a656`.

Prior finding verification:

- Prior WR-01 is fixed for the originally reported `BLOCK` execution checkpoint path. `recordTaskGroupExecution()` now preserves the stored hash baseline and active task group for `checkpointStatus: 'BLOCK'`, and `scripts/test-workflow-runtime.js` includes a regression test for that case.
- Prior WR-02 is fixed for unsafe change names. `createChangeSkeleton()` validates the change name before deriving or writing scaffold paths, and the regression test confirms `../escape`, `foo/bar`, and unsupported-character names fail before files or active pointers are written.

Two new correctness warnings remain in adjacent edge cases. No hardcoded secrets or dangerous API usage were found in the reviewed source/generated workflow files.

Verification run during review:

- `npm run test:workflow-runtime` passed: 51/51 tests.
- Static pattern scan for secrets, dangerous APIs, debug artifacts, and empty catch blocks returned no matches.

## Warnings

### WR-01: Lowercase Or Alternate Rejected Execution Checkpoints Still Advance State

**File:** `lib/change-store.js:467`

**Issue:** `recordTaskGroupExecution()` builds `checkpointResult.accepted` with an exact case-sensitive comparison against only `BLOCK` and `FAILED`. Because `isAcceptedCheckpointResult()` trusts `accepted === true` before checking the status text, payloads such as `checkpointStatus: 'block'`, `FAIL`, `ERROR`, or `REJECTED` are treated as accepted. A reproduced lowercase `block` checkpoint refreshed the drifted artifact hash, advanced `active.taskGroup` to the next group, and added no blocker.

**Fix:**

```js
const checkpointStatus = (toNonEmptyString(payload.checkpointStatus) || 'PENDING').toUpperCase();
const acceptedCheckpoint = isAcceptedCheckpointResult({ status: checkpointStatus });
const checkpointResult = {
  status: checkpointStatus,
  accepted: acceptedCheckpoint,
  taskGroup: completedTaskGroup,
  verificationCommand: verificationEntry.verificationCommand,
  verificationResult: verificationEntry.verificationResult,
  changedFiles: verificationEntry.changedFiles
};
```

Reuse that same `acceptedCheckpoint` after `recordCheckpointResult()` instead of recalculating from a result object whose `accepted` field may override the normalized status. Add regression coverage for lowercase `block` and at least one non-canonical rejected status such as `ERROR`.

### WR-02: Invalid `createdAt` Leaves A Partial New Change Directory

**File:** `lib/workspace.js:203`

**Issue:** `createChangeSkeleton()` creates `.opsx/changes/<changeName>` before parsing `options.createdAt` at line 215. When `createdAt` is invalid, `new Date(options.createdAt).toISOString()` throws `Invalid time value` after the empty change directory has already been written. This violates the same "reject before writing scaffold files" expectation used for invalid change names and leaves a partial change container behind.

**Fix:**

```js
function normalizeCreatedAt(value) {
  if (!value) return new Date().toISOString();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('createdAt must be a valid ISO-8601 timestamp.');
  }
  return parsed.toISOString();
}

function createChangeSkeleton(options = {}) {
  const repoRoot = path.resolve(options.repoRoot || process.cwd());
  const changeName = validateChangeName(options.changeName);
  const schemaName = String(options.schemaName || 'spec-driven').trim() || 'spec-driven';
  const createdAt = normalizeCreatedAt(options.createdAt);
  const securitySensitive = options.securitySensitive === true;

  const changesDir = getCanonicalChangesDir(repoRoot);
  const changeDir = path.join(changesDir, changeName);
  // Create directories only after all scalar inputs have been validated.
}
```

Add a regression test asserting `createChangeSkeleton({ changeName: 'date-edge', createdAt: 'not-a-date' })` throws before `.opsx/changes/date-edge` or `.opsx/active.yaml` exists.

---

_Reviewed: 2026-04-27T17:46:13Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
