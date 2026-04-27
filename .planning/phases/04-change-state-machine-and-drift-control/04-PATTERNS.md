# Phase 04: Change State Machine and Drift Control - Pattern Map

**Mapped:** 2026-04-27
**Files analyzed:** 19 file groups
**Analogs found:** 19 / 19

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `lib/change-state.js` | service / state machine | event-driven / request-response | `lib/workflow.js` | role-match |
| `lib/change-store.js` | service / storage | file-I/O / CRUD | `lib/workspace.js` + `lib/migrate.js` | role-match |
| `lib/change-artifacts.js` | service / utility | file-I/O / transform | `lib/runtime-guidance.js` + `lib/fs-utils.js` | role-match |
| `lib/change-capsule.js` | service / utility | file-I/O / transform | `lib/workspace.js` | role-match |
| `lib/workspace.js` | utility / scaffold | file-I/O / CRUD | `lib/workspace.js` | exact |
| `lib/runtime-guidance.js` | service / read model | request-response / transform | `lib/runtime-guidance.js` | exact |
| `lib/cli.js` | controller | request-response | `lib/cli.js` | exact |
| `lib/workflow.js` | config / workflow rules | event-driven / transform | `lib/workflow.js` | exact |
| `lib/generator.js` | service / generator | transform | `lib/generator.js` | exact |
| `lib/fs-utils.js` | utility | file-I/O | `lib/fs-utils.js` | exact |
| `lib/yaml.js` | utility / serializer | transform | `lib/yaml.js` | partial |
| `package.json` | config | config / dependency metadata | `package.json` | exact |
| `scripts/test-workflow-runtime.js` | test | request-response / file-I/O | `scripts/test-workflow-runtime.js` | exact |
| `skills/opsx/SKILL.md` | skill provider | request-response guidance | `skills/opsx/SKILL.md` | exact |
| `skills/opsx/references/action-playbooks.md` | skill reference | request-response guidance | `skills/opsx/references/action-playbooks.md` | exact |
| `skills/opsx/references/artifact-templates.md` | skill reference / template rules | scaffold / guidance | `skills/opsx/references/artifact-templates.md` | exact |
| `templates/project/change-metadata.yaml.tmpl` | template | scaffold | `templates/project/change-metadata.yaml.tmpl` | exact |
| `templates/commands/*.tmpl` | prompt template | transform | `templates/commands/action.md.tmpl` + `templates/commands/codex-entry.md.tmpl` | exact |
| `commands/{claude,codex,gemini}/opsx*` | generated prompt output | transform / request-response | `lib/generator.js` + `templates/commands/*.tmpl` | generated |

## Pattern Assignments

### `lib/change-state.js` (service / state machine, event-driven)

**Analog:** `lib/workflow.js`

**Imports / constants pattern** (lines 1-2, 147-150):
```javascript
const { DEFAULT_SCHEMA, PRODUCT_SHORT_NAME, SHARED_HOME_NAME } = require('./constants');
const { loadSchema } = require('./schema');

const REVIEW_STATES = ['required', 'recommended', 'waived', 'completed'];
const CHECKPOINT_STATES = ['PASS', 'WARN', 'BLOCK'];
const DEFAULT_HEURISTIC_INPUTS = ['request', 'proposal', 'specs', 'design'];
const DEFAULT_CHECKPOINT_IDS = ['spec-checkpoint', 'task-checkpoint', 'execution-checkpoint'];
```

**Strict result shape pattern** (lines 824-854):
```javascript
function buildCheckpointResult(schema, checkpointId, findings = [], extra = {}) {
  const checkpoint = getCheckpointDefinition(schema, checkpointId);
  const normalizedFindings = findings.map(normalizeFinding);
  const patchTargets = unique(normalizedFindings.flatMap((finding) => finding.patchTargets));
  const status = resolveCheckpointStatus(normalizedFindings);
  return {
    checkpoint: checkpoint.id,
    phase: checkpoint.phase || extra.phase || 'planning',
    status,
    findings: normalizedFindings,
    nextStep: extra.nextStep || buildCheckpointNextStep(checkpoint.id, status, patchTargets),
    patchTargets,
    updatesExistingArtifactsOnly: true,
    createsArtifacts: [],
    trigger: checkpoint.trigger || null,
    insertion: checkpoint.insertion || null
  };
}
```

