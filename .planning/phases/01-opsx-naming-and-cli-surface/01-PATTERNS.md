# Phase 1: OpsX Naming and CLI Surface - Pattern Map

**Mapped:** 2026-04-27
**Files analyzed:** 18 file groups
**Analogs found:** 18 / 18

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `package.json` | config | static metadata | `package.json` | exact |
| `bin/opsx.js` and removal of `bin/openspec.js` | route | request-response | `bin/openspec.js` | exact |
| `install.sh`, `uninstall.sh` | utility | request-response | `install.sh`, `uninstall.sh` | exact |
| `scripts/postinstall.js` | utility | request-response | `scripts/postinstall.js` | exact |
| `lib/constants.js` | config | transform | `lib/constants.js` | exact |
| `lib/cli.js` | route/controller | request-response | `lib/cli.js` | exact |
| `lib/config.js` | service/config | file-I/O | `lib/config.js` | exact |
| `lib/install.js` | service | file-I/O | `lib/install.js` | exact |
| `lib/generator.js` | utility/generator | transform | `lib/generator.js` | exact |
| `lib/workflow.js` | model/catalog | transform | `lib/workflow.js` | exact |
| `templates/commands/*.tmpl` | template | transform | `templates/commands/index.md.tmpl`, `action.md.tmpl`, `codex-entry.md.tmpl` | exact |
| `commands/**` | generated asset | transform | `commands/claude/opsx.md`, `commands/codex/prompts/opsx.md`, `commands/gemini/opsx.toml` | exact |
| `templates/project/*.tmpl` | template/config | file-I/O | `templates/project/config.yaml.tmpl`, `rule-file.md.tmpl` | exact |
| `skills/openspec/**` to `skills/opsx/**` | skill/provider | request-response | `skills/openspec/SKILL.md`, guides, references | exact |
| `README.md`, `README-zh.md`, `docs/*.md` | docs | static content | `README.md`, `docs/commands.md`, `docs/customization.md` | exact |
| `CHANGELOG.md` | docs/release metadata | chronological append | `CHANGELOG.md` | exact |
| `scripts/test-workflow-runtime.js` | test | file-I/O + request-response | `scripts/test-workflow-runtime.js` | exact |
| Boundary-sensitive runtime refs in `lib/runtime-guidance.js`, `openspec/config.yaml`, `schemas/spec-driven/schema.json` | service/model | file-I/O | `lib/runtime-guidance.js`, `openspec/config.yaml` | role-match |

## Pattern Assignments

### `package.json` (config, static metadata)

**Analog:** `package.json`

**Package identity pattern** (lines 1-7):
```json
{
  "name": "@xenonbyte/openspec",
  "version": "2.0.1",
  "description": "AI-native spec-driven workflow system for Claude, Codex, and Gemini",
  "bin": {
    "openspec": "bin/openspec.js"
  },
```

**Published file allowlist pattern** (lines 12-25):
```json
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
  ],
```

**Repository metadata pattern** (lines 38-55):
```json
  "repository": {
    "type": "git",
    "url": "git+https://github.com/xenonbyte/openspec.git"
  },
  "bugs": {
    "url": "https://github.com/xenonbyte/openspec/issues"
  },
  "homepage": "https://github.com/xenonbyte/openspec#readme",
  "engines": {
    "node": ">=14.14.0"
  },
  "os": [
    "darwin",
    "linux"
  ],
  "publishConfig": {
    "access": "public"
  }
```

**Planner note:** Change name, version, description, bin, repo URLs, and package files as one package-surface task. Do not leave `bin/openspec.js` in the publish set if the package does not expose an `openspec` alias.

---

### `bin/opsx.js` (route, request-response)

**Analog:** `bin/openspec.js`

**Node executable wrapper pattern** (lines 1-9):
```javascript
#!/usr/bin/env node

const { runCli } = require('../lib/cli');

runCli(process.argv.slice(2)).catch((error) => {
  const message = error && error.message ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
```

**Planner note:** New `bin/opsx.js` should copy this wrapper exactly, only changing the filename and `package.json` bin mapping. Remove or stop publishing `bin/openspec.js`; do not add a compatibility alias in `@xenonbyte/opsx@3.0.0`.

---

### `install.sh`, `uninstall.sh` (utility, request-response)

**Analog:** `install.sh`, `uninstall.sh`

**Shell wrapper pattern** (`install.sh` lines 1-4):
```bash
#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
node "$SCRIPT_DIR/bin/openspec.js" install "$@"
```

**Shell wrapper pattern** (`uninstall.sh` lines 1-4):
```bash
#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
node "$SCRIPT_DIR/bin/openspec.js" uninstall "$@"
```

**Planner note:** Preserve strict shell options and argument forwarding. Only retarget the node entrypoint.

---

### `scripts/postinstall.js` (utility, request-response)

**Analog:** `scripts/postinstall.js`

**Postinstall message pattern** (lines 1-21):
```javascript
#!/usr/bin/env node
const { PACKAGE_VERSION } = require('../lib/constants');

console.log(`
OpenSpec v${PACKAGE_VERSION} installed successfully.

Next steps:
1. Install assets for one or more tools:
   openspec install --platform claude,codex,gemini

2. For Codex, prefer:
   $openspec help me start an OpenSpec workflow

3. Optional: create \`openspec/config.yaml\` if you want project-local overrides.

Documentation:
- README.md
- docs/commands.md
- docs/codex.md
- docs/customization.md
`);
```

**Planner note:** Keep this as a plain static console message. Update branding and commands only after the CLI entrypoint exists. Do not describe later Phase 2/3 behavior as complete.

---

### `lib/constants.js` (config, transform)

**Analog:** `lib/constants.js`

**Central constants pattern** (lines 1-24):
```javascript
const path = require('path');
const pkg = require('../package.json');

