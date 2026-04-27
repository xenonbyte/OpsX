---
phase: 03-skill-and-command-surface-rewrite
reviewed: 2026-04-27T11:44:14Z
depth: standard
files_reviewed: 68
files_reviewed_list:
  - AGENTS.md
  - README.md
  - README-zh.md
  - commands/claude/opsx.md
  - commands/claude/opsx/apply.md
  - commands/claude/opsx/archive.md
  - commands/claude/opsx/batch-apply.md
  - commands/claude/opsx/bulk-archive.md
  - commands/claude/opsx/continue.md
  - commands/claude/opsx/explore.md
  - commands/claude/opsx/ff.md
  - commands/claude/opsx/new.md
  - commands/claude/opsx/onboard.md
  - commands/claude/opsx/propose.md
  - commands/claude/opsx/resume.md
  - commands/claude/opsx/status.md
  - commands/claude/opsx/sync.md
  - commands/claude/opsx/verify.md
  - commands/codex/prompts/opsx.md
  - commands/codex/prompts/opsx-apply.md
  - commands/codex/prompts/opsx-archive.md
  - commands/codex/prompts/opsx-batch-apply.md
  - commands/codex/prompts/opsx-bulk-archive.md
  - commands/codex/prompts/opsx-continue.md
  - commands/codex/prompts/opsx-explore.md
  - commands/codex/prompts/opsx-ff.md
  - commands/codex/prompts/opsx-new.md
  - commands/codex/prompts/opsx-onboard.md
  - commands/codex/prompts/opsx-propose.md
  - commands/codex/prompts/opsx-resume.md
  - commands/codex/prompts/opsx-status.md
  - commands/codex/prompts/opsx-sync.md
  - commands/codex/prompts/opsx-verify.md
  - commands/gemini/opsx.toml
  - commands/gemini/opsx/apply.toml
  - commands/gemini/opsx/archive.toml
  - commands/gemini/opsx/batch-apply.toml
  - commands/gemini/opsx/bulk-archive.toml
  - commands/gemini/opsx/continue.toml
  - commands/gemini/opsx/explore.toml
  - commands/gemini/opsx/ff.toml
  - commands/gemini/opsx/new.toml
  - commands/gemini/opsx/onboard.toml
  - commands/gemini/opsx/propose.toml
  - commands/gemini/opsx/resume.toml
  - commands/gemini/opsx/status.toml
  - commands/gemini/opsx/sync.toml
  - commands/gemini/opsx/verify.toml
  - docs/codex.md
  - docs/commands.md
  - docs/runtime-guidance.md
  - docs/supported-tools.md
  - lib/cli.js
  - lib/generator.js
  - lib/workflow.js
  - scripts/check-phase1-legacy-allowlist.js
  - scripts/postinstall.js
  - scripts/test-workflow-runtime.js
  - skills/opsx/GUIDE-en.md
  - skills/opsx/GUIDE-zh.md
  - skills/opsx/SKILL.md
  - skills/opsx/references/action-playbooks.md
  - skills/opsx/references/action-playbooks-zh.md
  - templates/commands/action.md.tmpl
  - templates/commands/codex-entry.md.tmpl
  - templates/commands/index.md.tmpl
  - templates/commands/shared-entry.md.tmpl
  - templates/project/rule-file.md.tmpl
findings:
  critical: 0
  warning: 2
  info: 1
  total: 3
status: issues_found
---

# Phase 03: Code Review Report

**Reviewed:** 2026-04-27T11:44:14Z
**Depth:** standard
**Files Reviewed:** 68
**Status:** issues_found

## Summary

Reviewed the Phase 03 public command surface, source generators, templates, skill guidance, and runtime gates. Legacy OpenSpec public-token checks pass, generated bundle parity is covered by the runtime suite, and Codex standalone `$opsx <request>` guidance is not advertised in the reviewed public docs/help surfaces.

The main regression is platform-specific route leakage: shared fallback copy uses Codex `$opsx-*` routes in Claude and Gemini generated commands. The runtime gate passes despite this, so it needs a platform-aware assertion.

Verification run during review:
- `node scripts/check-phase1-legacy-allowlist.js` passed.
- `npm run test:workflow-runtime` passed, 31/31 tests.