**Mutation/checkpoint validation pattern** (lines 1133-1238): `runExecutionCheckpoint()` collects evidence, adds `BLOCK` / `WARN` findings, and returns the normalized checkpoint result. Copy that shape for invalid mutation transitions: return a blocking result with code, message, patch targets, warnings, and next step rather than throwing for ordinary lifecycle blocks.

**Generation/export pattern** (lines 1956-1974):
```javascript
module.exports = {
  ACTIONS,
  REVIEW_STATES,
  CHECKPOINT_STATES,
  getAction,
  getAllActions,
  getActionSyntax,
  getPrimaryWorkflowSyntax,
  getPhaseThreePreflightLines,
  getActionFallbackLines,
  resolveSecurityReviewState,
  resolveWorkflowState,
  summarizeWorkflowState,
  normalizePlanningEvidence,
  normalizeExecutionEvidence,
  runSpecCheckpoint,
  runTaskCheckpoint,
  runExecutionCheckpoint,
  validatePhaseOneWorkflowContract,
```

**Apply:** define stage/event constants and pure transition helpers here. There is no local XState analog; use the XState pure-transition pattern from `04-RESEARCH.md`, but keep disk YAML as domain state rather than raw XState snapshots.

---

### `lib/change-store.js` (service / storage, file-I/O / CRUD)

**Analog:** `lib/workspace.js` and `lib/migrate.js`

**Path safety pattern** (`lib/workspace.js` lines 6-13):
```javascript
function ensureWithinBase(basePath, targetPath, errorCode) {
  const resolvedBase = path.resolve(basePath);
  const resolvedTarget = path.resolve(targetPath);
  const relativePath = path.relative(resolvedBase, resolvedTarget);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new Error(`Refusing to use path outside ${errorCode} root: ${targetPath}`);
  }
}
```

**Canonical path helpers** (`lib/workspace.js` lines 15-37):
```javascript
function getCanonicalProjectRoot(repoRoot) {
  return path.join(path.resolve(repoRoot), '.opsx');
}

function getCanonicalChangesDir(repoRoot) {
  return path.join(getCanonicalProjectRoot(repoRoot), 'changes');
}

function getCanonicalActivePath(repoRoot) {
  return path.join(getCanonicalProjectRoot(repoRoot), 'active.yaml');
}

function getCanonicalChangeMetadataPath(changeDir) {
  return path.join(path.resolve(changeDir), 'change.yaml');
}
```

**Non-overwrite scaffold writer** (`lib/workspace.js` lines 149-177):
```javascript
function writeChangeScaffoldsIfMissing(changeDir, changeName) {
  const resolvedChangeDir = path.resolve(changeDir);
  const outputs = [];
  const statePath = path.join(resolvedChangeDir, 'state.yaml');
  const contextPath = path.join(resolvedChangeDir, 'context.md');
  const driftPath = path.join(resolvedChangeDir, 'drift.md');

  ensureWithinBase(resolvedChangeDir, statePath, 'change');
  ensureWithinBase(resolvedChangeDir, contextPath, 'change');
  ensureWithinBase(resolvedChangeDir, driftPath, 'change');

  if (!fs.existsSync(statePath)) {
    writeText(statePath, `${buildInitialState(changeName, resolvedChangeDir)}\n`);
    outputs.push(statePath);
  }
```

