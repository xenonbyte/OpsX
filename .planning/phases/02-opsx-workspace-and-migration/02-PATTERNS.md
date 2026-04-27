# Phase 2: `.opsx/` Workspace and Migration - Pattern Map

**Mapped:** 2026-04-27
**Files analyzed:** 24
**Analogs found:** 21 / 24

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `lib/constants.js` | config | transform | `lib/constants.js` | exact |
| `lib/config.js` | config | file-I/O | `lib/config.js` | exact |
| `lib/cli.js` | controller | request-response | `lib/cli.js` | exact |
| `lib/migrate.js` | service | batch file-I/O | `lib/install.js` | role-match |
| `lib/workspace.js` | utility | file-I/O | `lib/fs-utils.js` + `lib/yaml.js` | role-match |
| `lib/install.js` | service | file-I/O / request-response | `lib/install.js` | exact |
| `lib/runtime-guidance.js` | service | request-response / file-I/O | `lib/runtime-guidance.js` | exact |
| `scripts/test-workflow-runtime.js` | test | request-response / file-I/O | `scripts/test-workflow-runtime.js` | exact |
| `.gitignore` | config | VCS filtering | `.gitignore` | exact |
| `README.md` | docs | guidance | `README.md` | exact |
| `README-zh.md` | docs | guidance | `README-zh.md` | exact |
| `docs/customization.md` | docs | guidance | `docs/customization.md` | exact |
| `docs/runtime-guidance.md` | docs | guidance | `docs/runtime-guidance.md` | exact |
| `templates/project/config.yaml.tmpl` | config template | scaffold | `templates/project/config.yaml.tmpl` | exact |
| `templates/project/change-metadata.yaml.tmpl` | model template | scaffold | `templates/project/change-metadata.yaml.tmpl` | exact |
| `.opsx/config.yaml` | config artifact | file-I/O migration | `openspec/config.yaml` | exact |
| `.opsx/active.yaml` | state artifact | scaffold | none | no-analog |
| `.opsx/changes/<change>/change.yaml` | model artifact | file-I/O migration | `openspec/changes/*/.openspec.yaml` | exact |
| `.opsx/changes/<change>/state.yaml` | state artifact | scaffold | `lib/runtime-guidance.js` status shape | partial |
| `.opsx/changes/<change>/context.md` | docs artifact | scaffold | none | no-analog |
| `.opsx/changes/<change>/drift.md` | docs artifact | scaffold | none | no-analog |
| `~/.opsx/config.yaml` | config artifact | file-I/O migration | `lib/config.js` global config | exact |
| `~/.opsx/manifests/*.manifest` | model artifact | file-I/O migration | `lib/install.js` manifest handling | exact |
| `~/.opsx/skills/opsx/**` | installed assets | file-I/O migration | `lib/install.js` shared skill install | exact |

## Pattern Assignments

### `lib/constants.js` (config, transform)

**Analog:** `lib/constants.js`

**Constants/export pattern** (lines 4-10, 19-30):
```javascript
const REPO_ROOT = path.resolve(__dirname, '..');
const PRODUCT_NAME = 'OpsX';
const PRODUCT_SHORT_NAME = 'opsx';
const PRODUCT_LONG_NAME = 'Operational Spec eXecution';
const SHARED_HOME_NAME = '.openspec';
const GLOBAL_CONFIG_NAME = '.opsx-config.yaml';

module.exports = {
  PACKAGE_NAME: pkg.name,
  PACKAGE_VERSION: pkg.version,
  REPO_ROOT,
  PRODUCT_NAME,
  PRODUCT_SHORT_NAME,
  PRODUCT_LONG_NAME,
  SHARED_HOME_NAME,
  GLOBAL_CONFIG_NAME,
  DEFAULT_SCHEMA,
  DEFAULT_LANGUAGE,
  PLATFORM_RULE_FILES
};
```