const REPO_ROOT = path.resolve(__dirname, '..');
const SHARED_HOME_NAME = '.openspec';
const GLOBAL_CONFIG_NAME = '.opsx-config.yaml';
const DEFAULT_SCHEMA = 'spec-driven';
const DEFAULT_LANGUAGE = 'en';

const PLATFORM_RULE_FILES = {
  claude: 'CLAUDE.md',
  codex: 'AGENTS.md',
  gemini: 'GEMINI.md'
};

module.exports = {
  PACKAGE_NAME: pkg.name,
  PACKAGE_VERSION: pkg.version,
  REPO_ROOT,
  SHARED_HOME_NAME,
  GLOBAL_CONFIG_NAME,
  DEFAULT_SCHEMA,
  DEFAULT_LANGUAGE,
  PLATFORM_RULE_FILES
};
```

**Planner note:** Add or split identity constants here, not inline in callers. Keep package-derived name/version. If Phase 1 does not fully migrate workspace paths, separate public identity constants from deferred workspace/shared-home constants so callers can be updated deliberately.

---

### `lib/cli.js` (route/controller, request-response)

**Analog:** `lib/cli.js`

**Imports and argv parsing pattern** (lines 1-22):
```javascript
const { PACKAGE_VERSION } = require('./constants');
const { install, uninstall, runCheck, showDoc, setLanguage } = require('./install');

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

**Help text pattern** (lines 24-43):
```javascript
function showHelp() {
  return [
    `OpenSpec v${PACKAGE_VERSION}`,
    '',
    'Usage:',
    '  openspec install --platform <claude|codex|gemini[,...]>',
    '  openspec uninstall --platform <claude|codex|gemini[,...]>',
    '  openspec --check',
    '  openspec --doc',
    '  openspec --language <en|zh>',
    '  openspec --version',
    '',
    'Codex usage:',
    '  - Prefer `$openspec <request>` for natural-language workflow requests',
    '  - Use `/prompts:openspec` or `/prompts:opsx-*` for explicit routing',
    '',
    'Project config:',
    '  - openspec/config.yaml controls schema, context, and rules',
    '  - precedence: change metadata > project config > global config > package defaults'
  ].join('\n');
}
```

**Command dispatch pattern** (lines 46-102):
```javascript
async function runCli(argv) {
  const options = parseArgs(argv);
  const command = options._[0] || '';

  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(showHelp());
    return;
  }
  if (argv.includes('--version') || argv.includes('-v')) {
    console.log(`OpenSpec v${PACKAGE_VERSION}`);
    return;
  }

  switch (command) {
    case 'install': {
      const results = install({ platform: options.platform, language: options.language });
      results.forEach((result) => {
        console.log(`Installed workflow commands for ${result.platformCommandsDir}`);
      });
      return;
    }
    case 'uninstall': {
      const removed = uninstall({ platform: options.platform });
      console.log(removed.length ? `Uninstalled: ${removed.join(', ')}` : 'Nothing to uninstall.');
      return;
    }
    case 'help':
    case '--help':
    case '-h':
      console.log(showHelp());
      return;
    case 'version':
      console.log(`OpenSpec v${PACKAGE_VERSION}`);
      return;
    default:
      break;
  }

  if (argv.includes('--check')) {
    console.log(runCheck());
    return;
  }
  if (argv.includes('--doc')) {
    console.log(showDoc());
    return;
  }
  if (options.language && argv[0] === '--language') {
    const language = setLanguage(options.language);
    console.log(language === 'zh' ? '语言已切换为中文。' : 'Language switched to English.');
    return;
  }

  if (command) {
    throw new Error(`Unknown command: ${command}. Run \`openspec --help\` for usage.`);
  }

  console.log(showHelp());
}
```

**Planner note:** Preserve small synchronous dispatch style. Add `check`, `doc`, and `language` subcommands while keeping existing flags if desired. If `migrate` and `status` are recognized in Phase 1, they must return honest minimal or not-yet-implemented output, not full Phase 2/4 behavior.

---

### `lib/config.js` (service/config, file-I/O)

**Analog:** `lib/config.js`

**Imports and config dependencies** (lines 1-12):
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

**Shared-home path pattern** (lines 41-47):
```javascript
function getSharedHome(homeDir = process.env.HOME) {
  return path.join(homeDir, SHARED_HOME_NAME);
}

function getGlobalConfigPath(homeDir = process.env.HOME) {
  return path.join(getSharedHome(homeDir), GLOBAL_CONFIG_NAME);
}
```

**Global config write pattern** (lines 82-100):
```javascript
function loadGlobalConfig(homeDir = process.env.HOME) {
  return normalizeConfig(readYamlFile(getGlobalConfigPath(homeDir)));
}

function writeGlobalConfig(config, homeDir = process.env.HOME) {
  const targetPath = getGlobalConfigPath(homeDir);
  ensureDir(path.dirname(targetPath));
  const content = [
    '# OpenSpec Local Skill Configuration',
    '# Managed by openspec install',
    '',
    stringifyYaml(normalizeConfig(config))
  ].join('\n');
  writeText(targetPath, `${content}\n`);
  return targetPath;
}

function getRepoSkillDir() {
  return path.join(REPO_ROOT, 'skills', 'openspec');
}
```

**Planner note:** Use `fs-utils` and `yaml` helpers rather than ad hoc file writes. Update `getRepoSkillDir()` together with any skill folder rename. Keep config normalization unchanged unless Phase 1 explicitly needs new identity fields.

---

### `lib/install.js` (service, file-I/O)

**Analog:** `lib/install.js`

**Imports and helper usage pattern** (lines 1-22):
```javascript
const fs = require('fs');
const path = require('path');
const {
  PACKAGE_VERSION,
  REPO_ROOT,
  PLATFORM_RULE_FILES
} = require('./constants');
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
const { buildPlatformBundle } = require('./generator');
```

**Manifest and platform path pattern** (lines 37-53):
```javascript
function getPlatformHome(platform, homeDir) {
  return path.join(homeDir, `.${platform}`);
}

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

