# Phase 2: `.opsx/` Workspace and Migration - Research

**Researched:** 2026-04-27  
**Domain:** workspace path migration, legacy-to-canonical filesystem moves, minimal state scaffold generation  
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

Verbatim copy from `.planning/phases/02-opsx-workspace-and-migration/02-CONTEXT.md`. [VERIFIED: .planning/phases/02-opsx-workspace-and-migration/02-CONTEXT.md]

### Locked Decisions

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

### Claude's Discretion
- The planner may decide whether to implement migration logic in `lib/migrate.js`, `lib/workspace.js`, or similarly small modules, but migration code should not be buried inside `lib/cli.js`.
- The planner may choose a compact text dry-run output or add a JSON-friendly internal plan object, provided stdout remains understandable and tests can assert the mapping.
- The planner may decide the exact inferred stage names for generated `state.yaml`, as long as the defaults are honest and do not pretend Phase 4 state-machine enforcement exists yet.

### Deferred Ideas (OUT OF SCOPE)
- Full `opsx migrate --merge` conflict-resolution workflow is deferred unless the planner finds a small explicit option that does not compromise the default safe abort behavior.
- Full change-level transition validation, artifact hashes, verification logs, allowed/forbidden paths, and active task-group behavior belong to Phase 4.
- Full command preflight language for `.opsx/active.yaml` and active change `state.yaml` belongs to Phase 3 and Phase 4.
- A final `@xenonbyte/openspec@2.x` bridge package remains a compatibility follow-up outside this Phase 2 scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

Descriptions copied from `.planning/REQUIREMENTS.md`; support mapping is based on local code and runtime-state inspection. [VERIFIED: .planning/REQUIREMENTS.md; rg repo scan; local runtime inventory]

| ID | Description | Research Support |
|----|-------------|------------------|
| DIR-01 | Project workflow artifacts live under `.opsx/` with `config.yaml`, `active.yaml`, `changes/`, `specs/`, `archive/`, `cache/`, `tmp/`, and `logs/`. | Constants, check/status messaging, runtime loaders, templates, docs, and migration scaffolds all have to agree on `.opsx/` as the only canonical project root after migration. [VERIFIED: lib/constants.js; lib/install.js; lib/runtime-guidance.js; README.md; docs/customization.md; templates/project/config.yaml.tmpl] |
| DIR-02 | Global OpsX files live under `~/.opsx/` with `config.yaml`, `manifests/`, `skills/opsx/`, and `cache/`. | `getSharedHome()` and `getGlobalConfigPath()` currently point at `~/.openspec/.opsx-config.yaml`; install/check/uninstall/manifests must be re-rooted and legacy `~/.openspec` state must be detected during migration planning. [VERIFIED: lib/constants.js; lib/config.js; lib/install.js; local runtime inventory `~/.openspec`] |
| DIR-03 | User can run `opsx migrate --dry-run` to preview the full `openspec/` to `.opsx/` migration mapping without writing files. | The existing CLI only prints a Phase 1 placeholder, so Phase 2 needs a reusable preflight plan object plus a formatter that performs zero writes in dry-run mode. [VERIFIED: lib/cli.js; scripts/test-workflow-runtime.js; 02-CONTEXT.md] |
| DIR-04 | User can run `opsx migrate` to move project config, changes, specs, archive, and change metadata into the `.opsx/` layout. | Repo state already contains `openspec/config.yaml` and four `openspec/changes/*` trees with `.openspec.yaml`, `proposal.md`, `design.md`, `tasks.md`, optional `security-review.md`, and `specs/**`; the planner must preserve these verbatim while moving them. [VERIFIED: find openspec inventory; openspec/config.yaml] |
| DIR-05 | Migration renames per-change `.openspec.yaml` files to `change.yaml` and creates missing `state.yaml`, `context.md`, `drift.md`, and `.opsx/active.yaml` defaults. | The repo already ships a `change-metadata.yaml` template and a minimal YAML/stringify stack; Phase 2 should reuse those and add conservative state/context/drift scaffold writers rather than inventing Phase 4 data. [VERIFIED: templates/project/change-metadata.yaml.tmpl; lib/yaml.js; 02-CONTEXT.md] |
| DIR-06 | Migration aborts by default when `.opsx/` already exists and requires explicit merge intent before combining directories. | Default-abort behavior is necessary because dry-run and execute currently do not exist, `.gitignore` already anticipates `.opsx/`, and user-local `~/.openspec` state proves upgrade paths can have pre-existing legacy installs. [VERIFIED: 02-CONTEXT.md; .gitignore; local runtime inventory `~/.openspec`] |
| DIR-07 | Git ignore guidance preserves tracked `.opsx/` workflow artifacts while ignoring `.opsx/cache/`, `.opsx/tmp/`, and `.opsx/logs/`. | Current `.gitignore` explicitly re-includes `openspec/changes/**` and `.planning/**` only, so Phase 2 must replace or supplement that with ordered `.opsx` patterns and matching docs. [VERIFIED: .gitignore; gitignore docs] |
</phase_requirements>

## Summary

Phase 2 is not only a repo-folder rename. The current codebase still hardcodes `openspec/`, `.openspec.yaml`, `~/.openspec`, and `.opsx-config.yaml` in runtime loaders, install/check flows, and tests, while README and customization docs already describe `.opsx/config.yaml` and `change.yaml` as the future truth. Planning has to treat constants, migration execution, scaffolds, docs, and regression coverage as one coordinated change set or the repository will remain internally contradictory. [VERIFIED: lib/constants.js; lib/config.js; lib/install.js; lib/runtime-guidance.js; scripts/test-workflow-runtime.js; README.md; docs/customization.md]

