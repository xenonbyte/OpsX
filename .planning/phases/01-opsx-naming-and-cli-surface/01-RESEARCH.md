# Phase 1: OpsX Naming and CLI Surface - Research

**Researched:** 2026-04-27  
**Domain:** package rename, CLI surface, generated command assets, release metadata  
**Confidence:** MEDIUM

<user_constraints>
## User Constraints (from CONTEXT.md)

Verbatim copy from `.planning/phases/01-opsx-naming-and-cli-surface/01-CONTEXT.md`. [VERIFIED: .planning/phases/01-opsx-naming-and-cli-surface/01-CONTEXT.md]

### Locked Decisions

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

### Claude's Discretion
- The planner may decide whether to rename files mechanically first or update content first, as long as commits stay reviewable and tests remain runnable.
- The planner may decide how to structure small helper constants for product names and command names.
- The planner may decide whether `opsx migrate` and `opsx status` are introduced as explicit placeholder commands in Phase 1 or left for later phases, provided user-facing docs do not overstate implemented behavior.

### Deferred Ideas (OUT OF SCOPE)
- Implementing `opsx migrate --dry-run` and full old-to-new workspace migration belongs to Phase 2.
- Rewriting detailed `/opsx-*` and `$opsx-*` command responsibilities belongs to Phase 3.
- Implementing `.opsx/active.yaml`, per-change `state.yaml`, `context.md`, `drift.md`, artifact hashes, and resumable state transitions belongs to Phase 4.
- Publishing or maintaining a final `@xenonbyte/openspec@2.x` bridge package is a compatibility follow-up and should not block `@xenonbyte/opsx@3.0.0` identity work unless the user explicitly pulls it into scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

Descriptions copied from `.planning/REQUIREMENTS.md`; support mapping is based on local codebase inspection. [VERIFIED: .planning/REQUIREMENTS.md; rg repo scan]

