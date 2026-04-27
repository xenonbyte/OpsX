# Phase 3: Skill and Command Surface Rewrite - Research

**Researched:** 2026-04-27
**Domain:** Command generation, prompt surface contracts, skill/docs alignment
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Codex public workflow entrypoints are explicit `$opsx-*` routes only.
- **D-02:** Remove standalone `$opsx` as a public entrypoint.
- **D-03:** Do not document `$opsx <request>` as a public or fallback workflow route.
- **D-04:** Codex prompt files may remain internal implementation files, but docs and prompt copy must not expose `/prompts:*` as a user-facing route.
- **D-05:** Every generated `/opsx-*` and `$opsx-*` action prompt must include strict preflight wording.
- **D-06:** Preflight wording must require reading `.opsx/config.yaml`, `.opsx/active.yaml`, the active change `state.yaml`, `context.md`, and current artifacts before acting when those files exist.
- **D-07:** Prompt text must define missing-file fallback behavior instead of pretending full state enforcement already exists. For example, `onboard`, `status`, and `resume` can report missing workspace or active change; implementation commands should block or route the user to planning when required artifacts are absent.
- **D-08:** Full hash comparison, stage-transition enforcement, allowed/forbidden path enforcement, and durable apply-state mutation remain Phase 4 responsibilities.
- **D-09:** Treat centralized generation as the source of truth.
- **D-10:** Extend `lib/workflow.js` action metadata and `templates/commands/*` first, then refresh checked-in `commands/claude/**`, `commands/codex/**`, and `commands/gemini/**` from generated output.
- **D-11:** Avoid hand-editing generated command files as the primary implementation strategy. Hand edits are acceptable only for generated-output refreshes or tests that verify generation behavior.
- **D-12:** Tests should lock the generator contract so Claude, Codex, and Gemini route wording cannot drift independently.
- **D-13:** Adopt a hard clean break for v3.0. Do not keep legacy OpenSpec entrypoints, prompt routes, path names, migration-history wording, or tests as an allowlisted public or runtime surface.
- **D-14:** This intentionally supersedes earlier Phase 1 and Phase 2 assumptions that allowed historical OpenSpec references in migration/history/source-lineage contexts.
- **D-15:** Downstream planning must update requirements and roadmap expectations instead of preserving `NAME-04` or Phase 2 migration/history compatibility allowances.
- **D-16:** The banned legacy surface includes `/openspec`, `$openspec`, `/prompts:openspec`, `/opsx:*`, `/prompts:opsx-*`, standalone `$opsx`, and active user guidance around old `openspec` paths.
- **D-17:** `opsx-onboard`, `opsx-status`, and `opsx-resume` must not fail just because `.opsx/active.yaml`, an active change, or the `.opsx/` workspace is missing.
- **D-18:** These routes should report the current workspace and active-change state, then provide a concrete next action.
- **D-19:** `onboard` should guide initialization or installation when workspace state is missing.
- **D-20:** `status` should show whether the workspace and active change exist and what the next useful command is.
- **D-21:** `resume` should say there is no resumable change when none exists, then suggest creating or proposing a change.
- **D-22:** Do not auto-create a default active change from `status` or `resume`.

### Claude's Discretion
- The planner may decide the exact wording of each route's missing-file fallback as long as it is concrete, phase-accurate, and consistent across platforms.
- The planner may decide whether to add a small generator helper for common preflight text or encode it directly in shared templates.
- The planner may decide how to structure tests for the hard clean-break policy, but the tests must distinguish current public/runtime surface from any intentionally removed legacy artifacts.

### Deferred Ideas (OUT OF SCOPE)
None. Discussion stayed within Phase 3 scope, but it did intentionally change earlier compatibility assumptions. Planning should update the affected requirements rather than treating this as deferred work.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CMD-01 | Claude Code users can use `/opsx-explore`, `/opsx-new`, `/opsx-propose`, `/opsx-continue`, `/opsx-ff`, `/opsx-apply`, `/opsx-verify`, `/opsx-status`, `/opsx-resume`, `/opsx-sync`, `/opsx-archive`, `/opsx-batch-apply`, `/opsx-bulk-archive`, and `/opsx-onboard`. | Claude/Gemini action syntax is already centralized in `getActionSyntax()` and rendered through shared templates, so Phase 3 should preserve the existing `/opsx-${action}` contract while refreshing all checked-in outputs and parity tests. [VERIFIED: lib/workflow.js; lib/generator.js; commands/claude/opsx/*.md; commands/gemini/opsx/*.toml] |
| CMD-02 | Codex users can use the corresponding `$opsx-*` commands as the public primary entrypoints. | Codex is still wired as `$opsx <request>` across help, guides, docs, templates, skill metadata, generated prompts, and runtime tests, so Phase 3 must replace that route model everywhere and lock it with negative tests. [VERIFIED: lib/cli.js; scripts/postinstall.js; docs/codex.md; docs/commands.md; docs/supported-tools.md; README.md; README-zh.md; skills/opsx/SKILL.md; skills/opsx/GUIDE-en.md; skills/opsx/GUIDE-zh.md; templates/commands/codex-entry.md.tmpl; templates/project/rule-file.md.tmpl; commands/codex/prompts/*.md; scripts/test-workflow-runtime.js] |
| CMD-03 | The distributed skill lives at `skills/opsx/` with frontmatter `name: opsx` and reads `.opsx/` and `~/.opsx/` config in the correct precedence order. | The path and frontmatter are already correct, and the skill already documents change -> project -> global precedence, so Phase 3 mainly needs to rewrite invocation model, preflight loop, and missing-state behavior without changing the underlying config order. [VERIFIED: skills/opsx/SKILL.md; lib/config.js; lib/install.js] |
| CMD-04 | Generated prompts no longer present `/openspec`, `$openspec`, `/prompts:openspec`, or `/opsx:*` as primary workflow entrypoints. | Public route drift currently lives in templates, docs, guides, postinstall copy, AGENTS route guidance, and the stale Phase 1 allowlist strategy; the phase should replace repo-wide legacy exceptions with a narrower public-surface contract. [VERIFIED: AGENTS.md; templates/commands/*.tmpl; docs/*.md; README.md; README-zh.md; skills/opsx/**/*.md; scripts/postinstall.js; scripts/check-phase1-legacy-allowlist.js; node scripts/check-phase1-legacy-allowlist.js] |
| CMD-05 | `opsx-onboard`, `opsx-status`, and `opsx-resume` behave correctly even when no active change exists. | The current prompts only carry generic scope lines, the skill playbooks do not define `resume` or `onboard`, and the runtime suite has no empty-active-change coverage for these routes, so Phase 3 needs explicit fallback metadata/playbooks/tests. [VERIFIED: lib/workflow.js; templates/commands/action.md.tmpl; commands/claude/opsx/onboard.md; commands/claude/opsx/resume.md; commands/codex/prompts/opsx-status.md; skills/opsx/references/action-playbooks.md; skills/opsx/references/action-playbooks-zh.md; scripts/test-workflow-runtime.js] |
</phase_requirements>

