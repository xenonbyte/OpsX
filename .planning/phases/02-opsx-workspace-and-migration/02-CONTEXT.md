# Phase 2: `.opsx/` Workspace and Migration - Context

**Gathered:** 2026-04-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 2 makes `.opsx/` and `~/.opsx/` the canonical project and global workflow directories, then provides a safe `opsx migrate` path from the existing `openspec/` and `~/.openspec/` layout.

This phase owns directory constants, project/global config filenames, `opsx migrate --dry-run`, `opsx migrate`, migration defaults, and documentation for tracked versus ignored `.opsx/` paths. It should create minimal runtime artifacts needed for later phases (`active.yaml`, `state.yaml`, `context.md`, `drift.md`) but should not implement the full change state machine, command preflight behavior, spec-split review, TDD-light, or archive/verify gates.

</domain>

<decisions>
## Implementation Decisions

### Canonical Paths
- **D-01:** Use `.opsx/` as the canonical project workflow directory for config, active change tracking, changes, specs, archive, cache, tmp, and logs.
- **D-02:** Use `~/.opsx/` as the canonical global directory for `config.yaml`, manifests, installed shared skill assets, and cache.
- **D-03:** Replace the current mixed constants (`SHARED_HOME_NAME = '.openspec'`, `GLOBAL_CONFIG_NAME = '.opsx-config.yaml'`) with `SHARED_HOME_NAME = '.opsx'` and `GLOBAL_CONFIG_NAME = 'config.yaml'`.
- **D-04:** Keep old `openspec/` and `~/.openspec/` references only in migration detection, migration mapping output, tests, and historical guidance.

### Migration Behavior
- **D-05:** `opsx migrate --dry-run` must be side-effect free and print the exact old-to-new mapping before any file operation is attempted.
- **D-06:** `opsx migrate` should move project artifacts from `openspec/` to `.opsx/`: `config.yaml`, `changes/`, `specs/`, and `archive/` when present.
- **D-07:** Per-change metadata files named `.openspec.yaml` must be renamed to `change.yaml` during migration.
- **D-08:** If `.opsx/` already exists, migration must abort by default before moving anything. Non-trivial merge behavior is deferred unless an explicit `--merge` option is intentionally planned later.
- **D-09:** Migration should validate source existence and destination conflicts before moving files. Prefer a preflight plan object reused by dry-run and execute paths so the two modes cannot drift.

### Generated Defaults
- **D-10:** Migration should create missing `.opsx/active.yaml` with no active change unless a safe active change can be inferred.
- **D-11:** Migration should create missing per-change `state.yaml`, `context.md`, and `drift.md` as minimal recovery scaffolds, not full Phase 4 state-machine records.
- **D-12:** Generated `state.yaml` defaults should be conservative: version, change name, stage derived from existing artifacts when obvious, nextAction, artifact paths, empty blockers/warnings, and no fabricated verification log.
- **D-13:** Generated `context.md` should be a short placeholder capsule that points to migrated proposal/spec/design/tasks files. It should not summarize requirements by guessing.
- **D-14:** Generated `drift.md` should start empty with standard sections for new assumptions, scope changes, out-of-bound file changes, discovered requirements, and user approval needs.

### Git Tracking and Ignore Policy
- **D-15:** Documentation and `.gitignore` guidance should explicitly track `.opsx/config.yaml`, `.opsx/active.yaml`, `.opsx/changes/**`, `.opsx/specs/**`, and `.opsx/archive/**`.
- **D-16:** Documentation and `.gitignore` guidance should ignore `.opsx/cache/`, `.opsx/tmp/`, and `.opsx/logs/`.
- **D-17:** Existing repo-local `.gitignore` currently unignores `openspec/`; Phase 2 should replace or supplement this with `.opsx/` rules without silently dropping trackability for migrated workflow artifacts.

### CLI and Runtime Surface
- **D-18:** Replace the Phase 1 `opsx migrate` placeholder with real command handling for `--dry-run` and execute modes.
- **D-19:** Keep `opsx status` as a placeholder unless a minimal truthful workspace status is cheap and directly useful for migration verification. Deep durable change status belongs to Phase 4.
- **D-20:** `opsx check` should look for `.opsx/config.yaml` and `~/.opsx/config.yaml` after this phase. Old paths may be reported only as migration candidates.

### the agent's Discretion
- The planner may decide whether to implement migration logic in `lib/migrate.js`, `lib/workspace.js`, or similarly small modules, but migration code should not be buried inside `lib/cli.js`.
- The planner may choose a compact text dry-run output or add a JSON-friendly internal plan object, provided stdout remains understandable and tests can assert the mapping.
- The planner may decide the exact inferred stage names for generated `state.yaml`, as long as the defaults are honest and do not pretend Phase 4 state-machine enforcement exists yet.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and phase scope
- `.planning/PROJECT.md` - Defines OpsX v3.0 direction, canonical `.opsx/` and `~/.opsx/` targets, and migration safety constraints.
- `.planning/REQUIREMENTS.md` - Defines Phase 2 requirements `DIR-01` through `DIR-07`.
- `.planning/ROADMAP.md` - Defines Phase 2 goal, success criteria, and dependency order.
- `.planning/phases/01-opsx-naming-and-cli-surface/01-CONTEXT.md` - Locks Phase 1 boundaries and defers full workspace migration to Phase 2.

