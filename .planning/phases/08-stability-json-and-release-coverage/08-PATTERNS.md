# Phase 08: Stability, JSON, and Release Coverage - Pattern Map

**Mapped:** 2026-04-29
**Files analyzed:** 27 new/modified files or work items
**Analogs found:** 27 / 27

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `lib/cli.js` | CLI controller | request-response, process I/O | `lib/cli.js`, `lib/runtime-guidance.js`, `lib/migrate.js`, `lib/change-store.js` | exact + composition |
| `lib/runtime-guidance.js` | service | request-response, file-I/O inspection, transform | same file: `buildStatus()`, path matching helpers | exact |
| `lib/migrate.js` | service/utility | file-I/O inspection, transform | same file: migration plan/status helpers | exact |
| `lib/fs-utils.js` | utility | file-I/O | same file: `listFiles()`, atomic write helpers | exact |
| `lib/change-artifacts.js` | utility | file-I/O, transform | same file: tracked artifact hashing | exact |
| `lib/path-scope.js` | utility | path/glob transform | same file: `picomatch` scope matcher | exact |
| `lib/sync.js` | service/utility | file-I/O, guarded writes, transform | same file: canonical spec containment and atomic sync | exact |
| `lib/generator.js` | generator | static generation, transform | same file: `buildPlatformBundle()` | exact |
| `lib/path-utils.js` | utility | path normalization, containment transform | `lib/migrate.js`, `lib/sync.js`, `lib/change-store.js`, `lib/runtime-guidance.js` | role + flow match |
| `lib/glob-utils.js` | utility | glob escaping/matching transform | `lib/path-scope.js`, `lib/runtime-guidance.js`, `lib/change-artifacts.js` | role + flow match |
| `scripts/test-workflow-runtime.js` | test runner | batch, process I/O, file-I/O fixtures | same file: custom test harness and aggregate suite | exact |
| `scripts/test-workflow-shared.js` | test utility | file-I/O fixtures, process I/O, transform | `scripts/test-workflow-runtime.js` helper block | exact |
| `scripts/test-workflow-package.js` | integration test | package metadata, process I/O, batch | `scripts/test-workflow-runtime.js`, `scripts/check-phase1-legacy-allowlist.js`, `package.json` | role-match |
| `scripts/test-workflow-generation.js` | integration test | static generation parity, file-I/O | `scripts/test-workflow-runtime.js` generation/parity block | exact |
| `scripts/test-workflow-state.js` | integration test | request-response, file-I/O state fixtures | `scripts/test-workflow-runtime.js` migration/status/runtime blocks | exact |
| `scripts/test-workflow-paths.js` | integration test | path/glob transform, file-I/O fixtures | `scripts/test-workflow-runtime.js` path-scope/artifact hash tests | exact |
| `scripts/test-workflow-gates.js` | integration test | request-response, file-I/O, batch | `scripts/test-workflow-runtime.js` verify/sync/archive/batch tests | exact |
| `scripts/check-phase1-legacy-allowlist.js` | release check utility | batch scan, file-I/O | same file | exact |
| `package.json` | config | package metadata, test command dispatch | existing scripts/dependency/bin/files blocks | exact |
| `README.md` | docs | static release-facing content | same file, `docs/commands.md`, `docs/runtime-guidance.md` | exact |
| `README-zh.md` | docs | static release-facing content | same file bilingual mirror | exact |
| `CHANGELOG.md` | docs | static release notes | same file | exact |
| `docs/commands.md` | docs | static command contract | same file | exact |
| `docs/runtime-guidance.md` | docs | static runtime contract | same file | exact |
| `docs/customization.md` | docs | static config contract | same file | exact |
| `docs/codex.md` | docs | static route guidance | same file | exact |
| `docs/supported-tools.md` | docs | static platform matrix | same file | exact |

## Pattern Assignments

### `lib/cli.js` (CLI controller, request-response/process I/O)

**Analog:** `lib/cli.js` + `lib/runtime-guidance.js` + `lib/migrate.js` + `lib/change-store.js`

**Imports pattern** from `lib/cli.js` lines 1-12:
```javascript
const fs = require('fs');
const path = require('path');
const {
  PACKAGE_VERSION,
  PRODUCT_NAME,
  PRODUCT_SHORT_NAME,
  PRODUCT_LONG_NAME
} = require('./constants');
const { install, uninstall, runCheck, showDoc, setLanguage } = require('./install');
const { runMigration, getMigrationStatus } = require('./migrate');
const { loadActiveChangePointer } = require('./change-store');
const { buildStatusText } = require('./runtime-guidance');
```

**Arg parsing pattern** from `lib/cli.js` lines 14-39:
```javascript
const BOOLEAN_FLAGS = new Set(['check', 'doc', 'dry-run', 'help', 'version']);

function parseArgs(argv) {
  const options = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      options._.push(token);
      continue;
    }
    const key = token.slice(2);
    if (BOOLEAN_FLAGS.has(key)) {
      options[key] = true;
      continue;
    }
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      options[key] = true;
      continue;
    }
    options[key] = next;
    index += 1;
  }
  return options;
}
```
Planner note: add `json` to `BOOLEAN_FLAGS`; do not add a custom parser elsewhere.

**Current text status pattern** from `lib/cli.js` lines 77-140:
```javascript
function showStatus(options = {}) {
  const cwd = options.cwd || process.cwd();
  const homeDir = options.homeDir || process.env.HOME;
  const status = getMigrationStatus({ cwd, homeDir });
  const canonicalProjectConfigPath = path.join(cwd, '.opsx', 'config.yaml');
  const legacyProjectConfigPath = path.join(cwd, LEGACY_PROJECT_DIR, 'config.yaml');
  const migrationLines = [
    'Migration status:',
    `- canonical project root: ${status.canonical.projectExists ? 'present' : 'missing'} (${status.canonical.projectRoot})`,
    `- canonical shared home: ${status.canonical.sharedExists ? 'present' : 'missing'} (${status.canonical.sharedHome})`,
    `- legacy project root: ${status.legacy.projectExists ? 'present' : 'missing'} (${status.legacy.projectRoot})`,
    `- legacy shared home: ${status.legacy.sharedExists ? 'present' : 'missing'} (${status.legacy.sharedHome})`,
    `- pending moves: ${status.migration.pendingMoves}`,
    `- pending creates: ${status.migration.pendingCreates}`,
    ...(status.legacy.candidates || []).map((entry) => `- legacy candidate: ${entry.display} (${entry.reason})`),
    ...(status.migration.abortReason ? [`- abort: ${status.migration.abortReason}`] : [])
  ];

  if (!fs.existsSync(canonicalProjectConfigPath)) {
    return [
      showVersion(),
      'Workspace not initialized: `.opsx/config.yaml` is missing.',
      'Use onboarding routes to initialize and select a change (`$opsx-onboard` / `/opsx-onboard`).',
      '',
      ...migrationLines
    ].join('\n');
  }

  const activePointer = loadActiveChangePointer(cwd);
  if (!activePointer.activeChange) {
    return [
      showVersion(),
      'Workspace initialized: `.opsx/config.yaml` found.',
      'No active change is selected in `.opsx/active.yaml`.',
      'Next: use `$opsx-new` / `/opsx-new` or `$opsx-propose` / `/opsx-propose`.',
      '',
      ...migrationLines
    ].join('\n');
  }
}
```
Planner note: keep text mode behavior separate. Add a `buildStatusJsonEnvelope()` helper next to `showStatus()` that returns a plain object, then serialize it only in the `status --json` branch.

