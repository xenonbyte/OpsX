---
phase: 01-opsx-naming-and-cli-surface
reviewed: 2026-04-27T02:17:34Z
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
  warning: 0
  info: 1
  total: 1
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-04-27T02:17:34Z
**Depth:** standard
**Files Reviewed:** 37
**Status:** issues_found

## Summary

Re-reviewed the Phase 1 OpsX naming and CLI surface after review-fix commits `ed5513d` and `84034f7`. No critical or warning-level issues remain in the reviewed scope.

The two requested fix checks are resolved:
- Manifest cleanup path trust is now guarded: `cleanupFromManifest()` validates every manifest entry against platform install roots before removing anything, and the regression test confirms a corrupted outside-root entry blocks both uninstall and reinstall without deleting files.
- Mixed invalid platform handling is now strict: `install()` and `uninstall()` reject mixed valid/invalid platform lists before doing partial work, and the regression test confirms `claude,bogus` does not partially install or uninstall.

Verification run:
- `node scripts/test-workflow-runtime.js` - PASS, 25 tests passed
- `node scripts/check-phase1-legacy-allowlist.js` - PASS, scanned 88 files with 56 allowlisted legacy-token hits
- `npm --cache /tmp/opsx-npm-cache pack --dry-run` - PASS, package `@xenonbyte/opsx@3.0.0` dry-run tarball includes 88 files

Note: plain `npm pack --dry-run` first failed because the user npm cache under `/Users/xubo/.npm` contains root-owned files. Re-running with a temporary cache avoided that unrelated host-cache issue.

## Info

### IN-01: Compatibility language alias docs omit the required value

**File:** `README.md:34`, `README-zh.md:34`, `docs/commands.md:63`
**Issue:** The compatibility alias lists show `opsx --language`, but the CLI requires a language value and fails without `<en|zh>`. The CLI help already documents `opsx --language <en|zh>`, so these docs are inconsistent with runtime behavior.
**Fix:** Change each compatibility alias bullet to `opsx --language <en|zh>`.

---

_Reviewed: 2026-04-27T02:17:34Z_
_Reviewer: Codex (gsd-code-reviewer)_
_Depth: standard_