**Apply:** Replace only `SHARED_HOME_NAME` and `GLOBAL_CONFIG_NAME` with `.opsx` and `config.yaml`. Keep exported names stable so `config.js`, `install.js`, and `workflow.js` do not need interface churn.

---

### `lib/config.js` (config, file-I/O)

**Analog:** `lib/config.js`

**Imports pattern** (lines 1-12):
```javascript
const fs = require('fs');
const path = require('path');
const {
  REPO_ROOT,
  SHARED_HOME_NAME,
  GLOBAL_CONFIG_NAME,
  DEFAULT_SCHEMA,
  DEFAULT_LANGUAGE,
  PACKAGE_VERSION
} = require('./constants');
const { parseYaml, stringifyYaml } = require('./yaml');
const { ensureDir, writeText } = require('./fs-utils');
```

**Global path pattern** (lines 41-47):
```javascript
function getSharedHome(homeDir = process.env.HOME) {
  return path.join(homeDir, SHARED_HOME_NAME);
}

function getGlobalConfigPath(homeDir = process.env.HOME) {
  return path.join(getSharedHome(homeDir), GLOBAL_CONFIG_NAME);
}
```

**Write config pattern** (lines 86-96):
```javascript
function writeGlobalConfig(config, homeDir = process.env.HOME) {
  const targetPath = getGlobalConfigPath(homeDir);
  ensureDir(path.dirname(targetPath));
  const content = [
    '# OpsX Local Skill Configuration',
    '# Managed by opsx install',
    '',
    stringifyYaml(normalizeConfig(config))
  ].join('\n');
  writeText(targetPath, `${content}\n`);
  return targetPath;
}
```

**Apply:** Keep `homeDir` injectable for tests. If migration needs legacy global detection, add separate helpers such as `getLegacySharedHome()` rather than changing the canonical `getSharedHome()` contract after constants flip.

---

### `lib/cli.js` (controller, request-response)

**Analog:** `lib/cli.js`

