---
phase: 08-stability-json-and-release-coverage
reviewed: 2026-04-28T20:14:14Z
depth: standard
files_reviewed: 22
files_reviewed_list:
  - CHANGELOG.md
  - README-zh.md
  - README.md
  - docs/commands.md
  - docs/release-checklist.md
  - docs/runtime-guidance.md
  - lib/change-artifacts.js
  - lib/cli.js
  - lib/glob-utils.js
  - lib/migrate.js
  - lib/path-scope.js
  - lib/path-utils.js
  - lib/runtime-guidance.js
  - lib/sync.js
  - package.json
  - scripts/test-workflow-gates.js
  - scripts/test-workflow-generation.js
  - scripts/test-workflow-package.js
  - scripts/test-workflow-paths.js
  - scripts/test-workflow-runtime.js
  - scripts/test-workflow-shared.js
  - scripts/test-workflow-state.js
findings:
  critical: 0
  warning: 2
  info: 0
  total: 2
status: issues_found
---

# Phase 8: Code Review Report

**Reviewed:** 2026-04-28T20:14:14Z
**Depth:** standard
**Files Reviewed:** 22
**Status:** issues_found

## Summary

Reviewed the Phase 8 source, docs, and split runtime test files for public-surface regressions, release-gate breakage, Node >=14.14.0/CommonJS compatibility, `status --json` transport behavior, and path/glob containment regressions.

No critical security or crash issues were found. The implementation and current regression suite pass locally, but two release-facing issues remain: public README docs still spell banned route forms, and the release checklist mixes non-shell GSD routes into a bash command block that it tells operators to run from the repo root.

Verification run during review:
- `npm test` passed: 126/126
- `node bin/opsx.js status --json` emitted parseable JSON with exit 0
- `node scripts/check-phase1-legacy-allowlist.js` passed
- `npm_config_cache=.npm-cache npm pack --dry-run --json` passed and emitted pack JSON

## Warnings

### WR-01: Public README Docs Still Expose Banned Route Forms

**File:** `README.md:47`, `README-zh.md:47`
**Issue:** The public README text explicitly spells `standalone $opsx` and `/opsx:*` as "do not use" examples. The Phase 8 contract says current public UX must not expose standalone `$opsx` or `/opsx:*` at all, and this wording ships those tokens in the primary public docs. The current automated gates miss this because the legacy allowlist check only scans OpenSpec-era tokens, and the generated-route tests do not scan README/README-zh for OpsX wildcard/dispatcher tokens.
**Fix:** Reword both README lines without spelling the forbidden forms, and add a public-doc scan that catches markdown-wrapped variants.

```markdown
Use only explicit action routes shown above; avoid dispatcher or wildcard route forms.
```

Add coverage in `scripts/test-workflow-generation.js` or the shared allowlist gate so README, README-zh, docs, templates, commands, skills, postinstall, and CLI help are scanned for:
- standalone dispatcher route wording
- `/opsx:*`
- `/prompts:opsx-*`
- `$opsx <request>`
- markdown-wrapped variants that insert backticks around the route token

### WR-02: Release Checklist Presents Non-Shell GSD Routes as Bash Commands

**File:** `docs/release-checklist.md:61`
**Issue:** The checklist starts with "Run all commands from repository root" and then places `$gsd-code-review 8` and `$gsd-verify-work 8` inside a `bash` block. Those are GSD/Codex workflow invocations, not executable shell commands; Phase 8 summaries already record that the shell forms are `command not found` in this environment. This makes the canonical release checklist copy/paste fail at the review/UAT gate. The preservation test also checks `.planning/.../08-06-PLAN.md` instead of `docs/release-checklist.md`, so the canonical checklist can drift without failing `npm test`.
**Fix:** Split executable shell commands from workflow-agent steps, while preserving the exact review/UAT route text.

```bash
gsd-sdk query verify.schema-drift 08
```

```text
Invoke through the GSD/Codex workflow UI:
$gsd-code-review 8
$gsd-verify-work 8
```

Update the generation/release test to assert these post-test steps in `docs/release-checklist.md`, not only in the phase plan.

---

_Reviewed: 2026-04-28T20:14:14Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