The safest implementation shape is a two-phase migration service: first build an immutable migration plan from detected legacy state, then either print that plan unchanged for `--dry-run` or execute it after preflight passes. Node’s built-in `fs.renameSync()`, `fs.mkdirSync({ recursive: true })`, `fs.rmSync()`, and `path.relative()` are sufficient for this phase, so no new runtime dependency is justified. [CITED: https://nodejs.org/api/fs.html#fsrenamesyncoldpath-newpath] [CITED: https://nodejs.org/api/fs.html#fsmkdirsyncpath-options] [CITED: https://nodejs.org/api/fs.html#fsrmsyncpath-options] [CITED: https://nodejs.org/api/path.html#pathrelativefrom-to] [VERIFIED: package.json; lib/fs-utils.js; lib/yaml.js]

The most important planning wrinkle is legacy global state. This machine already has `~/.openspec/.opsx-config.yaml`, `~/.openspec/manifests/*.manifest`, `~/.openspec/commands/openspec.md`, and `~/.openspec/skills/openspec/**`; if Phase 2 only flips constants to `~/.opsx` without a migration or compatibility detection path, `opsx check`, reinstall, and uninstall will lose visibility into existing installs. [VERIFIED: local runtime inventory `~/.openspec`; lib/config.js; lib/install.js]

**Primary recommendation:** plan Phase 2 around a dedicated `lib/migrate.js` service that builds one preflight plan for repo and shared-home moves, reuses it for dry-run and execute, and creates only minimal missing `.opsx/active.yaml`, `state.yaml`, `context.md`, and `drift.md` scaffolds after all moves succeed. [VERIFIED: 02-CONTEXT.md; lib/cli.js; lib/install.js; lib/runtime-guidance.js]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| `opsx migrate` argument handling and mode dispatch | CLI / Local Runtime | Filesystem / Storage | `bin/opsx.js` and `lib/cli.js` already own command parsing, but real work should be delegated out of the CLI into a migration service. [VERIFIED: bin/opsx.js; lib/cli.js; 02-CONTEXT.md] |
| Canonical project workspace resolution (`openspec/` -> `.opsx/`) | Filesystem / Storage | CLI / Local Runtime | The primary responsibility is file discovery, move ordering, conflict checks, and scaffold creation inside the repo tree. [VERIFIED: openspec/config.yaml; find openspec inventory; 02-CONTEXT.md] |
| Canonical shared-home resolution (`~/.openspec/` -> `~/.opsx/`) | Filesystem / Storage | CLI / Local Runtime | Existing install state lives in the user home and is consumed by `config.js` and `install.js`, so path migration/detection belongs to storage-first logic. [VERIFIED: lib/config.js; lib/install.js; local runtime inventory `~/.openspec`] |
| Dry-run plan rendering | CLI / Local Runtime | Filesystem / Storage | The plan is filesystem-derived, but its user-facing representation and zero-side-effect guarantee are CLI responsibilities. [VERIFIED: lib/cli.js; 02-CONTEXT.md] |
| Minimal state/context/drift scaffolding | Filesystem / Storage | CLI / Local Runtime | The output is disk state for later phases, so creation belongs in workspace helpers, not in help/status text paths. [VERIFIED: 02-CONTEXT.md; templates/project/change-metadata.yaml.tmpl] |
| Tracked-vs-ignored workspace policy | Repository / VCS | Docs / Guidance | `.gitignore` ordering and matching docs are what make `.opsx/changes/**` trackable while `cache/tmp/logs` stay ignored. [VERIFIED: .gitignore; README.md; docs/customization.md; gitignore docs] |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js runtime | `>=14.14.0` in-project; local machine `v24.8.0` | Execute the CLI, synchronous migration I/O, and regression script. | The package already declares `node >=14.14.0`, and `fs.rmSync()` is available from `v14.14.0`, so the phase can stay inside the supported engine floor. [VERIFIED: package.json; node --version] [CITED: https://nodejs.org/api/fs.html#fsrmsyncpath-options] |
| `node:fs` sync APIs | bundled with Node | Rename legacy files/dirs, create missing directories, remove stale temp targets, and test for existence. | `fs.renameSync()`, `fs.mkdirSync()`, `fs.existsSync()`, and `fs.rmSync()` cover the exact move/create/remove primitives needed for deterministic migration without adding `fs-extra`. [CITED: https://nodejs.org/api/fs.html#fsrenamesyncoldpath-newpath] [CITED: https://nodejs.org/api/fs.html#fsmkdirsyncpath-options] [CITED: https://nodejs.org/api/fs.html#fsexistssyncpath] [CITED: https://nodejs.org/api/fs.html#fsrmsyncpath-options] |
| `node:path` | bundled with Node | Build canonical paths, normalize destination layout, and enforce containment checks with `path.relative()`. | The current repo already uses `path.join()` everywhere, and `path.relative()` is the standard containment primitive for rejecting escapes before mutation. [VERIFIED: lib/constants.js; lib/config.js; lib/install.js; lib/runtime-guidance.js] [CITED: https://nodejs.org/api/path.html#pathjoinpaths] [CITED: https://nodejs.org/api/path.html#pathrelativefrom-to] |
| `lib/fs-utils.js` | repo-local | Reusable `ensureDir`, `writeText`, `copyDir`, `removePath`, and `listFiles` helpers. | The helper module already centralizes the project’s file-writing style and should be reused rather than open-coding more ad hoc filesystem loops. [VERIFIED: lib/fs-utils.js] |
| `lib/yaml.js` | repo-local | Parse legacy `config.yaml` / `.openspec.yaml` and write new `config.yaml`, `change.yaml`, `active.yaml`, and `state.yaml`. | The current config and template shapes are simple and already flow through this module, so Phase 2 can stay dependency-free unless real YAML incompatibilities are discovered. [VERIFIED: lib/yaml.js; lib/config.js; templates/project/config.yaml.tmpl; templates/project/change-metadata.yaml.tmpl] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `assert` + `child_process.spawnSync` | bundled with Node | CLI integration assertions and temp-fixture smoke coverage. | Extend `scripts/test-workflow-runtime.js` instead of creating a second test harness. [VERIFIED: scripts/test-workflow-runtime.js] |
| `scripts/test-workflow-runtime.js` | repo-local | Existing temp-repo/temp-home runtime fixture harness. | Reuse for dry-run, execute, conflict-abort, and shared-home migration scenarios. [VERIFIED: scripts/test-workflow-runtime.js] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Node built-ins + `lib/fs-utils.js` | `fs-extra@11.3.4` | `fs-extra` is current and mature, but Phase 2 already has enough local primitives and the context explicitly says no new runtime dependency unless absolutely required. [VERIFIED: lib/fs-utils.js; 02-CONTEXT.md] [VERIFIED: npm registry] |
| Current tiny CLI parser | `commander@14.0.3` or `minimist@1.2.8` | Both are current, but Phase 2 only needs one subcommand plus `--dry-run`; replacing the parser would increase surface area without addressing migration correctness. [VERIFIED: lib/cli.js; 02-CONTEXT.md] [VERIFIED: npm registry] |
| `lib/yaml.js` | `yaml@2.8.3` | `yaml` is more complete, but the repo already reads and writes the exact shapes Phase 2 needs; switching parser libraries mid-migration would add risk without a demonstrated parser bug. [VERIFIED: lib/yaml.js; lib/config.js; openspec/config.yaml] [VERIFIED: npm registry] |

**Installation:**
```bash
# No new runtime dependencies are recommended for Phase 2.
npm install
```

**Version verification:** No new package is recommended for Phase 2 implementation; current alternative-package registry checks are `fs-extra@11.3.4` (modified 2026-03-03), `yaml@2.8.3` (modified 2026-03-21), `commander@14.0.3` (modified 2026-04-24), and `minimist@1.2.8` (modified 2026-03-06). [VERIFIED: npm registry]

## Architecture Patterns

### System Architecture Diagram

```text
User / CI
  |
  v
bin/opsx.js
  |
  v
lib/cli.js
  |
  +--> createMigrationPlan(options)
  |       |
  |       +--> discoverLegacyProjectState (openspec/, .openspec.yaml)
  |       |
  |       +--> discoverLegacyGlobalState (~/.openspec/)
  |       |
  |       +--> validateSourcesAndConflicts
  |       |
  |       '--> ordered operations[]
  |
  +--> --dry-run
  |       |
  |       '--> renderPlanToStdout
  |
  '--> execute
          |
          +--> applyMoveOperations
          |
          +--> createMissingScaffolds
          |
          '--> summarizeResult / update check output

Filesystem boundaries:
  openspec/ ------------------------------> .opsx/
  ~/.openspec/ ---------------------------> ~/.opsx/
```

The diagram is prescriptive: discovery and validation happen before mutation, and both dry-run and execute consume the same ordered plan so they cannot diverge semantically. [VERIFIED: 02-CONTEXT.md; lib/cli.js; lib/install.js; lib/runtime-guidance.js]

### Recommended Project Structure

```text
lib/
├── cli.js          # parse args and dispatch commands only
├── migrate.js      # build, validate, print, and execute migration plans
├── workspace.js    # canonical .opsx path helpers and minimal scaffold writers
├── config.js       # global/project config read-write helpers
├── fs-utils.js     # shared filesystem primitives
└── yaml.js         # config and state serialization
```

Keeping migration logic in `lib/migrate.js` and scaffold logic in a small helper module matches the discretion note that migration code should not be buried in `lib/cli.js`. [VERIFIED: 02-CONTEXT.md; lib/cli.js]

### Pattern 1: Immutable Migration Plan
**What:** Build a plan object containing `moves[]`, `creates[]`, `warnings[]`, and `abortReason` before any write. [VERIFIED: 02-CONTEXT.md]

**When to use:** For both `opsx migrate --dry-run` and `opsx migrate`. [VERIFIED: 02-CONTEXT.md; lib/cli.js]

**Example:**
```javascript
// Source: Node fs/path docs + project helper conventions
const fs = require('fs');
const path = require('path');

function assertInside(baseDir, targetPath) {
  const relative = path.relative(path.resolve(baseDir), path.resolve(targetPath));
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Refusing to escape base dir: ${targetPath}`);
  }
}

function planMove(sourcePath, targetPath) {
  if (!fs.existsSync(sourcePath)) return null;
  return { type: 'move', sourcePath, targetPath };
}
```
`path.relative()` and `fs.existsSync()` are the stable primitives here; the project already uses the same containment style in `lib/runtime-guidance.js`. [VERIFIED: lib/runtime-guidance.js] [CITED: https://nodejs.org/api/path.html#pathrelativefrom-to] [CITED: https://nodejs.org/api/fs.html#fsexistssyncpath]

### Pattern 2: Moves First, Scaffolds Second
**What:** Execute renames and directory moves first, then create missing `.opsx/active.yaml`, `state.yaml`, `context.md`, and `drift.md` only after the new tree exists. [VERIFIED: 02-CONTEXT.md]

**When to use:** Any execute-mode migration path. [VERIFIED: 02-CONTEXT.md]

**Example:**
```javascript
// Source: Node fs docs + lib/fs-utils.js usage pattern
const fs = require('fs');
const { ensureDir, writeText } = require('./fs-utils');

function createIfMissing(filePath, content) {
  if (fs.existsSync(filePath)) return false;
  ensureDir(require('path').dirname(filePath));
  writeText(filePath, `${content}\n`);
  return true;
}
```
This ordering prevents scaffold generation from colliding with later directory moves or overwriting pre-existing `.opsx` content. [VERIFIED: lib/fs-utils.js; 02-CONTEXT.md] [CITED: https://nodejs.org/api/fs.html#fsexistssyncpath] [CITED: https://nodejs.org/api/fs.html#fsmkdirsyncpath-options]

### Pattern 3: Legacy Detection Without Silent Merge
**What:** Surface `openspec/` and `~/.openspec/` as migration candidates in `opsx check` or migrate output, but abort by default if `.opsx/` already exists. [VERIFIED: 02-CONTEXT.md]

**When to use:** `runCheck()`, migration preflight, and status/help text that references path readiness. [VERIFIED: lib/install.js; lib/cli.js; 02-CONTEXT.md]

**Example:** Print both canonical and legacy locations in diagnostics, but keep execute-mode mutation behind an explicit `migrate` call. [VERIFIED: lib/install.js; 02-CONTEXT.md]

### Anti-Patterns to Avoid
- **Writing during dry-run:** `--dry-run` must not call `writeText()`, `renameSync()`, `mkdirSync()`, or `rmSync()`. [VERIFIED: 02-CONTEXT.md; lib/fs-utils.js]
- **Embedding migration file I/O inside the CLI switch:** keep `lib/cli.js` as dispatch-only, or dry-run/execute logic becomes untestable and hard to reuse. [VERIFIED: lib/cli.js; 02-CONTEXT.md]
- **Auto-merging into an existing `.opsx/`:** Git-style directory merges are explicitly deferred and are riskier than default abort for this phase. [VERIFIED: 02-CONTEXT.md]
- **Inventing Phase 4 state:** `state.yaml`, `context.md`, and `drift.md` must be minimal honest recovery scaffolds, not fake verification logs or transition history. [VERIFIED: 02-CONTEXT.md]
- **Ignoring shared-home legacy state:** switching constants without migrating or reporting `~/.openspec` manifests will strand existing installs. [VERIFIED: lib/install.js; local runtime inventory `~/.openspec`]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Conflict-prone directory merge | A custom recursive auto-merge for existing `.opsx/` content | Default abort now; defer `--merge` to a later explicit phase | Non-trivial merge behavior is already out of scope and is the easiest place to corrupt user state. [VERIFIED: 02-CONTEXT.md] |
| New filesystem abstraction layer | Another ad hoc copy/remove/walk helper | Existing `lib/fs-utils.js` plus Node built-ins | The repo already has the primitives needed for deterministic move + scaffold behavior. [VERIFIED: lib/fs-utils.js; lib/install.js] |
| New YAML dependency or bespoke serializer | A second YAML library or one-off string builder | Existing `lib/yaml.js` and project templates | Phase 2 only needs the current config and scaffold shapes; extra parser churn adds risk during migration. [VERIFIED: lib/yaml.js; templates/project/config.yaml.tmpl; templates/project/change-metadata.yaml.tmpl] |
| New standalone test runner | A separate migration-only test harness | Extend `scripts/test-workflow-runtime.js` | The current harness already builds temp repos and temp homes and invokes `bin/opsx.js`. [VERIFIED: scripts/test-workflow-runtime.js] |

**Key insight:** the risky part of this phase is not path manipulation syntax; it is keeping repo state, shared-home state, dry-run output, docs, and tests coherent across one canonical plan. Reuse the existing helpers and defer merge complexity. [VERIFIED: lib/cli.js; lib/install.js; lib/fs-utils.js; 02-CONTEXT.md]

## Runtime State Inventory

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | Repo workspace currently stores live workflow data under `openspec/config.yaml` and four `openspec/changes/*` directories with `.openspec.yaml`, `proposal.md`, `design.md`, `tasks.md`, optional `security-review.md`, and `specs/**`. The user home currently stores legacy global state under `~/.openspec/.opsx-config.yaml`, `~/.openspec/manifests/*.manifest`, `~/.openspec/commands/openspec.md`, and `~/.openspec/skills/openspec/**`. [VERIFIED: openspec/config.yaml; find openspec inventory; local runtime inventory `~/.openspec`] | **Data migration:** move repo workspace into `.opsx/` and rename per-change `.openspec.yaml` to `change.yaml`. **Data migration or explicit detection:** migrate or explicitly report legacy shared-home state so `check`/`uninstall` do not lose track of installed assets after constants switch. [VERIFIED: lib/config.js; lib/install.js; 02-CONTEXT.md] |
| Live service config | None found; the repo and milestone docs explicitly avoid hosted services, telemetry, or UI-only external configuration, and repo scan found no service-specific config owners for this phase. [VERIFIED: .planning/PROJECT.md; .planning/REQUIREMENTS.md; rg repo scan] | None. [VERIFIED: .planning/PROJECT.md; rg repo scan] |
| OS-registered state | None found; install logic copies files into user directories and manifest files, and no `openspec` or `opsx` launch agent filenames were found under `~/Library/LaunchAgents`. [VERIFIED: lib/install.js; find ~/Library/LaunchAgents scan] | None. Keep platform install state as file-backed manifests, not launchd/system service registrations. [VERIFIED: lib/install.js] |
| Secrets / env vars | No OpenSpec/OpsX-specific env var contract exists; runtime path resolution uses `HOME` only. [VERIFIED: lib/config.js; lib/install.js; rg repo scan] | No rename is needed. Preserve `homeDir` injection in tests so migration does not touch the real user home. [VERIFIED: scripts/test-workflow-runtime.js; lib/install.js] |
| Build artifacts | The package currently runs through `bin/opsx.js`, but test fixtures and installed shared-home artifacts still assert `.openspec` and `.opsx-config.yaml`. The working tree also has an unrelated untracked `openspec/changes/.DS_Store`. [VERIFIED: scripts/test-workflow-runtime.js; git status --short] | **Code edit:** update tests and shared-home path expectations to `.opsx`. **No action:** ignore the unrelated `.DS_Store`; do not let planning assume a clean worktree. [VERIFIED: scripts/test-workflow-runtime.js; git status --short] |

## Common Pitfalls

### Pitfall 1: Constants Flip Without Shared-Home Migration
**What goes wrong:** `opsx check`, reinstall, or uninstall stop seeing existing installs after `SHARED_HOME_NAME` changes from `.openspec` to `.opsx`. [VERIFIED: lib/constants.js; lib/config.js; lib/install.js]

**Why it happens:** manifests and shared skill assets are currently rooted under `~/.openspec`, and `install.js` only looks under the canonical shared home. [VERIFIED: lib/install.js; local runtime inventory `~/.openspec`]

**How to avoid:** include shared-home legacy detection in the migration plan and add regression tests with a temp `homeDir` that starts in the old layout. [VERIFIED: scripts/test-workflow-runtime.js; 02-CONTEXT.md]

**Warning signs:** `opsx check` says config/manifests are missing immediately after upgrading from a machine that still has `~/.openspec/`. [VERIFIED: lib/install.js; local runtime inventory `~/.openspec`]

### Pitfall 2: Dry-Run and Execute Compute Different Mappings
**What goes wrong:** `--dry-run` prints one set of paths, but real execution moves different files or generates extra scaffolds. [VERIFIED: 02-CONTEXT.md]

**Why it happens:** discovery/preflight logic is duplicated in two codepaths instead of being built once and reused. [VERIFIED: 02-CONTEXT.md]

**How to avoid:** make dry-run and execute consume the same plan object, with execute only adding the mutation step. [VERIFIED: 02-CONTEXT.md]

**Warning signs:** tests have to assert separate dry-run and execute path lists because the two outputs are structurally different. [VERIFIED: 02-CONTEXT.md]

### Pitfall 3: Scaffolds Created Before Moves
**What goes wrong:** generated `state.yaml`, `context.md`, or `drift.md` either get overwritten by later directory moves or cause false destination-conflict aborts. [VERIFIED: 02-CONTEXT.md]

**Why it happens:** destination tree creation is mixed with source discovery and file renames. [VERIFIED: 02-CONTEXT.md]

**How to avoid:** finish all file/directory moves first, then create only missing scaffolds in the new tree. [VERIFIED: 02-CONTEXT.md]

**Warning signs:** `.opsx/changes/<name>/` exists before the source `openspec/changes/<name>/` has been moved. [VERIFIED: 02-CONTEXT.md]

### Pitfall 4: `.gitignore` Negation Order Is Wrong
**What goes wrong:** `.opsx/changes/**` stays ignored even though a child negate rule exists. [CITED: https://git-scm.com/docs/gitignore]

**Why it happens:** Git cannot re-include a child when its parent directory is excluded, and pattern order matters. [CITED: https://git-scm.com/docs/gitignore]

**How to avoid:** if you add broad `.opsx/*` ignores, re-include `!.opsx/` before re-including tracked subpaths such as `!.opsx/changes/**`. [CITED: https://git-scm.com/docs/gitignore]

**Warning signs:** `git check-ignore -v .opsx/changes/<name>/proposal.md` reports a parent-directory ignore rule. [CITED: https://git-scm.com/docs/gitignore]

### Pitfall 5: Runtime Guidance Still Reads Legacy Paths
**What goes wrong:** docs and migration say `.opsx`, but status/runtime helpers still load `openspec/config.yaml` and `.openspec.yaml`. [VERIFIED: lib/runtime-guidance.js; docs/customization.md]

**Why it happens:** `lib/runtime-guidance.js` currently hardcodes `openSpecDir` and `changeConfigPath` to legacy names. [VERIFIED: lib/runtime-guidance.js]

**How to avoid:** update path resolution in runtime loaders during Phase 2, but stop at minimal truthful behavior rather than implementing Phase 4 state transitions. [VERIFIED: lib/runtime-guidance.js; 02-CONTEXT.md]

**Warning signs:** `opsx status` or future skill/runtime helpers continue to mention `openspec/` after migration completes. [VERIFIED: lib/runtime-guidance.js; skills/opsx/SKILL.md]

## Code Examples

Verified patterns from official sources:

### Path Containment Guard
```javascript
// Source: https://nodejs.org/api/path.html#pathrelativefrom-to
const path = require('path');

function ensureInside(baseDir, targetPath) {
  const relative = path.relative(path.resolve(baseDir), path.resolve(targetPath));
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Path escapes base dir: ${targetPath}`);
  }
}
```
This matches the containment approach already used in `lib/runtime-guidance.js`. [VERIFIED: lib/runtime-guidance.js] [CITED: https://nodejs.org/api/path.html#pathrelativefrom-to]

### Deterministic Move + Create
```javascript
// Source: https://nodejs.org/api/fs.html#fsrenamesyncoldpath-newpath
// Source: https://nodejs.org/api/fs.html#fsmkdirsyncpath-options
const fs = require('fs');
const path = require('path');

function moveThenCreate(sourcePath, targetPath, scaffoldPath, scaffoldContent) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.renameSync(sourcePath, targetPath);
  if (!fs.existsSync(scaffoldPath)) {
    fs.mkdirSync(path.dirname(scaffoldPath), { recursive: true });
    fs.writeFileSync(scaffoldPath, `${scaffoldContent}\n`, 'utf8');
  }
}
```
The example is intentionally simple: plan first, then move, then create only if missing. [CITED: https://nodejs.org/api/fs.html#fsrenamesyncoldpath-newpath] [CITED: https://nodejs.org/api/fs.html#fsmkdirsyncpath-options] [CITED: https://nodejs.org/api/fs.html#fsexistssyncpath]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Mixed legacy global path: `~/.openspec/.opsx-config.yaml` | Canonical global path: `~/.opsx/config.yaml` | Locked in Phase 2 context on 2026-04-27 | `config.js`, `install.js`, manifests, and any shared-home migration/detection logic must move together. [VERIFIED: 02-CONTEXT.md; lib/constants.js; lib/config.js; lib/install.js] |
| Legacy repo workspace: `openspec/config.yaml` + `openspec/changes/*/.openspec.yaml` | Canonical repo workspace: `.opsx/config.yaml` + `.opsx/changes/*/change.yaml` | Locked in Phase 2 context on 2026-04-27 | Runtime loaders, templates, docs, and tests must stop reading old names after migration. [VERIFIED: 02-CONTEXT.md; lib/runtime-guidance.js; templates/project/change-metadata.yaml.tmpl; docs/customization.md] |
| Truthful Phase 1 placeholder for `opsx migrate` | Real dry-run + execute migration flow | Required by DIR-03 through DIR-06 in Phase 2 | `lib/cli.js` must delegate to a migration service and tests must replace placeholder assertions. [VERIFIED: lib/cli.js; scripts/test-workflow-runtime.js; .planning/REQUIREMENTS.md] |
| No per-change runtime recovery artifacts | Minimal honest `active.yaml`, `state.yaml`, `context.md`, and `drift.md` scaffolds | Locked in Phase 2 context on 2026-04-27 | Phase 2 seeds later phases without pretending the full state machine already exists. [VERIFIED: 02-CONTEXT.md; .planning/ROADMAP.md] |

**Deprecated/outdated:**
- `.opsx-config.yaml` as the global config filename is outdated and should be replaced by `config.yaml`. [VERIFIED: lib/constants.js; 02-CONTEXT.md]
- `.openspec.yaml` as per-change metadata is outdated and should migrate to `change.yaml`. [VERIFIED: find openspec inventory; 02-CONTEXT.md]
- `openspec/` as the canonical project workspace is outdated after Phase 2 and should remain only as migration/history context. [VERIFIED: 02-CONTEXT.md; .planning/ROADMAP.md]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| None | All claims in this research were verified from local repo/runtime state, official docs, or npm registry checks. [VERIFIED: local files; local commands; official docs; npm registry] | — | — |

## Open Questions (RESOLVED)

1. **RESOLVED: How much of `~/.openspec/` should `opsx migrate` move versus only detect?** [VERIFIED: 02-CONTEXT.md; local runtime inventory `~/.openspec`]
   - What we know: Phase 2 makes `~/.opsx/` canonical, and this machine already has legacy config, manifests, shared commands, skills, and backups under `~/.openspec/`. [VERIFIED: 02-CONTEXT.md; local runtime inventory `~/.openspec`]
   - What's unclear: the success criteria explicitly describe project-tree moves, but do not enumerate whether `commands/` and `backups/` under the shared home should also migrate. [VERIFIED: .planning/ROADMAP.md; lib/install.js]
   - Recommendation: lock a minimum safe scope before planning. The minimum that protects install/uninstall/check continuity is `config.yaml`, `manifests/`, and shared skill/command assets; backups can remain legacy if the planner wants to keep the execute path smaller. [VERIFIED: lib/install.js; local runtime inventory `~/.openspec`]

2. **RESOLVED: Should Phase 2 update `lib/runtime-guidance.js` path resolution now?** [VERIFIED: lib/runtime-guidance.js; 02-CONTEXT.md]
   - What we know: the module still loads `openspec/config.yaml` and `.openspec.yaml`, while docs and the skill already reference `.opsx/config.yaml` and `change.yaml`. [VERIFIED: lib/runtime-guidance.js; docs/customization.md; skills/opsx/SKILL.md]
   - What's unclear: the phase explicitly defers deep status/state-machine semantics, but leaving legacy path resolution in place would keep runtime internals inconsistent with migrated workspaces. [VERIFIED: 02-CONTEXT.md; .planning/ROADMAP.md]
   - Recommendation: update path resolution to the new canonical files in Phase 2, but keep `opsx status` output minimal and truthful so Phase 4 still owns durable stage semantics. [VERIFIED: 02-CONTEXT.md; lib/runtime-guidance.js]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | CLI execution, migration code, runtime tests | ✓ | `v24.8.0` | Package engine floor is `>=14.14.0`; if npm script wrappers fail, run `node scripts/test-workflow-runtime.js` directly. [VERIFIED: node --version; package.json] |
| npm | Script entrypoints and registry verification during planning | ✓ | `11.6.0` | Direct `node` command for local tests; registry verification is optional once planning is complete. [VERIFIED: npm --version; package.json] |
| git | `.gitignore` verification and working-tree checks | ✓ | `2.46.0` | No exact fallback for ignore-rule behavior; manual reasoning is higher risk than `git check-ignore`. [VERIFIED: git --version] |
| `rg` | Fast legacy-path inventory during development | ✓ | `15.1.0` | Use `grep -R` if `rg` is unavailable in another environment. [VERIFIED: rg --version] |

**Missing dependencies with no fallback:**
- None for this phase on the current machine. [VERIFIED: local command audit]

**Missing dependencies with fallback:**
- None that block execution; `rg` is convenience-only. [VERIFIED: local command audit]

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Custom Node test script using built-in `assert` and CLI/temp-fixture integration. [VERIFIED: scripts/test-workflow-runtime.js] |
| Config file | None; the harness is self-contained. [VERIFIED: scripts/test-workflow-runtime.js] |
| Quick run command | `npm run test:workflow-runtime` [VERIFIED: package.json] |
| Full suite command | `npm run test:workflow-runtime` plus targeted migration smoke commands once added. [VERIFIED: package.json; scripts/test-workflow-runtime.js] |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DIR-01 | `.opsx/` layout becomes the canonical repo workspace and scaffolds exist when needed. [VERIFIED: .planning/REQUIREMENTS.md] | integration | `npm run test:workflow-runtime` [VERIFIED: package.json] | ✅ `scripts/test-workflow-runtime.js`; specific migration case missing. [VERIFIED: scripts/test-workflow-runtime.js] |
| DIR-02 | `~/.opsx/` becomes the canonical shared home for config/manifests/skills. [VERIFIED: .planning/REQUIREMENTS.md] | integration | `npm run test:workflow-runtime` [VERIFIED: package.json] | ✅ harness exists; shared-home migration case missing. [VERIFIED: scripts/test-workflow-runtime.js] |
| DIR-03 | `opsx migrate --dry-run` prints mapping and performs zero writes. [VERIFIED: .planning/REQUIREMENTS.md] | integration | `npm run test:workflow-runtime` [VERIFIED: package.json] | ✅ harness exists; dry-run case missing. [VERIFIED: scripts/test-workflow-runtime.js] |
| DIR-04 | `opsx migrate` moves project config, changes, specs, archive, and metadata. [VERIFIED: .planning/REQUIREMENTS.md] | integration | `npm run test:workflow-runtime` [VERIFIED: package.json] | ✅ harness exists; execute case missing. [VERIFIED: scripts/test-workflow-runtime.js] |
| DIR-05 | Metadata becomes `change.yaml` and missing `active/state/context/drift` scaffolds are generated conservatively. [VERIFIED: .planning/REQUIREMENTS.md] | integration | `npm run test:workflow-runtime` [VERIFIED: package.json] | ✅ harness exists; scaffold-assertion case missing. [VERIFIED: scripts/test-workflow-runtime.js] |
| DIR-06 | Existing `.opsx/` causes default abort and no silent merge. [VERIFIED: .planning/REQUIREMENTS.md] | integration | `npm run test:workflow-runtime` [VERIFIED: package.json] | ✅ harness exists; conflict-abort case missing. [VERIFIED: scripts/test-workflow-runtime.js] |
| DIR-07 | `.gitignore` and docs distinguish tracked `.opsx` artifacts from ignored cache/tmp/logs. [VERIFIED: .planning/REQUIREMENTS.md] | integration + manual VCS check | `npm run test:workflow-runtime` plus `git check-ignore -v ...` [VERIFIED: package.json; gitignore docs] | ✅ repo has `.gitignore`; ❌ dedicated assertion case missing. [VERIFIED: .gitignore; scripts/test-workflow-runtime.js] |

### Sampling Rate
- **Per task commit:** `npm run test:workflow-runtime` after each migration-service or path-constant slice. [VERIFIED: package.json]
- **Per wave merge:** `npm run test:workflow-runtime` plus fixture-based `opsx migrate --dry-run` and execute smoke coverage on temp repos/homes. [VERIFIED: scripts/test-workflow-runtime.js; 02-CONTEXT.md]
- **Phase gate:** Full migration coverage green, `opsx check` reflects canonical and legacy-candidate paths truthfully, and `.gitignore` patterns verify with `git check-ignore`. [VERIFIED: lib/install.js; .gitignore; gitignore docs]

### Wave 0 Gaps
- [ ] Add a helper that creates both legacy repo state (`openspec/`) and legacy shared-home state (`~/.openspec/`) in temp fixtures. [VERIFIED: scripts/test-workflow-runtime.js; local runtime inventory `~/.openspec`]
- [ ] Add `opsx migrate --dry-run` assertions for exact mapping output and zero-write guarantees. [VERIFIED: lib/cli.js; .planning/REQUIREMENTS.md]
- [ ] Add execute-mode assertions for moved paths, renamed `change.yaml`, and generated `active/state/context/drift` files. [VERIFIED: .planning/REQUIREMENTS.md; 02-CONTEXT.md]
- [ ] Add conflict-abort assertions when `.opsx/` already exists before migrate runs. [VERIFIED: .planning/REQUIREMENTS.md; 02-CONTEXT.md]
- [ ] Add `.gitignore` verification for tracked `.opsx/changes/**` and ignored `.opsx/cache|tmp|logs/**`. [VERIFIED: .gitignore; .planning/REQUIREMENTS.md; gitignore docs]

## Security Domain

This phase is local-file migration work, not networked application logic, so the relevant security concerns are path containment, overwrite prevention, and honest handling of incomplete or conflicting state. [VERIFIED: lib/runtime-guidance.js; lib/install.js; 02-CONTEXT.md]

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No authentication surface is introduced by this phase. [VERIFIED: .planning/ROADMAP.md; .planning/REQUIREMENTS.md] |
| V3 Session Management | no | No session concept exists in this CLI migration phase. [VERIFIED: .planning/ROADMAP.md; .planning/REQUIREMENTS.md] |
| V4 Access Control | no | The phase is local filesystem orchestration, not user/role authorization. [VERIFIED: .planning/ROADMAP.md; .planning/REQUIREMENTS.md] |
| V5 Input Validation | yes | Reuse change/path validation patterns (`path.relative`, safe names, existence checks) before any move or scaffold write. [VERIFIED: lib/runtime-guidance.js] [CITED: https://nodejs.org/api/path.html#pathrelativefrom-to] [CITED: https://nodejs.org/api/fs.html#fsexistssyncpath] |
| V6 Cryptography | no | No cryptographic primitive is introduced or required. [VERIFIED: .planning/ROADMAP.md; .planning/REQUIREMENTS.md] |

### Known Threat Patterns for Node CLI Filesystem Migration

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Path traversal through crafted change names or destination paths | Tampering / Elevation of Privilege | Normalize with `path.resolve()` and reject any `path.relative()` that escapes the approved base directory. [VERIFIED: lib/runtime-guidance.js] [CITED: https://nodejs.org/api/path.html#pathrelativefrom-to] |
| Overwriting existing `.opsx/` content silently | Tampering | Preflight destination conflicts and abort by default unless a later explicit merge flow is designed. [VERIFIED: 02-CONTEXT.md] |
| Partial migration leaving repo/home in split state | Tampering / Denial of Service | Build the full plan first, fail before mutation on any conflict, and create scaffolds only after all moves complete. [VERIFIED: 02-CONTEXT.md] |
| Misleading dry-run output that hides real execute behavior | Repudiation | Reuse the exact same operation plan for dry-run display and execute-mode mutation. [VERIFIED: 02-CONTEXT.md] |

## Sources

### Primary (HIGH confidence)
- Local phase inputs: `.planning/phases/02-opsx-workspace-and-migration/02-CONTEXT.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/STATE.md`, `.planning/phases/01-opsx-naming-and-cli-surface/01-CONTEXT.md`. [VERIFIED: local files]
- Local implementation files: `lib/constants.js`, `lib/config.js`, `lib/cli.js`, `lib/install.js`, `lib/fs-utils.js`, `lib/yaml.js`, `lib/runtime-guidance.js`, `lib/workflow.js`, `scripts/test-workflow-runtime.js`, `.gitignore`, `openspec/config.yaml`, `templates/project/config.yaml.tmpl`, `templates/project/change-metadata.yaml.tmpl`, `README.md`, `docs/customization.md`, `docs/runtime-guidance.md`, `package.json`. [VERIFIED: local files]
- Local runtime and environment evidence: `node --version`, `npm --version`, `git --version`, `rg --version`, `npm run test:workflow-runtime`, `git status --short`, `find openspec ...`, `find ~/.openspec ...`, `find ~/.opsx ...`, `find ~/Library/LaunchAgents ...`. [VERIFIED: local command output]
- Official Node docs: `fs.renameSync`, `fs.mkdirSync`, `fs.existsSync`, `fs.rmSync`, `path.join`, `path.relative`. [CITED: https://nodejs.org/api/fs.html#fsrenamesyncoldpath-newpath] [CITED: https://nodejs.org/api/fs.html#fsmkdirsyncpath-options] [CITED: https://nodejs.org/api/fs.html#fsexistssyncpath] [CITED: https://nodejs.org/api/fs.html#fsrmsyncpath-options] [CITED: https://nodejs.org/api/path.html#pathjoinpaths] [CITED: https://nodejs.org/api/path.html#pathrelativefrom-to]
- Official Git docs: `.gitignore` negation and parent-directory behavior. [CITED: https://git-scm.com/docs/gitignore]

### Secondary (MEDIUM confidence)
- npm registry version checks for `fs-extra`, `yaml`, `commander`, and `minimist` alternatives. [VERIFIED: npm registry]

### Tertiary (LOW confidence)
- None. [VERIFIED: source audit]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - the phase uses the project’s existing Node runtime, local helper modules, and official filesystem/path APIs rather than a fast-moving external framework. [VERIFIED: package.json; lib/fs-utils.js; lib/yaml.js; official Node docs]
- Architecture: HIGH - the context locks the migration behavior, and the current repo/runtime inventory clearly shows the required touchpoints. [VERIFIED: 02-CONTEXT.md; lib/config.js; lib/install.js; lib/runtime-guidance.js; local runtime inventory]
- Pitfalls: HIGH - the main failure modes are already visible in current code and local legacy state, especially the shared-home coupling and `.gitignore` ordering rules. [VERIFIED: lib/install.js; .gitignore; local runtime inventory `~/.openspec`; gitignore docs]

**Research date:** 2026-04-27  
**Valid until:** 2026-05-27 unless Phase 2 implementation lands earlier or the shared-home layout changes during planning. [VERIFIED: local repo state]