### Current runtime and CLI implementation
- `lib/constants.js` - Current constants still use `SHARED_HOME_NAME = '.openspec'` and `GLOBAL_CONFIG_NAME = '.opsx-config.yaml'`.
- `lib/config.js` - Current global config path and repo skill lookup; should move to `~/.opsx/config.yaml`.
- `lib/cli.js` - Current `migrate` and `status` placeholders; Phase 2 replaces `migrate` behavior.
- `lib/install.js` - Current global install/check behavior, manifests, and workspace check output.
- `lib/fs-utils.js` - Existing filesystem primitives for safe reusable file operations.
- `lib/yaml.js` - Existing YAML parser/stringifier for reading old config and writing new defaults.
- `scripts/test-workflow-runtime.js` - Existing regression harness that should be extended for migration behavior.

### Existing workspace data to migrate
- `openspec/config.yaml` - Existing project config and language/security defaults.
- `openspec/changes/*/.openspec.yaml` - Existing per-change metadata files that must become `change.yaml`.
- `openspec/changes/*/proposal.md` - Existing change proposals to preserve.
- `openspec/changes/*/design.md` - Existing change designs to preserve.
- `openspec/changes/*/tasks.md` - Existing task files to preserve.
- `openspec/changes/*/security-review.md` - Optional existing security review artifacts to preserve.
- `openspec/changes/*/specs/**` - Existing per-change specs if present.

### Docs and templates
- `.gitignore` - Current rules keep `openspec/changes/**` trackable; Phase 2 must add `.opsx/` tracking and cache/tmp/log ignores.
- `README.md` - Public migration and workspace documentation target.
- `README-zh.md` - Chinese migration and workspace documentation target.
- `docs/customization.md` - Config path documentation target.
- `docs/runtime-guidance.md` - Runtime workspace path guidance target.
- `templates/project/config.yaml.tmpl` - Project config scaffold that should target `.opsx/config.yaml`.
- `templates/project/change-metadata.yaml.tmpl` - Change metadata scaffold that should align with `change.yaml`.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/fs-utils.js`: Provides `ensureDir`, `writeText`, `copyFile`, `copyDir`, `removePath`, and `listFiles`; reuse these for migration helpers where practical.
- `lib/yaml.js`: Existing YAML read/write support should handle `config.yaml`, old `.openspec.yaml`, new `change.yaml`, `active.yaml`, and generated `state.yaml`.
- `scripts/test-workflow-runtime.js`: Already creates temp fixture repos, copies schemas/skills, and runs CLI commands through `bin/opsx.js`; extend this instead of creating a separate test runner for Phase 2.

### Established Patterns
- CLI dispatch in `lib/cli.js` is synchronous and small; keep command parsing simple, but route migration behavior into a dedicated module.
- Install/check code already accepts injected `homeDir`/`cwd` options in some functions; migration tests should follow this temp-dir pattern to avoid touching real user paths.
- Phase 1 tests use temp directories and explicit assertions rather than snapshots; migration tests should assert concrete files moved, generated, and protected.
- Current package intentionally has no runtime dependency; avoid adding dependencies for filesystem walking, path mapping, or YAML unless absolutely necessary.

### Integration Points
- `lib/constants.js` feeds global config path behavior through `lib/config.js` and install/check output through `lib/install.js`.
- `lib/cli.js` should call the migration module for `opsx migrate` and pass options such as `--dry-run`.
- `lib/install.js` `runCheck()` currently checks `openspec/config.yaml`; Phase 2 should change that to `.opsx/config.yaml` and mention old `openspec/` only as a migration candidate.
- The real dogfood workspace currently has `openspec/config.yaml` and several `openspec/changes/*` directories, so migration tests should cover multiple changes and optional artifacts.

</code_context>

<specifics>
## Specific Ideas

- Migration mapping should follow the user-supplied table: `openspec/config.yaml -> .opsx/config.yaml`, `openspec/changes -> .opsx/changes`, `openspec/specs -> .opsx/specs`, `openspec/archive -> .opsx/archive`, and `openspec/changes/<change>/.openspec.yaml -> .opsx/changes/<change>/change.yaml`.
- Default `.opsx/` structure should include `config.yaml`, `active.yaml`, `changes/`, `specs/`, `archive/`, `cache/`, `tmp/`, and `logs/`.
- Default global structure should be `~/.opsx/config.yaml`, `~/.opsx/manifests/`, `~/.opsx/skills/opsx/`, and `~/.opsx/cache/`.
- Keep migration conservative: dry-run first, abort on existing `.opsx/`, no silent merge, and no destructive cleanup of old directories beyond successful moves.

</specifics>

<deferred>
## Deferred Ideas

- Full `opsx migrate --merge` conflict-resolution workflow is deferred unless the planner finds a small explicit option that does not compromise the default safe abort behavior.
- Full change-level transition validation, artifact hashes, verification logs, allowed/forbidden paths, and active task-group behavior belong to Phase 4.
- Full command preflight language for `.opsx/active.yaml` and active change `state.yaml` belongs to Phase 3 and Phase 4.
- A final `@xenonbyte/openspec@2.x` bridge package remains a compatibility follow-up outside this Phase 2 scope.

</deferred>

---

*Phase: 02-opsx-workspace-and-migration*
*Context gathered: 2026-04-27*
