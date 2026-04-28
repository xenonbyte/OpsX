# Phase 8: Stability, JSON, and Release Coverage - Research

**Researched:** 2026-04-29  
**Domain:** CLI status JSON hardening, path/glob stabilization, regression-suite split, and release preflight coverage  
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

Copied from `.planning/phases/08-stability-json-and-release-coverage/08-CONTEXT.md`. [VERIFIED: repo code]

### Locked Decisions

### `opsx status --json` Contract
- **D-01:** `opsx status --json` must emit a complete JSON envelope, not just the active change status. The envelope should include at least `ok`, `version`, `command`, `workspace`, `migration`, `activeChange`, `changeStatus`, `warnings`, and `errors`.
- **D-02:** Expected workflow states such as missing workspace, missing active change, warnings, blocked state, or migration candidates should exit `0` in `--json` mode and be expressed inside the JSON envelope.
- **D-03:** stdout must contain only parseable JSON for `opsx status --json`. stderr is reserved for true exceptional failures such as invalid CLI arguments, filesystem read failures, or internal exceptions.
- **D-04:** `migration` in the status envelope should include summary plus diagnostic fields: canonical/legacy root presence, `pendingMoves`, `pendingCreates`, `abortReason`, and `legacyCandidates[]`. It should not embed the full `opsx migrate --dry-run` move/create mapping.

### Path and Glob Stability
- **D-05:** Phase 8 may introduce an additional path/glob dependency, but the research step must validate Node `>=14.14.0` compatibility, maintenance state, API stability, and fit with existing `picomatch@4.0.4` before locking a package/version.
- **D-06:** Planning should prefer a centralized path/glob utility layer rather than continuing to grow isolated helpers. Candidate modules may include `lib/path-utils.js` and `lib/glob-utils.js`.
- **D-07:** The stabilization scope covers all artifact/path-related runtime surfaces: `runtime-guidance` artifact matching, `change-artifacts` hashing, `migrate` path guards, `sync` canonical spec path guards, `path-scope` allowed/forbidden matching, and test fixtures for glob-special path cases.
- **D-08:** Utilities should provide canonical path normalization, safe base containment checks, glob-special escaping, safe glob pattern construction, and predictable glob artifact output parsing.

### Test Suite Organization
- **D-09:** Phase 8 should split the current monolithic runtime test coverage into multiple topic-focused scripts, while preserving a single release-ready total entrypoint.
- **D-10:** `npm test` should become the release/preflight total entrypoint. `npm run test:workflow-runtime` should remain available as a compatibility or runtime-focused entrypoint.
- **D-11:** The existing `scripts/test-workflow-runtime.js` should be split cleanly in Phase 8, not merely wrapped. Planning must decompose the split into reviewable steps to avoid one giant risky rewrite.
- **D-12:** Test scripts should cover command/package metadata, command generation parity, migration, state machine, spec review, TDD checkpointing, path guards, archive blocking, status JSON, and release smoke checks.

### Release Verification Gate
- **D-13:** Phase 8 final verification must run the complete release gate: `npm test`, CLI `--help` / `--version` / `check` / `doc` / `status` / `status --json` smoke tests, generated command parity, legacy public-surface grep, package dry-run, schema drift, code review, and final phase verification.
- **D-14:** Package dry-run must use `npm pack --dry-run --json` so package contents, metadata, bin mapping, README, command files, skills, schemas, templates, config, and docs can be asserted without publishing.
- **D-15:** Release-facing documentation should be updated as part of Phase 8. At minimum, planning should consider `CHANGELOG.md`, release checklist material, and README sections affected by `status --json`, path/glob stability, and test/release commands.

### Carry-Forward Constraints
- **D-16:** Preserve the hard clean break: do not reintroduce legacy public entrypoints or standalone `$opsx`.
- **D-17:** Preserve Node `>=14.14.0` compatibility unless a later explicit release decision changes the engine floor.
- **D-18:** Keep implementation library-first. Phase 8 hardens CLI/status helpers, utilities, and tests; it should not turn the Node CLI into a full workflow runner.
- **D-19:** Generated commands remain source-of-truth driven through `lib/workflow.js`, `lib/generator.js`, and templates; do not hand-edit generated files as the primary fix.

### the agent's Discretion
- Exact JSON field ordering is left to the implementation, but it should be deterministic in tests.
- Exact dependency choice for path/glob utilities is left to Phase 8 research, provided it satisfies Node `>=14.14.0`.
- Exact test-file names are left to planning, provided the suite is split by meaningful topic and `npm test` remains the total entrypoint.

### Deferred Ideas (OUT OF SCOPE)

None - discussion stayed within Phase 8 scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| QUAL-05 | `opsx status --json` writes clean JSON to stdout without spinner/progress noise. | `lib/runtime-guidance.js` already exposes structured `buildStatus()`, `lib/migrate.js` already exposes structured `getMigrationStatus()`, but `lib/cli.js` still renders only text and ignores `--json`, so Phase 8 should add a thin CLI JSON adapter instead of a second status engine. [VERIFIED: repo code; local command output] |
| QUAL-06 | Path and glob utilities canonicalize artifact paths, escape glob-special paths, and handle glob artifact outputs predictably. | Path normalization and containment checks are duplicated across `lib/runtime-guidance.js`, `lib/migrate.js`, `lib/sync.js`, `lib/path-scope.js`, and `lib/change-artifacts.js`, so planning should centralize them before broadening fixtures. [VERIFIED: repo code] |
| TEST-01 | Tests verify package/bin metadata only exposes `@xenonbyte/opsx` and `opsx`. | `package.json` already exposes only `@xenonbyte/opsx` and `bin/opsx.js`, and `npm_config_cache=.npm-cache npm pack --dry-run --json` confirms the tarball ships `bin/opsx.js` without legacy top-level binaries, so the missing work is durable release assertions, not package surgery. [VERIFIED: package.json; local command output] |
| TEST-02 | Tests verify command generation only exposes `/opsx-*` and `$opsx-*` public entrypoints. | `scripts/test-workflow-runtime.js` already contains parity and banned-surface assertions, so Phase 8 should preserve these checks while moving them into a topic-specific script. [VERIFIED: repo code; local command output] |
| TEST-03 | Tests cover migration, state-machine transitions, artifact hash drift, resume/continue behavior, and status JSON output. | The current monolith already covers migration, state, drift, and resume/continue and passes `109 test(s)`, but it has no `status --json` assertions yet. [VERIFIED: repo code; local command output] |
| TEST-04 | Tests cover spec-split review, hidden requirement detection, TDD-light warnings/blocks, allowed/forbidden path checks, and archive blocking. | The current monolith already covers spec review, TDD-light, path-scope, verify/sync/archive, and batch gates, so the planning risk is losing coverage during the split rather than inventing new assertions. [VERIFIED: repo code; local command output] |
</phase_requirements>