**CLI parser pattern** (lines 9-27):
```javascript
function parseArgs(argv) {
  const options = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      options._.push(token);
      continue;
    }
    const key = token.slice(2);
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

**Subcommand dispatch pattern** (lines 93-126):
```javascript
switch (command) {
  case 'check':
    console.log(runCheck());
    return;
  case 'doc':
    console.log(showDoc());
    return;
  case 'language': {
    const languageInput = commandValue || options.language;
    if (!languageInput) {
      throw new Error(`Language command requires <en|zh>. Run \`${PRODUCT_SHORT_NAME} --help\` for usage.`);
    }
    const language = setLanguage(languageInput);
    console.log(showLanguageMessage(language));
    return;
  }
  case 'migrate':
    console.log(showMigratePlaceholder());
    return;
  case 'status':
    console.log(showStatusPlaceholder());
    return;
}
```

**Error propagation pattern** (`bin/opsx.js` lines 5-8):
```javascript
runCli(process.argv.slice(2)).catch((error) => {
  const message = error && error.message ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
```

**Apply:** Replace only the `migrate` placeholder with a call into `lib/migrate.js`, passing `cwd`, `homeDir`, and `dryRun: options['dry-run'] === true`. Keep thrown errors user-facing because `bin/opsx.js` already prints the message and exits non-zero.

---

### `lib/migrate.js` (service, batch file-I/O)

**Analog:** `lib/install.js` plus `lib/runtime-guidance.js`

**Imports pattern** (`lib/install.js` lines 1-21):
```javascript
const fs = require('fs');
const path = require('path');
const {
  ensureDir,
  writeText,
  copyDir,
  removePath,
  listFiles
} = require('./fs-utils');
const {
  getSharedHome,
  getGlobalConfigPath,
  loadGlobalConfig,
  writeGlobalConfig,
  getRepoSkillDir
} = require('./config');
```

**Containment / destructive guard pattern** (`lib/install.js` lines 66-75):
```javascript
function isWithinRoot(rootPath, targetPath) {
  const relativePath = path.relative(path.resolve(rootPath), path.resolve(targetPath));
  return Boolean(relativePath) && !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
}

function assertManifestEntryIsAllowed(entry, allowedRoots) {
  if (!path.isAbsolute(entry) || !allowedRoots.some((rootPath) => isWithinRoot(rootPath, entry))) {
    throw new Error(`Refusing to remove path outside OpsX install roots: ${entry}`);
  }
}
```

**Safe change-name guard pattern** (`lib/runtime-guidance.js` lines 26-49):
```javascript
function ensureSafeChangeName(changeName) {
  const normalized = String(changeName || '').trim();
  if (!normalized) {
    throw new RuntimeGuidanceError(
      'invalid-change-name',
      'Change name is required.',
      { expected: 'non-empty string' }
    );
  }
  if (normalized.includes('/') || normalized.includes('\\') || normalized.includes('..')) {
    throw new RuntimeGuidanceError(
      'invalid-change-name',
      'Change name must not include path separators or traversal markers.',
      { changeName: normalized }
    );
  }
  if (!CHANGE_NAME_PATTERN.test(normalized)) {
    throw new RuntimeGuidanceError(
      'invalid-change-name',
      'Change name contains unsupported characters.',
      { changeName: normalized, pattern: CHANGE_NAME_PATTERN.source }
    );
  }
  return normalized;
}
```

**Batch write/move style** (`lib/install.js` lines 118-173):
```javascript
function installPlatform(platform, options) {
  const homeDir = options.homeDir || process.env.HOME;
  const sharedHome = getSharedHome(homeDir);
  const manifestPath = getManifestPath(homeDir, platform);
  const installRoots = getPlatformInstallRoots(platform, homeDir);
  const records = [];

  ensureDir(path.join(sharedHome, 'manifests'));
  ensureDir(backupRoot);

  cleanupFromManifest(manifestPath, Object.values(installRoots));

  removePath(sharedSkillDir);
  removePath(platformSkillDir);
  ensureDir(sharedCommandsDir);

  copyDir(getRepoSkillDir(), sharedSkillDir);
  copyDir(getRepoSkillDir(), platformSkillDir);
  collectRecordedFiles(platformSkillDir).forEach((filePath) => records.push(filePath));

  fs.writeFileSync(manifestPath, `${records.join('\n')}\n`, 'utf8');
  return { manifestPath, backupRoot, platformCommandsDir, platformSkillDir, globalConfigPath };
}
```

**Apply:** Do not copy this install flow literally. Copy the shape: build all paths from injected roots, preflight before mutation, keep ordered operations, and return a structured summary. Dry-run must call only plan builders and renderers, never `writeText()`, `renameSync()`, `mkdirSync()`, `copyDir()`, or `removePath()`.

---

### `lib/workspace.js` (utility, file-I/O)

**Analog:** `lib/fs-utils.js`, `lib/yaml.js`, `lib/config.js`

**Filesystem helper pattern** (`lib/fs-utils.js` lines 4-19, 41-53):
```javascript
function ensureDir(directoryPath) {
  fs.mkdirSync(directoryPath, { recursive: true });
}

function writeText(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
}

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

**YAML scaffold pattern** (`lib/yaml.js` lines 84-99):
```javascript
function stringifyYaml(value, indent = 0) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
  const pad = ' '.repeat(indent);
  return Object.keys(value).map((key) => {
    const entry = value[key];
    if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
      const nested = stringifyYaml(entry, indent + 2);
      return `${pad}${key}:\n${nested}`;
    }
    if (typeof entry === 'string' && entry.includes('\n')) {
      const block = entry.split('\n').map((line) => `${pad}  ${line}`).join('\n');
      return `${pad}${key}: |\n${block}`;
    }
    return `${pad}${key}: ${stringifyScalar(entry)}`;
  }).join('\n');
}
```

**Apply:** Use this module only if the planner wants scaffold helpers separated from migration planning. Keep it small: path helpers, `createActiveYamlIfMissing()`, `createChangeScaffoldsIfMissing()`, and honest stage inference helpers.

---

### `lib/install.js` (service, file-I/O / request-response)

**Analog:** `lib/install.js`

**Manifest path pattern** (lines 52-84):
```javascript
function getManifestPath(homeDir, platform) {
  return path.join(getSharedHome(homeDir), 'manifests', `${platform}.manifest`);
}

function listInstalledManifestPlatforms(homeDir) {
  const manifestDir = path.join(getSharedHome(homeDir), 'manifests');
  if (!fs.existsSync(manifestDir)) return [];
  return fs.readdirSync(manifestDir)
    .filter((entry) => entry.endsWith('.manifest'))
    .map((entry) => entry.replace(/\.manifest$/, ''))
    .filter((platform) => PLATFORM_RULE_FILES[platform])
    .sort();
}
```

**Check output pattern** (lines 200-244):
```javascript
function runCheck(options = {}) {
  const cwd = options.cwd || process.cwd();
  const homeDir = options.homeDir || process.env.HOME;
  const globalConfigPath = getGlobalConfigPath(homeDir);
  const globalConfig = fs.existsSync(globalConfigPath) ? loadGlobalConfig(homeDir) : null;
  const lines = ['## OpsX Installation Check', ''];

  if (globalConfig) {
    lines.push(`**Config**: ✓ Found (${globalConfigPath})`);
  } else {
    lines.push(`**Config**: ✗ Not found (${globalConfigPath})`);
  }

  const projectConfigPath = path.join(cwd, 'openspec', 'config.yaml');
  lines.push('');
  lines.push(`**Workspace**: ${cwd}`);
  lines.push(
    fs.existsSync(projectConfigPath)
      ? `- optional project config: found (${projectConfigPath})`
      : `- optional project config: not found (${projectConfigPath})`
  );

  return lines.join('\n');
}
```

**Apply:** After constants flip, `runCheck()` should report `.opsx/config.yaml` and `~/.opsx/config.yaml` as canonical. Legacy `openspec/` and `~/.openspec/` belong in migration-candidate diagnostics, not as primary success paths.

---

### `lib/runtime-guidance.js` (service, request-response / file-I/O)

**Analog:** `lib/runtime-guidance.js`

**Runtime path resolution pattern** (lines 96-138):
```javascript
function resolveRuntimeConfig(options = {}) {
  const repoRoot = options.repoRoot || REPO_ROOT;
  const homeDir = options.homeDir || process.env.HOME;
  const changeName = ensureSafeChangeName(options.changeName);
  const openSpecDir = path.join(repoRoot, 'openspec');
  const changesDir = path.join(openSpecDir, 'changes');
  const changeDir = path.join(changesDir, changeName);

  ensureInside(changesDir, changeDir, 'invalid-change-path');
  if (!fs.existsSync(changeDir) || !fs.statSync(changeDir).isDirectory()) {
    throw new RuntimeGuidanceError(
      'change-not-found',
      `Change does not exist: ${changeName}`,
      { changeName, changeDir }
    );
  }

  const projectConfigPath = path.join(openSpecDir, 'config.yaml');
  const changeConfigPath = path.join(changeDir, '.openspec.yaml');
  const globalConfig = loadGlobalConfig(homeDir);
  const projectConfig = fs.existsSync(projectConfigPath) ? readYamlFile(projectConfigPath) : {};
  const changeConfig = fs.existsSync(changeConfigPath) ? readYamlFile(changeConfigPath) : {};
```

**Artifact discovery pattern** (lines 487-504):
```javascript
function collectArtifactSources(changeDir) {
  const proposalPath = path.join(changeDir, 'proposal.md');
  const designPath = path.join(changeDir, 'design.md');
  const tasksPath = path.join(changeDir, 'tasks.md');
  const specsDir = path.join(changeDir, 'specs');
  const specsText = fs.existsSync(specsDir)
    ? listFiles(specsDir)
      .filter((relativePath) => toUnixPath(relativePath).endsWith('/spec.md') || toUnixPath(relativePath) === 'spec.md')
      .map((relativePath) => readText(path.join(specsDir, relativePath)))
      .join('\n\n')
    : '';

  return {
    proposal: fs.existsSync(proposalPath) ? readText(proposalPath) : '',
    specs: specsText,
    design: fs.existsSync(designPath) ? readText(designPath) : '',
    tasks: fs.existsSync(tasksPath) ? readText(tasksPath) : ''
  };
}
```

**Apply:** Change `openSpecDir` to `.opsx`, and `changeConfigPath` to `change.yaml`. Do not add Phase 4 state-machine semantics here; keep status/runtime guidance based on artifact presence and existing schema logic.

---

### `scripts/test-workflow-runtime.js` (test, request-response / file-I/O)

**Analog:** `scripts/test-workflow-runtime.js`

**Imports and fixture setup pattern** (lines 3-17, 45-79):
```javascript
const assert = require('assert');
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { copyDir, ensureDir, removePath, writeText } = require('../lib/fs-utils');
const { REPO_ROOT, PACKAGE_VERSION } = require('../lib/constants');

function createFixtureRepo() {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-runtime-'));
  copyDir(path.join(REPO_ROOT, 'schemas'), path.join(fixtureRoot, 'schemas'));
  copyDir(path.join(REPO_ROOT, 'skills'), path.join(fixtureRoot, 'skills'));
  ensureDir(path.join(fixtureRoot, 'openspec', 'changes'));
  writeText(path.join(fixtureRoot, 'openspec', 'config.yaml'), [
    'schema: spec-driven',
    'language: en'
  ].join('\n'));
  return fixtureRoot;
}

function createChange(fixtureRoot, changeName, files = {}) {
  const changeDir = path.join(fixtureRoot, 'openspec', 'changes', changeName);
  ensureDir(changeDir);
  if (!files['.openspec.yaml']) {
    writeText(path.join(changeDir, '.openspec.yaml'), [
      `name: ${changeName}`,
      'schema: spec-driven',
      `createdAt: ${new Date('2026-01-01T00:00:00.000Z').toISOString()}`
    ].join('\n'));
  }
  Object.keys(files).forEach((relativePath) => {
    writeText(path.join(changeDir, relativePath), files[relativePath]);
  });
  return changeDir;
}
```

**CLI invocation pattern** (lines 81-93):
```javascript
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

**CLI surface test pattern** (lines 731-776):
```javascript
test('opsx check/doc/language work as subcommands and compatibility aliases', () => {
  const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'opsx-home-cli-'));
  cleanupTargets.push(tempHome);
  install({ platform: 'claude,codex,gemini', homeDir: tempHome, language: 'en' });

  const cliOptions = {
    cwd: fixtureRoot,
    env: { HOME: tempHome }
  };

  const checkCommand = runOpsxCli(['check'], cliOptions);
  assert.strictEqual(checkCommand.status, 0, checkCommand.stderr);
  assert(checkCommand.stdout.includes('Installation Check'));
});
```

**Runner/cleanup pattern** (lines 1025-1043):
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
```

