---
phase: 03-skill-and-command-surface-rewrite
verified: 2026-04-27T12:08:59Z
status: passed
score: 5/5 must-haves verified
requirements_satisfied: 5/5
overrides_applied: 0
gaps: 0
human_items: 0
review_findings: 0
---

# Phase 03: Skill and Command Surface Rewrite Verification Report

**Phase Goal:** Make `/opsx-*`, `$opsx-*`, and `skills/opsx` the public workflow surface.
**Verified:** 2026-04-27T12:08:59Z
**Status:** passed
**Re-verification:** No

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | `skills/opsx` is the distributed skill surface, `name: opsx`, with current config precedence and explicit-only Codex routing. | ✓ VERIFIED | [`skills/opsx/SKILL.md`](/Users/xubo/x-skills/openspec/skills/opsx/SKILL.md), [`skills/opsx/GUIDE-en.md`](/Users/xubo/x-skills/openspec/skills/opsx/GUIDE-en.md), [`skills/opsx/GUIDE-zh.md`](/Users/xubo/x-skills/openspec/skills/opsx/GUIDE-zh.md) |
| 2 | Claude and Gemini generated command bundles expose `/opsx-*` routes only, and their checked-in outputs match the generator contract. | ✓ VERIFIED | [`commands/claude/opsx.md`](/Users/xubo/x-skills/openspec/commands/claude/opsx.md), [`commands/claude/opsx/*.md`](/Users/xubo/x-skills/openspec/commands/claude/opsx/), [`commands/gemini/opsx.toml`](/Users/xubo/x-skills/openspec/commands/gemini/opsx.toml), [`commands/gemini/opsx/*.toml`](/Users/xubo/x-skills/openspec/commands/gemini/opsx/), `npm run test:workflow-runtime` (`31 test(s) passed`) |
| 3 | Codex public routing is explicit `$opsx-*` only; `commands/codex/prompts/opsx.md` remains an internal catalog, not a public entrypoint. | ✓ VERIFIED | [`commands/codex/prompts/opsx.md`](/Users/xubo/x-skills/openspec/commands/codex/prompts/opsx.md), [`docs/codex.md`](/Users/xubo/x-skills/openspec/docs/codex.md), [`docs/commands.md`](/Users/xubo/x-skills/openspec/docs/commands.md), [`docs/supported-tools.md`](/Users/xubo/x-skills/openspec/docs/supported-tools.md), [`lib/cli.js`](/Users/xubo/x-skills/openspec/lib/cli.js), [`scripts/postinstall.js`](/Users/xubo/x-skills/openspec/scripts/postinstall.js), [`templates/project/rule-file.md.tmpl`](/Users/xubo/x-skills/openspec/templates/project/rule-file.md.tmpl), [`AGENTS.md`](/Users/xubo/x-skills/openspec/AGENTS.md), `rg -n '/opsx-' commands/codex/prompts` returned no matches |
| 4 | Generated prompts read current `.opsx` state and give honest fallback guidance without auto-creating active state. | ✓ VERIFIED | [`lib/workflow.js`](/Users/xubo/x-skills/openspec/lib/workflow.js), [`templates/commands/action.md.tmpl`](/Users/xubo/x-skills/openspec/templates/commands/action.md.tmpl), [`scripts/test-workflow-runtime.js`](/Users/xubo/x-skills/openspec/scripts/test-workflow-runtime.js), `npm run test:workflow-runtime` (`31 test(s) passed`) |
| 5 | Empty-workspace and no-active-change guidance is concrete for `onboard`, `status`, and `resume`. | ✓ VERIFIED | [`skills/opsx/references/action-playbooks.md`](/Users/xubo/x-skills/openspec/skills/opsx/references/action-playbooks.md), [`skills/opsx/references/action-playbooks-zh.md`](/Users/xubo/x-skills/openspec/skills/opsx/references/action-playbooks-zh.md), [`commands/codex/prompts/opsx-onboard.md`](/Users/xubo/x-skills/openspec/commands/codex/prompts/opsx-onboard.md), [`commands/codex/prompts/opsx-status.md`](/Users/xubo/x-skills/openspec/commands/codex/prompts/opsx-status.md), [`commands/codex/prompts/opsx-resume.md`](/Users/xubo/x-skills/openspec/commands/codex/prompts/opsx-resume.md), `npm run test:workflow-runtime` (`31 test(s) passed`) |

