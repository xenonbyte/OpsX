# Phase 3: Skill and Command Surface Rewrite - Context

**Gathered:** 2026-04-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 3 rewrites the public workflow command and skill surface around `/opsx-*`, `$opsx-*`, and `skills/opsx`.

This phase owns generated Claude, Codex, and Gemini command prompt text, the distributed `opsx` skill invocation model, command templates, command-generation metadata, public route wording, and empty-workspace command behavior for `onboard`, `status`, and `resume`.

This phase does not implement the full Phase 4 change state machine. It may require prompt text to read `.opsx/config.yaml`, `.opsx/active.yaml`, active change `state.yaml`, `context.md`, and current artifacts, but full artifact hash enforcement, stage transition enforcement, drift-ledger mechanics, and one-task-group apply behavior remain Phase 4 work.

</domain>

<decisions>
## Implementation Decisions

### Codex entrypoint model
- **D-01:** Codex public workflow entrypoints are explicit `$opsx-*` routes only.
- **D-02:** Remove standalone `$opsx` as a public entrypoint.
- **D-03:** Do not document `$opsx <request>` as a public or fallback workflow route.
- **D-04:** Codex prompt files may remain internal implementation files, but docs and prompt copy must not expose `/prompts:*` as a user-facing route.

### Prompt preflight depth
- **D-05:** Every generated `/opsx-*` and `$opsx-*` action prompt must include strict preflight wording.
- **D-06:** Preflight wording must require reading `.opsx/config.yaml`, `.opsx/active.yaml`, the active change `state.yaml`, `context.md`, and current artifacts before acting when those files exist.
- **D-07:** Prompt text must define missing-file fallback behavior instead of pretending full state enforcement already exists. For example, `onboard`, `status`, and `resume` can report missing workspace or active change; implementation commands should block or route the user to planning when required artifacts are absent.
- **D-08:** Full hash comparison, stage-transition enforcement, allowed/forbidden path enforcement, and durable apply-state mutation remain Phase 4 responsibilities.

### Generated command architecture
- **D-09:** Treat centralized generation as the source of truth.
- **D-10:** Extend `lib/workflow.js` action metadata and `templates/commands/*` first, then refresh checked-in `commands/claude/**`, `commands/codex/**`, and `commands/gemini/**` from generated output.
- **D-11:** Avoid hand-editing generated command files as the primary implementation strategy. Hand edits are acceptable only for generated-output refreshes or tests that verify generation behavior.
- **D-12:** Tests should lock the generator contract so Claude, Codex, and Gemini route wording cannot drift independently.

### Legacy cleanup policy
- **D-13:** Adopt a hard clean break for v3.0. Do not keep legacy OpenSpec entrypoints, prompt routes, path names, migration-history wording, or tests as an allowlisted public or runtime surface.
- **D-14:** This intentionally supersedes earlier Phase 1 and Phase 2 assumptions that allowed historical OpenSpec references in migration/history/source-lineage contexts.
- **D-15:** Downstream planning must update requirements and roadmap expectations instead of preserving `NAME-04` or Phase 2 migration/history compatibility allowances.
- **D-16:** The banned legacy surface includes `/openspec`, `$openspec`, `/prompts:openspec`, `/opsx:*`, `/prompts:opsx-*`, standalone `$opsx`, and active user guidance around old `openspec` paths.

### Empty active change behavior
- **D-17:** `opsx-onboard`, `opsx-status`, and `opsx-resume` must not fail just because `.opsx/active.yaml`, an active change, or the `.opsx/` workspace is missing.
- **D-18:** These routes should report the current workspace and active-change state, then provide a concrete next action.
- **D-19:** `onboard` should guide initialization or installation when workspace state is missing.
- **D-20:** `status` should show whether the workspace and active change exist and what the next useful command is.
- **D-21:** `resume` should say there is no resumable change when none exists, then suggest creating or proposing a change.
- **D-22:** Do not auto-create a default active change from `status` or `resume`.

### the agent's Discretion
- The planner may decide the exact wording of each route's missing-file fallback as long as it is concrete, phase-accurate, and consistent across platforms.
- The planner may decide whether to add a small generator helper for common preflight text or encode it directly in shared templates.
- The planner may decide how to structure tests for the hard clean-break policy, but the tests must distinguish current public/runtime surface from any intentionally removed legacy artifacts.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and phase scope
- `.planning/PROJECT.md` - Defines OpsX v3.0 direction, command model, path model, and out-of-scope boundaries.
- `.planning/REQUIREMENTS.md` - Defines Phase 3 requirements `CMD-01` through `CMD-05`; also contains earlier requirements that Phase 3 planning must revise for the hard clean-break decision.
- `.planning/ROADMAP.md` - Defines Phase 3 goal, success criteria, and dependencies on Phases 1 and 2.
- `.planning/phases/01-opsx-naming-and-cli-surface/01-CONTEXT.md` - Locks OpsX identity and identifies Phase 3 as owner of detailed command and skill semantics.
- `.planning/phases/02-opsx-workspace-and-migration/02-CONTEXT.md` - Locks canonical `.opsx/` and `~/.opsx/` paths; some migration/history compatibility assumptions are now superseded by Phase 3 D-13 through D-16.

