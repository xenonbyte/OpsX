---
phase: 02-opsx-workspace-and-migration
reviewed: 2026-04-27T06:36:44Z
depth: standard
files_reviewed: 15
files_reviewed_list:
  - .gitignore
  - README-zh.md
  - README.md
  - docs/customization.md
  - docs/runtime-guidance.md
  - lib/cli.js
  - lib/config.js
  - lib/constants.js
  - lib/install.js
  - lib/migrate.js
  - lib/runtime-guidance.js
  - lib/workspace.js
  - scripts/test-workflow-runtime.js
  - templates/project/change-metadata.yaml.tmpl
  - templates/project/config.yaml.tmpl
findings:
  critical: 1
  warning: 1
  info: 1
  total: 3
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-04-27T06:36:44Z
**Depth:** standard
**Files Reviewed:** 15
**Status:** issues_found

## Summary

Reviewed the listed source, docs, templates, and runtime test coverage for Phase 2 migration guarantees. The canonical `.opsx/` and `~/.opsx/config.yaml` paths are generally wired through config/runtime paths, and the existing runtime suite passes, but two migration safety gaps can still violate fail-closed behavior around dry-run intent and pre-mutation aborts.

Verification run during review: `npm run test:workflow-runtime` passed 29/29.

## Critical Issues

### CR-01: `--dry-run` can execute when followed by an extra token

**File:** `lib/cli.js:20`

**Issue:** `parseArgs()` treats every `--flag` as value-taking when the next token does not start with `--`. For `opsx migrate --dry-run ./some-token`, `options['dry-run']` becomes the string `./some-token`; the migrate handler only enables dry-run when the value is exactly `true` at `lib/cli.js:139`. That means a command containing an explicit `--dry-run` can fall through to execute mode and move files, violating the Phase 2 zero-write dry-run guarantee.

**Fix:**
```js
const BOOLEAN_FLAGS = new Set(['dry-run', 'help', 'version', 'check', 'doc']);

function parseArgs(argv) {
  const options = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      options._.push(token);
      continue;
    }
    const key = token.slice(2);
    if (BOOLEAN_FLAGS.has(key)) {
      options[key] = true;
      continue;
    }
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      options[key] = true;
      continue;
    }
    options[key] = next;
    index += 1;
  }
  return options;
}
```
Also add a regression that `opsx migrate --dry-run extra` either remains dry-run with zero writes or fails closed before calling `runMigration()` in execute mode.

## Warnings

### WR-01: Destination parent conflicts can fail after earlier migration moves

**File:** `lib/migrate.js:140`

**Issue:** `appendMoveIfSelected()` aborts only when the exact destination path already exists, but execute mode later creates destination parents inside the move loop at `lib/migrate.js:381`. If a canonical parent path such as `~/.opsx` or `~/.opsx/skills` exists as a file, planning does not abort; execute mode can complete earlier repo/home moves and then throw from `ensureDir(path.dirname(move.to))`, leaving a partial migration. This weakens the guarantee that canonical destination conflicts abort before mutation.

**Fix:** Add preflight validation for all selected move destination ancestors before any `renameSync()` call. Abort during `createMigrationPlan()` when any ancestor between the scope base and `path.dirname(move.to)` exists and is not a directory.

```js
function validateDestinationParents(plan, move, baseDir, label) {
  let current = path.resolve(baseDir);
  const targetParent = path.dirname(path.resolve(move.to));
  ensureWithinBase(baseDir, targetParent, label);

  for (const segment of path.relative(current, targetParent).split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    if (fs.existsSync(current) && !fs.statSync(current).isDirectory()) {
      setAbortReason(plan, `Canonical destination parent is not a directory: ${move.toDisplay}`);
      return;
    }
  }
}
```
Call this while building the plan, and add regression coverage for file conflicts at `~/.opsx` and `~/.opsx/skills`.

## Info

### IN-01: Unused migration reference constant

**File:** `lib/migrate.js:82`

**Issue:** `REQUIRED_MOVE_LINE_REFERENCES` is defined but never read or exported. Keeping it in runtime code makes it look like required dry-run output is enforced here, while actual enforcement lives in tests.

**Fix:** Remove the constant, or wire it into the test helper/assertions if it is intended to be the single source of truth for required migration output lines.

---

_Reviewed: 2026-04-27T06:36:44Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