## Project Constraints (from AGENTS.md)

- Read `openspec/config.yaml` for project context and workflow defaults. [VERIFIED: repo code]
- Keep change artifacts under `openspec/changes/` in repo-authored guidance. [VERIFIED: repo code]
- For Codex, use explicit `$opsx-*` routes; do not reintroduce standalone `$opsx`. [VERIFIED: repo code]
- Keep `security-review.md` between `design.md` and `tasks.md` when required or recommended. [VERIFIED: repo code]
- Run `spec checkpoint` before `tasks`, `task checkpoint` before `apply`, and `execution checkpoint` after each top-level task group. [VERIFIED: repo code]
- Keep `proposal.md`, `specs/`, `design.md`, and `tasks.md` aligned when workflow behavior changes. [VERIFIED: repo code]
- No repo-root `CLAUDE.md` exists, so there are no extra project-local directives beyond `AGENTS.md`. [VERIFIED: repo code]

## Summary

Phase 8 is not missing primitives; it is missing adapters, consolidation, and release framing. The repo already has a structured runtime status object in `buildStatus()`, structured migration diagnostics in `getMigrationStatus()`, a Node-14-compatible matcher dependency in `picomatch@4.0.4`, and a 109-test regression harness. The current gaps are that `lib/cli.js` still treats `status` as text-only, `--json` is not a recognized boolean flag, path/glob logic is duplicated across multiple modules, `package.json` still has no `test` script, and the current tarball/release checks are not first-class assertions. [VERIFIED: repo code; npm registry; local command output]