**Status dispatch pattern** from `lib/cli.js` lines 142-196:
```javascript
async function runCli(argv) {
  const options = parseArgs(argv);
  const command = options._[0] || '';
  const commandValue = options._[1] || '';

  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(showHelp());
    return;
  }
  if (argv.includes('--version') || argv.includes('-v')) {
    console.log(showVersion());
    return;
  }

  switch (command) {
    case 'migrate':
      console.log(runMigration({
        cwd: process.cwd(),
        homeDir: process.env.HOME,
        dryRun: options['dry-run'] === true
      }));
      return;
    case 'status':
      console.log(showStatus({
        cwd: process.cwd(),
        homeDir: process.env.HOME
      }));
      return;
  }
}
```
Planner note: branch inside `case 'status'` on `options.json === true`; `console.log(JSON.stringify(envelope, null, 2))` is acceptable if tests lock deterministic ordering.

**Runtime status payload pattern** from `lib/runtime-guidance.js` lines 705-748:
```javascript
function buildStatus(options = {}) {
  const kernel = buildRuntimeKernel(options);
  const persisted = loadPersistedStateView(kernel.paths.changeDir);
  const driftInspection = inspectReadOnlyHashDrift(kernel.paths.changeDir, persisted);
  const driftAwareState = driftInspection.stateView;
  const warnings = Array.from(new Set([
    ...driftAwareState.warnings,
    ...driftInspection.drift.warnings
  ]));

  return {
    change: kernel.change,
    schema: kernel.schema,
    stage: driftAwareState.stage,
    nextAction: driftAwareState.nextAction,
    route: driftAwareState.route,
    active: {
      taskGroup: Object.prototype.hasOwnProperty.call(driftAwareState.active, 'taskGroup') ? driftAwareState.active.taskGroup : null,
      nextTaskGroup: Object.prototype.hasOwnProperty.call(driftAwareState.active, 'nextTaskGroup') ? driftAwareState.active.nextTaskGroup : null
    },
    warnings,
    blockers: driftAwareState.blockers.slice(),
    hashDriftWarnings: driftInspection.drift.warnings.slice(),
    allowedPaths: driftAwareState.allowedPaths.slice(),
    forbiddenPaths: driftAwareState.forbiddenPaths.slice()
  };
}
```

**Migration diagnostics pattern** from `lib/migrate.js` lines 419-473:
```javascript
function getMigrationStatus(options = {}) {
  const cwd = path.resolve(options.cwd || process.cwd());
  const homeDir = path.resolve(options.homeDir || process.env.HOME || '');
  const plan = createMigrationPlan({ cwd, homeDir });

  const status = {
    cwd: plan.cwd,
    homeDir: plan.homeDir,
    canonical: {
      projectRoot: plan.canonicalProjectRoot,
      projectExists: fs.existsSync(plan.canonicalProjectRoot),
      sharedHome: plan.canonicalSharedHome,
      sharedExists: fs.existsSync(plan.canonicalSharedHome)
    },
    legacy: {
      projectRoot: plan.legacyProjectRoot,
      projectExists: fs.existsSync(plan.legacyProjectRoot),
      sharedHome: plan.legacySharedHome,
      sharedExists: fs.existsSync(plan.legacySharedHome),
      candidates: plan.legacyCandidates.map((entry) => ({
        path: entry.path,
        display: entry.display,
        reason: entry.reason
      }))
    },
    migration: {
      pendingMoves: plan.moves.length,
      pendingCreates: plan.creates.length,
      warnings: plan.warnings.slice(),
      abortReason: plan.abortReason || ''
    }
  };

  return status;
}
```

**Active pointer pattern** from `lib/change-store.js` lines 322-331:
```javascript
function loadActiveChangePointer(repoRoot) {
  const activePath = getActivePointerPath(repoRoot);
  const projectRoot = path.join(path.resolve(repoRoot), '.opsx');
  ensureWithinBase(projectRoot, activePath, '.opsx project');

  if (!fs.existsSync(activePath)) {
    return normalizeActivePointer({});
  }

  return normalizeActivePointer(parseYamlFile(activePath));
}
```

**Error handling pattern** from `bin/opsx.js` lines 5-9:
```javascript
runCli(process.argv.slice(2)).catch((error) => {
  const message = error && error.message ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
```
Planner note: expected workflow states in `status --json` must not throw; reserve this path for invalid args and real failures.

---

### `lib/path-utils.js` and path-guard refactors (utility, path normalization/containment)

**Applies to:** new `lib/path-utils.js`, plus `lib/migrate.js`, `lib/sync.js`, `lib/runtime-guidance.js`, `lib/change-store.js`, and any caller with duplicated path helpers.

**Analog:** `lib/migrate.js`, `lib/sync.js`, `lib/change-store.js`, `lib/fs-utils.js`

**Containment pattern** from `lib/migrate.js` lines 82-93:
```javascript
function toUnixPath(value) {
  return String(value || '').replace(/\\/g, '/');
}

function ensureWithinBase(basePath, targetPath, label) {
  const resolvedBase = path.resolve(basePath);
  const resolvedTarget = path.resolve(targetPath);
  const relativePath = path.relative(resolvedBase, resolvedTarget);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new Error(`Refusing path outside ${label} base: ${targetPath}`);
  }
}
```

**Sync write guard pattern** from `lib/sync.js` lines 32-49 and 315-332:
```javascript
function ensureWithinBase(basePath, targetPath, label) {
  const resolvedBase = path.resolve(basePath);
  const resolvedTarget = path.resolve(targetPath);
  const relativePath = path.relative(resolvedBase, resolvedTarget);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new Error(`Refusing to write sync target outside ${label}: ${targetPath}`);
  }
}

function resolveCanonicalSpecsDir(plan = {}) {
  const repoRoot = path.resolve(plan.repoRoot || process.cwd());
  const expectedSpecsDir = path.join(repoRoot, '.opsx', 'specs');
  const suppliedSpecsDir = toNonEmptyString(plan.canonicalSpecsDir);
  if (suppliedSpecsDir && path.resolve(suppliedSpecsDir) !== expectedSpecsDir) {
    throw new Error('Sync plan canonicalSpecsDir must match repoRoot/.opsx/specs.');
  }
  return expectedSpecsDir;
}

const canonicalSpecsDir = resolveCanonicalSpecsDir(normalizedPlan);
const writes = (Array.isArray(normalizedPlan.writes) ? normalizedPlan.writes : []).map((entry, index) => {
  const targetPath = path.resolve(toNonEmptyString(entry.targetPath));
  if (!toNonEmptyString(entry.targetPath)) {
    throw new Error('Sync plan write entry is missing targetPath.');
  }
  ensureWithinBase(canonicalSpecsDir, targetPath, '.opsx/specs');
  return {
    targetPath,
    content: typeof entry.content === 'string' ? entry.content : '',
    tempPath: path.join(path.dirname(targetPath), `.${path.basename(targetPath)}.${process.pid}.${Date.now()}.${index}.tmp`)
  };
});
```