**Two-pass mutation preflight** (`lib/migrate.js` lines 365-383):
```javascript
function runMigration(options = {}) {
  const cwd = path.resolve(options.cwd || process.cwd());
  const homeDir = path.resolve(options.homeDir || process.env.HOME || '');
  const dryRun = options.dryRun === true;

  if (dryRun) {
    const plan = createMigrationPlan({ cwd, homeDir });
    return formatMigrationPlan(plan, { dryRun: true });
  }

  const firstPreflight = createMigrationPlan({ cwd, homeDir });
  if (firstPreflight.abortReason) {
    throw new Error(`Migration aborted: ${firstPreflight.abortReason}`);
  }

  const plan = createMigrationPlan({ cwd, homeDir });
  if (plan.abortReason) {
    throw new Error(`Migration aborted: ${plan.abortReason}`);
  }
```

**Apply:** load `.opsx/active.yaml`, `change.yaml`, `state.yaml`, `context.md`, and `drift.md` with path containment checks. Keep read-only loaders non-mutating. For accepted writes, use an atomic helper added to `lib/fs-utils.js`.

---

### `lib/change-artifacts.js` (service / utility, file-I/O / transform)

**Analog:** `lib/runtime-guidance.js` and `lib/fs-utils.js`

**File inventory pattern** (`lib/fs-utils.js` lines 41-53):
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

**Artifact matching pattern** (`lib/runtime-guidance.js` lines 256-275):
```javascript
function resolveChangeFileMatches(changeDir, pathPattern) {
  const files = listFiles(changeDir).map((relativePath) => toUnixPath(relativePath));
  const pattern = compilePathPattern(pathPattern);
  return files.filter((relativePath) => pattern.test(relativePath)).sort();
}

function detectArtifactCompletion(options = {}) {
  const graph = options.graph || validateSchemaGraph(options.schema, options);
  const changeDir = options.changeDir;
  if (!changeDir) {
    throw new RuntimeGuidanceError('invalid-change-path', 'changeDir is required for completion detection.');
  }
  return graph.artifacts.reduce((output, artifact) => {
```

**Task group parser pattern** (`lib/runtime-guidance.js` lines 537-557):
```javascript
function parseTopLevelTaskGroups(tasksText) {
  const text = normalizeSourceBlock(tasksText);
  const headingMatches = Array.from(text.matchAll(/^##\s+(\d+\.\s+.+)$/gm));
  return headingMatches.map((match, index) => {
    const start = match.index;
    const end = index + 1 < headingMatches.length ? headingMatches[index + 1].index : text.length;
    const block = text.slice(start, end).trim();
    const checklist = Array.from(block.matchAll(/^- \[([ xX])\]\s+(.+)$/gm)).map((item) => ({
      done: item[1].toLowerCase() === 'x',
      text: item[2].trim()
    }));
```

**Apply:** reuse sorted relative paths for deterministic SHA-256 hashing. Do not treat `detectArtifactCompletion()` as lifecycle truth after `opsx-new`; it is only artifact inventory once placeholder files exist.

---

### `lib/change-capsule.js` (service / utility, file-I/O / transform)

**Analog:** `lib/workspace.js`

**Context markdown generation pattern** (`lib/workspace.js` lines 85-113):
```javascript
function buildInitialContext(changeName, changeDir) {
  const resolvedChangeDir = path.resolve(changeDir);
  const artifacts = [];
  const metadataPath = getCanonicalChangeMetadataPath(resolvedChangeDir);
  const proposalPath = path.join(resolvedChangeDir, 'proposal.md');
  const specsPath = path.join(resolvedChangeDir, 'specs');
  const designPath = path.join(resolvedChangeDir, 'design.md');
  const tasksPath = path.join(resolvedChangeDir, 'tasks.md');

  if (fs.existsSync(metadataPath)) artifacts.push('- change.yaml');
```

