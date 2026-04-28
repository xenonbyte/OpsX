---
phase: 07-verify-sync-archive-and-batch-gates
reviewed: 2026-04-28T16:09:41Z
depth: standard
files_reviewed: 28
files_reviewed_list:
  - commands/claude/opsx/archive.md
  - commands/claude/opsx/batch-apply.md
  - commands/claude/opsx/bulk-archive.md
  - commands/claude/opsx/sync.md
  - commands/claude/opsx/verify.md
  - commands/codex/prompts/opsx-archive.md
  - commands/codex/prompts/opsx-batch-apply.md
  - commands/codex/prompts/opsx-bulk-archive.md
  - commands/codex/prompts/opsx-sync.md
  - commands/codex/prompts/opsx-verify.md
  - commands/gemini/opsx/archive.toml
  - commands/gemini/opsx/batch-apply.toml
  - commands/gemini/opsx/bulk-archive.toml
  - commands/gemini/opsx/sync.toml
  - commands/gemini/opsx/verify.toml
  - lib/archive.js
  - lib/batch.js
  - lib/generator.js
  - lib/path-scope.js
  - lib/runtime-guidance.js
  - lib/sync.js
  - lib/verify.js
  - lib/workflow.js
  - package.json
  - scripts/test-workflow-runtime.js
  - skills/opsx/SKILL.md
  - skills/opsx/references/action-playbooks-zh.md
  - skills/opsx/references/action-playbooks.md
findings:
  critical: 0
  warning: 4
  info: 0
  total: 4
status: issues_found
---

# Phase 07: Code Review Report

**Reviewed:** 2026-04-28T16:09:41Z
**Depth:** standard
**Files Reviewed:** 28
**Status:** issues_found

## Summary

Reviewed the current Phase 7 command prompts, OpsX skill guidance, gate/runtime modules, package metadata, and runtime test suite. Prompt generation and checked-in route surfaces are aligned across Claude, Codex, and Gemini, and `npm run test:workflow-runtime` passes 104/104 on the local Node 24.8.0 runtime.

The remaining issues are gate-hardening and compatibility gaps: verify can run with weakened config due to shallow merging, batch operations do not enforce the documented `.opsx/config.yaml` global precondition, archive execution can trust a caller-supplied gate result instead of recalculating the hard gate, and the declared Node engine floor is lower than syntax used by the test/runtime support path.

## Warnings

### WR-01: Verify Config Merge Can Drop Project Or Global Gate Policy

**File:** `lib/verify.js:101`
**Issue:** `loadEffectiveRuntimeConfig()` uses `Object.assign({}, projectConfig, changeConfig)` and never loads global config. A partial `change.yaml` object such as `rules:` or `securityReview:` replaces the whole project-level object before `normalizeConfig()` applies defaults. That can silently remove configured `rules.tdd.requireFor` / `rules.tdd.exempt` policy or a project/global `securityReview.required: true`, letting `evaluateVerifyGate()` run weaker gates than status/apply guidance uses.
**Fix:**
```js
const { normalizeConfig, readYamlFile, loadGlobalConfig, deepMerge } = require('./config');

function loadEffectiveRuntimeConfig(changeDir, options = {}) {
  const repoRoot = resolveRepoRoot(changeDir);
  const projectConfig = readYamlFile(path.join(repoRoot, '.opsx', 'config.yaml'));
  const changeConfig = readYamlFile(path.join(changeDir, 'change.yaml'));
  const globalConfig = loadGlobalConfig(options.homeDir);
  return {
    config: normalizeConfig(deepMerge(deepMerge(globalConfig, projectConfig), changeConfig)),
    changeConfig
  };
}
```

### WR-02: Batch Global Preconditions Do Not Require Workspace Config

**File:** `lib/batch.js:72`
**Issue:** `resolveBatchPaths()` treats `.opsx/` plus `.opsx/changes/` as enough to proceed. The generated batch and bulk-archive routes explicitly say missing `.opsx/config.yaml` must stop and redirect to onboard, but `runBatchApply()` / `runBulkArchive()` can still evaluate or mutate changes in a partially initialized workspace.
**Fix:**
```js
const configPath = path.join(workspaceDir, 'config.yaml');
if (!fs.existsSync(configPath) || !fs.statSync(configPath).isFile()) {
  return {
    ok: false,
    error: buildGlobalFailure(
      'workspace-config-missing',
      'Workspace config `.opsx/config.yaml` is missing and batch operations cannot continue safely.'
    )
  };
}
```

### WR-03: Archive Execution Can Trust A Stale Or Forged Gate Result

**File:** `lib/archive.js:229`
**Issue:** `archiveChange()` skips `evaluateArchiveGate()` when `options.gateResult` is an object. A caller can pass a stale or forged non-`BLOCK` result and bypass the documented archive behavior that re-runs verify/sync safety before moving the change directory. This is especially risky for `SYNCED` changes because the function then moves the directory without recalculating verify findings.
**Fix:**
```js
function archiveChange(options = {}) {
  const gateResult = evaluateArchiveGate(options);
  if (gateResult.status === 'BLOCK') {
    return Object.assign({}, gateResult, {
      syncApplied: false,
      archived: false
    });
  }
  // continue with the freshly evaluated gateResult
}
```

### WR-04: Declared Node Engine Is Lower Than The Runtime Syntax Floor

**File:** `package.json:51`
**Issue:** The package declares `node >=14.14.0`, but the reviewed test runtime imports `node:crypto` at `scripts/test-workflow-runtime.js:8`. The `node:` builtin prefix for CommonJS `require()` is not available across the declared Node 14.14 floor, so tests or package code using the same import form can fail on a version the package claims to support.
**Fix:** Either replace `require('node:crypto')` with `require('crypto')` in reviewed runtime/test code and matching package modules, or raise `engines.node` to a version that supports the `node:` prefix consistently, for example `>=14.18.0`.

---

_Reviewed: 2026-04-28T16:09:41Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
