---
phase: 01-opsx-naming-and-cli-surface
reviewed: 2026-04-27T01:59:28Z
depth: standard
files_reviewed: 37
files_reviewed_list:
  - CHANGELOG.md
  - README-zh.md
  - README.md
  - bin/opsx.js
  - commands/claude/opsx.md
  - commands/codex/prompts/opsx.md
  - commands/gemini/opsx.toml
  - docs/codex.md
  - docs/commands.md
  - docs/customization.md
  - docs/runtime-guidance.md
  - docs/supported-tools.md
  - install.sh
  - lib/cli.js
  - lib/config.js
  - lib/constants.js
  - lib/generator.js
  - lib/install.js
  - lib/workflow.js
  - package.json
  - scripts/check-phase1-legacy-allowlist.js
  - scripts/postinstall.js
  - scripts/test-workflow-runtime.js
  - skills/opsx/GUIDE-en.md
  - skills/opsx/GUIDE-zh.md
  - skills/opsx/SKILL.md
  - skills/opsx/references/action-playbooks-zh.md
  - skills/opsx/references/action-playbooks.md
  - skills/opsx/references/artifact-templates-zh.md
  - skills/opsx/references/artifact-templates.md
  - templates/commands/action.md.tmpl
  - templates/commands/codex-entry.md.tmpl
  - templates/commands/index.md.tmpl
  - templates/commands/shared-entry.md.tmpl
  - templates/project/config.yaml.tmpl
  - templates/project/rule-file.md.tmpl
  - uninstall.sh
findings:
  critical: 0
  warning: 2
  info: 1
  total: 3
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-04-27T01:59:28Z
**Depth:** standard
**Files Reviewed:** 37
**Status:** issues_found

## Summary

Re-reviewed the Phase 1 OpsX naming and CLI surface after the review-fix commit. The previous warning for `skills/opsx/**` execution-evidence classification is fixed: `changedFiles: ['skills/opsx/SKILL.md']` now derives `behavior.changed: true` and `docsOnly: false`.

No critical issues were found. Two warning-level install/uninstall edge cases remain, plus one documentation consistency issue carried over from the prior review.

Verification run:
- `node scripts/test-workflow-runtime.js` - PASS, 23 tests passed
- `node scripts/check-phase1-legacy-allowlist.js` - PASS, scanned 88 files with 54 allowlisted legacy-token hits
- `npm_config_cache=/tmp/opsx-npm-cache npm pack --dry-run` - PASS, package `@xenonbyte/opsx@3.0.0` dry-run tarball includes 88 files

## Warnings

### WR-01: Manifest cleanup can remove paths outside OpsX-owned install roots

**File:** `lib/install.js:55-58`
**Issue:** `cleanupFromManifest()` trusts every line in the manifest and passes it directly to `removePath()`. A corrupted or manually edited manifest under `~/.openspec/manifests/*.manifest` can make `opsx uninstall --platform <name>` or a reinstall delete arbitrary filesystem paths that the current user can write. I verified this with a temporary manifest pointing at a temporary victim file; uninstall removed the victim.
**Fix:**
```js
function isWithinRoot(rootPath, targetPath) {
  const relative = path.relative(path.resolve(rootPath), path.resolve(targetPath));
  return relative === '' || (relative && !relative.startsWith('..') && !path.isAbsolute(relative));
}

function cleanupFromManifest(manifestPath, allowedRoots) {
  if (!fs.existsSync(manifestPath)) return;
  const entries = fs.readFileSync(manifestPath, 'utf8').split('\n').filter(Boolean);
  entries.forEach((entry) => {
    if (!allowedRoots.some((root) => isWithinRoot(root, entry))) {
      throw new Error(`Refusing to remove path outside OpsX install roots: ${entry}`);
    }
    removePath(entry);
  });
}
```
Pass the platform command and skill install directories as `allowedRoots` from both install and uninstall paths, and add a regression test for a manifest entry outside those roots.

### WR-02: Invalid mixed platform values are silently ignored

**File:** `lib/install.js:142-147`, `lib/install.js:150-155`
**Issue:** `install()` and `uninstall()` filter unsupported platform names and proceed when at least one valid platform remains. For example, `opsx install --platform claude,bogus` installs Claude assets successfully and never tells the user that `bogus` was ignored. This can leave users with a partial install/uninstall after a typo.
**Fix:**
```js
function resolvePlatforms(input, action) {
  const requested = parsePlatforms(input);
  const invalid = requested.filter((platform) => !PLATFORM_RULE_FILES[platform]);
  if (!requested.length || invalid.length) {
    throw new Error(`${action} supports only --platform <claude|codex|gemini[,...]>${invalid.length ? `; invalid: ${invalid.join(', ')}` : ''}`);
  }
  return requested;
}
```
Use `resolvePlatforms()` in both `install()` and `uninstall()`, and cover mixed valid/invalid values in the runtime test script.

## Info

### IN-01: Compatibility language alias docs omit the required value

**File:** `README.md:34`, `README-zh.md:34`, `docs/commands.md:63`
**Issue:** The compatibility alias lists show `opsx --language`, but the CLI requires a language value and fails without `<en|zh>`. The CLI help already documents `opsx --language <en|zh>`, so these docs are inconsistent with runtime behavior.
**Fix:** Change each compatibility alias bullet to `opsx --language <en|zh>`.

---

_Reviewed: 2026-04-27T01:59:28Z_
_Reviewer: Codex (gsd-code-reviewer)_
_Depth: standard_