## Summary

Phase 3 is primarily a source-of-truth rewrite, not a many-file manual edit: `lib/workflow.js` owns action metadata and platform syntax helpers, `lib/generator.js` renders the platform bundles, `templates/commands/*.tmpl` inject shared wording, and `lib/install.js` fans those assets into tool home directories and shared `~/.opsx` copies. [VERIFIED: lib/workflow.js; lib/generator.js; templates/commands/action.md.tmpl; templates/commands/index.md.tmpl; templates/commands/codex-entry.md.tmpl; lib/install.js]

The largest contract gap is Codex routing. The repo still treats Codex as `$opsx <request>`-first in CLI help, postinstall output, README/docs, the distributed skill, project hand-off template, generated Codex prompt files, and the passing runtime suite. Phase 3 therefore has to rewrite public copy, generator output, and contract tests together; changing only `commands/codex/prompts/*` will leave the rest of the shipped surface inconsistent. [VERIFIED: lib/cli.js; scripts/postinstall.js; README.md; README-zh.md; docs/commands.md; docs/codex.md; docs/supported-tools.md; skills/opsx/SKILL.md; skills/opsx/GUIDE-en.md; skills/opsx/GUIDE-zh.md; templates/project/rule-file.md.tmpl; commands/codex/prompts/opsx.md; scripts/test-workflow-runtime.js]

The second gap is truthful preflight behavior. Action prompts still say `.opsx/active.yaml`, `state.yaml`, `spec-split-checkpoint`, and TDD-light checks are "planned for later phases" instead of telling the agent what to read now and what to do when files are missing. At the same time, the skill playbooks omit `resume`, `onboard`, `batch-apply`, and `bulk-archive`, so multiple generated prompts currently reference guidance that does not exist. [VERIFIED: templates/commands/action.md.tmpl; templates/commands/index.md.tmpl; commands/claude/opsx/onboard.md; commands/codex/prompts/opsx-resume.md; commands/gemini/opsx/onboard.toml; skills/opsx/references/action-playbooks.md; skills/opsx/references/action-playbooks-zh.md]

`npm run test:workflow-runtime` is green on the old assumptions, but the old Phase 1 legacy allowlist is already stale and failing with 32 hits, including public docs and migration internals. Phase 3 should not try to make that script "green again" by erasing Phase 2 migration logic; it should replace or narrow the gate so current public surfaces are strict while real migration implementation remains testable. [VERIFIED: npm run test:workflow-runtime; node scripts/check-phase1-legacy-allowlist.js]