**Apply:** Add migration fixture helpers that create legacy `openspec/` and temp-home `~/.openspec/`. Add tests for dry-run zero writes, execute moves/renames/scaffolds, existing `.opsx/` abort, canonical `check` output, and gitignore policy.

---

### `.gitignore` (config, VCS filtering)

**Analog:** `.gitignore`

**Current trackability pattern** (lines 35-42):
```gitignore
# Keep OpenSpec change artifacts trackable even if globally ignored.
!openspec/
!openspec/changes/
!openspec/changes/**

# Keep GSD planning artifacts trackable even if globally ignored.
!.planning/
!.planning/**
```

**Apply:** Replace/supplement legacy OpenSpec rules with ordered `.opsx` rules. If a broad ignore such as `.opsx/*` is used, re-include parent directories before child negations. Required policy: track `.opsx/config.yaml`, `.opsx/active.yaml`, `.opsx/changes/**`, `.opsx/specs/**`, `.opsx/archive/**`; ignore `.opsx/cache/`, `.opsx/tmp/`, `.opsx/logs/`.

---

### Documentation Files (docs, guidance)

**Analogs:** `README.md`, `README-zh.md`, `docs/customization.md`, `docs/runtime-guidance.md`, `docs/commands.md`

**README migration language pattern** (`README.md` lines 50-55):
```markdown
## Project Config

OpsX's target project-level workflow defaults live in `.opsx/config.yaml`.
Phase 1 renames the public package, CLI, skill, and command surface first; the
workspace path migration is completed by `opsx migrate` in Phase 2.
```