**Recursive file listing pattern** from `lib/fs-utils.js` lines 50-63:
```javascript
function listFiles(directoryPath, baseDir = directoryPath) {
  if (!fs.existsSync(directoryPath)) return [];
  const entries = fs.readdirSync(directoryPath, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFiles(fullPath, baseDir));
    } else {
      files.push(path.relative(baseDir, fullPath));
    }
  }
  return files.sort();
}
```

Planner guidance:
- Export small named helpers, for example `toPosixPath()`, `normalizeRelativePath()`, `ensureWithinBase()`, `isWithinBase()`, and `relativeToBase()`.
- Keep helpers synchronous and CommonJS.
- Keep `listFiles()` as the traversal primitive unless a strong reason appears; Phase 8 research recommends no new glob walker.
- Preserve exact error-message style where tests assert it, or update assertions intentionally.

---

### `lib/glob-utils.js` and glob/path matching refactors (utility, glob transform)

**Applies to:** new `lib/glob-utils.js`, plus `lib/path-scope.js`, `lib/change-artifacts.js`, `lib/runtime-guidance.js`.

**Analog:** `lib/path-scope.js`, `lib/runtime-guidance.js`, `lib/change-artifacts.js`

**Existing `picomatch` wrapper pattern** from `lib/path-scope.js` lines 1 and 40-75:
```javascript
const picomatch = require('picomatch');

function normalizePathScopeEntry(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  const normalized = trimmed
    .replace(/\\/g, '/')
    .replace(/^\.\/+/, '')
    .replace(/\/{2,}/g, '/');
  return normalized;
}

function buildMatchers(patterns) {
  return patterns.map((pattern) => ({
    pattern,
    isMatch: picomatch(pattern, {
      basename: !pattern.includes('/'),
      dot: true
    })
  }));
}

function matchesAny(filePath, matchers) {
  return matchers.some((matcher) => matcher.isMatch(filePath));
}
```

**Scope match result shape** from `lib/path-scope.js` lines 97-140:
```javascript
function matchPathScope(changedFiles, options = {}) {
  const files = unique(normalizeStringArray(changedFiles));
  const allowedPaths = unique(normalizeStringArray(options.allowedPaths));
  const forbiddenPaths = unique(normalizeStringArray(options.forbiddenPaths));
  const hasAllowedScope = allowedPaths.length > 0;
  const allowedMatchers = buildMatchers(allowedPaths);
  const forbiddenMatchers = buildMatchers(forbiddenPaths);

  const result = {
    changedFiles: files,
    allowedPaths,
    forbiddenPaths,
    hasAllowedScope,
    allowedMatches: [],
    forbiddenMatches: [],
    outOfScopeMatches: [],
    explainableExtraMatches: []
  };

  files.forEach((filePath) => {
    if (matchesAny(filePath, forbiddenMatchers)) {
      result.forbiddenMatches.push(filePath);
      return;
    }

    if (!hasAllowedScope || matchesAny(filePath, allowedMatchers)) {
      result.allowedMatches.push(filePath);
      return;
    }
  });

  result.hasForbiddenMatches = result.forbiddenMatches.length > 0;
  result.hasOutOfScopeMatches = result.outOfScopeMatches.length > 0;
  result.hasExplainableExtraMatches = result.explainableExtraMatches.length > 0;

  return result;
}
```

**Literal schema path pattern** from `lib/runtime-guidance.js` lines 260-274:
```javascript
function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function compilePathPattern(pathPattern) {
  const normalized = toUnixPath(pathPattern);
  const escaped = escapeRegex(normalized).replace(/<[^>]+>/g, '[^/]+');
  return new RegExp(`^${escaped}$`);
}

function resolveChangeFileMatches(changeDir, pathPattern) {
  const files = listFiles(changeDir).map((relativePath) => toUnixPath(relativePath));
  const pattern = compilePathPattern(pathPattern);
  return files.filter((relativePath) => pattern.test(relativePath)).sort();
}
```

**Tracked artifact filter pattern** from `lib/change-artifacts.js` lines 13-21 and 29-49:
```javascript
function toUnixPath(value) {
  return String(value || '').replace(/\\/g, '/');
}

function isTrackedArtifactPath(relativePath) {
  const normalized = toUnixPath(relativePath);
  if (TRACKED_FILES.includes(normalized)) return true;
  return /^specs\/.+\/spec\.md$/.test(normalized);
}

function hashTrackedArtifacts(changeDir) {
  const resolvedChangeDir = path.resolve(changeDir);
  if (!fs.existsSync(resolvedChangeDir)) {
    return {};
  }

  const trackedPaths = listFiles(resolvedChangeDir)
    .map((entry) => toUnixPath(entry))
    .filter((entry) => isTrackedArtifactPath(entry))
    .sort((left, right) => left.localeCompare(right));
}
```

Planner guidance:
- Keep `picomatch@4.0.4` as the matcher backend.
- Add literal escaping for paths with glob-special characters before constructing glob patterns.
- Keep sorted output; many existing assertions depend on deterministic order.
- Refactor call sites incrementally: read-only surfaces first (`runtime-guidance`, `change-artifacts`, `path-scope`), then write-sensitive surfaces (`migrate`, `sync`).

---

### `lib/runtime-guidance.js` (service, status/artifact request-response)

**Analog:** same file

**Machine-readable status pattern** from `lib/runtime-guidance.js` lines 705-748:
```javascript
function buildStatus(options = {}) {
  const kernel = buildRuntimeKernel(options);
  const persisted = loadPersistedStateView(kernel.paths.changeDir);
  const driftInspection = inspectReadOnlyHashDrift(kernel.paths.changeDir, persisted);
  const driftAwareState = driftInspection.stateView;
  const warnings = Array.from(new Set([
    ...driftAwareState.warnings,
    ...driftInspection.drift.warnings
  ]));

  return {
    change: kernel.change,
    schema: kernel.schema,
    stage: driftAwareState.stage,
    nextAction: driftAwareState.nextAction,
    route: driftAwareState.route,
    active: {
      taskGroup: Object.prototype.hasOwnProperty.call(driftAwareState.active, 'taskGroup') ? driftAwareState.active.taskGroup : null,
      nextTaskGroup: Object.prototype.hasOwnProperty.call(driftAwareState.active, 'nextTaskGroup') ? driftAwareState.active.nextTaskGroup : null
    },
    warnings,
    blockers: driftAwareState.blockers.slice(),
    hashDriftWarnings: driftInspection.drift.warnings.slice(),
    allowedPaths: driftAwareState.allowedPaths.slice(),
    forbiddenPaths: driftAwareState.forbiddenPaths.slice()
  };
}
```