## Warnings

### WR-01: Claude/Gemini fallback guidance points users to Codex-only routes

**File:** `/Users/xubo/x-skills/openspec/lib/workflow.js:109`
**Also affected:** `/Users/xubo/x-skills/openspec/lib/workflow.js:121`, `/Users/xubo/x-skills/openspec/lib/workflow.js:137-143`, `/Users/xubo/x-skills/openspec/commands/claude/opsx/apply.md:25-26`, `/Users/xubo/x-skills/openspec/commands/gemini/opsx/apply.toml:27-28`, `/Users/xubo/x-skills/openspec/skills/opsx/references/action-playbooks.md:20-21`, `/Users/xubo/x-skills/openspec/skills/opsx/references/action-playbooks-zh.md:20-21`

**Issue:** `getActionFallbackLines()` is platform-agnostic but embeds Codex-only `$opsx-*` commands. Because `buildActionMarkdown('claude'|'gemini', action)` reuses the same fallback text, Claude and Gemini action commands now say their primary route is `/opsx-<action>` while fallback instructions tell users to run `$opsx-onboard`, `$opsx-new`, or `$opsx-propose`. That contradicts the hard clean-break route contract.

**Fix:**
Make fallback route rendering platform-aware, then regenerate the checked-in command bundles and update shared skill playbooks to avoid unqualified Codex routes.

```js
const ROUTES_BY_PLATFORM = {
  codex: { onboard: '$opsx-onboard', new: '$opsx-new', propose: '$opsx-propose' },
  claude: { onboard: '/opsx-onboard', new: '/opsx-new', propose: '/opsx-propose' },
  gemini: { onboard: '/opsx-onboard', new: '/opsx-new', propose: '/opsx-propose' }
};

function getActionFallbackLines(platform, actionId) {
  const routes = ROUTES_BY_PLATFORM[platform];
  if (!routes) throw new Error(`Unsupported platform: ${platform}`);
  // Build fallback copy with routes.onboard/routes.new/routes.propose.
}
```

Then call `getActionFallbackLines(platform, action.id)` from `lib/generator.js`.

### WR-02: Runtime gate has a false negative for platform-specific fallback routes

**File:** `/Users/xubo/x-skills/openspec/scripts/test-workflow-runtime.js:1365-1373`

**Issue:** The fallback coverage test only checks that empty-workspace/missing-active/no-auto-create text exists. It never asserts that Claude/Gemini fallback text avoids `$opsx-*`, or that Codex fallback text avoids `/opsx-*`. The current suite passes 31/31 while the checked-in Claude/Gemini action bundles contain Codex route suggestions, so this gate can miss the exact public-surface regression Phase 03 is meant to prevent.

**Fix:**
Add route-contract assertions for generated action bundles before parity checks, for example:

```js
const wrongRoutePatternByPlatform = {
  claude: /\$opsx-/,
  gemini: /\$opsx-/,
  codex: /\/opsx-/
};

Object.entries(generatedBundles).forEach(([platform, bundle]) => {
  Object.entries(bundle).forEach(([relativePath, content]) => {
    assert(
      !wrongRoutePatternByPlatform[platform].test(content),
      `${platform}:${relativePath} contains a route for the wrong platform`
    );
  });
});
```

If shared skill docs intentionally mention both route families, test them separately with explicit platform labels.

## Info

### IN-01: Generated action prompts duplicate strict preflight bullets

**File:** `/Users/xubo/x-skills/openspec/templates/commands/action.md.tmpl:15-18`

**Issue:** The action template hard-codes `.opsx/config.yaml`, `.opsx/active.yaml`, `state.yaml`, and `context.md` preflight bullets, then immediately expands `{{preflight_note}}`, which contains the same guidance from `PHASE_THREE_PREFLIGHT_LINES`. Every generated action file now repeats the same preflight instructions twice, increasing token surface and making future prompt edits more error-prone.

**Fix:** Keep one source of truth. Prefer removing the hard-coded lines 16-17 from `templates/commands/action.md.tmpl` and relying on `{{preflight_note}}`, then regenerate Claude/Codex/Gemini command bundles.

---

_Reviewed: 2026-04-27T11:44:14Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