**Chinese README matching section** (`README-zh.md` lines 50-54):
```markdown
## 项目配置

OpsX 的目标项目级工作流默认配置位于 `.opsx/config.yaml`。
Phase 1 先统一公开包名、CLI、skill 和命令入口；工作目录迁移由 Phase 2 的 `opsx migrate` 完成。
```

**Config precedence pattern** (`docs/customization.md` lines 24-39):
```markdown
1. change metadata (`.opsx/changes/<name>/change.yaml`)
2. project config (`.opsx/config.yaml`)
3. global config (`~/.opsx/config.yaml`)
4. package defaults

`~/.opsx/config.yaml` is the target installation/runtime shared config after
the Phase 2 path migration.
```

**Runtime docs pattern** (`docs/runtime-guidance.md` lines 27-43):
```markdown
## Compatibility Notes
- Existing public CLI usage remains unchanged:
  - `opsx install`
  - `opsx uninstall`
  - `opsx check`
  - `opsx doc`
  - `opsx language`
  - `opsx migrate`
  - `opsx status`
```

**Apply:** Update Phase 2 phrasing from future-tense placeholder to completed behavior. Keep English and Chinese docs aligned. Explain tracked vs ignored `.opsx` paths once in public docs and point customization/runtime docs at canonical paths.