**Text adapter pattern** from `lib/runtime-guidance.js` lines 751-772:
```javascript
function buildStatusText(options = {}) {
  const status = buildStatus(options);
  const lines = [
    `Change: ${status.change}`,
    `Stage: ${status.stage}`,
    `Next action: ${status.nextAction}`,
    `Route: ${status.route}`
  ];

  if (status.active && status.active.taskGroup) {
    lines.push(`Active task group: ${status.active.taskGroup}`);
  }
  if (status.blockers.length) {
    lines.push('Blockers:');
    status.blockers.forEach((blocker) => lines.push(`- ${blocker}`));
  }
  if (status.warnings.length) {
    lines.push('Warnings:');
    status.warnings.forEach((warning) => lines.push(`- ${warning}`));
  }

  return lines.join('\n');
}
```

Planner guidance:
- Do not move JSON envelope responsibility into `runtime-guidance`; keep CLI transport in `lib/cli.js`.
- `buildStatus()` remains the `changeStatus` source of truth.
- Path/glob refactors in this file should preserve read-only behavior: status/resume must not refresh hashes or create missing files.

---

### `lib/migrate.js` (service/utility, migration diagnostics)

**Analog:** same file

**Plan and status boundary** from `lib/migrate.js` lines 290-330 and 419-473:
```javascript
function createMigrationPlan(options = {}) {
  const cwd = path.resolve(options.cwd || process.cwd());
  const homeDir = path.resolve(options.homeDir || process.env.HOME || '');

  const plan = {
    cwd,
    homeDir,
    canonicalProjectRoot: getCanonicalProjectRoot(cwd),
    legacyProjectRoot: getLegacyProjectRoot(cwd),
    canonicalSharedHome: path.join(homeDir, '.opsx'),
    legacySharedHome: path.join(homeDir, '.openspec'),
    moves: [],
    creates: [],
    warnings: [],
    legacyCandidates: [],
    abortReason: ''
  };

  return plan;
}

function getMigrationStatus(options = {}) {
  const cwd = path.resolve(options.cwd || process.cwd());
  const homeDir = path.resolve(options.homeDir || process.env.HOME || '');
  const plan = createMigrationPlan({ cwd, homeDir });

  const status = {
    cwd: plan.cwd,
    homeDir: plan.homeDir,
    canonical: { /* root paths + existence */ },
    legacy: { /* root paths + candidates */ },
    migration: {
      pendingMoves: plan.moves.length,
      pendingCreates: plan.creates.length,
      warnings: plan.warnings.slice(),
      abortReason: plan.abortReason || ''
    }
  };

  return status;
}
```

Planner guidance: `status --json` should use `getMigrationStatus()` and project only summary/diagnostic fields into the envelope. Do not embed full move/create mapping; that remains `opsx migrate --dry-run`.

---

### `lib/generator.js` (generator, static transform)

**Analog:** same file

**Template rendering pattern** from `lib/generator.js` lines 70-91:
```javascript
function buildActionMarkdown(platform, action) {
  const template = loadTemplate('action.md.tmpl');
  const inlineArgumentNote = platform === 'codex'
    ? 'Do not assume text typed after a `$opsx-*` command is reliably available as an inline argument in Codex.'
    : 'Use inline arguments when available, but confirm ambiguous names or descriptions before mutating files.';
  const preflightLines = formatBullets(getPhaseThreePreflightLines());
  const fallbackLines = formatBullets(getActionFallbackLines(platform, action.id));
  return renderTemplate(template, {
    description: action.summary,
    title: `OpsX route: ${action.title}`,
    action: action.id,
    inline_argument_note: inlineArgumentNote,
    scope: action.scope,
    primary_workflow_syntax: getPrimaryWorkflowSyntax(platform),
    action_syntax: getActionSyntax(platform, action.id),
    preflight_note: preflightLines,
    fallback_note: fallbackLines
  });
}
```

**Bundle source-of-truth pattern** from `lib/generator.js` lines 142-171:
```javascript
function buildPlatformBundle(platform) {
  const files = {};
  const actions = getAllActions();

  if (platform === 'claude') {
    files['opsx.md'] = buildIndexMarkdown('claude', 'OpsX Workflow');
    actions.forEach((action) => {
      files[`opsx/${action.id}.md`] = buildActionMarkdown('claude', action);
    });
    return files;
  }

  if (platform === 'codex') {
    files['prompts/opsx.md'] = buildCodexEntryMarkdown();
    actions.forEach((action) => {
      files[`prompts/opsx-${action.id}.md`] = buildActionMarkdown('codex', action);
    });
    return files;
  }

  if (platform === 'gemini') {
    files['opsx.toml'] = buildGeminiIndexToml('OpsX Workflow');
    actions.forEach((action) => {
      files[`opsx/${action.id}.toml`] = buildGeminiActionToml(action);
    });
    return files;
  }

  throw new Error(`Unsupported platform: ${platform}`);
}
```

Planner guidance: update generator/templates when command text must change; do not hand-edit generated command files as the primary fix.

---

### `scripts/test-workflow-shared.js` (test utility, fixtures/process helpers)

**Analog:** extracted from `scripts/test-workflow-runtime.js`

**Imports and constants pattern** from `scripts/test-workflow-runtime.js` lines 1-42:
```javascript
#!/usr/bin/env node

const assert = require('assert');
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createHash } = require('crypto');
const YAML = require('yaml');
const { copyDir, ensureDir, removePath, writeText } = require('../lib/fs-utils');
const { REPO_ROOT, PACKAGE_VERSION } = require('../lib/constants');
const { normalizeConfig } = require('../lib/config');
const {
  RuntimeGuidanceError,
  validateSchemaGraph,
  buildRuntimeKernel,
  buildStatus,
  buildStatusText,
  buildResumeInstructions,
  buildContinueInstructions,
  buildArtifactInstructions,
  buildApplyInstructions
} = require('../lib/runtime-guidance');
const { buildPlatformBundle } = require('../lib/generator');
```

**Parity helper pattern** from `scripts/test-workflow-runtime.js` lines 173-232:
```javascript
function toPosixPath(filePath) {
  return filePath.split(path.sep).join('/');
}

function listFilesRecursive(rootDir) {
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursive(absolutePath));
      continue;
    }
    if (entry.isFile()) {
      files.push(absolutePath);
    }
  }

  return files;
}

function collectBundleParity(platform, generatedBundle) {
  const platformTarget = PLATFORM_BUNDLE_TARGETS[platform];
  const generatedPaths = Object.keys(generatedBundle).sort((left, right) => left.localeCompare(right));
  const generatedPathSet = new Set(generatedPaths);
  const missing = [];
  const mismatched = [];
  /* compare generated bundle to checked-in files */
}
```