The recommended dependency choice is: do not add a new filesystem glob library in Phase 8. Keep `picomatch@4.0.4` as the only shipped matcher backend, add a repo-local `lib/path-utils.js` plus `lib/glob-utils.js`, and refactor call sites onto that layer. `fast-glob@3.3.3` is compatible with Node 14 and CommonJS but brings a second matcher stack through `micromatch`; `tinyglobby@0.2.16` is lighter and has a `require` export, but it still adds a new filesystem traversal layer to problems the repo already solves with `listFiles()` and targeted containment checks. `glob@13.0.6` and `globby@16.2.0` are currently incompatible with the repo’s `>=14.14.0` engine floor. [VERIFIED: repo code; npm registry] [CITED: https://github.com/mrmlnc/fast-glob] [CITED: https://github.com/superchupudev/tinyglobby/blob/main/README.md]

The planning shape should therefore be incremental: first establish a shared test/helper seam and the future `npm test` total entrypoint, then implement `status --json`, then centralize path/glob behavior surface-by-surface, then split the monolith into topic scripts while keeping `npm run test:workflow-runtime` as a compatibility entrypoint, and only then lock the release gate and docs. This order minimizes semantic drift and avoids trying to debug a new JSON contract, a new path layer, and a new test topology at the same time. [VERIFIED: repo code; local command output]

**Primary recommendation:** plan Phase 8 around “no new glob package, one shared path/glob utility layer, topic-split tests behind `npm test`, and a release gate that asserts tarball contents with `npm pack --dry-run --json` using a repo-local npm cache.” [VERIFIED: repo code; npm registry; local command output] [CITED: https://docs.npmjs.com/cli/v11/commands/npm-pack/]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| `opsx status --json` envelope and stdout/stderr/exit discipline | API / Backend | Database / Storage | `lib/cli.js` owns argv parsing and process I/O, while `lib/runtime-guidance.js` and `lib/change-store.js` already provide the disk-backed status truth it should serialize. [VERIFIED: repo code] |
| Migration diagnostics inside JSON status | API / Backend | Database / Storage | `lib/migrate.js` already computes canonical/legacy root presence, pending operations, and abort state from the filesystem; the CLI should reuse it rather than duplicate it. [VERIFIED: repo code] |
| Path normalization, containment, and glob escaping | API / Backend | Database / Storage | These helpers gate reads and writes over `.opsx/**`, change artifacts, and sync targets; they belong in shared library code, not in individual command branches. [VERIFIED: repo code] |
| Topic-split regression scripts and `npm test` entrypoint | CDN / Static | API / Backend | `package.json` and `scripts/**` define the release-facing test surface, while the actual assertions still execute against backend runtime modules. [VERIFIED: repo code] |
| Generated command parity and legacy public-surface release gate | CDN / Static | API / Backend | `lib/generator.js`, checked-in `commands/**`, README/docs, and grep/pack assertions define what the published package exposes publicly. [VERIFIED: repo code; local command output] |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js runtime | project floor `>=14.14.0`; local `v24.8.0` | Runs the CommonJS CLI, filesystem helpers, and regression scripts. | Phase 8 must preserve the existing engine floor, and the current machine already exceeds it. [VERIFIED: package.json; local command output] |
| `picomatch` | `4.0.4`, published `2026-03-23` | Single matcher backend for path/glob semantics over normalized relative paths. | Already shipped, already used by `lib/path-scope.js`, current on npm, and compatible with Node `>=12`, so it satisfies the project floor without introducing a second glob engine. [VERIFIED: package.json; npm registry; repo code] |
| `yaml` | `2.8.3`, published `2026-03-21` | Existing config/state persistence for `.opsx/*.yaml`. | Phase 8 should not disturb the current persistence layer; this dependency is already pinned and current. [VERIFIED: package.json; npm registry] |
| `lib/path-utils.js` | repo-local new module | Shared path normalization, POSIX conversion, and base-containment helpers. | At least three separate containment helpers and multiple `toUnixPath` variants already exist; centralizing them is the smallest safe refactor. [VERIFIED: repo code] |
| `lib/glob-utils.js` | repo-local new module | Shared glob-literal escaping, pattern construction, and matcher wrappers around `picomatch`. | Phase 8 needs predictable literal handling for artifact names and fixtures, but the repo does not need a second filesystem glob walker. [VERIFIED: repo code; npm registry] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `lib/cli.js` | repo-local | Thin command routing and stdout/stderr behavior. | Add `--json` parsing and envelope serialization here, but keep state logic delegated outward. [VERIFIED: repo code] |
| `lib/runtime-guidance.js` | repo-local | Existing structured per-change status object and read-only drift inspection. | Reuse `buildStatus()` for `changeStatus`; do not create a second lifecycle summary format. [VERIFIED: repo code] |
| `lib/migrate.js` | repo-local | Existing structured migration diagnostics. | Reuse `getMigrationStatus()` for the `migration` JSON block. [VERIFIED: repo code] |
| `scripts/test-workflow-runtime.js` | repo-local | Current 109-test monolith and future compatibility entrypoint. | Keep it as the compatibility/aggregate runner while topic scripts are introduced underneath it. [VERIFIED: repo code; local command output] |
| `npm pack --dry-run --json` | npm CLI 11 | Publish-surface assertion without publishing. | Use this for release gating and tarball inventory checks; it is the canonical way to inspect packed contents. [VERIFIED: local command output] [CITED: https://docs.npmjs.com/cli/v11/commands/npm-pack/] [CITED: https://docs.npmjs.com/cli/v10/commands/npm-publish/] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Repo-local `lib/path-utils.js` + `lib/glob-utils.js` over `picomatch` | `tinyglobby@0.2.16` | `tinyglobby` is Node-14-compatible and lighter than `fast-glob`, and npm metadata shows a `require` export plus `picomatch` dependency, but it still adds a new filesystem traversal layer and packaging surface that Phase 8 does not actually need. [VERIFIED: npm registry] [CITED: https://github.com/superchupudev/tinyglobby/blob/main/README.md] |
| Repo-local utility layer | `fast-glob@3.3.3` | `fast-glob` offers mature sync APIs and an `escapePath()` helper, but it brings five extra dependencies and routes matching through `micromatch`, which would split matcher semantics away from the repo’s existing `picomatch` usage. [VERIFIED: npm registry] [CITED: https://github.com/mrmlnc/fast-glob] |
| Existing Node-14 floor preservation | `glob@13.0.6` or `globby@16.2.0` | Both latest packages currently require newer Node versions than the repo allows, so choosing them would force an engine-floor decision that is explicitly out of scope for Phase 8. [VERIFIED: npm registry] |

**Installation:** No new packages are recommended for the preferred Phase 8 path. [VERIFIED: package.json; npm registry; local command output]

```bash
# Recommended path: keep the current dependency set.
npm run test:workflow-runtime
```

**Version verification:** `picomatch@4.0.4` is current on npm and was published on `2026-03-23`; `yaml@2.8.3` is current on npm and was published on `2026-03-21`; `fast-glob@3.3.3` is current and Node-14-compatible; `tinyglobby@0.2.16` is current and Node-14-compatible; `glob@13.0.6` and `globby@16.2.0` are current but not compatible with the repo’s Node floor. [VERIFIED: npm registry]

## Architecture Patterns

### System Architecture Diagram

```text
CLI argv
  |
  v
lib/cli.js
  -> parseArgs()
  -> command === "status"
      -> text mode:
           showStatus()
      -> json mode:
           buildStatusEnvelope()
             -> getMigrationStatus({ cwd, homeDir })
             -> loadActiveChangePointer(cwd)
             -> buildStatus({ repoRoot, homeDir, changeName }) when active change exists
             -> collect warnings/errors
             -> deterministic JSON serialization
  |
  +--> stdout: JSON only for `status --json`
  +--> stderr/non-zero: invalid args, filesystem failures, internal exceptions only

Workspace files / artifact paths
  |
  v
lib/path-utils.js
  -> normalize separators
  -> ensureWithinBase()
  -> relative path canonicalization
  |
  v
lib/glob-utils.js
  -> escape literal glob characters
  -> wrap picomatch options
  -> match predictable sorted file lists
  |
  +--> runtime-guidance artifact matching
  +--> change-artifacts hashing selection
  +--> path-scope allowed/forbidden matching
  +--> migrate/sync canonical path guards

Regression scripts
  |
  +--> topic scripts (`package`, `generation`, `state`, `paths`, `gates`)
  |
  +--> compatibility entrypoint `npm run test:workflow-runtime`
  |
  '--> total entrypoint `npm test`
         -> CLI smokes
         -> parity/grep
         -> pack JSON gate
         -> schema drift / review / verification handoff
```

This architecture keeps responsibilities where they already belong: the CLI owns transport concerns, library modules own state and path truth, and the release gate is assembled from deterministic topic checks instead of one growing script. [VERIFIED: repo code; local command output]

### Recommended Project Structure

```text
lib/
├── cli.js                  # add `--json` status routing only
├── runtime-guidance.js     # reuse existing buildStatus() for `changeStatus`
├── migrate.js              # reuse existing getMigrationStatus() for `migration`
├── path-utils.js           # new shared normalization + containment helpers
├── glob-utils.js           # new shared glob-literal escaping + matcher wrappers
├── path-scope.js           # migrate onto glob-utils wrappers
├── change-artifacts.js     # migrate onto shared path/glob helpers
└── sync.js                 # migrate onto shared containment helpers

scripts/
├── test-workflow-runtime.js    # compatibility entrypoint / aggregate runner
├── test-workflow-shared.js     # extracted fixture/process/helper seam
├── test-workflow-package.js    # TEST-01 + pack/release metadata
├── test-workflow-generation.js # TEST-02 + generated parity + legacy surface bans
├── test-workflow-state.js      # TEST-03 + migration/state/status JSON
├── test-workflow-paths.js      # QUAL-06 + glob-special fixtures
└── test-workflow-gates.js      # TEST-04 + verify/sync/archive/TDD/spec review
```

The key planning point is that `test-workflow-shared.js` should land before the split. The current monolith embeds fixtures, spawn helpers, pack helpers, and parity helpers in one file; extracting the seam first lowers the risk of accidental behavior loss during the topic split. [VERIFIED: repo code; local command output]

### Pattern 1: Treat `status --json` as a Thin Serialization Adapter

**What:** Add a CLI JSON branch that composes existing structured data rather than recomputing workspace, migration, or lifecycle state. [VERIFIED: repo code]

**When to use:** For `opsx status --json` only; keep text `opsx status` behavior separate so Phase 8 does not accidentally regress human-readable guidance. [VERIFIED: repo code; local command output]

**Example:**

```javascript
// Source: lib/cli.js; lib/migrate.js; lib/runtime-guidance.js; lib/change-store.js
const migration = getMigrationStatus({ cwd, homeDir });
const activePointer = loadActiveChangePointer(cwd);
const changeStatus = activePointer.activeChange
  ? buildStatus({ repoRoot: cwd, homeDir, changeName: activePointer.activeChange })
  : null;

const envelope = {
  ok: /* command transport succeeded; domain readiness lives below */,
  version: PACKAGE_VERSION,
  command: 'status',
  workspace: { /* initialized / active pointer summary */ },
  migration,
  activeChange: activePointer.activeChange || null,
  changeStatus,
  warnings: [],
  errors: []
};
```

The important semantics to freeze in planning are: exit `0` for expected workflow states, JSON-only stdout, deterministic key ordering, and no duplicated status computation path in the CLI. [VERIFIED: repo code; local command output]

### Pattern 2: Normalize Once, Match Many

**What:** Centralize `toUnixPath`, base-containment, literal escaping, and matcher construction into shared helpers, then adopt that layer surface-by-surface. [VERIFIED: repo code]

**When to use:** Any time a module converts user- or filesystem-derived paths into relative keys, checks whether a target stays inside a base directory, or matches those keys against glob-like rules. [VERIFIED: repo code]

**Example:**

```javascript
// Source shape: lib/path-scope.js + repo-local path/glob utility recommendation
const matcher = picomatch(pattern, {
  basename: !pattern.includes('/'),
  dot: true
});

const normalized = normalizeRelativePath(filePath);
if (matcher(normalized)) {
  // predictable match against a POSIX-normalized relative path
}
```

The repo already uses the `basename` plus `dot` options in `lib/path-scope.js`; the Phase 8 improvement is to reuse that policy instead of re-deriving slightly different match behavior in other modules. [VERIFIED: repo code]

### Pattern 3: Split by Topic, Keep One Total Entry

**What:** Convert the 109-test monolith into topic scripts that share helpers, while preserving one compatibility entrypoint and one release entrypoint. [VERIFIED: repo code; local command output]

**When to use:** During the test split only. Avoid editing assertions and topology in the same commit unless the change is strictly mechanical. [VERIFIED: repo code]

**Example:**

```json
{
  "scripts": {
    "test": "node scripts/test-workflow-runtime.js",
    "test:workflow-runtime": "node scripts/test-workflow-runtime.js",
    "test:workflow-package": "node scripts/test-workflow-package.js",
    "test:workflow-generation": "node scripts/test-workflow-generation.js",
    "test:workflow-state": "node scripts/test-workflow-state.js",
    "test:workflow-paths": "node scripts/test-workflow-paths.js",
    "test:workflow-gates": "node scripts/test-workflow-gates.js"
  }
}
```

`npm test` becomes the release/preflight entrypoint, while `npm run test:workflow-runtime` remains stable for existing habits and phase-local verification text. [VERIFIED: package.json; .planning/phases/08-stability-json-and-release-coverage/08-CONTEXT.md]

### Suggested Plan Decomposition

1. **Wave 0: Extract test shared helpers and add the future `npm test` seam.** Keep `scripts/test-workflow-runtime.js` green, pull shared fixture/spawn/pack/parity helpers into a shared module, and add `npm test` only after the aggregate runner can call topic scripts deterministically. [VERIFIED: repo code; local command output]
2. **Wave 1: Implement `status --json` plus its dedicated matrix tests.** Add `--json` parsing, envelope serialization, exit/stdout/stderr rules, and coverage for missing workspace, missing active change, active change present, warnings, and true exceptional failures. [VERIFIED: repo code; local command output]
3. **Wave 2: Introduce `lib/path-utils.js` and `lib/glob-utils.js`, then refactor one surface at a time.** Start with read-only matching surfaces (`runtime-guidance`, `change-artifacts`, `path-scope`) before touching write-sensitive guards (`migrate`, `sync`). [VERIFIED: repo code]
4. **Wave 3: Move existing assertions into topic scripts without semantic rewrites.** Preserve current test names and fixtures where practical so diff review stays mechanical; keep `scripts/test-workflow-runtime.js` as the aggregate wrapper. [VERIFIED: repo code; local command output]
5. **Wave 4: Lock the release gate and release docs.** Add tarball assertions, legacy public-surface grep, CLI smoke coverage, README/README-zh/docs updates, and whichever release checklist material planning decides to own. [VERIFIED: repo code; local command output] [CITED: https://docs.npmjs.com/cli/v10/commands/npm-publish/]

### Anti-Patterns to Avoid

- **Recomputing status separately in `lib/cli.js`:** it will drift from `buildStatus()` and `getMigrationStatus()` almost immediately. [VERIFIED: repo code]
- **Adding `fast-glob` or `tinyglobby` just to escape glob-special characters:** that imports a new traversal surface when the repo only needs shared normalization plus matching over existing file lists. [VERIFIED: npm registry; repo code] [CITED: https://github.com/mrmlnc/fast-glob] [CITED: https://github.com/superchupudev/tinyglobby/blob/main/README.md]
- **Big-bang test rewriting:** the current file is large but already green; extract helpers first, then move assertions by topic. [VERIFIED: repo code; local command output]
- **Using the default global npm cache in the release gate:** this machine’s `~/.npm` cache has permission problems, so pack checks must override `npm_config_cache`. [VERIFIED: local command output]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Publish-surface simulation | Custom tarball file-inclusion logic | `npm pack --dry-run --json` | npm already computes the exact packed file set, metadata, and tarball summary that Phase 8 needs to assert. [VERIFIED: local command output] [CITED: https://docs.npmjs.com/cli/v11/commands/npm-pack/] [CITED: https://docs.npmjs.com/cli/v10/commands/npm-publish/] |
| Second glob engine | New matcher semantics next to `picomatch` | Shared wrapper around `picomatch@4.0.4` | The repo already ships `picomatch`; adding `fast-glob` would also add `micromatch`, which increases semantic drift risk. [VERIFIED: package.json; npm registry; repo code] [CITED: https://github.com/mrmlnc/fast-glob] |
| Second status engine in the CLI | Separate lifecycle summary logic in `showStatus()` | `buildStatus()` + `getMigrationStatus()` + `loadActiveChangePointer()` composition | Existing library modules already know the lifecycle and migration truth; the CLI only needs to serialize it. [VERIFIED: repo code] |
| New test framework | Jest/Vitest/Tap migration for Phase 8 | Existing Node assert harness, split into topic scripts | The repo already has strong fixture patterns and a green suite; the phase requirement is release coverage, not framework churn. [VERIFIED: repo code; local command output] |

**Key insight:** Phase 8 is a consolidation phase. New infrastructure is justified only when it removes existing duplication or makes the release boundary testable; extra frameworks and extra glob walkers do neither here. [VERIFIED: repo code; npm registry; local command output]

## Common Pitfalls

### Pitfall 1: Treating `--json` as a Formatting Toggle

**What goes wrong:** Planning assumes `status --json` is just `JSON.stringify(showStatus())`, so text-specific branches, missing-workspace guidance, and process exit behavior stay tangled. [VERIFIED: repo code; local command output]

**Why it happens:** `lib/cli.js` currently has only a text `showStatus()` path, and `BOOLEAN_FLAGS` does not include `json`, so the current implementation simply ignores the flag. [VERIFIED: repo code; local command output]

**How to avoid:** Add a dedicated JSON branch in the status command path, define `ok`/`warnings`/`errors` semantics before coding, and freeze the expected matrix with tests before touching release docs. [VERIFIED: repo code]

**Warning signs:** `node bin/opsx.js status --json` still prints human text or tests assert substrings instead of parsing JSON. [VERIFIED: local command output]

### Pitfall 2: Mixing Path Normalization Policies Across Modules

**What goes wrong:** One module matches Windows-style separators, another hashes only POSIX-style keys, and a third treats glob-special characters as literals inconsistently. [VERIFIED: repo code]

**Why it happens:** There are multiple local `toUnixPath` / `ensureWithinBase` variants and multiple matching styles already in the repo. [VERIFIED: repo code]

**How to avoid:** Land shared path/glob utilities first and move call sites onto them one surface at a time, with glob-special fixtures added before write-path refactors. [VERIFIED: repo code]

**Warning signs:** Tests need per-module fixture quirks, or literal artifact names such as `[demo]` and `!(name)` behave differently between `path-scope`, artifact hashing, and runtime matching. [VERIFIED: repo code] [ASSUMED]

### Pitfall 3: Splitting the Test File and the Assertion Logic in One Pass

**What goes wrong:** The suite becomes smaller but weaker because helper extraction, fixture movement, and assertion rewrites all happen together. [VERIFIED: repo code]

**Why it happens:** `scripts/test-workflow-runtime.js` currently owns fixtures, CLI helpers, parity helpers, migration fixtures, and topic assertions in one file. [VERIFIED: repo code]

**How to avoid:** First extract shared helpers with no semantic changes, then move topic blocks into new files mechanically, then add new Phase 8-only assertions such as `status --json` and pack JSON checks. [VERIFIED: repo code; local command output]

**Warning signs:** Test names change unnecessarily, fixture setup is duplicated across files, or the compatibility entrypoint stops matching the previous total count and scope. [VERIFIED: repo code; local command output]

### Pitfall 4: Letting Release Gate Checks Fail for Environment Reasons

**What goes wrong:** The release gate reports a failure that looks like packaging drift, but the real issue is the machine’s broken global npm cache. [VERIFIED: local command output]

**Why it happens:** `npm pack --dry-run --json` fails against `~/.npm` on this machine with `EPERM`, even though the same command succeeds with `npm_config_cache=.npm-cache`. [VERIFIED: local command output]

**How to avoid:** Bake a repo-local or `/tmp` cache override into the pack gate command from the start. [VERIFIED: local command output]

**Warning signs:** `npm pack` errors mention root-owned files under `~/.npm/_cacache` instead of tarball content or package metadata. [VERIFIED: local command output]

## Code Examples

Verified patterns from official sources:

### Tarball Inspection Without Publishing

```bash
# Source: https://docs.npmjs.com/cli/v11/commands/npm-pack/
npm_config_cache=.npm-cache npm pack --dry-run --json
```

This is the canonical release-gate command for Phase 8 because it exposes packed file paths, package metadata, and tarball summary in machine-readable form. [VERIFIED: local command output] [CITED: https://docs.npmjs.com/cli/v11/commands/npm-pack/] [CITED: https://docs.npmjs.com/cli/v10/commands/npm-publish/]

### `fast-glob` Escaping Example for Reference Only

```javascript
// Source: https://github.com/mrmlnc/fast-glob
const fg = require('fast-glob');

fg.escapePath('!abc');
// \\!abc

fg.escapePath('[OpenSource] mrmlnc – fast-glob (Deluxe Edition) 2014') + '/*.flac';
// \\[OpenSource\\] mrmlnc – fast-glob \\(Deluxe Edition\\) 2014/*.flac
```

This is useful as a reference for what “glob-special escaping” must achieve, even though the recommended Phase 8 path is to implement the equivalent locally rather than importing `fast-glob`. [CITED: https://github.com/mrmlnc/fast-glob]

### `tinyglobby` Sync Pattern Matching for Future-Only Scope

```javascript
// Source: https://github.com/superchupudev/tinyglobby/blob/main/README.md
import { globSync } from 'tinyglobby';

const files = globSync('src/**/*.ts', { cwd: '/app' });
```

If a later phase genuinely needs a shared filesystem glob walker, `tinyglobby` is the cleanest candidate under the current Node floor, but it is not necessary for the recommended Phase 8 plan. [VERIFIED: npm registry] [CITED: https://github.com/superchupudev/tinyglobby/blob/main/README.md]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Text-only `opsx status` scraping | Deterministic JSON envelope for `opsx status --json`, while preserving text `opsx status` | Phase 8 target; the structured `buildStatus()` object already exists from Phase 4. [VERIFIED: repo code] | Agents and release checks stop parsing human prose. [VERIFIED: repo code; local command output] |
| One 109-test monolith as the only entrypoint | Topic scripts plus `npm test` total entrypoint, with `npm run test:workflow-runtime` retained for compatibility | Phase 8 target. [VERIFIED: repo code; .planning/phases/08-stability-json-and-release-coverage/08-CONTEXT.md] | Reviewable diffs, clearer release gates, and smaller failure scopes. [VERIFIED: repo code] |
| Module-local path and containment helpers | Shared path/glob utility layer over existing `picomatch` | Phase 8 target. [VERIFIED: repo code] | One normalization and escaping policy across status, hashing, migration, sync, and path-scope. [VERIFIED: repo code] |
| Manual or text-only tarball inspection | `npm pack --dry-run --json` assertions | Current npm CLI documentation; locally validated on 2026-04-29. [VERIFIED: local command output] [CITED: https://docs.npmjs.com/cli/v11/commands/npm-pack/] | Publish surface becomes a testable contract. [VERIFIED: local command output] |
| Latest `glob` / `globby` as default ecosystem picks | Not viable for this repo while Node floor stays `>=14.14.0` | `glob@13.0.6` published `2026-02-19`; `globby@16.2.0` published `2026-03-27`. [VERIFIED: npm registry] | Planning must stay on existing `picomatch` or, if absolutely needed later, a Node-14-compatible alternative such as `tinyglobby`. [VERIFIED: npm registry] |

**Deprecated/outdated:**

- `glob@13.0.6` for this repo: current engine requirement is `18 || 20 || >=22`, so it conflicts with the locked Phase 8 Node floor. [VERIFIED: npm registry]
- `globby@16.2.0` for this repo: current engine requirement is `>=20`, so it also conflicts with the locked Phase 8 Node floor. [VERIFIED: npm registry]
- Relying on the machine’s default `~/.npm` cache for pack gates: it currently causes `EPERM` failures on this machine. [VERIFIED: local command output]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Literal glob-special fixtures should include characters such as `[](){}!+@?*` because Phase 8 explicitly calls for glob-special coverage, but the exact filename set is not locked yet. [ASSUMED] | Common Pitfalls / Validation Architecture | Low: only affects fixture naming, not the recommended implementation structure. |

## Open Questions (RESOLVED)

1. **Where should the release checklist live?**
   - What we know: the repo already has `CHANGELOG.md`, README files, and docs, but the current scan did not surface a dedicated release checklist file in the shipped documentation surface. [VERIFIED: repo code]
   - Resolved in revision: the release checklist lives at `docs/release-checklist.md`, and it stays in the same wave as the pack/grep/smoke gate wiring so the published commands and the checklist cannot diverge.

2. **What should `ok` mean inside the JSON envelope?**
   - What we know: exit `0` is reserved for expected states, and the envelope must include `ok`, `warnings`, and `errors`. [VERIFIED: .planning/phases/08-stability-json-and-release-coverage/08-CONTEXT.md]
   - Resolved in revision: `ok: true` means the command transport completed successfully and emitted valid JSON.
   - Resolved in revision: workspace readiness and other domain problems must be expressed in `workspace`, `migration`, `changeStatus`, `warnings`, and `errors`, keeping transport success separate from workflow readiness.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | CLI smokes, runtime modules, topic test scripts | ✓ | `v24.8.0` | None needed. [VERIFIED: local command output] |
| npm | `npm test`, `npm view`, `npm pack --dry-run --json` release gate | ✓ | `11.6.0` | For test execution only, `node scripts/test-workflow-runtime.js` can bypass `npm test` until the new script lands; no true fallback exists for pack JSON output. [VERIFIED: local command output; package.json] |
| git | legacy public-surface grep gate and normal repo workflow | ✓ | `2.46.0` | `rg` can replace grep-only checks if needed. [VERIFIED: local command output] |
| `rg` | fast repo scans and legacy public-surface checks | ✓ | `15.1.0` | `git grep` or `grep -R` if required. [VERIFIED: local command output] |
| Local npm cache override | `npm pack --dry-run --json` on this machine | ✓ | repo-local `.npm-cache` | Use `npm_config_cache=.npm-cache` or `/tmp/opsx-npm-cache`; do not rely on `~/.npm`. [VERIFIED: local command output] |

**Missing dependencies with no fallback:**
- None. [VERIFIED: local command output]

**Missing dependencies with fallback:**
- The default global npm cache is not usable for pack checks on this machine, but a repo-local cache works and should be baked into the release gate. [VERIFIED: local command output]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Custom Node.js regression scripts built on the standard `assert` module. [VERIFIED: repo code] |
| Config file | none. [VERIFIED: package.json; repo code] |
| Quick run command | `npm run test:workflow-runtime` [VERIFIED: package.json] |
| Full suite command | `npm test` after Phase 8 adds the total entrypoint; today this is a Wave 0 gap because `package.json` has no `test` script. [VERIFIED: package.json; .planning/phases/08-stability-json-and-release-coverage/08-CONTEXT.md] |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| QUAL-05 | `status --json` emits JSON-only stdout, exit `0` for expected states, and non-zero stderr behavior only for exceptional failures. [VERIFIED: .planning/REQUIREMENTS.md; .planning/phases/08-stability-json-and-release-coverage/08-CONTEXT.md] | integration | `node scripts/test-workflow-state.js` | ❌ Wave 0. Current coverage lives only in `scripts/test-workflow-runtime.js` and has no JSON assertions yet. [VERIFIED: repo code; local command output] |
| QUAL-06 | Shared path/glob helpers normalize separators, enforce base containment, escape literal glob characters, and behave predictably on special-character fixtures. [VERIFIED: .planning/REQUIREMENTS.md; .planning/phases/08-stability-json-and-release-coverage/08-CONTEXT.md] | integration | `node scripts/test-workflow-paths.js` | ❌ Wave 0. Current coverage is scattered across `path-scope`, hashing, sync, and runtime tests inside the monolith. [VERIFIED: repo code] |
| TEST-01 | Package metadata, bin mapping, and tarball contents expose only the OpsX public surface. [VERIFIED: .planning/REQUIREMENTS.md; package.json] | integration | `node scripts/test-workflow-package.js` | ❌ Wave 0. Tarball inspection is currently ad hoc via pack output, not its own topic script. [VERIFIED: repo code; local command output] |
| TEST-02 | Generated command bundles and checked-in command files expose only `/opsx-*` and `$opsx-*` public routes. [VERIFIED: .planning/REQUIREMENTS.md; repo code] | integration | `node scripts/test-workflow-generation.js` | ❌ Wave 0. Coverage exists today inside the monolith and should be moved mechanically. [VERIFIED: repo code; local command output] |
| TEST-03 | Migration, state-machine, drift, resume/continue, and status JSON remain green after the split. [VERIFIED: .planning/REQUIREMENTS.md; repo code] | integration | `node scripts/test-workflow-state.js` | ❌ Wave 0. Most current assertions already exist, but the new JSON contract does not. [VERIFIED: repo code; local command output] |
| TEST-04 | Spec review, TDD-light, path guards, verify/sync/archive, and batch/archive blocking remain green after the split. [VERIFIED: .planning/REQUIREMENTS.md; repo code] | integration | `node scripts/test-workflow-gates.js` | ❌ Wave 0. Coverage exists today inside the monolith and should be moved by topic. [VERIFIED: repo code; local command output] |

### Sampling Rate

- **Per task commit:** run the touched topic script plus `npm run test:workflow-runtime` until the compatibility runner is fully delegated to topic scripts. [VERIFIED: repo code; package.json]
- **Per wave merge:** run `npm test` once the new script exists; until then, run `npm run test:workflow-runtime` plus any new topic scripts added in that wave. [VERIFIED: package.json; .planning/phases/08-stability-json-and-release-coverage/08-CONTEXT.md]
- **Phase gate:** `npm test` + CLI smoke checks + generated command parity + legacy public-surface grep + `npm_config_cache=.npm-cache npm pack --dry-run --json` + schema drift + code review + final phase verification. [VERIFIED: .planning/phases/08-stability-json-and-release-coverage/08-CONTEXT.md; local command output]

### Wave 0 Gaps

- [ ] `package.json` — add `test` as the total release/preflight entrypoint while keeping `test:workflow-runtime`. [VERIFIED: package.json; .planning/phases/08-stability-json-and-release-coverage/08-CONTEXT.md]
- [ ] `scripts/test-workflow-shared.js` — extract fixture, CLI spawn, parity, and pack helpers out of the monolith before moving assertions. [VERIFIED: repo code]
- [ ] `scripts/test-workflow-package.js` — assert package/bin metadata and tarball contents via `npm_config_cache=.npm-cache npm pack --dry-run --json`. [VERIFIED: package.json; local command output]
- [ ] `scripts/test-workflow-generation.js` — move generated parity and banned public-surface assertions out of the monolith. [VERIFIED: repo code]
- [ ] `scripts/test-workflow-state.js` — add the `status --json` stdout/stderr/exit matrix while preserving migration/state/resume coverage. [VERIFIED: repo code; local command output]
- [ ] `scripts/test-workflow-paths.js` — add glob-special fixture coverage and shared path-utility regression cases. [VERIFIED: repo code] [ASSUMED]
- [ ] `scripts/test-workflow-gates.js` — move spec review, TDD-light, verify/sync/archive, and batch gate coverage out of the monolith. [VERIFIED: repo code]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Phase 8 does not add identity or login flows. [VERIFIED: .planning/ROADMAP.md; .planning/REQUIREMENTS.md] |
| V3 Session Management | no | Phase 8 is local CLI/runtime hardening, not session lifecycle work. [VERIFIED: .planning/ROADMAP.md; .planning/REQUIREMENTS.md] |
| V4 Access Control | no | No new authorization model is added; path restrictions remain local workflow scope rules, not user ACLs. [VERIFIED: .planning/ROADMAP.md; repo code] |
| V5 Input Validation | yes | Normalize relative paths, reject base escapes, escape literal glob characters, and separate JSON transport success from domain-state warnings/errors. [VERIFIED: repo code] |
| V6 Cryptography | no | Phase 8 should keep existing SHA-256 artifact hashing and not introduce new crypto behavior. [VERIFIED: repo code] |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Path traversal into sync or migration targets | Tampering / Elevation of Privilege | Centralize `ensureWithinBase()`-style checks and reuse them everywhere writes are planned or executed. [VERIFIED: repo code] |
| Glob injection from literal artifact names or fixture paths | Tampering | Escape glob-special characters before building patterns and match only normalized relative paths. [VERIFIED: repo code] [ASSUMED] |
| Mixed stdout/stderr breaking machine consumers | Denial of Service | Reserve stdout for parseable JSON in `status --json` and keep exceptional failures on stderr with non-zero exit codes. [VERIFIED: .planning/phases/08-stability-json-and-release-coverage/08-CONTEXT.md] |
| Tarball surface drift reintroducing legacy public assets | Tampering | Assert `npm pack --dry-run --json` output plus legacy public-surface grep as part of the release gate. [VERIFIED: local command output; repo code] [CITED: https://docs.npmjs.com/cli/v10/commands/npm-publish/] |

## Sources

### Primary (HIGH confidence)

- `.planning/phases/08-stability-json-and-release-coverage/08-CONTEXT.md` - locked Phase 8 decisions and discretion.
- `.planning/REQUIREMENTS.md` - QUAL-05, QUAL-06, TEST-01, TEST-02, TEST-03, TEST-04.
- `.planning/ROADMAP.md` - Phase 8 goal, success criteria, and dependency notes.
- `.planning/STATE.md` - current milestone state and next action.
- `CONTINUITY.md` - durable prior-phase receipts and Phase 8 readiness.
- `AGENTS.md` - repo-local workflow constraints.
- `openspec/config.yaml` - project defaults and language/security-review baseline.
- `package.json` - current engine floor, scripts, bin mapping, files list, and dependencies.
- `lib/cli.js` - current text-only status routing and argv parsing.
- `lib/runtime-guidance.js` - `buildStatus()`, `buildStatusText()`, and read-only drift inspection.
- `lib/migrate.js` - `getMigrationStatus()` and canonical/legacy diagnostics.
- `lib/fs-utils.js` - current recursive file listing behavior.
- `lib/change-artifacts.js` - current tracked-artifact hashing selection.
- `lib/path-scope.js` - current `picomatch`-based allowed/forbidden matching.
- `lib/sync.js` - canonical spec path guard behavior.
- `lib/generator.js` - generated command source-of-truth.
- `scripts/test-workflow-runtime.js` - current 109-test monolith and release-surface assertions.
- `node bin/opsx.js status --json` - current behavior probe showing text output, not JSON.
- `node bin/opsx.js --help` and `node bin/opsx.js --version` - current CLI smoke outputs.
- `npm run test:workflow-runtime` - current full regression result (`109 test(s) passed`).
- `npm_config_cache=.npm-cache npm pack --dry-run --json` - current tarball metadata and file inventory.
- `npm view picomatch version time engines license repository.url dependencies --json` - current `picomatch` metadata.
- `npm view yaml version time --json` - current `yaml` metadata.
- `npm view fast-glob version time engines license repository.url dependencies --json` - current `fast-glob` metadata.
- `npm view tinyglobby version time engines license repository.url exports type dependencies --json` - current `tinyglobby` metadata.
- `npm view glob version time engines license repository.url --json` - current `glob` metadata.
- `npm view globby version time engines license repository.url --json` - current `globby` metadata.
- `https://docs.npmjs.com/cli/v11/commands/npm-pack/` - canonical `npm pack` dry-run and JSON documentation.
- `https://docs.npmjs.com/cli/v10/commands/npm-publish/` - canonical package-inclusion behavior and `npm pack --dry-run` guidance.
- `https://github.com/mrmlnc/fast-glob` - official README for `fast-glob` API and `escapePath()`.
- `https://github.com/superchupudev/tinyglobby/blob/main/README.md` - official README for `tinyglobby` usage.

### Secondary (MEDIUM confidence)

- None. [VERIFIED: repo code; npm registry; official docs covered the phase scope]

### Tertiary (LOW confidence)

- None beyond the explicitly listed assumptions about exact future fixture characters and `ok` field semantics. [VERIFIED: this document]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - dependency choices and version constraints were verified from the npm registry, repo code, and official docs. [VERIFIED: npm registry; repo code] [CITED: https://docs.npmjs.com/cli/v11/commands/npm-pack/]
- Architecture: HIGH - implementation surfaces, sequencing risks, and adapter boundaries were verified by direct code inspection and current-command probes. [VERIFIED: repo code; local command output]
- Pitfalls: HIGH - every major risk ties back to a currently observed code path, missing script, or environment behavior. [VERIFIED: repo code; local command output]

**Research date:** 2026-04-29  
**Valid until:** 2026-05-06