---

### Project Templates (config/model scaffold)

**Analogs:** `templates/project/config.yaml.tmpl`, `templates/project/change-metadata.yaml.tmpl`

**Project config template** (`templates/project/config.yaml.tmpl` lines 1-14):
```yaml
schema: spec-driven
language: "zh"
context: |
  Project: OpsX distribution package
  Goal: Keep the OpsX workflow schema-driven, cross-platform, and suitable for npm distribution.
rules:
  proposal: "Include platform compatibility and migration impact."
  design: "Explain OpsX CLI/runtime separation and rollout notes."
  tasks: "Keep tasks implementation-first, dependency-ordered, and grouped into top-level milestones."
securityReview:
  mode: "heuristic"
  required: false
  allowWaiver: true
```

**Change metadata template** (`templates/project/change-metadata.yaml.tmpl` lines 1-7):
```yaml
name: <change-name>
schema: spec-driven
createdAt: <ISO-8601>
securitySensitive: false
securityWaiver:
  approved: false
  reason: ""
```

**Apply:** Keep template shape; update references and generators so per-change metadata path is `change.yaml`, not `.openspec.yaml`.

---

### `.opsx/config.yaml` and `~/.opsx/config.yaml` (config artifacts, file-I/O migration)

**Analog:** `openspec/config.yaml`, `lib/config.js`

**Existing project config shape** (`openspec/config.yaml` lines 1-14):
```yaml
schema: spec-driven
language: "zh"
context: |
  Project: XenonByte OpenSpec multi-platform distribution
  Goal: Keep runtime guidance, checkpoints, and command generation aligned across Claude/Codex/Gemini.
rules:
  proposal: "Call out rollout, migration, and compatibility impact."
  design: "Describe checkpoint and security-review behavior with rollback notes."
  tasks: "Keep top-level milestones dependency-ordered and include explicit verification steps."
securityReview:
  mode: "heuristic"
  required: false
  allowWaiver: true
```