| ID | Description | Research Support |
|----|-------------|------------------|
| NAME-01 | User can install the breaking release as `@xenonbyte/opsx`. | Rename `package.json`, `bin`, wrappers, postinstall text, and tarball contents together; current tarball still ships `@xenonbyte/openspec`, `bin/openspec.js`, `commands/*/openspec*`, and `skills/openspec/**`. [VERIFIED: package.json; scripts/postinstall.js; npm pack --dry-run] |
| NAME-02 | User can invoke the CLI as `opsx` with `--help`, `--version`, `install`, `uninstall`, `check`, `doc`, `language`, `migrate`, and `status`. | Current CLI only supports install/uninstall/help/version plus `--check`, `--doc`, and `--language`; `status` exists as runtime/prompt concepts, while `migrate` is absent, so Phase 1 needs at least truthful stubs or a minimal status surface. [VERIFIED: lib/cli.js; lib/workflow.js; lib/runtime-guidance.js; docs/commands.md] |
| NAME-03 | User-facing docs, package metadata, templates, generated command text, and runtime messages consistently use `OpsX`, `opsx`, and `@xenonbyte/opsx`. | README, docs, templates, commands, skill guides, help text, check/doc output, and postinstall output still use OpenSpec naming. [VERIFIED: README.md; README-zh.md; docs/*.md; templates/**/*.tmpl; commands/**; skills/openspec/**; lib/cli.js; lib/install.js; scripts/postinstall.js] |
| NAME-04 | Historical OpenSpec references remain only where they explain source lineage, migration, or changelog history. | Current repo has many active runtime and shipped references to `openspec`, `.openspec`, `$openspec`, `/openspec`, and `~/.openspec`; these must be reduced or explicitly allowlisted as deferred internal path references. [VERIFIED: rg repo scan] |
| NAME-05 | Release metadata clearly communicates `3.0.0` as a breaking OpsX rename and workflow-state upgrade. | Package metadata is still `2.0.1` and changelog has no `3.0.0` entry yet. [VERIFIED: package.json; CHANGELOG.md] |
</phase_requirements>

## Summary

Phase 1 is not a simple `package.json` rename: the published tarball currently ships OpenSpec-branded binaries, shared command files, guides, skill assets, and repository metadata, so package identity, install assets, templates, and generated files have to move together. [VERIFIED: package.json; lib/install.js; lib/generator.js; skills/openspec/**; commands/**; npm pack --dry-run]

The main planning tension is that the repo already mixes public OpsX route names with still-live OpenSpec workspace and shared-home paths. Public/package surfaces clearly belong in Phase 1, but `openspec/`, `.openspec.yaml`, and `~/.openspec/` are still active runtime semantics in `lib/runtime-guidance.js`, tests, docs, and the shipped skill, which is why the strict repo-wide grep gate conflicts with the stated Phase 2 boundary unless the plan explicitly allowlists deferred internal references or intentionally pulls some path migration forward. [VERIFIED: lib/runtime-guidance.js; scripts/test-workflow-runtime.js; skills/openspec/SKILL.md; docs/customization.md; 01-CONTEXT.md; rg repo scan]

`status` is already a real runtime concept via `buildStatus()`, but not a CLI subcommand; `migrate` is not implemented in the CLI at all. Phase 1 therefore needs an explicit decision: either add honest placeholders/minimal output now, or keep them out of real behavior while ensuring docs/help do not imply Phase 2 or Phase 4 functionality already exists. [VERIFIED: lib/cli.js; lib/runtime-guidance.js; docs/commands.md; 01-CONTEXT.md]

**Primary recommendation:** do the phase in three slices: rename package/binary metadata first, then rename install/generator/skill surfaces as one coherent asset pass, then update docs/tests/search gates last with an explicit allowance policy for deferred workspace-path references. [VERIFIED: package.json; lib/install.js; lib/generator.js; npm pack --dry-run; 01-CONTEXT.md]

## Current Architecture

| Capability | Current owner | Phase 1 planning note |
|------------|---------------|-----------------------|
| Published package identity | `package.json`, `bin/openspec.js`, `install.sh`, `uninstall.sh`, `scripts/postinstall.js` | This is the public npm surface and is still fully OpenSpec-branded; rename here first so package dry-run stops shipping the wrong identity. [VERIFIED: package.json; bin/openspec.js; install.sh; uninstall.sh; scripts/postinstall.js; npm pack --dry-run] |
| CLI command parsing | `lib/cli.js` | The parser is intentionally small and synchronous; it currently supports install/uninstall/help/version and flag-based check/doc/language only, so `status`/`migrate` must be added without turning Phase 1 into a router rewrite. [VERIFIED: lib/cli.js; 01-CONTEXT.md] |
| Shared-home config and install state | `lib/constants.js`, `lib/config.js`, `lib/install.js` | The code currently uses mixed naming: shared home `.openspec`, global config `.opsx-config.yaml`, and skill path `skills/openspec`; touching this area half-way risks broken `install`/`uninstall`/`check`/`doc` flows. [VERIFIED: lib/constants.js; lib/config.js; lib/install.js] |
| Generated command bundles | `lib/workflow.js`, `lib/generator.js`, `templates/commands/*`, `commands/**` | Public action routes already use `opsx`, but index titles, skill names, primary entrypoints, config paths, and shipped `openspec.*` files still say OpenSpec. [VERIFIED: lib/workflow.js; lib/generator.js; templates/commands/*.tmpl; commands/**] |
| Distributed skill bundle and docs | `skills/openspec/**`, `README*.md`, `docs/*.md`, `templates/project/*` | These are copied or published as user-facing assets, so stale OpenSpec guidance here becomes product truth even if the CLI is renamed. [VERIFIED: skills/openspec/**; README.md; README-zh.md; docs/*.md; templates/project/*.tmpl] |
| Workspace/state runtime | `lib/runtime-guidance.js`, `schemas/spec-driven/schema.json`, `openspec/config.yaml`, `scripts/test-workflow-runtime.js` | This layer still uses `openspec/` and `.openspec.yaml` as live runtime data paths; that is Phase 2 territory unless the plan intentionally broadens scope. [VERIFIED: lib/runtime-guidance.js; schemas/spec-driven/schema.json; openspec/config.yaml; scripts/test-workflow-runtime.js; ROADMAP.md] |

Baseline verification is already usable: `node scripts/test-workflow-runtime.js` passes 19 tests, `node bin/openspec.js --help` and `--version` work, and `npm pack --dry-run` succeeds with a temporary npm cache. [VERIFIED: node scripts/test-workflow-runtime.js; node bin/openspec.js --help; node bin/openspec.js --version; npm_config_cache=/tmp/opsx-npm-cache npm pack --dry-run]

## Naming Surface Inventory

| Surface | Current state | Category | Phase 1 action |
|--------|---------------|----------|----------------|
| `package.json` name/version/bin/repo/bugs/homepage | `@xenonbyte/openspec`, `2.0.1`, binary `openspec`, repo `xenonbyte/openspec`. [VERIFIED: package.json] | Active published runtime | Rename now and verify tarball metadata. [VERIFIED: package.json; npm pack --dry-run] |
| `bin/openspec.js`, `install.sh`, `uninstall.sh`, `scripts/postinstall.js` | Public entrypoints and onboarding output still reference `openspec`. [VERIFIED: bin/openspec.js; install.sh; uninstall.sh; scripts/postinstall.js] | Active published runtime | Rename now; old `bin/openspec.js` cannot remain in the published `bin/` directory if no alias is allowed. [VERIFIED: package.json; npm pack --dry-run; 01-CONTEXT.md] |
| `lib/cli.js` help/version/errors | Help prints `OpenSpec`, `openspec`, `$openspec`, `/prompts:openspec`, and `openspec/config.yaml`; there is no `status` or `migrate` command branch. [VERIFIED: lib/cli.js] | Active user-facing runtime | Rename now; add truthful `status`/`migrate` behavior or explicit placeholders. [VERIFIED: lib/cli.js; 01-CONTEXT.md] |
| `lib/constants.js`, `lib/config.js`, `lib/install.js` | Shared home is `.openspec`; global config is `.opsx-config.yaml`; repo skill dir and installed skill dir are `skills/openspec`; `runCheck()` and `showDoc()` expose these names. [VERIFIED: lib/constants.js; lib/config.js; lib/install.js] | Active runtime internals and install surface | Treat as one slice; do not rename only one of home path, skill path, manifests, or doc lookup. [VERIFIED: lib/config.js; lib/install.js] |
| `lib/generator.js`, `lib/workflow.js`, `templates/commands/*`, `commands/**` | Action routes are already `opsx`, but headings, descriptions, skill references, config paths, and shared files such as `commands/openspec.md` remain OpenSpec-branded. [VERIFIED: lib/workflow.js; lib/generator.js; templates/commands/*.tmpl; commands/**] | Shipped generated assets | Update generator and templates together, then refresh checked-in command files in the same pass. [VERIFIED: lib/generator.js; templates/commands/*.tmpl; commands/**] |
| `skills/openspec/**` and guides | Skill frontmatter is `name: openspec`; config precedence still reads `openspec/` and `~/.openspec/`; guides tell users to run `$openspec`. [VERIFIED: skills/openspec/SKILL.md; skills/openspec/GUIDE-en.md; skills/openspec/GUIDE-zh.md] | Shipped skill surface | Coarse rename/path update is in-scope for package coherence, but deep `.opsx/` state semantics stay deferred. [VERIFIED: 01-CONTEXT.md; skills/openspec/**] |
| `README.md`, `README-zh.md`, `docs/*.md`, `templates/project/*` | Primary docs still present OpenSpec as the product and still document `openspec/config.yaml`, `~/.openspec`, `skills/openspec`, and `$openspec`. [VERIFIED: README.md; README-zh.md; docs/*.md; templates/project/*.tmpl] | Active user-facing docs | Rename now, but do not overclaim `migrate`, `status`, or `.opsx` behavior that later phases own. [VERIFIED: 01-CONTEXT.md; docs/commands.md] |
| `lib/runtime-guidance.js`, `openspec/config.yaml`, `.openspec.yaml`, tests | Still use `openspec/changes/*` and `.openspec.yaml` as live runtime data. [VERIFIED: lib/runtime-guidance.js; openspec/config.yaml; scripts/test-workflow-runtime.js] | Active internal runtime, Phase 2 boundary | Either explicitly defer and allowlist these hits, or broaden Phase 1 to include part of Phase 2. Doing neither will make the grep gate fail. [VERIFIED: ROADMAP.md; 01-CONTEXT.md; rg repo scan] |
| `CHANGELOG.md`, `LICENSE`, lineage note | Prior release history and legal attribution naturally retain OpenSpec naming. [VERIFIED: CHANGELOG.md; LICENSE] | Acceptable history/legal text | Keep only where clearly marked as history, migration, or source lineage. [VERIFIED: 01-CONTEXT.md] |

One extra cleanup candidate exists: `templates/commands/shared-entry.md.tmpl` is present in the repo, but no references to `shared-entry` were found in `lib/`, `templates/`, `commands/`, `scripts/`, or `skills/`, so it should not be treated as a primary generation path unless Phase 1 explicitly decides to revive it. [VERIFIED: rg repo scan]

## Phase Boundary and Non-Goals

- Phase 1 should own package identity, binary name, public help/version text, install/check/doc/language smoke outputs, release metadata, README/docs/templates, shipped command bundles, and coarse skill/package asset naming. [VERIFIED: ROADMAP.md; 01-CONTEXT.md; package.json; lib/cli.js; lib/install.js; lib/generator.js]  
- Phase 2 should own the real `.opsx/` and `~/.opsx/` migration, `change.yaml`, `.opsx/active.yaml`, and old-to-new workspace movement; Phase 1 should not claim those behaviors are complete. [VERIFIED: ROADMAP.md; REQUIREMENTS.md; 01-CONTEXT.md]  
- Phase 3 should own the deeper rewrite of `/opsx-*`, `$opsx-*`, and `skills/opsx` semantics that preload `.opsx` state before acting; Phase 1 may only do coarse naming moves needed to keep package/install assets coherent. [VERIFIED: ROADMAP.md; REQUIREMENTS.md; 01-CONTEXT.md]  
- Phase 4 and later should own durable state-machine behavior, resumable state transitions, artifact hashes, rich `status`, and the rest of the runtime workflow contract. [VERIFIED: ROADMAP.md; REQUIREMENTS.md]  
- Phase 8 should own the expanded coverage goals such as `opsx status --json`, broader migration/state tests, and final release-hardening coverage. [VERIFIED: ROADMAP.md; REQUIREMENTS.md]  

The only Phase 1 gray area that needs a planning decision up front is whether `opsx status` and `opsx migrate` become recognized-but-honest placeholder commands now. The context allows either approach, but docs/help must match whichever choice is made. [VERIFIED: 01-CONTEXT.md; lib/cli.js]

## Recommended Implementation Order

1. **Rename package metadata and published entrypoints first.** Switch `package.json` to `@xenonbyte/opsx@3.0.0`, add `bin/opsx.js`, update wrapper scripts and postinstall text, and ensure the old `bin/openspec.js` will not keep shipping in `bin/`. [VERIFIED: package.json; bin/openspec.js; install.sh; uninstall.sh; scripts/postinstall.js; npm pack --dry-run]
2. **Introduce explicit identity constants before touching install paths broadly.** Separate display/binary/package naming from workspace-path naming so Phase 1 can rename public identity without accidentally half-migrating `.openspec`/`openspec/` state semantics. [VERIFIED: lib/constants.js; lib/config.js; lib/install.js; 01-CONTEXT.md]
3. **Update `lib/cli.js` next, not last.** Help/version/error text is the fastest smoke-test path and is where Phase 1 must decide the truthful behavior for `status` and `migrate`. [VERIFIED: lib/cli.js; 01-CONTEXT.md]
4. **Handle generator, templates, checked-in commands, and skill bundle as one asset wave.** `install()` copies `commands/openspec.md`, generated bundles, and `skills/openspec/**`; updating only docs or only templates will leave the tarball and installed assets contradictory. [VERIFIED: lib/install.js; lib/generator.js; commands/**; skills/openspec/**; npm pack --dry-run]
5. **Update README/docs/changelog only after the actual surface exists.** This avoids documenting `opsx status`/`opsx migrate` behavior that the CLI still does not support. [VERIFIED: README.md; README-zh.md; docs/*.md; lib/cli.js]
6. **Finish with tests, tarball inspection, and grep gates.** The repo already has a useful runtime smoke script, but it does not yet assert package identity or shipped-asset naming, so Phase 1 should extend verification only after the rename settles. [VERIFIED: scripts/test-workflow-runtime.js; npm pack --dry-run]

## File Impact Map

| Risk / ownership | Files | Why this group matters |
|------------------|-------|------------------------|
| High risk: package + CLI | `package.json`, `bin/openspec.js`, `lib/cli.js`, `install.sh`, `uninstall.sh`, `scripts/postinstall.js` | This is the public install and invocation path; mistakes here break `npm install -g`, `opsx --help`, and versioning immediately. [VERIFIED: package.json; lib/cli.js; scripts/postinstall.js; npm pack --dry-run] |
| High risk: install/runtime coupling | `lib/constants.js`, `lib/config.js`, `lib/install.js`, `scripts/test-workflow-runtime.js` | These files own shared-home paths, manifests, doc lookup, and smoke-test coverage; inconsistent renames here strand installed assets or break uninstall/check/doc behavior. [VERIFIED: lib/constants.js; lib/config.js; lib/install.js; scripts/test-workflow-runtime.js] |
| Medium risk: generated assets | `lib/generator.js`, `lib/workflow.js`, `templates/commands/index.md.tmpl`, `templates/commands/action.md.tmpl`, `templates/commands/codex-entry.md.tmpl`, `commands/**` | The package publishes these files and `install()` copies them, so stale OpenSpec text here becomes installed UX. [VERIFIED: lib/generator.js; lib/workflow.js; templates/commands/*.tmpl; commands/**; npm pack --dry-run] |
| Medium risk: skill bundle | `skills/openspec/SKILL.md`, `skills/openspec/GUIDE-en.md`, `skills/openspec/GUIDE-zh.md`, `skills/openspec/references/*` | The skill is both shipped and copied into platform homes; coarse rename is in-scope, but deep `.opsx` semantics are later-phase work. [VERIFIED: skills/openspec/**; 01-CONTEXT.md] |
| Medium risk: primary docs | `README.md`, `README-zh.md`, `CHANGELOG.md`, `docs/commands.md`, `docs/codex.md`, `docs/customization.md`, `docs/runtime-guidance.md`, `docs/supported-tools.md` | These are the authoritative user-facing explanations and are currently the densest concentration of stale OpenSpec copy. [VERIFIED: README.md; README-zh.md; CHANGELOG.md; docs/*.md; rg repo scan] |
| Boundary-sensitive / likely defer | `lib/runtime-guidance.js`, `openspec/config.yaml`, `schemas/spec-driven/schema.json`, test fixtures that create `openspec/` or `.openspec.yaml` | These represent live workspace/state semantics, not just branding, so changing them in Phase 1 effectively starts Phase 2. [VERIFIED: lib/runtime-guidance.js; openspec/config.yaml; schemas/spec-driven/schema.json; scripts/test-workflow-runtime.js; ROADMAP.md] |
| Additional shipped but easy-to-miss files | `templates/project/config.yaml.tmpl`, `templates/project/change-metadata.yaml.tmpl`, `templates/project/rule-file.md.tmpl`, `commands/openspec.md` | These are not part of the CLI parser, but they are shipped scaffolds or shared entry docs and can quietly reintroduce OpenSpec naming after the rename. [VERIFIED: templates/project/*.tmpl; commands/openspec.md; npm pack --dry-run] |

## Runtime State Inventory

| Category | Items found | Action required |
|----------|-------------|-----------------|
| Stored data | Repo runtime state is file-backed, not DB-backed: `openspec/config.yaml`, `openspec/changes/**`, and per-change `.openspec.yaml` are live current-state locations. [VERIFIED: openspec/config.yaml; lib/runtime-guidance.js; scripts/test-workflow-runtime.js] | If Phase 1 keeps Phase 2 out of scope, these stay as deferred internal references and must be explicitly exempted from the grep gate; real data migration belongs to Phase 2. [VERIFIED: ROADMAP.md; 01-CONTEXT.md] |
| Live service config | None found; the repo does not configure external SaaS or UI-only services for naming/runtime state. [VERIFIED: rg repo scan] | None. [VERIFIED: rg repo scan] |
| OS-registered state | Installer writes user-home assets under `~/.claude/commands`, `~/.codex/prompts`, `~/.gemini/commands`, plus manifests and shared skills under the shared home currently rooted at `.openspec`. [VERIFIED: lib/install.js; scripts/test-workflow-runtime.js] | If shared-home or skill paths move in Phase 1, the plan must include reinstall/uninstall smoke coverage and possibly cleanup/migration for existing manifests; otherwise defer the home-path rename to Phase 2. [VERIFIED: lib/install.js; 01-CONTEXT.md] |
| Secrets / env vars | No named OpenSpec/OpsX environment variable contract was found; runtime only relies on `HOME` for shared-home resolution. [VERIFIED: lib/config.js; lib/install.js; rg repo scan] | None beyond preserving `HOME`-based behavior in tests. [VERIFIED: lib/config.js; scripts/test-workflow-runtime.js] |
| Build artifacts / installed packages | The current dry-run tarball includes `bin/openspec.js`, `commands/*/openspec*`, `commands/openspec.md`, and `skills/openspec/**`. [VERIFIED: npm pack --dry-run] | Rename/remove these artifacts in the publish set and re-run tarball inspection before calling Phase 1 done. [VERIFIED: npm pack --dry-run] |

## Verification Strategy

Environment baseline on this machine is good enough for local planning and smoke validation: Node `v24.8.0`, npm `11.6.0`, and `rg` `15.1.0` are installed. `npm pack --dry-run` fails with the default cache because `~/.npm` has root-owned files, but it succeeds with `npm_config_cache=/tmp/opsx-npm-cache`. [VERIFIED: node --version; npm --version; rg --version; npm pack --dry-run; npm_config_cache=/tmp/opsx-npm-cache npm pack --dry-run]

### Recommended commands

```bash
node bin/opsx.js --version
node bin/opsx.js --help
node scripts/test-workflow-runtime.js
npm_config_cache=/tmp/opsx-npm-cache npm pack --dry-run
rg -n "OpenSpec|openspec|\\.openspec|\\$openspec|/openspec|/prompts:openspec|@xenonbyte/openspec|~/.openspec" README.md README-zh.md docs package.json bin lib scripts commands skills templates
```

These are the highest-signal checks because they cover public CLI identity, current runtime smoke behavior, publish contents, and stale naming search gates. [VERIFIED: lib/cli.js; scripts/test-workflow-runtime.js; npm pack --dry-run; rg repo scan]

### Requirement-to-check map

| Requirement | Primary checks |
|-------------|----------------|
| NAME-01 | `package.json` diff plus `npm_config_cache=/tmp/opsx-npm-cache npm pack --dry-run` with tarball contents free of `bin/openspec.js`, `commands/*/openspec*`, and `skills/openspec/**`. [VERIFIED: package.json; npm pack --dry-run] |
| NAME-02 | `node bin/opsx.js --version`, `node bin/opsx.js --help`, plus smoke coverage for install/uninstall/check/doc/language and whichever truthful `status`/`migrate` behavior Phase 1 chooses. [VERIFIED: lib/cli.js; scripts/test-workflow-runtime.js; 01-CONTEXT.md] |
| NAME-03 | Targeted grep over README/docs/templates/commands/skills/scripts and spot-check help/check/doc output strings. [VERIFIED: rg repo scan; lib/cli.js; lib/install.js] |
| NAME-04 | Repo grep reviewed against an explicit allowlist of history/migration/legal references; if no allowlist is adopted, the plan must migrate deferred internal path hits too. [VERIFIED: 01-CONTEXT.md; lib/runtime-guidance.js; scripts/test-workflow-runtime.js; rg repo scan] |
| NAME-05 | `package.json` version `3.0.0`, repository URLs updated, and a new `CHANGELOG.md` release note that describes the breaking OpsX rename without pretending later-phase features are already done. [VERIFIED: package.json; CHANGELOG.md; 01-CONTEXT.md] |

### Validation Architecture

| Property | Value |
|----------|-------|
| Framework | Node script with built-in `assert` via `scripts/test-workflow-runtime.js`. [VERIFIED: scripts/test-workflow-runtime.js] |
| Config file | None; the test harness is self-contained. [VERIFIED: scripts/test-workflow-runtime.js] |
| Quick run command | `node scripts/test-workflow-runtime.js`. [VERIFIED: package.json; scripts/test-workflow-runtime.js] |
| Full phase gate | Quick run command + `node bin/opsx.js --help` + `node bin/opsx.js --version` + `npm_config_cache=/tmp/opsx-npm-cache npm pack --dry-run` + grep gate. [VERIFIED: package.json; lib/cli.js; npm pack --dry-run; rg repo scan] |

Current gap: the existing runtime script verifies install/check/doc/language compatibility and internal runtime behavior, but it does not assert renamed package metadata or tarball naming, so Phase 1 should add focused coverage or scripted shell checks for those concerns. [VERIFIED: scripts/test-workflow-runtime.js; npm pack --dry-run]

## Risks and Mitigations

- **Repo-wide grep gate conflicts with the documented phase split.** Current live runtime/test files still require `openspec/`, `.openspec.yaml`, and `~/.openspec/`; either allowlist those internal references for Phase 1 or intentionally broaden scope into Phase 2. [VERIFIED: lib/runtime-guidance.js; scripts/test-workflow-runtime.js; skills/openspec/SKILL.md; ROADMAP.md; 01-CONTEXT.md]
- **Generated assets can drift from templates.** `commands/**` are shipped and `install()` copies them, so editing only checked-in command files or only templates will leave contradictions. Update generator + templates + checked-in assets in one wave. [VERIFIED: lib/install.js; lib/generator.js; commands/**; templates/commands/*.tmpl]
- **Shared-home path and skill path are tightly coupled.** `runCheck()`, `showDoc()`, manifests, backups, and installed skill copies all depend on the current shared-home layout, so partial renames here break smoke tests fast. [VERIFIED: lib/config.js; lib/install.js; scripts/test-workflow-runtime.js]
- **Docs currently overstate route surfaces relative to the real CLI.** `docs/commands.md` and generated prompt assets expose `status` broadly, but `lib/cli.js` does not implement it as a command; `migrate` is missing entirely. Help/docs must stay honest. [VERIFIED: lib/cli.js; docs/commands.md; commands/**; 01-CONTEXT.md]
- **Old published artifacts can survive even after the binary rename.** Because the pack output currently includes `bin/openspec.js`, `commands/*/openspec*`, and `skills/openspec/**`, a metadata-only rename still ships legacy artifacts. [VERIFIED: npm pack --dry-run]
- **Skill rename can accidentally front-run Phase 3 semantics.** Coarse `skills/openspec` to `skills/opsx` renaming is allowed, but changing the skill’s full config precedence, command semantics, and `.opsx` state contract is later-phase work. [VERIFIED: 01-CONTEXT.md; skills/openspec/SKILL.md; ROADMAP.md]

## Security Domain

This phase is mostly packaging, naming, and documentation work, but it still touches local-install and path-resolution code, so path-safety and truthful operator messaging are the only meaningful security concerns here. [VERIFIED: lib/install.js; lib/runtime-guidance.js; scripts/test-workflow-runtime.js]

| ASVS Category | Applies | Standard control |
|---------------|---------|------------------|
| V2 Authentication | no | Not part of this phase scope. [VERIFIED: ROADMAP.md; REQUIREMENTS.md] |
| V3 Session Management | no | Not part of this phase scope. [VERIFIED: ROADMAP.md; REQUIREMENTS.md] |
| V4 Access Control | no | Not part of this phase scope. [VERIFIED: ROADMAP.md; REQUIREMENTS.md] |
| V5 Input Validation | yes | Preserve existing change/capability path validation when touching runtime helpers or exposing minimal `status`. [VERIFIED: lib/runtime-guidance.js] |
| V6 Cryptography | no | Not part of this phase scope. [VERIFIED: ROADMAP.md; REQUIREMENTS.md] |

## Sources

### Primary
- Local phase context and requirements: `.planning/phases/01-opsx-naming-and-cli-surface/01-CONTEXT.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/STATE.md`. [VERIFIED: local files]
- Core runtime/package files: `package.json`, `bin/openspec.js`, `lib/constants.js`, `lib/cli.js`, `lib/config.js`, `lib/install.js`, `lib/generator.js`, `lib/workflow.js`, `lib/runtime-guidance.js`, `scripts/postinstall.js`, `scripts/test-workflow-runtime.js`. [VERIFIED: local files]
- Docs/templates/assets: `README.md`, `README-zh.md`, `CHANGELOG.md`, `docs/*.md`, `templates/**/*.tmpl`, `commands/**`, `skills/openspec/**`. [VERIFIED: local files]
- Command evidence: `node bin/openspec.js --help`, `node bin/openspec.js --version`, `node scripts/test-workflow-runtime.js`, `npm_config_cache=/tmp/opsx-npm-cache npm pack --dry-run`, repo-wide `rg` scans. [VERIFIED: local command output]

## Metadata

**Confidence breakdown:**  
- Standard stack / architecture: HIGH, because the phase concerns the current local Node CLI and shipped assets rather than third-party moving targets. [VERIFIED: package.json; lib/*.js; scripts/test-workflow-runtime.js]  
- Phase boundary / non-goals: HIGH, because they are explicitly locked in `01-CONTEXT.md`, `REQUIREMENTS.md`, and `ROADMAP.md`. [VERIFIED: 01-CONTEXT.md; REQUIREMENTS.md; ROADMAP.md]  
- Grep-gate feasibility: MEDIUM, because the codebase evidence is clear but the exact accepted allowlist policy for deferred internal references is still a planning decision. [VERIFIED: 01-CONTEXT.md; rg repo scan]  

**Valid until:** 2026-05-27 for current repo state unless Phase 1 or Phase 2 lands earlier. [VERIFIED: local repo state]