**Drift ledger heading pattern** (`lib/workspace.js` lines 116-129):
```javascript
function buildInitialDrift() {
  return [
    '# Drift Log',
    '',
    '## New Assumptions',
    '',
    '## Scope Changes',
    '',
    '## Out-of-Bound File Changes',
    '',
    '## Discovered Requirements',
    '',
    '## User Approval Needed'
  ].join('\n');
}
```

**Apply:** generate `context.md` from normalized state, warnings, blockers, active task group, and last verification. Append timestamped entries under the existing `drift.md` headings; do not parse business logic back out of markdown.

---

### `lib/workspace.js` (utility / scaffold, file-I/O / CRUD)

**Analog:** `lib/workspace.js`

**Current initial state scaffold** (lines 56-82):
```javascript
function buildInitialState(changeName, changeDir) {
  const stage = inferChangeStage(changeDir);
  return stringifyYaml({
    version: 1,
    change: String(changeName || '').trim(),
    stage,
    nextAction: stage === 'tasks'
      ? 'Continue with execution tasks and checkpoints.'
      : stage === 'design'
        ? 'Create tasks.md after reviewing design.'
```

**Active pointer writer** (lines 132-147):
```javascript
function writeActiveStateIfMissing(repoRoot, activeChange = '') {
  const activePath = getCanonicalActivePath(repoRoot);
  const projectRoot = getCanonicalProjectRoot(repoRoot);
  ensureWithinBase(projectRoot, activePath, '.opsx project');
  if (fs.existsSync(activePath)) {
    return { path: activePath, created: false };
  }

  ensureDir(path.dirname(activePath));
  writeText(activePath, `${stringifyYaml({
    version: 1,
    activeChange: String(activeChange || ''),
    updatedAt: new Date().toISOString()
  })}\n`);
```

**Apply:** keep path helpers here. Add or delegate `createChangeSkeleton()` here only if it stays a narrow scaffold creator. Use full Phase 4 state shape instead of the sparse migration-only `buildInitialState()` shape for new changes.

---

### `lib/runtime-guidance.js` (service / read model, request-response / transform)

**Analog:** `lib/runtime-guidance.js`

**Error class and validation pattern** (lines 13-20, 26-50, 72-80):
```javascript
class RuntimeGuidanceError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'RuntimeGuidanceError';
    this.code = code;
    this.details = details;
  }
}

function ensureSafeChangeName(changeName) {
  const normalized = String(changeName || '').trim();
```

**Runtime config loader pattern** (lines 96-138):
```javascript
function resolveRuntimeConfig(options = {}) {
  const repoRoot = options.repoRoot || REPO_ROOT;
  const homeDir = options.homeDir || process.env.HOME;
  const changeName = ensureSafeChangeName(options.changeName);
  const opsxDir = path.join(repoRoot, '.opsx');
  const changesDir = path.join(opsxDir, 'changes');
  const changeDir = path.join(changesDir, changeName);

  ensureInside(changesDir, changeDir, 'invalid-change-path');
  if (!fs.existsSync(changeDir) || !fs.statSync(changeDir).isDirectory()) {
```

**Kernel read-model pattern** (lines 559-609):
```javascript
function buildRuntimeKernel(options = {}) {
  const runtime = resolveRuntimeConfig(options);
  const schemaName = options.schemaName || runtime.changeConfig.schema || runtime.config.schema || DEFAULT_SCHEMA;
  const schema = ensureSchema(schemaName, options);
  const graph = validateSchemaGraph(schema, { schemaName });
  const completion = detectArtifactCompletion({ graph, changeDir: runtime.changeDir });
  const sources = mergeRuntimeSources(options.sources, collectArtifactSources(runtime.changeDir));
  const artifactPresence = graph.artifacts.reduce((output, artifact) => {
```

**Status payload pattern** (lines 611-634):
```javascript
function buildStatus(options = {}) {
  const kernel = buildRuntimeKernel(options);
  return {
    change: kernel.change,
    schema: kernel.schema,
    progress: kernel.progress,
    summary: kernel.stateSummary,
    artifacts: kernel.graph.artifacts.reduce((output, artifact) => {
```