**Apply:** Preserve existing project config content verbatim when moving `openspec/config.yaml -> .opsx/config.yaml`. For global config, use `writeGlobalConfig()` style and target `~/.opsx/config.yaml` after constants flip.

---

### `.opsx/changes/<change>/change.yaml` (model artifact, file-I/O migration)

**Analog:** `openspec/changes/*/.openspec.yaml`

**Existing metadata shape** (`openspec/changes/upgrade-artifact-graph-runtime/.openspec.yaml` lines 1-6):
```yaml
name: upgrade-artifact-graph-runtime
schema: spec-driven
createdAt: 2026-04-05T23:32:00
securityWaiver:
  approved: true
  reason: "Workflow runtime and test-coverage upgrade only; no auth/permission/token surface changes."
```

**Apply:** Rename file path only: `.openspec.yaml -> change.yaml`. Preserve YAML content. If generating a missing file, use `templates/project/change-metadata.yaml.tmpl` shape and current change directory name.

---

### `.opsx/active.yaml` (state artifact, scaffold)

**Analog:** none. Use format constraints from YAML templates and `skills/opsx/SKILL.md`.

**Workspace target structure** (`skills/opsx/SKILL.md` lines 44-61):
```text
.opsx/
├── config.yaml
├── active.yaml
├── changes/
│   └── <change-name>/
│       ├── change.yaml
│       ├── proposal.md
│       ├── specs/<capability>/spec.md
│       ├── design.md
│       ├── state.yaml
│       ├── context.md
│       ├── drift.md
│       └── tasks.md
└── specs/
```

**Apply:** No exact existing file. Generate a minimal YAML file with no active change by default. Do not infer an active change unless there is a single safe candidate and the planner explicitly defines that rule.

---

### `.opsx/changes/<change>/state.yaml` (state artifact, scaffold)

**Analog:** partial from `lib/runtime-guidance.js`

**Status shape to mirror conservatively** (`lib/runtime-guidance.js` lines 611-634):
```javascript
function buildStatus(options = {}) {
  const kernel = buildRuntimeKernel(options);
  return {
    change: kernel.change,
    schema: kernel.schema,
    progress: kernel.progress,
    summary: kernel.stateSummary,
    artifacts: kernel.graph.artifacts.reduce((output, artifact) => {
      const state = kernel.artifactStates[artifact.id];
      output[artifact.id] = {
        state: state.state,
        active: state.active,
        optional: state.optional,
        path: state.path,
        requires: state.requires.slice(),
        missingDependencies: state.missingDependencies.slice(),
        outOfOrder: state.outOfOrder,
        matchedFiles: state.matchedFiles.slice()
      };
      return output;
    }, {}),
    review: kernel.review,
    next: kernel.next
  };
}
```

**Apply:** Generate minimal state only: version, change name, honest stage derived from artifact presence when obvious, nextAction, artifact paths, empty blockers/warnings. Do not fabricate verification logs, hashes, transitions, or Phase 4 enforcement fields.

---

### `.opsx/changes/<change>/context.md` and `.opsx/changes/<change>/drift.md` (docs artifacts, scaffold)

**Analog:** no close source analog

**Recommended scaffold constraints from Phase 2 context:**
```markdown
# Context

Migrated change: <change-name>

## Existing Artifacts
- proposal.md
- specs/
- design.md
- tasks.md

## Notes
- Placeholder created by `opsx migrate`.
- Requirements were not summarized automatically.
```

```markdown
# Drift Log

## New Assumptions

## Scope Changes

## Out-of-Bound File Changes

## Discovered Requirements

## User Approval Needed
```

**Apply:** Keep these files short and honest. Point to existing migrated artifacts; do not summarize requirements or infer approval history.

---

### `~/.opsx/manifests/*.manifest` and `~/.opsx/skills/opsx/**` (installed assets, file-I/O migration)

