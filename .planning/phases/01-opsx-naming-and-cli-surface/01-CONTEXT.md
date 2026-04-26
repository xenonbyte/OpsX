# Phase 1: OpsX Naming and CLI Surface - Context

**Gathered:** 2026-04-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 1 delivers the breaking product identity change from OpenSpec to OpsX at the package, binary, high-level CLI, constants, docs, release metadata, and coarse generated-asset level. The phase should make `@xenonbyte/opsx` and `opsx` the visible product surface and remove old primary OpenSpec entrypoints from user-facing guidance.

Phase 1 does not implement the full `.opsx/` workspace migration engine, change-level state machine, spec-split review, TDD-light, or archive/verify quality gates. Those are later phases. This phase may introduce names and placeholders needed for later phases, but it must not claim later behavior is complete unless it is actually implemented.

</domain>

<decisions>
## Implementation Decisions

### Product Identity
- **D-01:** Rename the product to `OpsX` and explain it as `Operational Spec eXecution`.
- **D-02:** Rename the npm package from `@xenonbyte/openspec` to `@xenonbyte/opsx`.
- **D-03:** Bump package metadata to `3.0.0` because package name, binary, command names, directories, and skill identity are breaking.
- **D-04:** Update repository metadata to `xenonbyte/opsx` and use `OpsX` in descriptions, README copy, docs, templates, and release notes.

### CLI Surface
- **D-05:** Rename the executable from `openspec` to `opsx`; use `bin/opsx.js` as the package binary target.
- **D-06:** Do not ship an `openspec` binary alias from `@xenonbyte/opsx@3.0.0`. If a compatibility bridge is needed, it belongs in a final `@xenonbyte/openspec@2.x` package or a later explicit compatibility task.
- **D-07:** `opsx --help` and `opsx --version` must use OpsX branding only. Help text should show `opsx install`, `opsx uninstall`, `opsx check`, `opsx doc`, `opsx language`, `opsx migrate`, and `opsx status` as the intended surface, without `/prompts:*` as the public UX.
- **D-08:** Phase 1 must keep existing working CLI behavior for install/uninstall/check/doc/language while moving names to OpsX. Deep `migrate` behavior belongs to Phase 2; deep `status` behavior belongs to Phase 4/8. If Phase 1 recognizes those commands, it must return an honest not-yet-implemented or minimal status response rather than pretending full behavior exists.

### Legacy References
- **D-09:** Remove `/openspec`, `$openspec`, `/prompts:openspec`, `@xenonbyte/openspec`, `openspec install`, `openspec/config.yaml`, `~/.openspec`, and `skills/openspec` from primary runtime/docs surfaces.
- **D-10:** Historical OpenSpec references are allowed only in explicit migration/history contexts, such as changelog lineage, source attribution, or compatibility guidance.
- **D-11:** Keep one concise source-lineage sentence acceptable in docs: `OpsX was originally adapted from Fission-AI/OpenSpec.`

### Generated Assets and Skills
- **D-12:** Phase 1 may do coarse file/path renames needed for package identity, including `skills/openspec` to `skills/opsx` and generated asset path names, if doing so keeps install/package smoke tests coherent.
- **D-13:** Phase 3 owns the deeper semantic rewrite of command prompts and skill behavior around `.opsx/config.yaml`, `.opsx/active.yaml`, and per-change `state.yaml`. Phase 1 should not attempt to implement the full command preflight contract.
- **D-14:** Generated Claude/Codex/Gemini asset names should move toward OpsX naming now, but detailed route behavior and command responsibilities can be completed in Phase 3.

### Verification Expectations
- **D-15:** Phase 1 verification should include `node bin/opsx.js --version`, `node bin/opsx.js --help`, install/check/doc smoke tests as practical, existing runtime tests adjusted for the new names, and a package dry-run.
- **D-16:** The search gate for Phase 1 is strict: `rg "OpenSpec|openspec|\\.openspec|\\$openspec|/openspec|/prompts:openspec|@xenonbyte/openspec|~/.openspec"` should return only accepted migration/history/source-lineage references.

### the agent's Discretion
- The planner may decide whether to rename files mechanically first or update content first, as long as commits stay reviewable and tests remain runnable.
- The planner may decide how to structure small helper constants for product names and command names.
- The planner may decide whether `opsx migrate` and `opsx status` are introduced as explicit placeholder commands in Phase 1 or left for later phases, provided user-facing docs do not overstate implemented behavior.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone scope
- `.planning/PROJECT.md` — Defines OpsX v3.0 product direction, constraints, and out-of-scope boundaries.
- `.planning/REQUIREMENTS.md` — Defines Phase 1 requirements `NAME-01` through `NAME-05`.
- `.planning/ROADMAP.md` — Defines Phase 1 goal and success criteria.
- `.planning/research/SUMMARY.md` — Summarizes user-provided OpsX migration research and watch-outs.