**Apply payload pattern** (lines 723-810): `buildApplyInstructions()` returns `{ change, schema, ready, prerequisites, checkpoint, remainingTaskGroups, nextTaskGroup }` and has a `format: 'text'` renderer. Extend this payload with persisted stage, hash drift warnings, `active.taskGroup`, and verification log evidence.

---

### `lib/cli.js` (controller, request-response)

**Analog:** `lib/cli.js`

**Argument parsing pattern** (lines 15-37):
```javascript
function parseArgs(argv) {
  const options = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      options._.push(token);
      continue;
    }
```

**Status renderer pattern** (lines 75-99):
```javascript
function showStatus(options = {}) {
  const cwd = options.cwd || process.cwd();
  const homeDir = options.homeDir || process.env.HOME;
  const status = getMigrationStatus({ cwd, homeDir });
  const canonicalProjectConfigPath = path.join(cwd, '.opsx', 'config.yaml');
  const legacyProjectConfigPath = path.join(cwd, LEGACY_PROJECT_DIR, 'config.yaml');
  return [
    showVersion(),
```

**Thin routing pattern** (lines 101-187): `runCli()` parses once, switches on the first positional command, prints command output, and throws on unknown commands. Add `status --json` and any narrow `new` wrapper here; delegate all state logic to library modules.

---

### `lib/workflow.js` (config / workflow rules, event-driven / transform)

**Analog:** `lib/workflow.js`

**Action registry and preflight/fallback pattern** (lines 9-45, 96-145):
```javascript
const ACTIONS = [
  {
    id: 'propose',
    title: 'Propose',
    summary: 'Create a change and generate planning artifacts in one step.',
    scope: 'Keep planning-phase edits inside the active change workspace unless the user explicitly asks to move into implementation.'
  },
```

```javascript
const PHASE_THREE_PREFLIGHT_LINES = Object.freeze([
  'Read `.opsx/config.yaml` if present to confirm schema, language, and workspace rules.',
  'Read `.opsx/active.yaml` if present to locate the active change pointer.',
  'When an active change exists, read `.opsx/changes/<active-change>/state.yaml` before acting.',
  'When an active change exists, read `.opsx/changes/<active-change>/context.md` before acting.',
  'When an active change exists, read current artifacts (`proposal.md`, `specs/`, `design.md`, optional `security-review.md`, and `tasks.md`) before mutating files.'
]);
```

**Checkpoint contract pattern** (lines 1419-1430): schema validation ensures required checkpoint IDs and canonical `PASS`, `WARN`, `BLOCK` states exist. Add similar validation for Phase 4 stage names and mutation events.

**Route syntax pattern** (lines 1913-1953):
```javascript
function getActionSyntax(platform, actionId) {
  if (platform === 'claude') return `/opsx-${actionId}`;
  if (platform === 'gemini') return `/opsx-${actionId}`;
  if (platform === 'codex') return `$opsx-${actionId}`;
  return actionId;
}

function getPhaseThreePreflightLines() {
  return [...PHASE_THREE_PREFLIGHT_LINES];
}
```

**Apply:** update shared preflight text here first so `lib/generator.js`, generated command files, and tests stay aligned.

---

### `lib/generator.js` and `templates/commands/*.tmpl` (generator / prompt templates, transform)

**Analog:** `lib/generator.js`, `templates/commands/action.md.tmpl`, `templates/commands/codex-entry.md.tmpl`

**Generator imports pattern** (`lib/generator.js` lines 5-13):
```javascript
const {
  getAllActions,
  getActionSyntax,
  getPrimaryWorkflowSyntax,
  getPhaseThreePreflightLines,
  getActionFallbackLines,
  REVIEW_STATES,
  CHECKPOINT_STATES
} = require('./workflow');
```