**Fixture and CLI helper pattern** from `scripts/test-workflow-runtime.js` lines 280-379:
```javascript
function createFixtureRepo() {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-runtime-'));
  copyDir(path.join(REPO_ROOT, 'schemas'), path.join(fixtureRoot, 'schemas'));
  copyDir(path.join(REPO_ROOT, 'skills'), path.join(fixtureRoot, 'skills'));
  ensureDir(path.join(fixtureRoot, '.opsx', 'changes'));
  writeText(path.join(fixtureRoot, '.opsx', 'config.yaml'), [
    'schema: spec-driven',
    'language: en',
    'context: Runtime fixture project'
  ].join('\n'));
  return fixtureRoot;
}

function createChange(fixtureRoot, changeName, files = {}) {
  const changeDir = path.join(fixtureRoot, '.opsx', 'changes', changeName);
  ensureDir(changeDir);
  Object.keys(files).forEach((relativePath) => {
    const normalizedPath = relativePath === '.openspec.yaml' ? 'change.yaml' : relativePath;
    writeText(path.join(changeDir, normalizedPath), files[relativePath]);
  });
  return changeDir;
}

function runOpsxCli(args, options = {}) {
  const env = Object.assign({}, process.env, options.env || {});
  const result = spawnSync(process.execPath, [path.join(REPO_ROOT, 'bin', 'opsx.js'), ...args], {
    cwd: options.cwd || REPO_ROOT,
    env,
    encoding: 'utf8'
  });
  return {
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || ''
  };
}
```

Planner guidance:
- Export shared helpers instead of relying on globals after the split.
- Keep fixture cleanup explicit in the aggregate runner.
- Preserve Node `>=14.14.0`: keep `require('crypto')`, not `require('node:crypto')`.

---

### `scripts/test-workflow-runtime.js` (test runner, aggregate compatibility entrypoint)

**Analog:** same file

**Test registration pattern** from `scripts/test-workflow-runtime.js` lines 446-453:
```javascript
function runTests() {
  const tests = [];
  const fixtureRoot = createFixtureRepo();
  const cleanupTargets = [fixtureRoot];

  function test(name, fn) {
    tests.push({ name, fn });
  }
```

**Runner output and exit pattern** from `scripts/test-workflow-runtime.js` lines 5192-5213:
```javascript
let failures = 0;
tests.forEach(({ name, fn }, index) => {
  try {
    fn();
    console.log(`ok ${index + 1} - ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`not ok ${index + 1} - ${name}`);
    console.error(error && error.stack ? error.stack : error);
  }
});

cleanupTargets.forEach((target) => removePath(target));

if (failures) {
  console.error(`\n${failures} test(s) failed.`);
  process.exit(1);
}
console.log(`\n${tests.length} test(s) passed.`);
}

runTests();
```

Planner guidance:
- Keep this file as aggregate/compatibility entrypoint.
- After topic scripts exist, either require their exported `registerTests(test, helpers)` functions or spawn them deterministically.
- `npm run test:workflow-runtime` must remain available.

---

### `scripts/test-workflow-package.js` (integration test, package/release surface)

**Analog:** `scripts/test-workflow-runtime.js`, `scripts/check-phase1-legacy-allowlist.js`, `package.json`

**Package metadata baseline** from `package.json` lines 1-11 and 16-29:
```json
{
  "name": "@xenonbyte/opsx",
  "version": "3.0.0",
  "description": "AI-native operational spec execution workflow for Claude, Codex, and Gemini",
  "bin": {
    "opsx": "bin/opsx.js"
  },
  "scripts": {
    "postinstall": "node scripts/postinstall.js",
    "test:workflow-runtime": "node scripts/test-workflow-runtime.js"
  },
  "files": [
    "bin/",
    "lib/",
    "scripts/",
    "commands/",
    "skills/",
    "schemas/",
    "templates/",
    "config/",
    "docs/",
    "install.sh",
    "uninstall.sh",
    "README.md"
  ]
}
```

**Node floor assertion pattern** from `scripts/test-workflow-runtime.js` lines 523-535:
```javascript
test('declared Node 14 engine floor uses compatible CommonJS builtin imports', () => {
  const packageJson = require('../package.json');
  const nodeCryptoSpecifier = ['node', 'crypto'].join(':');
  assert.strictEqual(packageJson.engines.node, '>=14.14.0');
  [
    'scripts/test-workflow-runtime.js',
    'lib/change-artifacts.js'
  ].forEach((relativePath) => {
    const content = fs.readFileSync(path.join(REPO_ROOT, relativePath), 'utf8');
    assert(!content.includes(`require('${nodeCryptoSpecifier}')`), `${relativePath} must avoid node-prefixed crypto require.`);
    assert(!content.includes(`require("${nodeCryptoSpecifier}")`), `${relativePath} must avoid node-prefixed crypto require.`);
    assert(content.includes("require('crypto')"), `${relativePath} must use Node 14.14 compatible crypto require.`);
  });
});
```

**Public install/check/doc smoke pattern** from `scripts/test-workflow-runtime.js` lines 4984-5009:
```javascript
test('public install/check/doc/language command surface remains compatible', () => {
  const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'opsx-home-'));
  cleanupTargets.push(tempHome);

  const results = install({ platform: 'claude,codex,gemini', homeDir: tempHome, language: 'en' });
  assert.strictEqual(results.length, 3);

  const checkOutput = runCheck({ homeDir: tempHome, cwd: fixtureRoot });
  assert(checkOutput.includes('OpsX Installation Check'));
  assert(checkOutput.includes('Config'));
  assert(checkOutput.includes('Found 3 manifest(s)'));

  const englishDoc = showDoc({ homeDir: tempHome });
  assert(englishDoc.includes('# OpsX Guide'));

  const removed = uninstall({ platform: 'claude,codex,gemini', homeDir: tempHome });
  assert.deepStrictEqual(removed.sort(), ['claude', 'codex', 'gemini']);
});
```

**Legacy public-surface scan pattern** from `scripts/check-phase1-legacy-allowlist.js` lines 111-156:
```javascript
function main() {
  const files = resolveScanFiles();
  const unexpected = [];
  let allowedHitCount = 0;

  for (const relativePath of files) {
    const absolutePath = path.join(REPO_ROOT, relativePath);
    const content = fs.readFileSync(absolutePath, 'utf8');
    const lines = content.split(/\r?\n/);

    for (let index = 0; index < lines.length; index += 1) {
      const lineNumber = index + 1;
      const lineText = lines[index];
      const tokens = findLegacyTokens(lineText);
      if (!tokens.length) continue;
      if (isAllowedMatch(relativePath, lineText)) {
        allowedHitCount += tokens.length;
        continue;
      }
      unexpected.push({ filePath: relativePath, lineNumber, tokens });
    }
  }

  if (unexpected.length) {
    console.error('Phase 3 public-surface legacy token check FAILED.');
    process.exit(1);
  }
}
```

Planner guidance:
- Add `npm pack --dry-run --json` assertions here using `spawnSync` and repo-local `npm_config_cache=.npm-cache`.
- No existing pack JSON test exists; copy process execution style from `runOpsxCli()` lines 367-379.
- Assert `package.json.name`, `bin`, `files`, packed filenames, README presence, command files, skills, schemas, templates, docs, and absence of legacy public entries.

---

### `scripts/test-workflow-generation.js` (integration test, generated parity)

**Analog:** `scripts/test-workflow-runtime.js` generation block

**Generated bundle and route contract pattern** from `scripts/test-workflow-runtime.js` lines 4615-4675:
```javascript
test('runtime suite locks renamed skill targets, generated bundles, and checked-in command entries', () => {
  const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'opsx-home-surface-'));
  cleanupTargets.push(tempHome);

  const installResults = install({ platform: 'claude,codex,gemini', homeDir: tempHome, language: 'en' });
  assert.strictEqual(installResults.length, 3);

  const generatedBundles = {
    claude: buildPlatformBundle('claude'),
    codex: buildPlatformBundle('codex'),
    gemini: buildPlatformBundle('gemini')
  };

  const codexRoutesFromWorkflow = getAllActions()
    .map((action) => getActionSyntax('codex', action.id))
    .sort((left, right) => left.localeCompare(right));
  const expectedCodexRoutes = [...EXPECTED_CODEX_PUBLIC_ROUTES].sort((left, right) => left.localeCompare(right));
  assert.deepStrictEqual(codexRoutesFromWorkflow, expectedCodexRoutes);

  assert(generatedBundles.claude['opsx.md'].includes('OpsX'));
  assert(generatedBundles.claude['opsx.md'].includes('Primary workflow entry: `/opsx-<action>`'));
  assert(!generatedBundles.codex['prompts/opsx.md'].includes('$opsx <request>'));
});
```

**Parity assertion pattern** from `scripts/test-workflow-runtime.js` lines 4888-4906:
```javascript
const bundleParity = Object.fromEntries(
  Object.entries(generatedBundles).map(([platform, bundle]) => [
    platform,
    collectBundleParity(platform, bundle)
  ])
);
Object.entries(bundleParity).forEach(([platform, parity]) => {
  assert(parity.totalGenerated > 0, `${platform} generated bundle must not be empty`);
  assert(Array.isArray(parity.missing), `${platform} parity record must expose missing array`);
  assert(Array.isArray(parity.mismatched), `${platform} parity record must expose mismatched array`);
  assert(Array.isArray(parity.extra), `${platform} parity record must expose extra array`);
  assert.deepStrictEqual(parity.missing, [], `${platform} checked-in bundle is missing generated files`);
  assert.deepStrictEqual(parity.mismatched, [], `${platform} checked-in bundle has generated mismatches`);
  assert.deepStrictEqual(parity.extra, [], `${platform} checked-in bundle has extra tracked files outside generated output`);
  assert.strictEqual(parity.totalGenerated, parity.totalCheckedIn, `${platform} tracked checked-in count must match generated count`);
});
```

Planner guidance: move generation/parity assertions here with minimal semantic edits first; add release-only assertions after the split is green.

---

### `scripts/test-workflow-state.js` (integration test, status/migration/state)

**Analog:** `scripts/test-workflow-runtime.js` status, migration, runtime state blocks

**CLI migration/status smoke pattern** from `scripts/test-workflow-runtime.js` lines 4387-4561:
```javascript
test('opsx migrate --dry-run reports deterministic legacy repo/home mapping with zero writes', () => {
  const { fixtureRoot: statusFixture } = createLegacyMigrationRepoFixture({ changeName: 'demo' });
  const statusHome = fs.mkdtempSync(path.join(os.tmpdir(), 'opsx-status-home-'));
  cleanupTargets.push(statusFixture, statusHome);
  createLegacySharedHomeFixture(statusHome, { platform: 'codex' });

  const cliOptions = {
    cwd: statusFixture,
    env: { HOME: statusHome }
  };

  const migrateOutput = runOpsxCli(['migrate', '--dry-run'], cliOptions);
  assert.strictEqual(migrateOutput.status, 0, migrateOutput.stderr);
  assert(!fs.existsSync(path.join(statusFixture, '.opsx')), 'Dry-run must not create .opsx directory.');
});