**Analog:** `lib/install.js`

**Shared home install pattern** (`lib/install.js` lines 127-156):
```javascript
ensureDir(path.join(sharedHome, 'manifests'));
ensureDir(backupRoot);

const sharedSkillDir = path.join(sharedHome, 'skills', 'opsx');
const sharedCommandsDir = path.join(sharedHome, 'commands');

removePath(sharedSkillDir);
ensureDir(sharedCommandsDir);

copyDir(getRepoSkillDir(), sharedSkillDir);

const sharedOpsxPath = path.join(sharedCommandsDir, 'opsx.md');
const sharedOpsxContent = fs.readFileSync(path.join(REPO_ROOT, 'commands', 'claude', 'opsx.md'), 'utf8');
writeText(sharedOpsxPath, sharedOpsxContent);

fs.writeFileSync(manifestPath, `${records.join('\n')}\n`, 'utf8');
```

**Apply:** If Phase 2 migrates global state, preserve manifest content and shared skill assets under `~/.opsx/`. If it only detects some legacy global paths, `runCheck()` and migration dry-run must say so explicitly.

## Shared Patterns

### Canonical Path Injection
**Source:** `lib/config.js` lines 41-47 and `scripts/test-workflow-runtime.js` lines 81-93  
**Apply to:** `lib/config.js`, `lib/install.js`, `lib/migrate.js`, tests

Use `homeDir` and `cwd`/`repoRoot` options in code under test. Do not touch the real user home in regression tests.

### Preflight Before Mutation
**Source:** `lib/install.js` lines 66-75 and Phase 2 context D-05 through D-09  
**Apply to:** `lib/migrate.js`

Build a plan object first: `moves[]`, `creates[]`, `warnings[]`, `abortReason`. Dry-run renders this exact plan. Execute validates it and then mutates.

### Filesystem Helpers
**Source:** `lib/fs-utils.js` lines 4-19 and 41-53  
**Apply to:** `lib/migrate.js`, `lib/workspace.js`, tests

Use `ensureDir`, `writeText`, `listFiles`, and existing Node sync APIs. Avoid adding `fs-extra` or a new filesystem abstraction for Phase 2.

### YAML Serialization
**Source:** `lib/yaml.js` lines 21-69 and 84-99  
**Apply to:** `active.yaml`, `change.yaml`, `state.yaml`, config migration

Use the repo-local parser/stringifier for simple config/scaffold shapes. Preserve existing YAML content when moving legacy files; only generate missing defaults.

### CLI Error Handling
**Source:** `bin/opsx.js` lines 5-8 and `lib/cli.js` lines 153-155  
**Apply to:** `opsx migrate`, unknown options, conflict aborts

Throw normal `Error` instances with clear messages. Let the CLI entrypoint print the message and exit non-zero.

### Documentation Tone
**Source:** `README.md` lines 50-55, `docs/customization.md` lines 24-39  
**Apply to:** README, README-zh, customization/runtime docs

Use direct operator guidance with concrete paths. After Phase 2, avoid saying migration is future work except in historical notes.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `.opsx/changes/<change>/context.md` | docs artifact | scaffold | No existing migrated runtime capsule file exists yet. Generate a short placeholder only. |
| `.opsx/changes/<change>/drift.md` | docs artifact | scaffold | No existing drift log file exists yet. Generate standard empty sections only. |
| `.opsx/active.yaml` | state artifact | scaffold | No existing active-change tracker exists yet. Keep it minimal and explicitly empty unless safe inference is specified. |

## Metadata

**Analog search scope:** `lib/`, `scripts/`, `templates/`, `docs/`, `README*.md`, `.gitignore`, `openspec/`, `skills/opsx/SKILL.md`  
**Files scanned:** 39 by `rg --files`/`find`, with 15 implementation/docs analog files read in full and 4 metadata samples read.  
**Pattern extraction date:** 2026-04-27