**Action prompt render pattern** (`lib/generator.js` lines 29-50):
```javascript
function buildActionMarkdown(platform, action) {
  const template = loadTemplate('action.md.tmpl');
  const inlineArgumentNote = platform === 'codex'
    ? 'Do not assume text typed after a `$opsx-*` command is reliably available as an inline argument in Codex.'
    : 'Use inline arguments when available, but confirm ambiguous names or descriptions before mutating files.';
  const preflightLines = formatBullets(getPhaseThreePreflightLines());
  const fallbackLines = formatBullets(getActionFallbackLines(platform, action.id));
```

**Bundle fan-out pattern** (`lib/generator.js` lines 101-127):
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
```

**Action template pattern** (`templates/commands/action.md.tmpl` lines 12-29):
```markdown
Execution rules:
- Follow the `{{action}}` playbook from the `opsx` skill and its referenced files.
- CLI quick checks: `opsx check`, `opsx doc`, and `opsx language <en|zh>`.
- Preflight before acting:
{{preflight_note}}
- If required artifacts are missing, report that honestly and apply route-specific fallback guidance.
```

**Apply:** route all prompt wording through `lib/workflow.js` metadata and these templates. Generated command files should be refreshed, not hand-edited.

---

### `lib/fs-utils.js` (utility, file-I/O)

**Analog:** `lib/fs-utils.js`

**Read/write helper pattern** (lines 4-15):
```javascript
function ensureDir(directoryPath) {
  fs.mkdirSync(directoryPath, { recursive: true });
}

