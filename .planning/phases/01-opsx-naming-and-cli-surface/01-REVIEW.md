---
phase: 01-opsx-naming-and-cli-surface
reviewed: 2026-04-26T21:00:26Z
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
  warning: 1
  info: 1
  total: 2
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-04-26T21:00:26Z
**Depth:** standard
**Files Reviewed:** 37
**Status:** issues_found

## Summary

Reviewed the Phase 1 OpsX naming and CLI surface files at standard depth, including the package/bin surface, CLI dispatch, install/generator plumbing, workflow classification logic, public command adapters, docs, templates, skill bundle, and regression scripts.

The main runtime issue is a Phase 1 rename regression in execution-evidence classification: `skills/opsx/**` changes are currently treated as documentation-only, so checkpoint verification can be skipped for behavior-changing skill updates.

Verification run:
- `node scripts/test-workflow-runtime.js` - PASS, 23 tests passed
- `node scripts/check-phase1-legacy-allowlist.js` - PASS, scanned 88 files with 54 allowlisted legacy-token hits
- `npm_config_cache=/tmp/opsx-npm-cache npm pack --dry-run` - PASS, package `@xenonbyte/opsx@3.0.0` dry-run tarball includes 88 files

## Warnings

### WR-01: Renamed skill changes are classified as docs-only

**File:** `lib/workflow.js:487`
**Issue:** `isDocsPath()` excludes command files and the old `skills/openspec/` prefix from docs-only handling, but it does not exclude the renamed `skills/opsx/` bundle. A changed file such as `skills/opsx/SKILL.md` now derives `behavior.changed: false`, `docsOnly: true`, and `verification.requiresTesting: false`, so `execution checkpoint` can skip verification for behavior-changing skill or playbook edits.
**Fix:**
```js
const OPSX_SKILL_DIR_PREFIX = 'skills/opsx/';

function isDocsPath(filePath = '') {
  const normalized = String(filePath || '').replace(/\\/g, '/').toLowerCase();
  if (
    /^commands\//.test(normalized)
    || normalized.startsWith(OPSX_SKILL_DIR_PREFIX)
    || normalized.startsWith(LEGACY_SKILL_DIR_PREFIX)
  ) return false;
  return (
    /\.md$/i.test(normalized)
    || /^docs\//i.test(normalized)
    || normalized.startsWith(LEGACY_CHANGE_DIR_PREFIX)
    || /readme/i.test(normalized)
    || /changelog/i.test(normalized)
  );
}
```
Add a regression assertion beside the existing command/prompt classification test for `changedFiles: ['skills/opsx/SKILL.md']`.

## Info

### IN-01: Compatibility language alias docs omit the required value

**File:** `README.md:31`, `README-zh.md:31`, `docs/commands.md:60`
**Issue:** The compatibility alias lists show `opsx --language`, but the CLI requires a language value and fails without `<en|zh>`. The CLI help already documents `opsx --language <en|zh>`, so these docs are inconsistent with runtime behavior.
**Fix:** Change each compatibility alias bullet to `opsx --language <en|zh>`.

---

_Reviewed: 2026-04-26T21:00:26Z_
_Reviewer: Codex (gsd-code-reviewer)_
_Depth: standard_