**Write bundle pattern** (lines 65-80):
```javascript
function writeBundle(targetBaseDir, bundle, records) {
  Object.keys(bundle).sort().forEach((relativePath) => {
    const filePath = path.join(targetBaseDir, relativePath);
    writeText(filePath, `${bundle[relativePath]}\n`);
    records.push(filePath);
  });
}

function normalizeInstallBundle(platform, bundle) {
  if (platform !== 'codex') return bundle;
  return Object.keys(bundle).reduce((output, relativePath) => {
    const normalizedPath = relativePath.startsWith('prompts/') ? relativePath.slice('prompts/'.length) : relativePath;
    output[normalizedPath] = bundle[relativePath];
    return output;
  }, {});
}
```

**Install transaction pattern** (lines 82-124):
```javascript
function installPlatform(platform, options) {
  const homeDir = options.homeDir || process.env.HOME;
  const sharedHome = getSharedHome(homeDir);
  const platformHome = getPlatformHome(platform, homeDir);
  const manifestPath = getManifestPath(homeDir, platform);
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '-');
  const backupRoot = path.join(sharedHome, 'backups', `install-${platform}-${timestamp}`);
  const records = [];

  ensureDir(path.join(sharedHome, 'manifests'));
  ensureDir(backupRoot);

  const platformCommandsDir = platform === 'codex'
    ? path.join(platformHome, 'prompts')
    : path.join(platformHome, 'commands');
  const platformSkillDir = path.join(platformHome, 'skills', 'openspec');
  const sharedSkillDir = path.join(sharedHome, 'skills', 'openspec');
  const sharedCommandsDir = path.join(sharedHome, 'commands');

  backupPath(platformCommandsDir, backupRoot);
  backupPath(platformSkillDir, backupRoot);

  cleanupFromManifest(manifestPath);

  removePath(sharedSkillDir);
  removePath(platformSkillDir);
  ensureDir(sharedCommandsDir);

  copyDir(getRepoSkillDir(), sharedSkillDir);
  collectRecordedFiles(sharedSkillDir).forEach((filePath) => records.push(filePath));

  copyDir(getRepoSkillDir(), platformSkillDir);
  collectRecordedFiles(platformSkillDir).forEach((filePath) => records.push(filePath));

  const sharedOpenSpecPath = path.join(sharedCommandsDir, 'openspec.md');
  const sharedOpenSpecContent = fs.readFileSync(path.join(REPO_ROOT, 'commands', 'openspec.md'), 'utf8');
  writeText(sharedOpenSpecPath, sharedOpenSpecContent);
  records.push(sharedOpenSpecPath);

  const bundle = normalizeInstallBundle(platform, buildPlatformBundle(platform));
  writeBundle(platformCommandsDir, bundle, records);

  fs.writeFileSync(manifestPath, `${records.join('\n')}\n`, 'utf8');
```

**Public service API pattern** (lines 144-167):
```javascript
function install(options) {
  const platforms = parsePlatforms(options.platform || options.platforms).filter((platform) => PLATFORM_RULE_FILES[platform]);
  if (!platforms.length) {
    throw new Error('Install requires --platform <claude|codex|gemini[,...]>');
  }
  return platforms.map((platform) => installPlatform(platform, options));
}

function uninstall(options) {
  const homeDir = options.homeDir || process.env.HOME;
  const platforms = parsePlatforms(options.platform || options.platforms).filter((platform) => PLATFORM_RULE_FILES[platform]);
  if (!platforms.length) {
    throw new Error('Uninstall requires --platform <claude|codex|gemini[,...]>');
  }
  const removed = [];
  platforms.forEach((platform) => {
    const manifestPath = getManifestPath(homeDir, platform);
    if (fs.existsSync(manifestPath)) {
      cleanupFromManifest(manifestPath);
      fs.rmSync(manifestPath, { force: true });
      removed.push(platform);
    }
  });
  return removed;
}
```

**Doc/language pattern** (lines 217-235):
```javascript
function showDoc(options = {}) {
  const homeDir = options.homeDir || process.env.HOME;
  const config = loadGlobalConfig(homeDir);
  const guideName = config.language === 'zh' ? 'GUIDE-zh.md' : 'GUIDE-en.md';
  const localGuidePath = path.join(getRepoSkillDir(), guideName);
  const installedGuidePath = path.join(getSharedHome(homeDir), 'skills', 'openspec', guideName);
  const sourcePath = fs.existsSync(localGuidePath) ? localGuidePath : installedGuidePath;
  return fs.readFileSync(sourcePath, 'utf8');
}

function setLanguage(language, options = {}) {
  if (!['en', 'zh'].includes(language)) {
    throw new Error('Language must be en or zh.');
  }
  const homeDir = options.homeDir || process.env.HOME;
  const current = loadGlobalConfig(homeDir);
  writeGlobalConfig(Object.assign({}, current, { language }), homeDir);
  return language;
}
```

**Planner note:** Treat install path, shared command filename, skill folder name, manifests, `showDoc()`, and tests as one coupled slice. Do not update only templates or only install paths.

---

### `lib/fs-utils.js`, `lib/template.js`, `lib/yaml.js` (shared utility patterns)

**Analogs:** `lib/fs-utils.js`, `lib/template.js`, `lib/yaml.js`

**Filesystem helper pattern** (`lib/fs-utils.js` lines 4-19):
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

function removePath(targetPath) {
  if (!fs.existsSync(targetPath)) return;
  fs.rmSync(targetPath, { recursive: true, force: true });
}
```

**Template helper pattern** (`lib/template.js` lines 1-10):
```javascript
function renderTemplate(template, values) {
  return Object.keys(values).reduce((output, key) => {
    const pattern = new RegExp(`{{${key}}}`, 'g');
    return output.replace(pattern, String(values[key]));
  }, template);
}