### Command generation and runtime code
- `lib/workflow.js` - Defines action metadata, action syntax, primary workflow syntax, checkpoints, and workflow validation helpers.
- `lib/generator.js` - Builds Claude, Codex, and Gemini command bundles from workflow metadata and templates.
- `lib/install.js` - Installs generated commands and shared skill assets into platform directories and manifests.
- `lib/cli.js` - Current CLI status/help behavior and phase-specific status text.
- `scripts/test-workflow-runtime.js` - Regression harness for command generation, install/check/doc/language, migration, and runtime guidance.

### Command templates and generated files
- `templates/commands/index.md.tmpl` - Shared index prompt template for Claude/Gemini style command surfaces.
- `templates/commands/action.md.tmpl` - Shared per-action prompt template that should receive strict preflight wording.
- `templates/commands/codex-entry.md.tmpl` - Current Codex index template; Phase 3 should remove standalone `$opsx` public guidance.
- `templates/commands/shared-entry.md.tmpl` - Shared entry guidance that may still mention public routing.
- `templates/commands/gemini-action.toml.tmpl` - Gemini action wrapper for generated prompt content.
- `templates/commands/gemini-index.toml.tmpl` - Gemini index wrapper for generated prompt content.
- `commands/claude/opsx.md` - Checked-in generated Claude index output.
- `commands/claude/opsx/*.md` - Checked-in generated Claude action outputs.
- `commands/codex/prompts/opsx*.md` - Checked-in generated Codex outputs; prompt file paths are implementation details, not public routes.
- `commands/gemini/opsx.toml` - Checked-in generated Gemini index output.
- `commands/gemini/opsx/*.toml` - Checked-in generated Gemini action outputs.

### Skill and documentation surface
- `skills/opsx/SKILL.md` - Distributed skill metadata, invocation model, config precedence, workflow loop, and guardrails.
- `skills/opsx/GUIDE-en.md` - English skill guide.
- `skills/opsx/GUIDE-zh.md` - Chinese skill guide.
- `skills/opsx/references/action-playbooks.md` - English action playbooks.
- `skills/opsx/references/action-playbooks-zh.md` - Chinese action playbooks.
- `docs/commands.md` - Public command reference.
- `docs/codex.md` - Codex usage guidance.
- `docs/supported-tools.md` - Supported tool route guidance.
- `README.md` - Public English project overview.
- `README-zh.md` - Public Chinese project overview.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/workflow.js`: Already centralizes action ids, summaries, scopes, and syntax helpers. This is the right place to add or adjust command metadata needed by templates.
- `lib/generator.js`: Already renders platform bundles from templates. Reuse it so Phase 3 changes regenerate all platforms consistently.
- `templates/commands/*`: Existing shared templates can carry common preflight and missing-file fallback text across platforms.
- `skills/opsx/SKILL.md`: Already has `name: opsx`, `.opsx/changes/*`, config precedence, and high-level execution loop. Phase 3 should tighten invocation and preflight language rather than replace the skill wholesale.
- `scripts/test-workflow-runtime.js`: Already contains command-generation and installed-command assertions. Extend this test harness for `$opsx-*` only, no standalone `$opsx`, no `/prompts:*` public UX, and empty active-change prompt behavior.

### Established Patterns
- Generated command files are checked into `commands/**`, but they are derived from `lib/generator.js` and `templates/commands/*`.
- Current action syntax already returns `/opsx-${actionId}` for Claude/Gemini and `$opsx-${actionId}` for Codex.
- Current primary workflow syntax still returns `$opsx <request>` for Codex; Phase 3 must change this.
- Existing command templates still say Phase 4 concepts are planned for later phases. Phase 3 should replace that with stricter preflight wording plus honest fallback language.
- The current skill invocation model still says Codex preferred is `$opsx <request>` and explicit routes are `$opsx-*`; this must be inverted to explicit-only.

### Integration Points
- `getPrimaryWorkflowSyntax('codex')` should no longer return `$opsx <request>`.
- `buildCodexEntryMarkdown()` and `templates/commands/codex-entry.md.tmpl` should stop describing a standalone `$opsx` route.
- `buildActionMarkdown()` and `templates/commands/action.md.tmpl` should include shared strict preflight instructions.
- `templates/commands/index.md.tmpl` should avoid exposing internal prompt names or legacy route names.
- Checked-in command bundles under `commands/**` must be refreshed after template/generator changes.
- Docs and skill guide files must align with generated command text.

</code_context>

<specifics>
## Specific Ideas

- User explicitly chose a hard clean break: "长痛不如短痛，留一堆历史遗留" should guide planning tradeoffs.
- For Codex, there is no standalone `$opsx` command in v3.0. The only public routes are `$opsx-explore`, `$opsx-new`, `$opsx-propose`, `$opsx-continue`, `$opsx-ff`, `$opsx-apply`, `$opsx-verify`, `$opsx-status`, `$opsx-resume`, `$opsx-sync`, `$opsx-archive`, `$opsx-batch-apply`, `$opsx-bulk-archive`, and `$opsx-onboard`.
- Phase 3 should make old route names disappear from current user-facing surfaces rather than preserving them as aliases.
- Empty workspace behavior should help users recover, not create state implicitly.

</specifics>

<deferred>
## Deferred Ideas

None. Discussion stayed within Phase 3 scope, but it did intentionally change earlier compatibility assumptions. Planning should update the affected requirements rather than treating this as deferred work.

</deferred>

---

*Phase: 03-skill-and-command-surface-rewrite*
*Context gathered: 2026-04-27*