### Current implementation surface
- `package.json` — Current package name, version, binary mapping, repository metadata, scripts, and published files.
- `bin/openspec.js` — Current CLI entrypoint that should become `bin/opsx.js`.
- `lib/constants.js` — Current package/global constants; contains mixed `.openspec` and `.opsx-config.yaml` naming.
- `lib/cli.js` — Current CLI parser/help/version behavior and OpenSpec-branded messages.
- `lib/config.js` — Current global config location, config header text, and repo skill directory lookup.
- `lib/install.js` — Current install/uninstall/check/doc behavior and shared/platform skill paths.
- `lib/generator.js` — Current generated command bundle paths and OpenSpec/opsx mixed naming.
- `lib/workflow.js` — Current action list and command syntax generation used by generated assets.
- `scripts/test-workflow-runtime.js` — Existing runtime and install/check/doc regression coverage that must be renamed/adjusted.

### Current docs and templates
- `README.md` — Current primary OpenSpec documentation surface.
- `README-zh.md` — Current Chinese documentation surface.
- `CHANGELOG.md` — Current release history and future v3.0 release-note target.
- `docs/commands.md` — Current command reference and checkpoint language.
- `docs/codex.md` — Current Codex entrypoint guidance.
- `docs/customization.md` — Current config/customization references.
- `docs/runtime-guidance.md` — Current runtime guidance docs.
- `docs/supported-tools.md` — Current platform support docs.
- `templates/commands/index.md.tmpl` — Current generated index text.
- `templates/commands/action.md.tmpl` — Current generated action text.
- `templates/commands/codex-entry.md.tmpl` — Current Codex entry text.
- `templates/project/config.yaml.tmpl` — Current project config scaffold.
- `templates/project/change-metadata.yaml.tmpl` — Current change metadata scaffold.
- `templates/project/rule-file.md.tmpl` — Current rule-file scaffold.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/fs-utils.js`: Existing filesystem helpers should be reused for file writes, directory copies, and removals rather than adding ad hoc file operations.
- `lib/template.js`: Existing template rendering should continue to drive generated command text.
- `lib/yaml.js`: Existing YAML parser/stringifier should continue to handle config files.
- `scripts/test-workflow-runtime.js`: Existing tests already exercise runtime guidance, install/check/doc, and workflow contract behavior; rename and extend rather than starting a separate test harness for Phase 1.

### Established Patterns
- CLI command parsing is small and synchronous in `lib/cli.js`; keep Phase 1 changes in that style unless a later phase introduces a larger command router.
- Install behavior records files through per-platform manifests under the shared home; preserve this manifest cleanup model while renaming shared paths.
- Generated commands come from `lib/generator.js` and `templates/commands/*`; update templates/generator together so checked-in generated files can be regenerated consistently.
- Config loading centralizes default schema/language/security review behavior in `lib/config.js`; update product/path names there rather than scattering constants.

### Integration Points
- `package.json` `bin` must point at `bin/opsx.js`.
- `lib/constants.js` feeds `lib/config.js`, `lib/install.js`, and CLI version/name output.
- `lib/install.js` must copy the renamed skill path and write manifests under the renamed shared home.
- `lib/generator.js` must keep generated asset names aligned with `lib/workflow.js` action syntax.
- Docs, templates, generated command files, and skill bundle content should be updated in the same phase so `npm pack --dry-run` does not ship contradictory naming.

</code_context>

<specifics>
## Specific Ideas

- Public positioning: `OpsX = Operational Spec eXecution`.
- Public description: `AI-native spec execution workflow for Claude, Codex, and Gemini`.
- Final target identity: project `OpsX`, repository `xenonbyte/opsx`, npm package `@xenonbyte/opsx`, CLI `opsx`, skill `opsx`.
- Old OpenSpec names should feel like migration history, not active workflow affordances.

</specifics>

<deferred>
## Deferred Ideas

- Implementing `opsx migrate --dry-run` and full old-to-new workspace migration belongs to Phase 2.
- Rewriting detailed `/opsx-*` and `$opsx-*` command responsibilities belongs to Phase 3.
- Implementing `.opsx/active.yaml`, per-change `state.yaml`, `context.md`, `drift.md`, artifact hashes, and resumable state transitions belongs to Phase 4.
- Publishing or maintaining a final `@xenonbyte/openspec@2.x` bridge package is a compatibility follow-up and should not block `@xenonbyte/opsx@3.0.0` identity work unless the user explicitly pulls it into scope.

</deferred>

---

*Phase: 01-opsx-naming-and-cli-surface*
*Context gathered: 2026-04-27*