**Primary recommendation:** Update Phase 3 from the center out: lock a new public-surface test contract first, rewrite centralized route/preflight metadata and shared templates second, then regenerate platform bundles and refresh every user-facing skill/doc/help surface in the same wave. [VERIFIED: lib/workflow.js; lib/generator.js; scripts/test-workflow-runtime.js; 03-CONTEXT.md]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Public route syntax and platform-specific command text | API / Backend | CDN / Static | Node-side generator code decides route strings, then emits static markdown/TOML files that become the public command surface. [VERIFIED: lib/workflow.js; lib/generator.js; commands/claude/opsx.md; commands/codex/prompts/opsx.md; commands/gemini/opsx.toml] |
| Strict prompt preflight and missing-file fallback | API / Backend | Database / Storage | The prompt contract is authored in templates/skill metadata, but it must describe reads against `.opsx/config.yaml`, `.opsx/active.yaml`, change `state.yaml`, `context.md`, and current artifacts. [VERIFIED: 03-CONTEXT.md; templates/commands/action.md.tmpl; skills/opsx/SKILL.md] |
| Installed prompt/skill copies and manifest-backed surface refresh | Database / Storage | API / Backend | Installed state lives under `~/.claude/commands`, `~/.codex/prompts`, `~/.gemini/commands`, `~/.opsx/skills/opsx`, and `~/.opsx/manifests/*.manifest`, but Node install logic owns how those files are written and cleaned up. [VERIFIED: lib/install.js; docs/customization.md] |
| Public docs, guides, postinstall text, and repo hand-off route guidance | CDN / Static | API / Backend | These are static assets, but they must stay aligned with the generator contract and the install/help UX or users will receive contradictory instructions. [VERIFIED: README.md; README-zh.md; docs/commands.md; docs/codex.md; docs/supported-tools.md; skills/opsx/GUIDE-en.md; skills/opsx/GUIDE-zh.md; scripts/postinstall.js; AGENTS.md] |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `node` | `>=14.14.0` in `package.json`; local runtime `v24.8.0` [VERIFIED: package.json; node --version] | Runs the CLI, generator, installer, and test harness. [VERIFIED: package.json; lib/*.js; scripts/test-workflow-runtime.js] | The package is intentionally zero-dependency, so Phase 3 should stay inside the existing Node toolchain. [VERIFIED: package.json] |
| `lib/workflow.js` | repo-local [VERIFIED: lib/workflow.js] | Defines action IDs, route syntax helpers, scope text, checkpoint constants, and validation helpers. [VERIFIED: lib/workflow.js] | All platform route text already fans out from this file, making it the correct home for explicit-only Codex routing and per-action fallback metadata. [VERIFIED: lib/workflow.js; lib/generator.js; 03-CONTEXT.md] |
| `lib/generator.js` + `templates/commands/*.tmpl` | repo-local [VERIFIED: lib/generator.js; templates/commands/*.tmpl] | Renders the checked-in Claude/Codex/Gemini command bundles. [VERIFIED: lib/generator.js] | Generated files under `commands/**` are derived from this layer and install-time bundle writing uses the same source. [VERIFIED: lib/install.js; commands/claude/opsx.md; commands/codex/prompts/opsx.md; commands/gemini/opsx.toml] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `skills/opsx/**` | repo-local [VERIFIED: skills/opsx/SKILL.md; skills/opsx/GUIDE-en.md; skills/opsx/GUIDE-zh.md] | Distributed skill metadata, localized guides, and reference playbooks. [VERIFIED: skills/opsx/**] | Use this layer for invocation model, config precedence wording, and route-specific playbooks that generated prompts reference. [VERIFIED: commands/claude/opsx/onboard.md; skills/opsx/references/action-playbooks.md] |
| `lib/install.js` | repo-local [VERIFIED: lib/install.js] | Installs generated bundles into tool home directories and writes `~/.opsx/manifests/*.manifest`. [VERIFIED: lib/install.js] | Use it whenever Phase 3 changes what the installed surface should expose or remove. [VERIFIED: lib/install.js; docs/customization.md] |
| `scripts/test-workflow-runtime.js` | repo-local [VERIFIED: scripts/test-workflow-runtime.js] | Fast contract coverage for generation, install/uninstall, docs, migration, CLI help, and runtime guidance. [VERIFIED: scripts/test-workflow-runtime.js] | Use it as the primary regression suite, but expand it with Phase 3-specific route and fallback assertions. [VERIFIED: npm run test:workflow-runtime; scripts/test-workflow-runtime.js] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Centralized metadata + template fan-out | Hand-edit `commands/claude/**`, `commands/codex/**`, and `commands/gemini/**` | This would create guaranteed cross-platform drift and violate D-09 through D-12. [VERIFIED: 03-CONTEXT.md; lib/generator.js] |
| Public-surface contract tests | Reusing the Phase 1 legacy allowlist as-is | The old allowlist already fails on current repo state and cannot distinguish legitimate migration internals from current public route copy. [VERIFIED: node scripts/check-phase1-legacy-allowlist.js; scripts/check-phase1-legacy-allowlist.js] |
| Removing or de-publicizing the standalone Codex root entry | Keeping the current root Codex entry document unchanged | The current root document is explicitly written as the `$opsx <request>` entry surface, which conflicts with D-01 through D-03. [VERIFIED: commands/codex/prompts/opsx.md; templates/commands/codex-entry.md.tmpl; 03-CONTEXT.md] |

**Installation:**
```bash
# No additional npm packages are recommended for Phase 3.
npm run test:workflow-runtime
```

**Version verification:** No new npm package versions are recommended for this phase; the package remains zero-dependency and Phase 3 should stay on repo-local modules. [VERIFIED: package.json]

## Architecture Patterns

### System Architecture Diagram

```text
Route decisions in 03-CONTEXT.md / REQUIREMENTS.md
            |
            v
  lib/workflow.js action metadata + route syntax
            |
            v
  lib/generator.js + templates/commands/*.tmpl
            |
            +------------------------------+
            |                              |
            v                              v
  checked-in commands/**           docs/skills/help/postinstall copy
            |                              |
            +---------------+--------------+
                            |
                            v
                     lib/install.js
                            |
                            v
  ~/.claude/commands   ~/.codex/prompts   ~/.gemini/commands   ~/.opsx/skills/opsx   ~/.opsx/manifests/*
                            |
                            v
               User invokes `/opsx-*` or `$opsx-*`
                            |
                            v
          skill/playbook/prompt preflight reads `.opsx/config.yaml`
                     -> `.opsx/active.yaml`
                     -> active change `state.yaml`
                     -> `context.md`
                     -> current artifacts
                            |
                +-----------+-----------+
                |                       |
                v                       v
      artifacts present -> continue   files missing -> honest Phase 3 fallback / next action
```

This phase owns the left side of the diagram through honest fallback text; Phase 4 owns hash checks, transition enforcement, durable state mutation, and one-task-group apply behavior after the preflight has loaded the relevant files. [VERIFIED: 03-CONTEXT.md; lib/generator.js; skills/opsx/SKILL.md]

### Recommended Project Structure

```text
lib/
├── workflow.js          # action metadata, route syntax, validation helpers
├── generator.js         # platform bundle generation
├── install.js           # install/uninstall + manifest handling
└── cli.js               # help, status, post-install UX-adjacent CLI text

templates/
├── commands/            # shared prompt/index wording
└── project/             # hand-off template that still leaks Codex route guidance

commands/
├── claude/              # checked-in generated markdown
├── codex/prompts/       # checked-in generated Codex prompt files
└── gemini/              # checked-in generated TOML

skills/opsx/
├── SKILL.md             # invocation model + execution loop
├── GUIDE-*.md           # localized public guide content
└── references/          # action playbooks and artifact templates
```

This is the correct split to plan against because every observed Phase 3 drift point lands in one of these four groups. [VERIFIED: rg --files lib templates/commands commands/claude commands/codex commands/gemini skills/opsx docs]

### Pattern 1: Route Contract Lives in Metadata First

**What:** Keep route syntax, public-entry semantics, and route-specific fallback notes in centralized metadata/helpers, then render them through templates. [VERIFIED: lib/workflow.js; lib/generator.js]

**When to use:** Any change that affects `/opsx-*` or `$opsx-*`, especially when one platform has a different public model than the others. [VERIFIED: 03-CONTEXT.md; lib/workflow.js]

**Example:**
```js
// Source: lib/workflow.js
const ACTIONS = [
  {
    id: 'resume',
    summary: 'Restore context around active changes and recommend the next move.',
    scope: 'If no change is specified, recommend the best active candidate and explain why.'
  },
  {
    id: 'status',
    summary: 'Show change progress, readiness, and blockers.',
    scope: 'Inspect artifacts and task state without changing unrelated files.'
  }
];

function getActionSyntax(platform, actionId) {
  if (platform === 'claude' || platform === 'gemini') return `/opsx-${actionId}`;
  if (platform === 'codex') return `$opsx-${actionId}`;
}
```

Use the existing `ACTIONS` object as the extension point for strict preflight and empty-state behavior instead of branching across generated files. [VERIFIED: lib/workflow.js]

### Pattern 2: Templates Should Consume Shared Preflight Blocks, Not Repeated Prose

**What:** `buildActionMarkdown()` already injects shared variables into one action template; Phase 3 should extend that existing mechanism with a strict preflight block and action-specific fallback block. [VERIFIED: lib/generator.js; templates/commands/action.md.tmpl]

**When to use:** Any instruction that should stay identical across Claude/Codex/Gemini except for route syntax or inline-argument wording. [VERIFIED: lib/generator.js]

**Example:**
```js
// Source: lib/generator.js
function buildActionMarkdown(platform, action) {
  const template = loadTemplate('action.md.tmpl');
  const inlineArgumentNote = platform === 'codex'
    ? 'Do not assume text typed after a `$opsx-*` command is reliably available as an inline argument in Codex.'
    : 'Use inline arguments when available, but confirm ambiguous names or descriptions before mutating files.';

  return renderTemplate(template, {
    action: action.id,
    primary_workflow_syntax: getPrimaryWorkflowSyntax(platform),
    action_syntax: getActionSyntax(platform, action.id),
    inline_argument_note: inlineArgumentNote,
    scope: action.scope
  });
}
```

The current fan-out path is already correct; the stale content is the contract payload, not the rendering mechanism. [VERIFIED: lib/generator.js; templates/commands/action.md.tmpl]

### Pattern 3: Keep Public-Surface Tests Separate from Migration-Internals Tests

**What:** Use one set of assertions for current public route/help/doc/skill surfaces and a different set for Phase 2 migration fixtures that must still mention legacy paths. [VERIFIED: scripts/test-workflow-runtime.js; scripts/check-phase1-legacy-allowlist.js; 03-CONTEXT.md]

**When to use:** Any time a clean-break rename coexists with a migration command that still consumes or reports legacy locations. [VERIFIED: lib/migrate.js; scripts/test-workflow-runtime.js]

**Example:**
```js
// Source: scripts/test-workflow-runtime.js
const generatedBundles = {
  claude: buildPlatformBundle('claude'),
  codex: buildPlatformBundle('codex'),
  gemini: buildPlatformBundle('gemini')
};

assert(generatedBundles.claude['opsx.md'].includes('Primary workflow entry: `/opsx-<action>`'));
assert(generatedBundles.codex['prompts/opsx.md'].includes('$opsx <request>'));
```

This is the exact seam to replace: keep the bundle/install assertions, but rewrite them around the Phase 3 surface contract instead of the old Codex root-entry assumption. [VERIFIED: scripts/test-workflow-runtime.js]

### Anti-Patterns to Avoid

- **Hand-editing generated command files first:** `commands/**` is generated output, so editing it before `lib/workflow.js`/`lib/generator.js`/templates will create drift that reinstall or regeneration later overwrites. [VERIFIED: lib/generator.js; 03-CONTEXT.md]
- **Using a repo-wide legacy-token grep as the only clean-break gate:** migration internals still need legacy path literals, so a broad grep cannot express the real Phase 3 contract cleanly. [VERIFIED: lib/migrate.js; lib/workspace.js; scripts/check-phase1-legacy-allowlist.js; node scripts/check-phase1-legacy-allowlist.js]
- **Conflating CLI `opsx status` with route `$opsx-status` / `/opsx-status`:** the CLI command currently reports Phase 2 migration diagnostics, while CMD-05 is about the generated route behavior and skill guidance. [VERIFIED: lib/cli.js; 03-CONTEXT.md]
- **Pretending Phase 4 enforcement already exists:** current prompts must read the right files and route the user honestly, not claim hash comparisons or transition enforcement that do not exist yet. [VERIFIED: 03-CONTEXT.md; templates/commands/action.md.tmpl]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cross-platform prompt updates | Manual edits across 45 checked-in generated files | Update `lib/workflow.js`, `lib/generator.js`, and `templates/commands/*.tmpl`, then regenerate outputs | The repo already centralizes route rendering; copying prose across platforms is the main drift risk. [VERIFIED: lib/generator.js; find commands/claude commands/codex commands/gemini -type f \| wc -l] |
| Legacy-surface policy | A new broad exception list for old tokens | Explicit positive/negative tests over current public/help/doc/skill surfaces | The old allowlist is already stale, and migration logic still needs legacy path literals internally. [VERIFIED: node scripts/check-phase1-legacy-allowlist.js; lib/migrate.js] |
| Empty-state route wording | Ad hoc prose duplicated into `status`/`resume`/`onboard` files | Metadata-driven fallback text plus matching skill playbooks and tests | CMD-05 requires consistent behavior across platforms, and those prompts already share one template. [VERIFIED: templates/commands/action.md.tmpl; commands/claude/opsx/status.md; commands/codex/prompts/opsx-resume.md; commands/gemini/opsx/onboard.toml] |

**Key insight:** The repo already solved the hard part of multi-platform distribution by centralizing generation; Phase 3 should extend that central contract, not bypass it. [VERIFIED: lib/generator.js; lib/workflow.js; 03-CONTEXT.md]

## Runtime State Inventory

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | No database-backed or workspace-persisted command-route registry was identified; `~/.opsx/config.yaml` stores normalized config fields such as `version`, `schema`, `language`, `platform`, and `ruleFile`, not a public route map. [VERIFIED: lib/config.js; docs/customization.md] | Code edit only for docs/skill wording; no data migration required. [VERIFIED: lib/config.js] |
| Live service config | None identified. This package installs local files and manifests; the researched surfaces do not integrate with remote dashboards or SaaS config stores. [VERIFIED: lib/install.js; repo scan over targeted files] | None. [VERIFIED: lib/install.js] |
| OS-registered state | Installed prompt/command files under `~/.claude/commands`, `~/.codex/prompts`, and `~/.gemini/commands`, plus shared copies under `~/.opsx/skills/opsx` and `~/.opsx/commands/opsx.md`, will keep stale route/help text until users reinstall. [VERIFIED: lib/install.js; docs/customization.md] | After implementation, rerun `opsx install --platform ...` in validation flows and add tests that installed Codex assets no longer expose the old public model. [VERIFIED: lib/install.js; scripts/test-workflow-runtime.js; 03-CONTEXT.md] |
| Secrets/env vars | No route-specific secrets or environment-variable names were identified; the researched files only rely on `HOME` for install/runtime path resolution. [VERIFIED: rg process.env repo scan; lib/install.js; lib/cli.js; lib/config.js; lib/migrate.js; lib/runtime-guidance.js] | None. [VERIFIED: repo scan] |
| Build artifacts | Checked-in generated files under `commands/**` and installed guides under `~/.opsx/skills/opsx` can drift from `lib/generator.js` and `skills/opsx/**`; current tests do not assert full bundle parity. [VERIFIED: lib/generator.js; lib/install.js; scripts/test-workflow-runtime.js] | Refresh the generated bundle as part of the phase and add parity assertions so repo output and installed output cannot diverge silently. [VERIFIED: scripts/test-workflow-runtime.js; lib/install.js] |

## Common Pitfalls

### Pitfall 1: Fixing the Leaves Instead of the Generator

**What goes wrong:** A developer updates `commands/codex/prompts/*.md` or README copy directly, but the next install/regeneration restores stale wording from templates or generator helpers. [VERIFIED: lib/generator.js; lib/install.js]

**Why it happens:** The repo has both checked-in generated outputs and separate user-facing docs, so it is easy to patch the visible leaf without moving the central contract. [VERIFIED: commands/**; docs/*.md; README.md]

**How to avoid:** Change `lib/workflow.js`, `lib/generator.js`, templates, and skill/docs sources first; treat generated outputs as refresh-only artifacts. [VERIFIED: 03-CONTEXT.md; lib/generator.js]

**Warning signs:** One platform bundle changes but another still mentions `$opsx <request>` or the installed home copy differs from the checked-in file. [VERIFIED: rg -n '\$opsx <request>' repo scan; lib/install.js]

### Pitfall 2: Using the Clean-Break Decision to Break Migration Behavior

**What goes wrong:** The implementation removes legacy path literals from migration code or tests in order to make a broad grep gate pass, accidentally weakening `opsx migrate`. [VERIFIED: lib/migrate.js; scripts/test-workflow-runtime.js]

**Why it happens:** The old Phase 1 allowlist mixed public-surface policy with Phase 2 migration internals, so a naive "remove all legacy strings" approach looks attractive. [VERIFIED: scripts/check-phase1-legacy-allowlist.js; node scripts/check-phase1-legacy-allowlist.js]

**How to avoid:** Replace the gate with a public-surface contract and keep migration tests focused on `opsx migrate` inputs/outputs. [VERIFIED: 03-CONTEXT.md; scripts/test-workflow-runtime.js]

**Warning signs:** Changes touch `lib/migrate.js` or `lib/workspace.js` even though the task is only about prompt/docs/skill surface rewrite. [VERIFIED: research target boundaries; lib/migrate.js; lib/workspace.js]

### Pitfall 3: Solving CMD-05 in the Wrong Surface

**What goes wrong:** Work lands in CLI `opsx status` or runtime kernel output while the generated route prompts and skill playbooks remain vague. [VERIFIED: lib/cli.js; commands/claude/opsx/status.md]

**Why it happens:** The repo has both CLI commands (`opsx status`) and agent routes (`/opsx-status`, `$opsx-status`), and both use the word "status". [VERIFIED: lib/cli.js; docs/commands.md]

**How to avoid:** Keep Phase 3 focused on generated route text, skill guidance, and tests for route behavior; keep CLI phase messaging truthful but separate. [VERIFIED: 03-CONTEXT.md; lib/cli.js]

**Warning signs:** A patch changes `showStatus()` but leaves `commands/*/status.*` and `skills/opsx/references/action-playbooks*.md` untouched. [VERIFIED: lib/cli.js; commands/claude/opsx/status.md; skills/opsx/references/action-playbooks.md]

### Pitfall 4: Referencing Playbooks That Do Not Exist

**What goes wrong:** Generated prompts tell agents to "follow the `resume` playbook" or "follow the `onboard` playbook", but the skill reference files have no such sections. [VERIFIED: commands/claude/opsx/resume.md; commands/claude/opsx/onboard.md; skills/opsx/references/action-playbooks.md]

**Why it happens:** The generator can emit any action ID, but the playbook files are manually maintained and currently stop at `status`. [VERIFIED: skills/opsx/references/action-playbooks.md; skills/opsx/references/action-playbooks-zh.md]

**How to avoid:** Add the missing playbook sections in both languages in the same phase that rewrites prompt text. [VERIFIED: skills/opsx/references/action-playbooks*.md; 03-CONTEXT.md]

**Warning signs:** `resume`, `onboard`, `batch-apply`, or `bulk-archive` prompts change but `skills/opsx/references/action-playbooks*.md` line count stays unchanged at 87 lines. [VERIFIED: wc -l skills/opsx/references/action-playbooks.md skills/opsx/references/action-playbooks-zh.md]

## Code Examples

Verified patterns from the local source of truth:

### Route Syntax Helper

```js
// Source: lib/workflow.js
function getActionSyntax(platform, actionId) {
  if (platform === 'claude') return `/opsx-${actionId}`;
  if (platform === 'gemini') return `/opsx-${actionId}`;
  if (platform === 'codex') return `$opsx-${actionId}`;
  return actionId;
}

function getPrimaryWorkflowSyntax(platform) {
  if (platform === 'codex') return '$opsx <request>';
  if (platform === 'claude' || platform === 'gemini') return '/opsx-<action>';
  return 'opsx';
}
```

This helper is the smallest verified seam for replacing the old Codex primary-entry model. [VERIFIED: lib/workflow.js]

### Shared Action Rendering

```js
// Source: lib/generator.js
return renderTemplate(template, {
  description: action.summary,
  title: `OpsX route: ${action.title}`,
  action: action.id,
  inline_argument_note: inlineArgumentNote,
  scope: action.scope,
  primary_workflow_syntax: getPrimaryWorkflowSyntax(platform),
  action_syntax: getActionSyntax(platform, action.id)
});
```

This is the verified place to inject a strict preflight block and route-specific missing-file fallback without copying strings into 42 action files. [VERIFIED: lib/generator.js]

### Current Bundle/Test Contract Seam

```js
// Source: scripts/test-workflow-runtime.js
const generatedBundles = {
  claude: buildPlatformBundle('claude'),
  codex: buildPlatformBundle('codex'),
  gemini: buildPlatformBundle('gemini')
};

assert(generatedBundles.codex['prompts/opsx.md'].includes('$opsx <request>'));
```

This assertion is intentionally the one to replace or remove in Phase 3 because it hard-locks the outdated Codex root-entry model. [VERIFIED: scripts/test-workflow-runtime.js]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Codex public usage prefers `$opsx <request>` | Phase 3 context locks explicit-only `$opsx-*` public routes | Locked in `03-CONTEXT.md` on 2026-04-27 | Help text, guides, skill metadata, generated prompts, install artifacts, and tests must all drop the standalone Codex entry model. [VERIFIED: 03-CONTEXT.md; rg -n '\$opsx <request>' repo scan] |
| Prompts say state reads/checks are "planned for later phases" | Phase 3 requires strict preflight reads now plus honest missing-file fallback, while full enforcement remains Phase 4 | Locked in `03-CONTEXT.md` on 2026-04-27 | Shared action template and playbooks need new contract text; do not implement Phase 4 state mutation early. [VERIFIED: 03-CONTEXT.md; templates/commands/action.md.tmpl] |
| Phase 1 legacy allowlist acts as the rename gate | Hard clean break replaces broad migration/history exceptions with current-surface tests | Locked in `03-CONTEXT.md` on 2026-04-27 | `scripts/check-phase1-legacy-allowlist.js`, current requirements wording, and roadmap success criteria must be updated or superseded. [VERIFIED: 03-CONTEXT.md; scripts/check-phase1-legacy-allowlist.js; .planning/REQUIREMENTS.md; .planning/ROADMAP.md] |

**Deprecated/outdated:**
- Public Codex guidance that says "Prefer `$opsx <request>`". [VERIFIED: lib/cli.js; README.md; docs/codex.md; skills/opsx/SKILL.md; scripts/postinstall.js]
- Using `NAME-04` as a standing allowlist for migration/history wording on current command surfaces. [VERIFIED: .planning/REQUIREMENTS.md; .planning/ROADMAP.md; 03-CONTEXT.md]
- Generated prompts that claim `resume`/`onboard` playbooks exist when the reference files do not define them. [VERIFIED: commands/claude/opsx/resume.md; commands/claude/opsx/onboard.md; skills/opsx/references/action-playbooks*.md]

## Assumptions Log

All claims in this research were verified from the current repo state, config, or command output in this session; no user confirmation is required for factual accuracy. [VERIFIED: local repo files; npm run test:workflow-runtime; node scripts/check-phase1-legacy-allowlist.js]

## Open Questions (RESOLVED)

1. **`commands/codex/prompts/opsx.md`**
   - Resolution: keep the file as an internal generated route catalog only. It may remain in the repo and installed Codex prompt surface, but it must not expose standalone `$opsx` or `$opsx <request>` as a public entrypoint. Phase 3 plans `03-02` and `03-05` encode this by rewriting the generator/template contract first and then refreshing the checked-in Codex index as an internal-only route list. [VERIFIED: 03-CONTEXT.md; lib/generator.js; lib/install.js]

2. **`AGENTS.md` scope**
   - Resolution: Phase 3 updates only stale route guidance. Repo-local authoring instructions that point to `openspec/config.yaml` and `openspec/changes/` remain intact because they describe this repository's source-of-truth workflow, not the distributed public OpsX runtime surface. Plan `03-11` encodes the exact change: replace the stale route bullet with current OpsX guidance while preserving the repo-local authoring-path bullets. [VERIFIED: AGENTS.md; 03-CONTEXT.md]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | CLI help checks, generator logic, test harness | ✓ | `v24.8.0` [VERIFIED: node --version] | — |
| npm | `npm run test:workflow-runtime` wrapper | ✓ | `11.6.0` [VERIFIED: npm --version] | Run `node scripts/test-workflow-runtime.js` directly. [VERIFIED: package.json] |
| git | `.gitignore` assertions inside runtime suite | ✓ | `2.46.0` [VERIFIED: git --version] | None. [VERIFIED: scripts/test-workflow-runtime.js] |
| `opsx` global binary | Optional human smoke usage | ✗ | — [VERIFIED: command -v opsx] | Use `node bin/opsx.js ...` during development and verification. [VERIFIED: node bin/opsx.js --help] |

**Missing dependencies with no fallback:**
- None identified for Phase 3 planning or verification. [VERIFIED: environment probe]

**Missing dependencies with fallback:**
- Global `opsx` install is not present locally, but repo-local CLI execution is sufficient for Phase 3 verification. [VERIFIED: command -v opsx; node bin/opsx.js --help]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Custom Node.js assert-based runtime suite in `scripts/test-workflow-runtime.js`. [VERIFIED: scripts/test-workflow-runtime.js] |
| Config file | `package.json` script wiring only; no separate test config file. [VERIFIED: package.json] |
| Quick run command | `npm run test:workflow-runtime` [VERIFIED: package.json; npm run test:workflow-runtime] |
| Full suite command | `npm run test:workflow-runtime` currently; Phase 3 should replace the stale legacy allowlist with a new public-surface gate before the phase closes. [VERIFIED: package.json; node scripts/check-phase1-legacy-allowlist.js; 03-CONTEXT.md] |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CMD-01 | Claude/Gemini action bundles expose the `/opsx-*` route set consistently and checked-in outputs match generator output. [VERIFIED: commands/claude/opsx/*.md; commands/gemini/opsx/*.toml] | unit / contract | `npm run test:workflow-runtime` | ✅ Partial; current suite checks some entry content but not full bundle parity. [VERIFIED: scripts/test-workflow-runtime.js] |
| CMD-02 | Codex public surface is explicit `$opsx-*` only, with no standalone `$opsx <request>` guidance. [VERIFIED: 03-CONTEXT.md] | unit / contract | `npm run test:workflow-runtime` | ❌ Wave 0; current tests explicitly assert `$opsx <request>`. [VERIFIED: scripts/test-workflow-runtime.js] |
| CMD-03 | `skills/opsx` frontmatter, install targets, and config-precedence wording stay correct. [VERIFIED: skills/opsx/SKILL.md; lib/install.js; lib/config.js] | unit / smoke | `npm run test:workflow-runtime` | ✅ Partial; install target is covered, but explicit frontmatter/precedence assertions are missing. [VERIFIED: scripts/test-workflow-runtime.js] |
| CMD-04 | Generated prompts/docs/help no longer advertise banned legacy or old primary routes. [VERIFIED: 03-CONTEXT.md] | contract / grep | `npm run test:workflow-runtime` plus a new surface gate | ❌ Wave 0; the current allowlist script is stale and the runtime suite does not cover docs/postinstall/AGENTS route copy. [VERIFIED: node scripts/check-phase1-legacy-allowlist.js; scripts/test-workflow-runtime.js] |
| CMD-05 | `onboard`, `status`, and `resume` report missing workspace/active-change state honestly and suggest a concrete next action without auto-creating state. [VERIFIED: 03-CONTEXT.md] | unit / contract | `npm run test:workflow-runtime` | ❌ Wave 0; no explicit coverage exists today. [VERIFIED: rg -n 'onboard|resume|no resumable|active change|activeChange|missing workspace|missing active' scripts/test-workflow-runtime.js] |

### Sampling Rate

- **Per task commit:** `npm run test:workflow-runtime` [VERIFIED: package.json]
- **Per wave merge:** `npm run test:workflow-runtime` plus the new Phase 3 public-surface gate once it exists. [VERIFIED: 03-CONTEXT.md; node scripts/check-phase1-legacy-allowlist.js]
- **Phase gate:** Full runtime suite green, new public-surface gate green, and CLI/doc/help spot checks consistent with regenerated bundle output. [VERIFIED: 03-CONTEXT.md; npm run test:workflow-runtime]

### Wave 0 Gaps

- [ ] Add negative assertions that no public help/doc/guide/generated Codex surface recommends `$opsx <request>`. [VERIFIED: lib/cli.js; docs/codex.md; skills/opsx/GUIDE-en.md; scripts/postinstall.js; scripts/test-workflow-runtime.js]
- [ ] Add explicit route-behavior coverage for empty workspace / no active change on `onboard`, `status`, and `resume`. [VERIFIED: 03-CONTEXT.md; scripts/test-workflow-runtime.js]
- [ ] Replace or narrow `scripts/check-phase1-legacy-allowlist.js` so it enforces current public surfaces without breaking legitimate migration internals. [VERIFIED: scripts/check-phase1-legacy-allowlist.js; node scripts/check-phase1-legacy-allowlist.js]
- [ ] Add full bundle parity checks so checked-in `commands/**` cannot drift from `buildPlatformBundle()` output. [VERIFIED: lib/generator.js; scripts/test-workflow-runtime.js]
- [ ] Add skill-playbook coverage for `resume`, `onboard`, `batch-apply`, and `bulk-archive` because prompts already reference them. [VERIFIED: commands/claude/opsx/*.md; skills/opsx/references/action-playbooks*.md]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no [VERIFIED: phase scope] | None in scope. [VERIFIED: 03-CONTEXT.md] |
| V3 Session Management | no [VERIFIED: phase scope] | None in scope. [VERIFIED: 03-CONTEXT.md] |
| V4 Access Control | no [VERIFIED: phase scope] | None in scope. [VERIFIED: 03-CONTEXT.md] |
| V5 Input Validation | yes [VERIFIED: lib/runtime-guidance.js; 03-CONTEXT.md] | Preserve the existing safe change/capability/path validation and do not let prompt text imply unsafe bypasses or auto-created state. [VERIFIED: lib/runtime-guidance.js; 03-CONTEXT.md] |
| V6 Cryptography | no [VERIFIED: phase scope] | Never hand-roll crypto, but no crypto change is needed here. [VERIFIED: 03-CONTEXT.md] |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Conflicting route guidance across help, docs, skill metadata, and generated prompts | Spoofing / Tampering | Centralize route text, regenerate bundles, and lock public-surface tests across all user-facing surfaces. [VERIFIED: rg -n '\$opsx <request>' repo scan; lib/generator.js] |
| Prompts claim Phase 4 enforcement exists when it does not | Repudiation / Tampering | Keep preflight wording honest: read current files, report missing prerequisites, and route users to the next action without inventing hash/transition guarantees. [VERIFIED: 03-CONTEXT.md; templates/commands/action.md.tmpl] |
| `status` or `resume` implicitly creates or mutates active state | Tampering | Encode explicit non-mutating fallback behavior for CMD-05 and test it. [VERIFIED: 03-CONTEXT.md] |
| Legacy-route cleanup accidentally weakens migration code | Denial of Service / Tampering | Scope clean-break checks to current public surfaces and keep migration tests separate. [VERIFIED: lib/migrate.js; scripts/test-workflow-runtime.js; node scripts/check-phase1-legacy-allowlist.js] |

## Sources

### Primary (HIGH confidence)

- `.planning/phases/03-skill-and-command-surface-rewrite/03-CONTEXT.md` - locked decisions, scope boundary, and clean-break policy
- `.planning/REQUIREMENTS.md` - CMD-01 through CMD-05 plus stale NAME-04 wording
- `.planning/ROADMAP.md` - Phase 3 goal, success criteria, and dependency notes
- `.planning/STATE.md` - current phase focus and prior hard-clean-break decision
- `lib/workflow.js` - action metadata and route syntax helpers
- `lib/generator.js` - bundle fan-out and template inputs
- `templates/commands/action.md.tmpl`, `index.md.tmpl`, `codex-entry.md.tmpl`, `shared-entry.md.tmpl` - current prompt/index wording
- `lib/install.js`, `lib/cli.js`, `lib/config.js` - install paths, docs/help surfaces, config precedence, and installed-state behavior
- `commands/claude/**`, `commands/codex/prompts/**`, `commands/gemini/**` - checked-in generated outputs
- `skills/opsx/SKILL.md`, `GUIDE-en.md`, `GUIDE-zh.md`, `references/action-playbooks*.md` - skill invocation model and playbook coverage
- `README.md`, `README-zh.md`, `docs/commands.md`, `docs/codex.md`, `docs/supported-tools.md`, `docs/runtime-guidance.md`, `AGENTS.md`, `templates/project/rule-file.md.tmpl`, `scripts/postinstall.js` - user-facing route/help surfaces
- `scripts/test-workflow-runtime.js` and `scripts/check-phase1-legacy-allowlist.js` - current regression harness and stale legacy gate
- `package.json` - zero-dependency stack and test command
- Command outputs: `npm run test:workflow-runtime`, `node scripts/check-phase1-legacy-allowlist.js`, `node bin/opsx.js --help`, `node --version`, `npm --version`, `git --version`, `command -v opsx`

### Secondary (MEDIUM confidence)

- None. This research relied on first-party repo files and local command output only. [VERIFIED: local session inputs]

### Tertiary (LOW confidence)

- None. [VERIFIED: local session inputs]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Phase 3 can stay on the existing zero-dependency Node/generator/install stack with no external package ambiguity. [VERIFIED: package.json; lib/generator.js; lib/install.js]
- Architecture: HIGH - Route syntax, template fan-out, install behavior, and stale docs/tests are directly observable in the current repo. [VERIFIED: lib/workflow.js; lib/generator.js; commands/**; docs/**; scripts/**]
- Pitfalls: HIGH - Each listed pitfall is already visible in current files or command output, especially the stale Codex root-entry contract and failing legacy allowlist. [VERIFIED: rg repo scan; node scripts/check-phase1-legacy-allowlist.js; scripts/test-workflow-runtime.js]

**Research date:** 2026-04-27
**Valid until:** 2026-05-04 for current repo state because this milestone is actively changing command surfaces and tests.