**Score:** 5/5 truths verified

## Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `lib/workflow.js` | Source-of-truth action metadata, fallback lines, and route syntax | ✓ VERIFIED | `getActionSyntax()`, `getPrimaryWorkflowSyntax()`, `getActionFallbackLines()` all feed the generated surface |
| `lib/generator.js` + `templates/commands/*.tmpl` | Shared rendering path for Claude, Codex, and Gemini bundles | ✓ VERIFIED | `buildPlatformBundle()` fans out from shared templates; Codex entry stays internal-only |
| `commands/claude/**`, `commands/codex/**`, `commands/gemini/**` | Checked-in generated bundles match current generator output | ✓ VERIFIED | `collectBundleParity()` checks passed for all three platforms; no missing, mismatched, or extra tracked files |
| `skills/opsx/**` | Distributed skill bundle and bilingual playbooks match explicit-only routing | ✓ VERIFIED | `name: opsx`, `.opsx/changes/*`, explicit `$opsx-*`/`/opsx-*` guidance, and non-mutating empty-state behavior are present |
| `README*.md`, `docs/*.md`, `lib/cli.js`, `scripts/postinstall.js`, `templates/project/rule-file.md.tmpl`, `AGENTS.md` | Public/help surfaces use the explicit-only route contract | ✓ VERIFIED | `rg` checks found no banned public-route tokens in these surfaces; explicit `$opsx-*` examples are present |
| `scripts/test-workflow-runtime.js`, `scripts/check-phase1-legacy-allowlist.js` | Final runtime + public-surface gates | ✓ VERIFIED | `npm run test:workflow-runtime`, `node scripts/check-phase1-legacy-allowlist.js`, `node bin/opsx.js --help`, and `gsd-sdk query verify.schema-drift 03` all passed |
| `03-REVIEW.md` | Code review clean | ✓ VERIFIED | Status is `clean` with `0 findings` |

## Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `lib/workflow.js` | `lib/generator.js` | `getActionSyntax()`, `getPrimaryWorkflowSyntax()`, `getActionFallbackLines()` | ✓ WIRED | Shared metadata drives every platform bundle from the same action inventory |
| `lib/generator.js` | `templates/commands/*.tmpl` | `renderTemplate()` inputs | ✓ WIRED | Preflight and fallback wording are injected once and fanned out consistently |
| `scripts/test-workflow-runtime.js` | `commands/**` | `collectBundleParity()`, `WRONG_PLATFORM_ROUTE_PATTERNS`, `BANNED_PUBLIC_ROUTE_STRINGS` | ✓ WIRED | The runtime gate now checks checked-in parity and bans wrong-platform/public-route drift |
| `skills/opsx/SKILL.md` | `skills/opsx/references/action-playbooks*.md` | Invocation model + playbook references | ✓ WIRED | Skill guidance and localized playbooks carry the same empty-state contract |
| `docs/codex.md` | `commands/codex/prompts/opsx.md` | Internal-catalog wording | ✓ WIRED | Public docs point to explicit `$opsx-*` routes and keep the root Codex file internal-only |

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| --- | --- | --- | --- | --- |
| `commands/claude/opsx.md` and `commands/claude/opsx/*.md` | Route inventory and preflight/fallback copy | `ACTIONS`, `PHASE_THREE_PREFLIGHT_LINES`, and `ACTION_FALLBACK_LINES` in `lib/workflow.js` through `buildPlatformBundle('claude')` | Yes | ✓ FLOWING |
| `commands/codex/prompts/opsx.md` and `commands/codex/prompts/opsx-*.md` | Explicit `$opsx-*` route inventory and empty-state guidance | `ACTIONS` + `getActionSyntax('codex')` + `getActionFallbackLines('codex', ...)` through `buildPlatformBundle('codex')` | Yes | ✓ FLOWING |
| `commands/gemini/opsx.toml` and `commands/gemini/opsx/*.toml` | `/opsx-*` route inventory and preflight/fallback copy | `ACTIONS` + shared templates through `buildPlatformBundle('gemini')` | Yes | ✓ FLOWING |
| `skills/opsx/references/action-playbooks*.md` | Route-specific empty-state playbook text | Skill docs and generated prompts, kept in sync by review/verification | Yes | ✓ FLOWING |

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| `CMD-01` | Phase 3 roadmap and plans 03-03/03-04/03-07/03-08 | Claude users can use all listed `/opsx-*` actions | ✓ SATISFIED | `commands/claude/opsx.md`, `commands/claude/opsx/*.md`, `commands/gemini/opsx.toml`, `commands/gemini/opsx/*.toml`, `npm run test:workflow-runtime` (`31 test(s) passed`) |
| `CMD-02` | Phase 3 roadmap and plans 03-05/03-06/03-09/03-10/03-11 | Codex users can use explicit `$opsx-*` routes as the public primary entrypoints | ✓ SATISFIED | `commands/codex/prompts/opsx.md`, `docs/codex.md`, `docs/commands.md`, `docs/supported-tools.md`, `lib/cli.js`, `scripts/postinstall.js`, `templates/project/rule-file.md.tmpl`, `AGENTS.md`, `rg -n '/opsx-' commands/codex/prompts` (no matches) |
| `CMD-03` | Phase 3 roadmap and plan 03-09 | `skills/opsx` frontmatter and config precedence are correct | ✓ SATISFIED | `skills/opsx/SKILL.md` retains `name: opsx` and resolves config in change -> project -> global order |
| `CMD-04` | Phase 3 roadmap and plans 03-01/03-02/03-05/03-07/03-09/03-10/03-11 | Generated prompts/public surfaces ban legacy and cross-platform public entrypoints | ✓ SATISFIED | `scripts/test-workflow-runtime.js` `BANNED_PUBLIC_ROUTE_STRINGS`, `scripts/check-phase1-legacy-allowlist.js`, `README*.md`, `docs/*.md`, `lib/cli.js`, `scripts/postinstall.js`, `templates/project/rule-file.md.tmpl`, `AGENTS.md` all passed explicit-banned-token checks |
| `CMD-05` | Phase 3 roadmap and plans 03-04/03-06/03-08/03-09/03-11 | `onboard`, `status`, and `resume` behave correctly when no active change exists | ✓ SATISFIED | `lib/workflow.js`, `templates/commands/action.md.tmpl`, `skills/opsx/references/action-playbooks*.md`, `commands/*/onboard.*`, `commands/*/status.*`, `commands/*/resume.*`, `npm run test:workflow-runtime` (`31 test(s) passed`) |

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| `lib/workspace.js` | 111 | `Placeholder created by opsx migrate.` | Info | Migration context text only; not a public stub or Phase 3 workflow regression |
| `scripts/test-workflow-runtime.js` | 1239 | `Phase 1 status placeholder.` | Info | Test assertion text; not user-facing guidance |
| `lib/workflow.js` | 176 | `todo` in stopword list | Info | Static metadata entry; not a placeholder implementation |

## Residual Risks / Test Gaps

- The current guardrail is parity-based. Future hand-edits to `commands/**`, `skills/opsx/**`, or public docs can drift again if the runtime suite and public-surface gate are not rerun.
- `npm run test:workflow-runtime` validates exact bundle parity and representative behavior, but it does not replace a human review for prose tone or UX polish.
- Phase 4 state-machine drift enforcement is intentionally deferred; Phase 3 only requires strict preflight reads and honest non-mutating empty-state guidance.

## Gaps Summary

None. All five CMD requirements, the roadmap-aligned Phase 3 truths, and the final public-surface gates are satisfied at current HEAD.

---

_Verified: 2026-04-27T12:08:59Z_
_Verifier: Claude (gsd-verifier)_