module.exports = {
  renderTemplate
};
```

**YAML helper pattern** (`lib/yaml.js` lines 21-69 and 84-104):
```javascript
function parseYaml(text) {
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
  const root = {};
  const stack = [{ indent: -1, value: root }];
  // ...
  return root;
}

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

**Planner note:** Reuse these helpers for any generated asset or config writes. Do not introduce new ad hoc read/write/template code in Phase 1.

---

### `lib/generator.js` (utility/generator, transform)

**Analog:** `lib/generator.js`

**Imports and action list pattern** (lines 1-15):
```javascript
const path = require('path');
const { REPO_ROOT } = require('./constants');
const { readText } = require('./fs-utils');
const { renderTemplate } = require('./template');
const { getAllActions, getActionSyntax, getOpenSpecSyntax, REVIEW_STATES, CHECKPOINT_STATES } = require('./workflow');

function loadTemplate(relativePath) {
  return readText(path.join(REPO_ROOT, 'templates', 'commands', relativePath));
}

function buildCommandList(platform) {
  return getAllActions()
    .map((action) => `- \`${getActionSyntax(platform, action.id)}\` - ${action.summary}`)
    .join('\n');
}
```

**Action template render pattern** (lines 17-35):
```javascript
function buildActionMarkdown(platform, action) {
  const template = loadTemplate('action.md.tmpl');
  const inlineArgumentNote = platform === 'codex'
    ? 'Do not assume text typed after a `/prompts:` command is reliably available as an inline argument in Codex.'
    : 'Use inline arguments when available, but confirm ambiguous names or descriptions before mutating files.';
  return renderTemplate(template, {
    description: action.summary,
    title: `OpenSpec route: ${action.title}`,
    action: action.id,
    inline_argument_note: inlineArgumentNote,
    scope: action.scope,
    open_spec_syntax: getOpenSpecSyntax(platform),
    action_syntax: getActionSyntax(platform, action.id),
    review_state_note: REVIEW_STATES.map((state) => `\`${state}\``).join(', '),
    planning_checkpoint_note: '`spec checkpoint` runs after `design` and before `tasks`; `task checkpoint` runs after `tasks` and before `apply`.',
    execution_checkpoint_note: '`execution checkpoint` runs after each top-level task group during `apply`.',
    checkpoint_state_note: CHECKPOINT_STATES.map((state) => `\`${state}\``).join(', ')
  });
}
```

**Bundle output pattern** (lines 83-115):
```javascript
function buildPlatformBundle(platform) {
  const files = {};
  const actions = getAllActions();

  if (platform === 'claude') {
    files['openspec.md'] = buildIndexMarkdown('claude', 'OpenSpec');
    files['opsx.md'] = buildIndexMarkdown('claude', 'OpenSpec Workflow');
    actions.forEach((action) => {
      files[`opsx/${action.id}.md`] = buildActionMarkdown('claude', action);
    });
    return files;
  }

  if (platform === 'codex') {
    files['prompts/openspec.md'] = buildCodexEntryMarkdown();
    files['prompts/opsx.md'] = buildIndexMarkdown('codex', 'OpenSpec Workflow');
    actions.forEach((action) => {
      files[`prompts/opsx-${action.id}.md`] = buildActionMarkdown('codex', action);
    });
    return files;
  }

  if (platform === 'gemini') {
    files['openspec.toml'] = buildGeminiIndexToml('OpenSpec');
    files['opsx.toml'] = buildGeminiIndexToml('OpenSpec Workflow');
    actions.forEach((action) => {
      files[`opsx/${action.id}.toml`] = buildGeminiActionToml(action);
    });
    return files;
  }

  throw new Error(`Unsupported platform: ${platform}`);
}
```

**Planner note:** Update generator and checked-in `commands/**` together. If public command route semantics are deferred to Phase 3, Phase 1 should still remove legacy primary OpenSpec entry assets from package/install surfaces per scope.

---

### `lib/workflow.js` (model/catalog, transform)

**Analog:** `lib/workflow.js`

**Action catalog pattern** (lines 4-89):
```javascript
const ACTIONS = [
  {
    id: 'propose',
    title: 'Propose',
    summary: 'Create a change and generate planning artifacts in one step.',
    scope: 'Keep planning-phase edits inside `openspec/changes/<name>/` unless the user explicitly asks to move into implementation.'
  },
  // ...
  {
    id: 'status',
    title: 'Status',
    summary: 'Show change progress, readiness, and blockers.',
    scope: 'Inspect artifacts and task state without changing unrelated files.'
  },
  {
    id: 'onboard',
    title: 'Onboard',
    summary: 'Walk a user through the minimum OpenSpec workflow path.',
    scope: 'Keep onboarding instructional until the user chooses a real change to create.'
  }
];
```

**Syntax resolver pattern** (lines 1831-1849):
```javascript
function getAction(actionId) {
  return ACTIONS.find((action) => action.id === actionId);
}

function getAllActions() {
  return ACTIONS.map((action) => getAction(action.id));
}

function getActionSyntax(platform, actionId) {
  if (platform === 'claude') return `/opsx:${actionId}`;
  if (platform === 'gemini') return `/opsx:${actionId}`;
  if (platform === 'codex') return `/prompts:opsx-${actionId}`;
  return actionId;
}

function getOpenSpecSyntax(platform) {
  if (platform === 'codex') return '$openspec <request>';
  return '/openspec <request>';
}
```

**Planner note:** For Phase 1, keep action catalog structure and update only identity/syntax strings needed for package and generated assets. Deep command responsibility rewrites belong to Phase 3.

---

### `templates/commands/*.tmpl` (template, transform)

**Analogs:** `templates/commands/index.md.tmpl`, `action.md.tmpl`, `codex-entry.md.tmpl`, Gemini TOML templates

**Index template pattern** (`index.md.tmpl` lines 1-20):
```markdown
---
description: {{description}}
---
# {{heading}}

Use the `openspec` skill for this request.

Platform: {{platform_label}}
Primary workflow entry: `{{open_spec_syntax}}`

Available routes:
{{command_list}}

Notes:
- `openspec/config.yaml` controls schema, language, context, and rules.
- `{{inline_note}}`
- Security-review states: {{review_state_note}}
- Checkpoints: {{checkpoint_note}}
- Checkpoint outcomes: {{checkpoint_state_note}}
- Keep workflow semantics shared across Claude, Codex, and Gemini.
```

**Action template pattern** (`action.md.tmpl` lines 1-24):
```markdown
---
description: {{description}}
---
# {{title}}

Use the `openspec` skill for this request.

Workflow action: `{{action}}`
Primary workflow entry: `{{open_spec_syntax}}`
Explicit action route: `{{action_syntax}}`

Execution rules:
- Follow the `{{action}}` playbook from the `openspec` skill and its referenced files.
- Read `openspec/config.yaml` if present, then `~/.openspec/.opsx-config.yaml`.
- Use request details already present in the conversation.
- {{inline_argument_note}}
- Security-review states are {{review_state_note}}.
- If config or heuristics indicate a security-sensitive change, create or recommend `security-review.md` after `design` and before `tasks`; if the user waives it, record the waiver in artifacts.
- {{planning_checkpoint_note}}
- {{execution_checkpoint_note}}
- Checkpoint outcomes use {{checkpoint_state_note}} and update existing artifacts instead of creating new review files.
- If the required change name, description, or selection is missing, ask for the minimum clarification needed.
- {{scope}}
- When files are mutated, report changed files, current state, next step, and blockers.
```

**Codex entry template pattern** (`codex-entry.md.tmpl` lines 1-20):
```markdown
---
description: OpenSpec entrypoint for Codex. Prefer the openspec skill for natural-language workflow requests.
---
# OpenSpec

Use the `openspec` skill for this request.

Codex usage model:
- Preferred: `$openspec <request>`
- Explicit routing: `/prompts:openspec` and `/prompts:opsx-*`

Available routes:
{{command_list}}

Important:
- Treat `/prompts:*` as action selectors in Codex.
- If details are still needed after command selection, provide them in the next message.
- Read `openspec/config.yaml` if present, then `~/.openspec/.opsx-config.yaml`.
- Security-review states: {{review_state_note}}
- Checkpoints: {{checkpoint_note}}
```

**Gemini TOML wrapper pattern** (`gemini-index.toml.tmpl` lines 1-4):
```toml
description = "{{description}}"
prompt = """
{{prompt}}
"""
```

**Planner note:** Preserve `{{...}}` placeholders and update source templates before regenerating checked-in command files.

---

### `commands/**` (generated asset, transform)

**Analogs:** `commands/claude/opsx.md`, `commands/codex/prompts/opsx.md`, `commands/gemini/opsx.toml`

**Claude index output pattern** (`commands/claude/opsx.md` lines 1-33):
```markdown
---
description: OpenSpec workflow command index for Claude
---
# OpenSpec Workflow

Use the `openspec` skill for this request.

Platform: Claude
Primary workflow entry: `/openspec <request>`

Available routes:
- `/opsx:propose` - Create a change and generate planning artifacts in one step.
- `/opsx:explore` - Investigate ideas, constraints, and tradeoffs before committing to a change.
- `/opsx:apply` - Implement tasks from a change and update task state.
```

**Codex action output pattern** (`commands/codex/prompts/opsx-status.md` lines 1-24):
```markdown
---
description: Show change progress, readiness, and blockers.
---
# OpenSpec route: Status

Use the `openspec` skill for this request.

Workflow action: `status`
Primary workflow entry: `$openspec <request>`
Explicit action route: `/prompts:opsx-status`

Execution rules:
- Follow the `status` playbook from the `openspec` skill and its referenced files.
- Read `openspec/config.yaml` if present, then `~/.openspec/.opsx-config.yaml`.
- Use request details already present in the conversation.
- Do not assume text typed after a `/prompts:` command is reliably available as an inline argument in Codex.
```

**Gemini output pattern** (`commands/gemini/opsx.toml` lines 1-12):
```toml
description = "OpenSpec workflow command index for Gemini"
prompt = """
---
description: OpenSpec workflow command index for Gemini
---
# OpenSpec Workflow

Use the `openspec` skill for this request.

Platform: Gemini
Primary workflow entry: `/openspec <request>`
```

**Planner note:** Treat checked-in command files as generated outputs from `lib/generator.js` and `templates/commands/*`. If changed manually, verify they still match generator output expectations.

---

### `templates/project/*.tmpl` (template/config, file-I/O)

**Analogs:** `templates/project/config.yaml.tmpl`, `change-metadata.yaml.tmpl`, `rule-file.md.tmpl`

**Project config scaffold pattern** (`config.yaml.tmpl` lines 1-14):
```yaml
schema: spec-driven
language: "zh"
context: |
  Project: OpenSpec distribution package
  Goal: Keep the workflow schema-driven, cross-platform, and suitable for npm distribution.
rules:
  proposal: "Include platform compatibility and migration impact."
  design: "Explain CLI/runtime separation and compatibility wrappers."
  tasks: "Keep tasks implementation-first, dependency-ordered, and grouped into top-level milestones."
securityReview:
  mode: "heuristic"
  required: false
  allowWaiver: true
  heuristicHint: "auth, permission, token, session, cookie, upload, payment, admin, pii, secret, tenant, webhook, callback, encryption, signature"
```

**Change metadata scaffold pattern** (`change-metadata.yaml.tmpl` lines 1-7):
```yaml
name: <change-name>
schema: spec-driven
createdAt: <ISO-8601>
securitySensitive: false
securityWaiver:
  approved: false
  reason: ""
```

**Rule file scaffold pattern** (`rule-file.md.tmpl` lines 1-7):
```markdown
# OpenSpec project hand-off

This repository uses OpenSpec as the workflow source of truth.
- Read `openspec/config.yaml` before creating or updating artifacts.
- Keep active changes under `openspec/changes/`.
- For Codex, prefer `$openspec <request>`.
- Keep `proposal.md`, `specs/`, `design.md`, and `tasks.md` aligned when work changes scope.
```

**Planner note:** Update public names in scaffolds without introducing Phase 2-only `.opsx/` state claims unless the plan explicitly accepts that boundary expansion.

---

### `skills/openspec/**` to `skills/opsx/**` (skill/provider, request-response)

**Analogs:** `skills/openspec/SKILL.md`, `GUIDE-en.md`, `GUIDE-zh.md`

**Skill frontmatter and purpose pattern** (`skills/openspec/SKILL.md` lines 1-16):
```markdown
---
name: openspec
description: Run OpenSpec spec-driven development without the OpenSpec CLI by creating and maintaining `openspec/changes/*` artifacts, implementing tasks, verifying against requirements, syncing deltas, and archiving changes. Use when users ask for `/openspec`, `/opsx:*`, Codex `/prompts:openspec`, Codex `/prompts:opsx-*`, or explicit `$openspec` workflow help.
---

# OpenSpec Workflow

Use OpenSpec as a schema-driven workflow system. Keep one change per folder and keep artifacts aligned.

## Resolve Config

Read config in this order before replying:
1. `openspec/changes/<name>/.openspec.yaml` when a specific change is active
2. `openspec/config.yaml` if present
3. `~/.openspec/.opsx-config.yaml`
```

**Invocation and filesystem model pattern** (`skills/openspec/SKILL.md` lines 27-54):
````markdown
## Invocation Model

Canonical workflow names are `openspec` and `opsx`.

- Claude/Gemini preferred: `/openspec <request>` and `/opsx:*`
- Codex preferred: `$openspec <request>`
- Codex explicit routes: `/prompts:openspec` and `/prompts:opsx-*`

On Codex, treat `/prompts:*` as routing commands, not a reliable inline-argument transport.

## Work Directly On Files

Operate without the OpenSpec CLI. Use the repository files under `openspec/`.

Typical structure:

```text
openspec/
├── config.yaml
├── changes/
│   └── <change-name>/
│       ├── .openspec.yaml
│       ├── proposal.md
│       ├── specs/<capability>/spec.md
│       ├── design.md
│       └── tasks.md
└── specs/
```
````

**Execution loop pattern** (`skills/openspec/SKILL.md` lines 99-108):
```markdown
## Default Execution Loop

1. Identify the active change name.
2. Inspect artifact presence and dependency readiness from the active schema.
3. Apply project context, per-artifact rules, and `securityReview` policy from `openspec/config.yaml`.
4. Read dependency artifacts before writing a new artifact.
5. Run `spec checkpoint` before entering `tasks`, and `task checkpoint` before entering `apply`.
6. During `apply`, run `execution checkpoint` after each top-level task group.
7. Create or update files using the schema and template rules.
8. Report changed files, current state, next step, and blockers.
```

**Guide pattern** (`GUIDE-en.md` lines 1-29):
```markdown
# OpenSpec Guide

## Quick path

1. `openspec install --platform codex`
2. `openspec --check`
3. In Codex, use `$openspec create an OpenSpec change for <work>`

## Config

Use `openspec/config.yaml` for `schema`, `language`, `context`, per-artifact `rules`, and `securityReview`.
```

**Planner note:** Coarse rename to `skills/opsx` is in Phase 1 when needed for package/install coherence. Deep rewrite of command preflight, `.opsx/active.yaml`, per-change `state.yaml`, and full skill semantics is Phase 3.

---

### `README.md`, `README-zh.md`, `docs/*.md` (docs, static content)

**Analogs:** `README.md`, `README-zh.md`, `docs/commands.md`, `docs/customization.md`, `docs/runtime-guidance.md`, `docs/supported-tools.md`

**README identity and quick-start pattern** (`README.md` lines 1-22):
````markdown
# OpenSpec

OpenSpec is an AI-native spec-driven workflow system for Claude, Codex, and Gemini.

This package now ships as a Node CLI with:
- optional project-local `openspec/config.yaml` overrides
- full workflow command set by default (no profile split)
- schema-driven workflow metadata
- generated platform adapters
- pure Node install/uninstall/check/doc/language commands
- built-in security-review gating and workflow checkpoints
- runtime guidance primitives for status/instructions integrations

## Quick start

```bash
npm install -g @xenonbyte/openspec
openspec install --platform claude,codex,gemini
$openspec help me start an OpenSpec workflow
```

Current release: `2.0.1`
````

**Command docs pattern** (`docs/commands.md` lines 55-71):
````markdown
## CLI commands

```bash
openspec install --platform <claude|codex|gemini[,...]>
openspec uninstall --platform <claude|codex|gemini[,...]>
openspec --check
openspec --doc
openspec --language <en|zh>
openspec --help
openspec --version
```

Behavior notes:
- `install` / `uninstall` require `--platform` and support comma-separated multi-platform values.
- Installation always deploys the full command surface; there is no `--profile` split.
````

**Customization precedence pattern** (`docs/customization.md` lines 24-38):
```markdown
## Precedence

1. change metadata (`openspec/changes/<name>/.openspec.yaml`)
2. project config (`openspec/config.yaml`)
3. global config (`~/.openspec/.opsx-config.yaml`)
4. package defaults

## Global config semantics

`~/.openspec/.opsx-config.yaml` is installation/runtime shared config.

- `platform` stores the last selected install target (not a single source of truth for installed platforms).
- Installed platform state is derived from manifest files under `~/.openspec/manifests/*.manifest`.
- `openspec --check` reports both views so partial uninstall states are explicit and non-blocking.
```

**Supported tools pattern** (`docs/supported-tools.md` lines 1-22):
```markdown
# Supported Tools

## Claude

- `/openspec`
- `/opsx:*`
- generated files live under `commands/claude/`

## Codex

- preferred: `$openspec <request>`
- explicit routes: `/prompts:openspec`, `/prompts:opsx-*`
- generated files live under `commands/codex/`
```

**Planner note:** Docs should reflect implemented Phase 1 CLI behavior. Keep exactly one concise source-lineage sentence where appropriate: `OpsX was originally adapted from Fission-AI/OpenSpec.`

---

### `CHANGELOG.md` (docs/release metadata, chronological append)

**Analog:** `CHANGELOG.md`

**Release entry pattern** (lines 1-20):
```markdown
# Changelog

## v2.0.1

Release date: 2026-04-06

Highlights:
- Make advisory `security-review` non-actionable across runtime guidance, workflow state, and summarized workflow output while preserving visible review state
- Preserve caller-provided preview sources for heuristic review detection and apply previews when on-disk artifacts are absent or whitespace-only
- Normalize array-backed `tasks` preview sources and keep `buildApplyInstructions().ready` gated by on-disk required artifact completion

## v2.0.0

Release date: 2026-04-05

Highlights:
- Ship the unified OpenSpec 2.0 CLI surface with schema-driven workflow metadata and generated platform adapters
- Add the runtime-guidance kernel for artifact graph resolution, status/instructions integrations, and apply preflight
- Stabilize security-review gating plus spec/task/execution checkpoint contracts across install/check/doc flows
```

**Planner note:** Add `v3.0.0` above prior entries. It may mention old OpenSpec only as history/migration lineage, not as active command guidance.

---

### `scripts/test-workflow-runtime.js` (test, file-I/O + request-response)

**Analog:** `scripts/test-workflow-runtime.js`

**Imports and local test harness pattern** (lines 1-29):
```javascript
#!/usr/bin/env node

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { copyDir, ensureDir, removePath, writeText } = require('../lib/fs-utils');
const { REPO_ROOT } = require('../lib/constants');
const {
  RuntimeGuidanceError,
  validateSchemaGraph,
  buildRuntimeKernel,
  buildStatus,
  buildArtifactInstructions,
  buildApplyInstructions
} = require('../lib/runtime-guidance');
const {
  runExecutionCheckpoint,
  summarizeWorkflowState,
  validatePhaseOneWorkflowContract,
  validateCheckpointContracts
} = require('../lib/workflow');
const {
  install,
  uninstall,
  runCheck,
  showDoc,
  setLanguage
} = require('../lib/install');
```

**Fixture setup pattern** (lines 43-77):
```javascript
function createFixtureRepo() {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-runtime-'));
  copyDir(path.join(REPO_ROOT, 'schemas'), path.join(fixtureRoot, 'schemas'));
  copyDir(path.join(REPO_ROOT, 'skills'), path.join(fixtureRoot, 'skills'));
  ensureDir(path.join(fixtureRoot, 'openspec', 'changes'));
  writeText(path.join(fixtureRoot, 'openspec', 'config.yaml'), [
    'schema: spec-driven',
    'language: en',
    'context: Runtime fixture project',
    'rules:',
    '  proposal: Keep proposal concise and implementation-scoped.',
    '  tasks: Keep tasks dependency ordered.',
    'securityReview:',
    '  mode: heuristic',
    '  required: false',
    '  allowWaiver: true'
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
```

**Install/check/doc/language regression pattern** (lines 689-714):
```javascript
test('public install/check/doc/language command surface remains compatible', () => {
  const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-home-'));
  cleanupTargets.push(tempHome);

  const results = install({ platform: 'claude,codex,gemini', homeDir: tempHome, language: 'en' });
  assert.strictEqual(results.length, 3);

  const checkOutput = runCheck({ homeDir: tempHome, cwd: fixtureRoot });
  assert(checkOutput.includes('OpenSpec Installation Check'));
  assert(checkOutput.includes('Config'));
  assert(checkOutput.includes('Found 3 manifest(s)'));
  assert(checkOutput.includes('claude'));
  assert(checkOutput.includes('codex'));
  assert(checkOutput.includes('gemini'));

  const englishDoc = showDoc({ homeDir: tempHome });
  assert(englishDoc.includes('# OpenSpec Guide'));

  const language = setLanguage('zh', { homeDir: tempHome });
  assert.strictEqual(language, 'zh');
  const chineseDoc = showDoc({ homeDir: tempHome });
  assert(chineseDoc.includes('OpenSpec'));

  const removed = uninstall({ platform: 'claude,codex,gemini', homeDir: tempHome });
  assert.deepStrictEqual(removed.sort(), ['claude', 'codex', 'gemini']);
});
```

**Doc fallback regression pattern** (lines 731-754):
```javascript
test('doc output prefers package guide over stale installed guide copy', () => {
  const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-home-doc-'));
  cleanupTargets.push(tempHome);

  const staleGuideDir = path.join(tempHome, '.openspec', 'skills', 'openspec');
  ensureDir(staleGuideDir);
  writeText(path.join(staleGuideDir, 'GUIDE-en.md'), [
    '# OpenSpec Guide',
    '',
    '1. `openspec init --platform codex --profile core`',
    '2. `openspec install --platform codex --profile core`'
  ].join('\n'));
  writeText(path.join(tempHome, '.openspec', '.opsx-config.yaml'), [
    'version: "2.0.0"',
    'schema: "spec-driven"',
    'language: "en"',
    'platform: "codex"'
  ].join('\n'));

  const doc = showDoc({ homeDir: tempHome });
  assert(doc.includes('openspec install --platform codex'));
  assert(!doc.includes('openspec init --platform codex --profile core'));
  assert(!doc.includes('--profile core'));
});
```

**Test runner pattern** (lines 824-845):
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
```

**Planner note:** Extend this existing harness for Phase 1 smoke coverage. Add focused assertions for package metadata, `bin/opsx.js`, help/version branding, install/check/doc output, generated asset paths, and stale-name gate. Keep temp homes and cleanup pattern.

---

### Boundary-sensitive runtime files (service/model, file-I/O)

**Analogs:** `lib/runtime-guidance.js`, `openspec/config.yaml`, `schemas/spec-driven/schema.json`

**Runtime config resolution pattern** (`lib/runtime-guidance.js` lines 96-117):
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
```

**Package reference lookup pattern** (`lib/runtime-guidance.js` lines 397-402):
```javascript
function loadArtifactTemplateIndex(options = {}) {
  const language = options.language === 'zh' ? 'zh' : 'en';
  const templateRoot = options.templateRoot || REPO_ROOT;
  const fileName = language === 'zh' ? 'artifact-templates-zh.md' : 'artifact-templates.md';
  const sourcePath = path.join(templateRoot, 'skills', 'openspec', 'references', fileName);
  if (!fs.existsSync(sourcePath)) {
```

**Project dogfood config pattern** (`openspec/config.yaml` lines 1-13):
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

**Planner note:** Phase 1 may update package reference lookup if `skills/openspec` is renamed to `skills/opsx`, because that keeps shipped assets coherent. Do not migrate `openSpecDir`, `changeConfigPath`, dogfood workspace layout, or schema state-machine semantics unless the plan explicitly broadens into Phase 2.

## Shared Patterns

### CommonJS Module Style

**Source:** `lib/cli.js`, `lib/install.js`, `lib/config.js`

Apply to all runtime JavaScript edits:
```javascript
const dependency = require('./dependency');

function namedFunction(options = {}) {
  // implementation
}

module.exports = {
  namedFunction
};
```

### File Operations

**Source:** `lib/fs-utils.js`

Apply to config writes, asset writes, generated bundles, and test fixtures:
```javascript
function writeText(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
}
```

### Install Manifest Cleanup

**Source:** `lib/install.js` lines 41-59, 82-124

Apply to any rename of installed files:
```javascript
function cleanupFromManifest(manifestPath) {
  if (!fs.existsSync(manifestPath)) return;
  const entries = fs.readFileSync(manifestPath, 'utf8').split('\n').filter(Boolean);
  entries.forEach((entry) => removePath(entry));
}
```

### Generated Asset Pipeline

**Source:** `lib/generator.js` lines 7-15, 83-115; `templates/commands/*.tmpl`

Apply to command assets:
```javascript
function loadTemplate(relativePath) {
  return readText(path.join(REPO_ROOT, 'templates', 'commands', relativePath));
}

function buildCommandList(platform) {
  return getAllActions()
    .map((action) => `- \`${getActionSyntax(platform, action.id)}\` - ${action.summary}`)
    .join('\n');
}
```

### Test Harness

**Source:** `scripts/test-workflow-runtime.js`

Apply to all Phase 1 verification additions:
```javascript
function test(name, fn) {
  tests.push({ name, fn });
}

// Add assertions with built-in assert, temp homes, and cleanupTargets.
```

### Error Handling

**Source:** `bin/openspec.js`, `lib/cli.js`, `lib/install.js`

Use wrapper-level catch for CLI entrypoint and explicit `throw new Error(...)` for user input errors:
```javascript
runCli(process.argv.slice(2)).catch((error) => {
  const message = error && error.message ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
```

```javascript
if (!platforms.length) {
  throw new Error('Install requires --platform <claude|codex|gemini[,...]>');
}
```

### Phase Boundary Guard

**Source:** `01-CONTEXT.md`, `01-RESEARCH.md`, `lib/runtime-guidance.js`

Apply to planning decisions:
- Rename package, binary, help/version, docs, release metadata, generated assets, and coarse skill paths now.
- Keep full `.opsx/` workspace migration, `change.yaml`, `.opsx/active.yaml`, state machine, spec-split review, TDD-light, and final JSON/status hardening out of Phase 1.
- If stale-name grep hits deferred internal runtime paths, plan an explicit allowlist or move that exact path-migration work into Phase 2.

## No Analog Found

No required Phase 1 file group lacks a codebase analog.

Do not create these as Phase 1 primary implementation files unless the plan explicitly changes scope:

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `lib/migrate.js` | service | file-I/O | Full workspace migration is Phase 2; Phase 1 may only add an honest CLI placeholder. |
| `lib/state*.js` | service/model | file-I/O | Durable state machine is Phase 4. |
| `lib/spec-split*.js` | service | transform | Spec-split checkpoint is Phase 5. |
| `lib/tdd*.js` | service | transform | TDD-light is Phase 6. |

## Metadata

**Analog search scope:** `package.json`, `bin/`, `lib/`, `scripts/`, `install.sh`, `uninstall.sh`, `templates/`, `commands/`, `skills/`, `README*.md`, `docs/`, `CHANGELOG.md`, `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/research/SUMMARY.md`, phase context/research/validation files.

**Files scanned:** 85 phase-relevant files excluding `.DS_Store` artifacts; 88 files including `.DS_Store` artifacts.

**Pattern extraction date:** 2026-04-27

**Project-specific context:** No `CLAUDE.md`, `.claude/skills/`, or `.agents/skills/` directories were present. `openspec/config.yaml` sets `language: "zh"` and heuristic security review defaults.