function writeText(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}
```

**Apply:** add `writeTextAtomic(filePath, content)` beside `writeText()`: ensure same-directory temp write, `fs.writeFileSync`, then `fs.renameSync`. Keep export style from lines 56-64.

---

### `lib/yaml.js` and `package.json` (serializer / config)

**Analog:** `lib/yaml.js`, `package.json`

**Current YAML parser pattern** (`lib/yaml.js` lines 21-69):
```javascript
function parseYaml(text) {
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
  const root = {};
  const stack = [{ indent: -1, value: root }];

  for (let index = 0; index < lines.length; index += 1) {
```

**Current limitation to replace for state files** (`lib/yaml.js` lines 84-99):
```javascript
function stringifyYaml(value, indent = 0) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
  const pad = ' '.repeat(indent);
  return Object.keys(value).map((key) => {
```

**Package script / engine pattern** (`package.json` lines 8-11, 46-48):
```json
"scripts": {
  "postinstall": "node scripts/postinstall.js",
  "test:workflow-runtime": "node scripts/test-workflow-runtime.js"
},
```

```json
"engines": {
  "node": ">=14.14.0"
}
```

**Apply:** add `yaml` and `xstate` dependencies in `package.json`. Either wrap `yaml` in `lib/yaml.js` or introduce state-specific YAML helpers in `lib/change-store.js`; do not extend the current parser for arrays.

---

### `scripts/test-workflow-runtime.js` (test, request-response / file-I/O)

**Analog:** `scripts/test-workflow-runtime.js`

**Imports pattern** (lines 3-33):
```javascript
const assert = require('assert');
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { copyDir, ensureDir, removePath, writeText } = require('../lib/fs-utils');
const { REPO_ROOT, PACKAGE_VERSION } = require('../lib/constants');
```

**Fixture writer pattern** (lines 222-255):
```javascript
const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-runtime-'));
copyDir(path.join(REPO_ROOT, 'schemas'), path.join(fixtureRoot, 'schemas'));
copyDir(path.join(REPO_ROOT, 'skills'), path.join(fixtureRoot, 'skills'));
ensureDir(path.join(fixtureRoot, '.opsx', 'changes'));
writeText(path.join(fixtureRoot, '.opsx', 'config.yaml'), [
```

**CLI spawn pattern** (lines 308-320):
```javascript
function runOpsxCli(args, options = {}) {
  const env = Object.assign({}, process.env, options.env || {});
  const result = spawnSync(process.execPath, [path.join(REPO_ROOT, 'bin', 'opsx.js'), ...args], {
    cwd: options.cwd || REPO_ROOT,
    env,
    encoding: 'utf8'
  });
```

**Test registration pattern** (lines 343-350):
```javascript
function runTests() {
  const tests = [];
  const fixtureRoot = createFixtureRepo();
  const cleanupTargets = [fixtureRoot];

  function test(name, fn) {
    tests.push({ name, fn });
  }
```

**Apply guidance test pattern** (lines 874-922): creates a change fixture, calls `buildApplyInstructions()`, asserts readiness, remaining groups, text renderer, and blocked prerequisites. Extend this area for one-top-level-task-group persistence.

**Generated parity test pattern** (lines 1294-1412): builds all platform bundles, validates route/preflight text, and compares generated files against checked-in command entries. Extend this when prompt wording changes.

---

### `skills/opsx/SKILL.md` and `skills/opsx/references/action-playbooks.md` (skill provider / guidance)

**Analog:** `skills/opsx/SKILL.md`, `skills/opsx/references/action-playbooks.md`

**Skill preflight pattern** (`skills/opsx/SKILL.md` lines 64-74):
```markdown
## Phase 3 Preflight

Before acting, read workspace state in this order when files exist:
1. `.opsx/config.yaml`
2. `.opsx/active.yaml`
3. `.opsx/changes/<active-change>/state.yaml` when an active change exists
4. `.opsx/changes/<active-change>/context.md` when an active change exists
5. Current artifacts (`proposal.md`, `specs/`, `design.md`, optional `security-review.md`, and `tasks.md`) when an active change exists
```

**Default execution loop pattern** (`skills/opsx/SKILL.md` lines 113-124):
```markdown
1. Identify the workflow action and target change.
2. Resolve config from change metadata, project config, then global config.
3. Run the strict preflight reads (`.opsx/config.yaml`, `.opsx/active.yaml`, active `state.yaml`, active `context.md`, and current artifacts when present).
4. Inspect artifact presence and dependency readiness from the active schema.
```

**Apply playbook pattern** (`skills/opsx/references/action-playbooks.md` lines 69-78):
```markdown
## apply

- Read proposal, specs, design if present, and tasks.
- Execute tasks in order.
- Use top-level task groups as execution milestones.
- Run `execution checkpoint` after each top-level task group.
- If `execution checkpoint` returns `WARN` or `BLOCK`, patch existing artifacts before continuing.
```

**Status playbook pattern** (`skills/opsx/references/action-playbooks.md` lines 110-121): status reports workspace, active change, artifact readiness, blockers, next command, security-review state, checkpoint output, and does not auto-create state.

**Apply:** rename this section from Phase 3 to Phase 4 or make it version-neutral. Add hash drift warning/reload, persisted stage, context capsule, drift ledger, and one-group apply guidance.

---

### `skills/opsx/references/artifact-templates.md` and `templates/project/change-metadata.yaml.tmpl` (template rules / scaffold)

**Analog:** existing templates

**Change metadata template** (`templates/project/change-metadata.yaml.tmpl` lines 1-8):
```yaml
# Save as .opsx/changes/<change-name>/change.yaml
name: <change-name>
schema: spec-driven
createdAt: <ISO-8601>
securitySensitive: false
securityWaiver:
  approved: false
  reason: ""
```

**Tasks/top-level group template** (`skills/opsx/references/artifact-templates.md` lines 64-76):
````markdown
## tasks.md

```markdown
## 1. Setup
- [ ] 1.1 Example task
```

Rules:
- Use exact checkbox format `- [ ] X.Y Description`.
- Mark completed work with `- [x]`.
- Order tasks by dependency.
- Organize work under top-level task groups such as `## 1. Setup`; `execution checkpoint` runs after each top-level group.
````

**Apply:** `opsx-new` should create placeholder artifact files without marking stages accepted. If no capability is known, create `specs/` only rather than inventing `specs/<capability>/spec.md`.

---

## Shared Patterns

### Path Safety

**Source:** `lib/workspace.js` lines 6-13 and `lib/runtime-guidance.js` lines 72-80  
**Apply to:** `change-store`, `change-artifacts`, `workspace`, `cli` wrappers

Use `path.resolve()`, `path.relative()`, and `path.isAbsolute()` before reading or writing any `.opsx/changes/<name>` paths. Keep `ensureSafeChangeName()` as the public change-name guard.

### Read-Only Status / Resume

**Source:** `lib/workflow.js` lines 111-121 and `skills/opsx/references/action-playbooks.md` lines 48-53, 110-121  
**Apply to:** `lib/runtime-guidance.js`, `lib/cli.js`, generated `status` / `resume` prompts

Status and resume must read missing/partial state and return concrete next steps. They must not create `.opsx/active.yaml`, invent an active change, refresh hashes, or advance lifecycle state.

### Lifecycle State vs File Presence

**Source:** `lib/runtime-guidance.js` lines 262-275 and `04-RESEARCH.md` anti-patterns  
**Apply to:** `change-state`, `runtime-guidance`, `change-artifacts`, tests

Keep artifact presence as inventory only. Persisted `stage`, checkpoints, and accepted artifact hashes are lifecycle truth after `opsx-new` starts creating placeholder files.

### Checkpoint Result Shape

**Source:** `lib/workflow.js` lines 838-854  
**Apply to:** mutation transition blocks, verification log entries, status warnings

All state-machine blockers should expose stable fields: status/code/message/findings/patchTargets/nextStep. This matches existing checkpoint consumers and tests.

### Generated Surface Parity

**Source:** `scripts/test-workflow-runtime.js` lines 1294-1412  
**Apply to:** `lib/workflow.js`, `lib/generator.js`, `templates/commands/*.tmpl`, generated command files

Update source metadata/templates first, regenerate platform bundles, then rely on parity assertions to detect checked-in command drift.

### Test Harness

**Source:** `scripts/test-workflow-runtime.js` lines 222-255, 308-320, 343-350, 1618-1628  
**Apply to:** all Phase 4 tests

Use temp fixtures under `os.tmpdir()`, `writeText()` / `ensureDir()`, direct library calls for unit coverage, `runOpsxCli()` for CLI behavior, and `assert` only. Verification command remains `npm run test:workflow-runtime`.

## No Analog Found

All planned file groups have at least a role-match local analog. The following implementation concerns do not have exact local code examples and should use `04-RESEARCH.md` patterns.

| Concern | Planned File | Reason | Use Instead |
|---------|--------------|--------|-------------|
| XState pure transition API | `lib/change-state.js` | No current local module uses XState or an external state-machine library. | `04-RESEARCH.md` XState pure-transition example; keep outputs shaped like `lib/workflow.js` checkpoint results. |
| Rich YAML arrays/document edits | `lib/change-store.js` / `lib/yaml.js` | Current `lib/yaml.js` cannot stringify arrays and is mapping-only. | `yaml@2.8.3` from `04-RESEARCH.md`; wrap it behind local state-store helpers. |
| Artifact SHA-256 hashing | `lib/change-artifacts.js` | Current code inventories files but does not persist hashes. | Node `crypto.createHash('sha256')` pattern from `04-RESEARCH.md` plus sorted `listFiles()` from `lib/fs-utils.js`. |

## Metadata

**Analog search scope:** `lib/`, `scripts/`, `skills/opsx/`, `templates/`, `commands/`, `schemas/`, prior phase pattern docs  
**Files scanned:** 50+ repository files plus Phase 4 context/research/validation  
**Pattern extraction date:** 2026-04-27
