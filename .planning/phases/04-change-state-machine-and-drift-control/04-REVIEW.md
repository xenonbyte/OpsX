---
phase: 04-change-state-machine-and-drift-control
reviewed: 2026-04-27T17:21:36Z
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

**Reviewed:** 2026-04-27T17:21:36Z
**Depth:** standard
**Files Reviewed:** 35
**Status:** issues_found

## Summary

Reviewed the listed Phase 04 runtime libraries, generated command prompts for Claude/Codex/Gemini, package metadata, workflow runtime tests, and OpsX skill/playbook files. `package-lock.json` was supplied in the config but filtered out as a lock file per review rules.

Two correctness issues were found in edge cases not covered by the current runtime suite. The generated workflow prompt files are consistent with the checked-in route guidance, and no hardcoded secrets or dangerous API usage were found in the reviewed source.

Verification run during review:

- `npm run test:workflow-runtime` passed: 49/49 tests.

## Warnings

### WR-01: Blocked Execution Checkpoints Still Refresh Hashes And Advance The Active Group

**File:** `lib/change-store.js:483-495`

**Issue:** `recordTaskGroupExecution()` correctly marks `checkpointResult.accepted` as false for `BLOCK` and `FAILED`, but then unconditionally writes `active.taskGroup: nextTaskGroup` and `hashes: normalizeHashMap(refreshedHashes)`. A blocked execution checkpoint can therefore make rejected artifact contents the new hash baseline and move `continue`/`apply` guidance to the next task group, bypassing the intended "patch existing artifacts before continuing" gate.

**Fix:**

```js
const acceptedCheckpoint = isAcceptedCheckpointResult(normalizeCheckpointResult(checkpointResult));

const persistedState = writeChangeState(resolvedChangeDir, Object.assign({}, checkpointed, {
  active: acceptedCheckpoint
    ? Object.assign({}, checkpointed.active, {
      taskGroup: nextTaskGroup,
      nextTaskGroup
    })
    : checkpointed.active,
  verificationLog: [...normalizeAnyArray(checkpointed.verificationLog), verificationEntry],
  hashes: acceptedCheckpoint ? normalizeHashMap(refreshedHashes) : checkpointed.hashes,
  warnings: nextWarnings,
  blockers: acceptedCheckpoint
    ? checkpointed.blockers
    : Array.from(new Set([
      ...normalizeStringArray(checkpointed.blockers),
      `Execution checkpoint blocked for ${completedTaskGroup}`
    ])),
  allowedPaths: allowedPaths.length ? allowedPaths : checkpointed.allowedPaths,
  forbiddenPaths: forbiddenPaths.length ? forbiddenPaths : checkpointed.forbiddenPaths
}));
```

Add a regression test that calls `recordTaskGroupExecution()` with `checkpointStatus: 'BLOCK'` after changing a tracked artifact and asserts the stored hash stays unchanged and `active.taskGroup` does not advance to the next group.

### WR-02: New Change Creation Accepts Names That Runtime Status Later Rejects

**File:** `lib/workspace.js:180-189`

**Issue:** `createChangeSkeleton()` only checks that `changeName` is non-empty and that the joined path remains under `.opsx/changes`. It still accepts names such as `foo/bar`, creates nested change folders, and writes that value to `.opsx/active.yaml`. The runtime status path later rejects the same name through `ensureSafeChangeName()` with `invalid-change-name`, leaving a newly created change that cannot be resumed through the normal runtime APIs.

**Fix:**

```js
const CHANGE_NAME_PATTERN = /^[a-z0-9][a-z0-9-_]*$/i;

function validateChangeName(value) {
  const normalized = String(value || '').trim();
  if (!normalized) throw new Error('changeName is required.');
  if (normalized.includes('/') || normalized.includes('\\') || normalized.includes('..')) {
    throw new Error('changeName must not include path separators or traversal markers.');
  }
  if (!CHANGE_NAME_PATTERN.test(normalized)) {
    throw new Error('changeName contains unsupported characters.');
  }
  return normalized;
}

function createChangeSkeleton(options = {}) {
  const repoRoot = path.resolve(options.repoRoot || process.cwd());
  const changeName = validateChangeName(options.changeName);
  // ...
}
```

Add a test next to the existing invalid-input coverage asserting `createChangeSkeleton({ changeName: '../escape' })`, `createChangeSkeleton({ changeName: 'foo/bar' })`, and unsupported characters fail before any files are written.

---

_Reviewed: 2026-04-27T17:21:36Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