test('opsx status reports truthful migration and onboard guidance when workspace is missing', () => {
  const { fixtureRoot: statusFixture } = createLegacyMigrationRepoFixture({ changeName: 'status-only' });
  const statusHome = fs.mkdtempSync(path.join(os.tmpdir(), 'opsx-status-home-guidance-'));
  cleanupTargets.push(statusFixture, statusHome);

  const statusOutput = runOpsxCli(['status'], {
    cwd: statusFixture,
    env: { HOME: statusHome }
  });
  assert.strictEqual(statusOutput.status, 0, statusOutput.stderr);
  assert(statusOutput.stdout.includes(`OpsX v${PACKAGE_VERSION}`));
  assert(statusOutput.stdout.includes('Workspace not initialized: `.opsx/config.yaml` is missing.'));
});
```

**Read-only status/resume pattern** from `scripts/test-workflow-runtime.js` lines 2903-2949:
```javascript
test('status and resume read partial state without auto-creating files', () => {
  const changeName = 'partial-state-read-only';
  const changeDir = createChange(fixtureRoot, changeName, {
    'proposal.md': '# Proposal from fixture\n'
  });
  const statePath = path.join(changeDir, 'state.yaml');
  const contextPath = path.join(changeDir, 'context.md');
  const driftPath = path.join(changeDir, 'drift.md');

  writeText(statePath, `${YAML.stringify({
    change: changeName,
    stage: 'SPECS_READY',
    warnings: 'legacy warning from sparse state',
    blockers: ['waiting for review']
  })}\n`);
  const stateBefore = fs.readFileSync(statePath, 'utf8');

  const status = buildStatus({ repoRoot: fixtureRoot, changeName });
  assert.strictEqual(status.stage, 'SPECS_READY');
  assert.strictEqual(status.nextAction, 'design');
  assert(status.warnings.includes('legacy warning from sparse state'));

  const resume = buildResumeInstructions({ repoRoot: fixtureRoot, changeName });
  assert.strictEqual(resume.route, 'opsx-design');

  assert.strictEqual(fs.readFileSync(statePath, 'utf8'), stateBefore);
  assert.strictEqual(fs.existsSync(contextPath), false);
  assert.strictEqual(fs.existsSync(driftPath), false);
});
```

**Stable machine-readable status pattern** from `scripts/test-workflow-runtime.js` lines 3139-3147:
```javascript
test('status output is stable and machine-readable across repeated calls', () => {
  const changeName = 'status-stable';
  createChange(fixtureRoot, changeName, {});
  const first = buildStatus({ repoRoot: fixtureRoot, changeName });
  const second = buildStatus({ repoRoot: fixtureRoot, changeName });
  assert.deepStrictEqual(first, second);
  assert.strictEqual(first.artifacts.proposal.state, 'ready');
  assert.strictEqual(first.next.artifactId, 'proposal');
});
```

Planner guidance:
- Add `opsx status --json` matrix tests here.
- Assert `stdout` parses with `JSON.parse`, `stderr === ''`, and exit `0` for missing workspace, missing active change, migration candidates, warnings/blockers, and active change.
- Assert true exceptional cases still go through stderr/non-zero.

---

### `scripts/test-workflow-paths.js` (integration test, path/glob behavior)

**Analog:** `scripts/test-workflow-runtime.js` path-scope and artifact hashing tests

**Path-scope assertions** from `scripts/test-workflow-runtime.js` lines 630-677:
```javascript
test('matchPathScope uses picomatch globs for allowed and forbidden paths', () => {
  const { matchPathScope } = require('../lib/path-scope');
  const result = matchPathScope(
    [
      'lib/verify.js',
      'lib\\windows\\gate.js',
      'secrets/private.pem',
      'src/index.js'
    ],
    {
      allowedPaths: ['lib/**'],
      forbiddenPaths: ['*.pem']
    }
  );

  assert.strictEqual(result.hasAllowedScope, true);
  assert.deepStrictEqual(result.allowedMatches.sort((left, right) => left.localeCompare(right)), [
    'lib/verify.js',
    'lib/windows/gate.js'
  ]);
  assert.deepStrictEqual(result.forbiddenMatches, ['secrets/private.pem']);
  assert.deepStrictEqual(result.outOfScopeMatches, ['src/index.js']);
});
```

**Tracked artifact hash assertions** from `scripts/test-workflow-runtime.js` lines 2509-2543:
```javascript
test('change-artifacts hashes tracked Phase 4 artifacts deterministically', () => {
  const { hashTrackedArtifacts, detectArtifactHashDrift } = require('../lib/change-artifacts');
  const changeName = 'tracked-artifact-hash';
  const changeDir = createChange(fixtureRoot, changeName, {
    'proposal.md': '# Proposal\n',
    'design.md': '# Design\n',
    'security-review.md': '# Security review\n',
    'tasks.md': '## 1. Group\n- [ ] 1.1 Work\n',
    'specs/core/spec.md': '## ADDED Requirements\n### Requirement: Core\n',
    'specs/edge/spec.md': '## ADDED Requirements\n### Requirement: Edge\n',
    'specs/README.md': 'Ignored non-spec artifact\n'
  });

  const first = hashTrackedArtifacts(changeDir);
  const second = hashTrackedArtifacts(changeDir);
  assert.deepStrictEqual(first, second);
  assert.deepStrictEqual(Object.keys(first), [
    'design.md',
    'proposal.md',
    'security-review.md',
    'specs/core/spec.md',
    'specs/edge/spec.md',
    'tasks.md'
  ]);
});
```

Planner guidance: add fixtures with glob-special literal names, for example `specs/a[bracket]/spec.md`, `specs/question?/spec.md`, and files containing `*` or `[` in path segments. Tests should prove literal escaping and pattern matching are distinct.

---

### `scripts/test-workflow-gates.js` (integration test, gates/batch)

**Analog:** `scripts/test-workflow-runtime.js` verify/sync/archive/batch blocks

**Archive gate fixture pattern** from `scripts/test-workflow-runtime.js` lines 1205-1344:
```javascript
test('archive gate blocks unsafe verify and sync prerequisites', () => {
  const { evaluateArchiveGate } = require('../lib/archive');
  const { writeChangeState } = require('../lib/change-store');
  const { hashTrackedArtifacts } = require('../lib/change-artifacts');
  const now = new Date().toISOString();

  const verifyBlockedChangeName = 'archive-gate-verify-blocked';
  const verifyBlockedChangeDir = createChange(fixtureRoot, verifyBlockedChangeName, {
    'proposal.md': '# Proposal\n',
    'design.md': '# Design\n',
    'tasks.md': [
      '## 1. Incomplete task group',
      '- TDD Class: behavior-change',
      '- [x] RED: add archive gate regression coverage',
      '- [ ] GREEN: implement archive precondition enforcement',
      '- [ ] VERIFY: run workflow runtime regression'
    ].join('\n'),
    'specs/runtime/spec.md': [
      '## ADDED Requirements',
      '### Requirement: Archive gate verify prerequisite',
      'The system SHALL block archive when verify prerequisites are incomplete.'
    ].join('\n')
  });
  writeChangeState(verifyBlockedChangeDir, {
    change: verifyBlockedChangeName,
    stage: 'VERIFIED',
    hashes: hashTrackedArtifacts(verifyBlockedChangeDir),
    checkpoints: { execution: { status: 'PASS', updatedAt: now } },
    allowedPaths: ['lib/**'],
    forbiddenPaths: ['*.pem']
  });

  const verifyBlockedGate = evaluateArchiveGate({
    changeDir: verifyBlockedChangeDir,
    changedFiles: ['lib/archive.js']
  });
  assert.strictEqual(verifyBlockedGate.status, 'BLOCK');
  assert(verifyBlockedGate.findings.some((finding) => finding.code === 'archive-verify-blocked'));
});
```

**Batch isolation pattern** from `scripts/test-workflow-runtime.js` lines 1554-1623 and 1625-1771:
```javascript
test('runBatchApply isolates per-change readiness and skip reasons', () => {
  const { runBatchApply } = require('../lib/batch');
  const { writeChangeState } = require('../lib/change-store');
  const { hashTrackedArtifacts } = require('../lib/change-artifacts');

  const readyChangeName = 'batch-ready-change';
  const readyChangeDir = createChange(fixtureRoot, readyChangeName, {
    'proposal.md': '# Proposal\n',
    'design.md': '# Design\n',
    'tasks.md': '## 1. Ready group\n- [ ] RED: add batch apply coverage\n'
  });
  writeChangeState(readyChangeDir, {
    change: readyChangeName,
    stage: 'TASKS_READY',
    hashes: hashTrackedArtifacts(readyChangeDir)
  });

  const result = runBatchApply({
    repoRoot: fixtureRoot,
    changeNames: [readyChangeName, 'batch-skipped-change', 'batch-malformed-change']
  });

  assert.strictEqual(result.status, 'PASS');
  assert.strictEqual(result.summary.ready, 1);
  assert.strictEqual(result.summary.skipped, 1);
  assert.strictEqual(result.summary.blocked, 1);
});
```

Planner guidance: move existing gate assertions without rewriting semantics, then add any Phase 8 path/glob regression that specifically protects gate inputs.

---

### `package.json` (config, release/test scripts)

**Analog:** existing `package.json`

**Current scripts/dependencies/files pattern** from `package.json` lines 8-15 and 50-52:
```json
"scripts": {
  "postinstall": "node scripts/postinstall.js",
  "test:workflow-runtime": "node scripts/test-workflow-runtime.js"
},
"dependencies": {
  "picomatch": "4.0.4",
  "yaml": "2.8.3"
},
"engines": {
  "node": ">=14.14.0"
}
```

Planner guidance:
- Add `"test": "node scripts/test-workflow-runtime.js"` or a dedicated aggregate runner once topic scripts exist.
- Add topic scripts for package/generation/state/paths/gates.
- Keep `test:workflow-runtime` stable.
- Do not add a new glob dependency unless planning intentionally rejects the research recommendation.

---

### Release-facing docs (`README.md`, `README-zh.md`, `CHANGELOG.md`, `docs/*.md`)

**Analog:** existing README/docs/changelog files

**README CLI surface pattern** from `README.md` lines 15-27:
````markdown
## CLI Surface

```bash
opsx install --platform <claude|codex|gemini[,...]>
opsx uninstall --platform <claude|codex|gemini[,...]>
opsx check
opsx doc
opsx language <en|zh>
opsx migrate
opsx status
opsx --help
opsx --version
```
````

**README workspace/config pattern** from `README.md` lines 47-63:
```markdown
## Project Config

OpsX project-level workflow defaults now live in `.opsx/config.yaml`.
Use `opsx migrate --dry-run` to print the exact `MOVE`/`CREATE` mapping with
zero writes. Run `opsx migrate` to execute the same plan; it aborts by default
if `.opsx/` already exists.

Workspace tracking policy:
- Tracked: `.opsx/config.yaml`, `.opsx/active.yaml`, `.opsx/changes/**`, `.opsx/specs/**`, `.opsx/archive/**`
- Ignored: `.opsx/cache/**`, `.opsx/tmp/**`, `.opsx/logs/**`
```

**Command docs pattern** from `docs/commands.md` lines 51-73:
````markdown
## CLI Commands

```bash
opsx install --platform <claude|codex|gemini[,...]>
opsx uninstall --platform <claude|codex|gemini[,...]>
opsx check
opsx doc
opsx language <en|zh>
opsx migrate
opsx status
opsx --help
opsx --version
```

Behavior notes:
- `install` / `uninstall` require `--platform` and support comma-separated multi-platform values.
- Installation always deploys the full command surface; there is no profile split.
- `migrate` and `status` are included in the command surface; deeper migration/state workflows are delivered in later phases.
````

**Runtime docs pattern** from `docs/runtime-guidance.md` lines 6-15 and 27-41:
```markdown
## Internal APIs
- `buildRuntimeKernel(options)`  
  Loads schema + change context, validates dependencies, computes completion/readiness state, and resolves the next artifact/stage.
- `buildStatus(options)`  
  Returns machine-readable progress/state output for agent status flows.

## Compatibility Notes
- Runtime artifact resolution reads current OpsX workspace artifacts only:
  - project config: `.opsx/config.yaml`
  - active change pointer: `.opsx/active.yaml`
  - per-change metadata: `.opsx/changes/<name>/change.yaml`
- Migration commands (`opsx migrate --dry-run` / `opsx migrate`) may still translate older pre-v3.0 workspace layouts, but those layouts are not part of current runtime guidance.
```

**Changelog pattern** from `CHANGELOG.md` lines 3-10:
```markdown
## v3.0.0

Release date: 2026-04-27

Highlights:
- Ship the breaking rename from OpenSpec to OpsX on the public surface: npm package `@xenonbyte/opsx`, CLI `opsx`, and distributed skill bundle `skills/opsx`
- Do not ship an `openspec` executable alias in `@xenonbyte/opsx@3.0.0`; any compatibility bridge belongs to a separate `@xenonbyte/openspec@2.x` follow-up
```

Planner guidance:
- Update English and Chinese docs together when the content exists in both README files.
- Add `opsx status --json`, `npm test`, topic scripts, release/preflight gate, and `npm pack --dry-run --json` only after implementation names settle.
- Preserve the clean break: do not reintroduce public legacy route strings outside explicitly allowlisted history/migration notes.

## Shared Patterns

### CommonJS and Node 14 Compatibility
**Source:** `package.json` lines 50-52 and `scripts/test-workflow-runtime.js` lines 523-535  
**Apply to:** all new `lib/*.js` and `scripts/*.js`
```javascript
const packageJson = require('../package.json');
const nodeCryptoSpecifier = ['node', 'crypto'].join(':');
assert.strictEqual(packageJson.engines.node, '>=14.14.0');
assert(!content.includes(`require('${nodeCryptoSpecifier}')`));
assert(content.includes("require('crypto')"));
```

### CLI Transport vs Library Truth
**Source:** `lib/cli.js` lines 77-140, `lib/runtime-guidance.js` lines 705-748, `lib/migrate.js` lines 419-473  
**Apply to:** `status --json` implementation
```javascript
const migration = getMigrationStatus({ cwd, homeDir });
const activePointer = loadActiveChangePointer(cwd);
const changeStatus = activePointer.activeChange
  ? buildStatus({ repoRoot: cwd, homeDir, changeName: activePointer.activeChange })
  : null;
```
Planner note: this is an inferred composition from existing exports; keep it as a thin serialization adapter.

### Deterministic Sorting
**Source:** `lib/fs-utils.js` line 62, `lib/change-artifacts.js` lines 35-38, `lib/path-scope.js` line 98  
**Apply to:** path/glob utilities and tests
```javascript
return files.sort();

const trackedPaths = listFiles(resolvedChangeDir)
  .map((entry) => toUnixPath(entry))
  .filter((entry) => isTrackedArtifactPath(entry))
  .sort((left, right) => left.localeCompare(right));
```

### No Source-of-Truth Drift for Generated Commands
**Source:** `lib/generator.js` lines 142-171 and `scripts/test-workflow-runtime.js` lines 4888-4906  
**Apply to:** generated commands and release gate
```javascript
const generatedBundles = {
  claude: buildPlatformBundle('claude'),
  codex: buildPlatformBundle('codex'),
  gemini: buildPlatformBundle('gemini')
};

assert.deepStrictEqual(parity.missing, [], `${platform} checked-in bundle is missing generated files`);
assert.deepStrictEqual(parity.mismatched, [], `${platform} checked-in bundle has generated mismatches`);
assert.deepStrictEqual(parity.extra, [], `${platform} checked-in bundle has extra tracked files outside generated output`);
```

### Release Surface Legacy Scan
**Source:** `scripts/check-phase1-legacy-allowlist.js` lines 11-21 and 96-108  
**Apply to:** `scripts/test-workflow-package.js`, release gate
```javascript
const SCAN_TARGETS = [
  'README.md',
  'README-zh.md',
  'docs',
  'skills/opsx',
  'templates',
  'commands',
  'scripts/postinstall.js',
  'lib/cli.js',
  'AGENTS.md'
];

function classifySurface(filePath) {
  if (filePath === 'README.md' || filePath === 'README-zh.md') return 'forbidden public docs surface';
  if (filePath.startsWith('commands/')) return 'forbidden generated command surface';
  if (filePath.startsWith('docs/')) return 'forbidden docs surface';
  return 'unexpected legacy reference';
}
```

### Test Harness
**Source:** `scripts/test-workflow-runtime.js` lines 446-453 and 5192-5213  
**Apply to:** all topic scripts if they run standalone, and the aggregate runner
```javascript
function test(name, fn) {
  tests.push({ name, fn });
}

tests.forEach(({ name, fn }, index) => {
  try {
    fn();
    console.log(`ok ${index + 1} - ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`not ok ${index + 1} - ${name}`);
    console.error(error && error.stack ? error.stack : error);
  }
});
```

## No Analog Found

No file is without a usable analog. The only missing exact assertion pattern is `npm pack --dry-run --json`; implement it in `scripts/test-workflow-package.js` using the existing `spawnSync` process helper style from `scripts/test-workflow-runtime.js` lines 367-379 and the package metadata baseline from `package.json` lines 1-29.

## Metadata

**Analog search scope:** `lib/`, `scripts/`, `docs/`, `README*.md`, `CHANGELOG.md`, `package.json`, `bin/`, phase artifacts in `.planning/phases/08-stability-json-and-release-coverage/`  
**Files scanned:** 100+ repo files via `rg --files`; 18 source/doc analog files read with line numbers; large test file sampled through targeted non-overlapping ranges  
**Pattern extraction date:** 2026-04-29
