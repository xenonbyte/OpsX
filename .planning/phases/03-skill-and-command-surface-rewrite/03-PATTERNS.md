# Phase 3: Skill and Command Surface Rewrite - Pattern Map

**Mapped:** 2026-04-27
**Files analyzed:** 33 file groups
**Analogs found:** 33 / 33

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `lib/workflow.js` | config / metadata registry | transform | `lib/workflow.js` | exact |
| `lib/generator.js` | service / generator | transform | `lib/generator.js` | exact |
| `lib/install.js` | service | file-I/O / batch | `lib/install.js` | exact |
| `lib/cli.js` | controller | request-response | `lib/cli.js` | exact |
| `templates/commands/action.md.tmpl` | prompt template | transform | `templates/commands/action.md.tmpl` | exact |
| `templates/commands/index.md.tmpl` | prompt template | transform | `templates/commands/index.md.tmpl` | exact |
| `templates/commands/codex-entry.md.tmpl` | prompt template | transform | `templates/commands/codex-entry.md.tmpl` | exact |
| `templates/commands/shared-entry.md.tmpl` | prompt template | transform | `templates/commands/shared-entry.md.tmpl` | exact |
| `templates/commands/gemini-*.toml.tmpl` | wrapper template | transform | `templates/commands/gemini-*.toml.tmpl` | exact |
| `commands/claude/opsx.md` | generated prompt output | transform / request-response | `templates/commands/index.md.tmpl` + `lib/generator.js` | generated |
| `commands/claude/opsx/*.md` | generated prompt output | transform / request-response | `templates/commands/action.md.tmpl` + `lib/generator.js` | generated |
| `commands/codex/prompts/opsx.md` | generated prompt output / possible internal index | transform / request-response | `templates/commands/codex-entry.md.tmpl` + `lib/generator.js` | generated |
| `commands/codex/prompts/opsx-*.md` | generated prompt output | transform / request-response | `templates/commands/action.md.tmpl` + `lib/generator.js` | generated |
| `commands/gemini/opsx.toml` | generated prompt output | transform / request-response | `templates/commands/gemini-index.toml.tmpl` + `lib/generator.js` | generated |
| `commands/gemini/opsx/*.toml` | generated prompt output | transform / request-response | `templates/commands/gemini-action.toml.tmpl` + `lib/generator.js` | generated |
| `skills/opsx/SKILL.md` | skill metadata / provider | request-response | `skills/opsx/SKILL.md` | exact |
| `skills/opsx/GUIDE-en.md` | docs | guidance | `skills/opsx/GUIDE-en.md` | exact |
| `skills/opsx/GUIDE-zh.md` | docs | guidance | `skills/opsx/GUIDE-zh.md` | exact |
| `skills/opsx/references/action-playbooks.md` | skill reference | request-response guidance | `skills/opsx/references/action-playbooks.md` | exact |
| `skills/opsx/references/action-playbooks-zh.md` | skill reference | request-response guidance | `skills/opsx/references/action-playbooks-zh.md` | exact |
| `docs/commands.md` | docs | guidance | `docs/commands.md` | exact |
| `docs/codex.md` | docs | guidance | `docs/codex.md` | exact |
| `docs/supported-tools.md` | docs | guidance | `docs/supported-tools.md` | exact |
| `docs/runtime-guidance.md` | docs | guidance | `docs/runtime-guidance.md` | exact |
| `README.md` | docs | guidance | `README.md` | exact |
| `README-zh.md` | docs | guidance | `README-zh.md` | exact |
| `templates/project/rule-file.md.tmpl` | docs template | scaffold | `templates/project/rule-file.md.tmpl` | exact |
| `AGENTS.md` | project instructions | guidance | `AGENTS.md` | exact |
| `scripts/postinstall.js` | script | request-response | `scripts/postinstall.js` | exact |
| `scripts/test-workflow-runtime.js` | test | request-response / file-I/O | `scripts/test-workflow-runtime.js` | exact |
| `scripts/check-phase1-legacy-allowlist.js` | test / policy gate | batch scan | `scripts/check-phase1-legacy-allowlist.js` | exact |
| `.planning/REQUIREMENTS.md` | planning docs | guidance / traceability | `.planning/REQUIREMENTS.md` | exact |
| `.planning/ROADMAP.md` | planning docs | guidance / traceability | `.planning/ROADMAP.md` | exact |

## Pattern Assignments

### `lib/workflow.js` (config / metadata registry, transform)

**Analog:** `lib/workflow.js`

**Imports and legacy-constant pattern** (lines 1-7):
```javascript
const { DEFAULT_SCHEMA, PRODUCT_SHORT_NAME, SHARED_HOME_NAME } = require('./constants');
const { loadSchema } = require('./schema');

const OPSX_SKILL_DIR_PREFIX = `skills/${PRODUCT_SHORT_NAME}/`;
const LEGACY_WORKSPACE_SEGMENT = SHARED_HOME_NAME.replace(/^\./, '');
const LEGACY_SKILL_DIR_PREFIX = `skills/${LEGACY_WORKSPACE_SEGMENT}/`;
const LEGACY_CHANGE_DIR_PREFIX = `${LEGACY_WORKSPACE_SEGMENT}/changes/`;
```

**Action metadata pattern** (lines 9-15, 77-93):
```javascript
const ACTIONS = [
  {
    id: 'propose',
    title: 'Propose',
    summary: 'Create a change and generate planning artifacts in one step.',
    scope: 'Keep planning-phase edits inside the active change workspace unless the user explicitly asks to move into implementation.'
  },
  {
    id: 'resume',
    title: 'Resume',
    summary: 'Restore context around active changes and recommend the next move.',
    scope: 'If no change is specified, recommend the best active candidate and explain why.'
  },
  {
    id: 'status',
    title: 'Status',
    summary: 'Show change progress, readiness, and blockers.',
    scope: 'Inspect artifacts and task state without changing unrelated files.'
  },
  {
    id: 'onboard',
    title: 'Onboard',
    summary: 'Walk a user through the minimum OpsX workflow path.',
    scope: 'Keep onboarding instructional until the user chooses a real change to create.'
  }
];
```

**Route syntax helper pattern** (lines 1854-1873):
```javascript
function getAction(actionId) {
  return ACTIONS.find((action) => action.id === actionId);
}

function getAllActions() {
  return ACTIONS.map((action) => getAction(action.id));
}

function getActionSyntax(platform, actionId) {
  if (platform === 'claude') return `/opsx-${actionId}`;
  if (platform === 'gemini') return `/opsx-${actionId}`;
  if (platform === 'codex') return `$opsx-${actionId}`;
  return actionId;
}

function getPrimaryWorkflowSyntax(platform) {
  if (platform === 'codex') return '$opsx <request>';
  if (platform === 'claude' || platform === 'gemini') return '/opsx-<action>';
  return 'opsx';
}
```

**Export pattern** (lines 1875-1893):
```javascript
module.exports = {
  ACTIONS,
  REVIEW_STATES,
  CHECKPOINT_STATES,
  getAction,
  getAllActions,
  getActionSyntax,
  getPrimaryWorkflowSyntax,
  resolveSecurityReviewState,
  resolveWorkflowState,
  summarizeWorkflowState,
  normalizePlanningEvidence,
  normalizeExecutionEvidence,
  runSpecCheckpoint,
  runTaskCheckpoint,
  runExecutionCheckpoint,
  validatePhaseOneWorkflowContract,
  validateCheckpointContracts
};
```

**Apply:** Make this the first source of truth for route syntax and action-specific fallback metadata. `getActionSyntax('codex', id)` already returns `$opsx-${id}`; change or remove the old Codex primary workflow syntax so generated Codex action prompts stop rendering `$opsx <request>`. Add any shared preflight/fallback metadata here if planner wants templates to avoid repeated prose.

---

### `lib/generator.js` (service / generator, transform)

**Analog:** `lib/generator.js`

**Imports pattern** (lines 1-5):
```javascript
const path = require('path');
const { REPO_ROOT } = require('./constants');
const { readText } = require('./fs-utils');
const { renderTemplate } = require('./template');
const { getAllActions, getActionSyntax, getPrimaryWorkflowSyntax, REVIEW_STATES, CHECKPOINT_STATES } = require('./workflow');
```

**Command list fan-out pattern** (lines 11-15):
```javascript
function buildCommandList(platform) {
  return getAllActions()
    .map((action) => `- \`${getActionSyntax(platform, action.id)}\` - ${action.summary}`)
    .join('\n');
}
```

**Action prompt render pattern** (lines 17-34):
```javascript
function buildActionMarkdown(platform, action) {
  const template = loadTemplate('action.md.tmpl');
  const inlineArgumentNote = platform === 'codex'
    ? 'Do not assume text typed after a `$opsx-*` command is reliably available as an inline argument in Codex.'
    : 'Use inline arguments when available, but confirm ambiguous names or descriptions before mutating files.';
  return renderTemplate(template, {
    description: action.summary,
    title: `OpsX route: ${action.title}`,
    action: action.id,
    inline_argument_note: inlineArgumentNote,
    scope: action.scope,
    primary_workflow_syntax: getPrimaryWorkflowSyntax(platform),
    action_syntax: getActionSyntax(platform, action.id),
    review_state_note: REVIEW_STATES.map((state) => `\`${state}\``).join(', '),
    planning_checkpoint_note: '`spec checkpoint` runs after `design` and before `tasks`; `task checkpoint` runs after `tasks` and before `apply`.',
    execution_checkpoint_note: '`execution checkpoint` runs after each top-level task group during `apply`.',
    checkpoint_state_note: CHECKPOINT_STATES.map((state) => `\`${state}\``).join(', ')
  });
}
```

**Index and Codex entry render pattern** (lines 37-63):
```javascript
function buildIndexMarkdown(platform, heading) {
  const template = loadTemplate('index.md.tmpl');
  const platformLabel = platform === 'codex' ? 'Codex' : platform === 'claude' ? 'Claude' : 'Gemini';
  const inlineNote = platform === 'codex'
    ? 'Treat `$opsx-*` as action selectors in Codex. If details are still needed, provide them in the next message.'
    : 'Inline command arguments are acceptable, but the workflow should still confirm missing or ambiguous details.';
  return renderTemplate(template, {
    description: `OpsX workflow command index for ${platformLabel}`,
    heading,
    platform_label: platformLabel,
    primary_workflow_syntax: getPrimaryWorkflowSyntax(platform),
    command_list: buildCommandList(platform),
    inline_note: inlineNote,
    review_state_note: REVIEW_STATES.map((state) => `\`${state}\``).join(', '),
    checkpoint_note: '`spec checkpoint` before `tasks`, `task checkpoint` before `apply`, and `execution checkpoint` after each top-level task group.',
    checkpoint_state_note: CHECKPOINT_STATES.map((state) => `\`${state}\``).join(', ')
  });
}

function buildCodexEntryMarkdown() {
  const template = loadTemplate('codex-entry.md.tmpl');
  return renderTemplate(template, {
    command_list: buildCommandList('codex'),
    review_state_note: REVIEW_STATES.map((state) => `\`${state}\``).join(', '),
    checkpoint_note: '`spec checkpoint` before `tasks`, `task checkpoint` before `apply`, and `execution checkpoint` after each top-level task group.'
  });
}
```

**Bundle dispatch pattern** (lines 83-111):
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

**Apply:** Extend render variables for strict preflight and route-specific fallback blocks before refreshing `commands/**`. If `commands/codex/prompts/opsx.md` remains, keep it as an internal index only and remove public `$opsx <request>` language; if deleted from the bundle, update `buildPlatformBundle('codex')`, install normalization, and tests together.

---

### `templates/commands/*.tmpl` (prompt templates, transform)

**Analogs:** `templates/commands/action.md.tmpl`, `index.md.tmpl`, `codex-entry.md.tmpl`, `shared-entry.md.tmpl`, `gemini-*.toml.tmpl`

**Action template pattern** (`templates/commands/action.md.tmpl` lines 6-25):
```markdown
Use the `opsx` skill for this request.

Workflow action: `{{action}}`
Primary workflow entry: `{{primary_workflow_syntax}}`
Explicit action route: `{{action_syntax}}`

Execution rules:
- Follow the `{{action}}` playbook from the `opsx` skill and its referenced files.
- CLI quick checks: `opsx check`, `opsx doc`, and `opsx language <en|zh>`.
- Keep guidance phase-accurate: `.opsx/active.yaml`, per-change `state.yaml`, `spec-split-checkpoint`, and TDD-light checks are planned for later phases.
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

**Index template pattern** (`templates/commands/index.md.tmpl` lines 8-21):
```markdown
Platform: {{platform_label}}
Primary workflow entry: `{{primary_workflow_syntax}}`

Available routes:
{{command_list}}

Notes:
- CLI quick checks: `opsx check`, `opsx doc`, and `opsx language <en|zh>`.
- `{{inline_note}}`
- Keep guidance phase-accurate: `.opsx/active.yaml`, per-change `state.yaml`, `spec-split-checkpoint`, and TDD-light checks are planned for later phases.
- Security-review states: {{review_state_note}}
- Checkpoints: {{checkpoint_note}}
- Checkpoint outcomes: {{checkpoint_state_note}}
- Keep workflow semantics shared across Claude, Codex, and Gemini.
```

**Codex entry template pattern** (`templates/commands/codex-entry.md.tmpl` lines 8-21):
```markdown
Codex usage model:
- Preferred: `$opsx <request>`
- Explicit routing: `$opsx-*`

Available routes:
{{command_list}}

Important:
- Treat `$opsx-*` as action selectors in Codex.
- If details are still needed after command selection, provide them in the next message.
- CLI quick checks: `opsx check`, `opsx doc`, `opsx language <en|zh>`.
- Keep guidance phase-accurate: `.opsx/active.yaml`, per-change `state.yaml`, `spec-split-checkpoint`, and TDD-light checks are planned for later phases.
- Security-review states: {{review_state_note}}
- Checkpoints: {{checkpoint_note}}
```

**Shared entry pattern** (`templates/commands/shared-entry.md.tmpl` lines 17-27):
```markdown
Codex guidance:
- Prefer `$opsx <request>` for natural-language requests.
- Use `$opsx-*` or `/opsx-*` for explicit routing.
- CLI quick checks: `opsx check`, `opsx doc`, and `opsx language <en|zh>`.
- Keep guidance phase-accurate: `.opsx/active.yaml`, per-change `state.yaml`, `spec-split-checkpoint`, and TDD-light checks are planned for later phases.

Security review guidance:
- Use `security-review.md` after `design` and before `tasks` for security-sensitive changes.
- Explicit markers force the review; heuristic matches recommend it and allow waiver with recorded reasoning.
- Review states: {{review_states}}
- Checkpoint states: {{checkpoint_states}}
```

**Gemini wrapper pattern** (`templates/commands/gemini-action.toml.tmpl` lines 1-4):
```toml
description = "{{description}}"
prompt = """
{{prompt}}
"""
```

**Apply:** Replace "planned for later phases" lines with Phase 3 strict preflight wording: read `.opsx/config.yaml`, `.opsx/active.yaml`, active change `state.yaml`, `context.md`, and current artifacts when present. Do not claim Phase 4 hash comparison, transition enforcement, allowed/forbidden path enforcement, or durable apply-state mutation. Remove `$opsx <request>`, `/prompts:*`, `/opsx:*`, `/openspec`, and `$openspec` public guidance from templates.

---

### `commands/**` (generated prompt outputs, transform / request-response)

**Analogs:** generated outputs from `lib/generator.js` + `templates/commands/*`

**Claude action output pattern** (`commands/claude/opsx/status.md` lines 8-25):
```markdown
Workflow action: `status`
Primary workflow entry: `/opsx-<action>`
Explicit action route: `/opsx-status`

Execution rules:
- Follow the `status` playbook from the `opsx` skill and its referenced files.
- CLI quick checks: `opsx check`, `opsx doc`, and `opsx language <en|zh>`.
- Keep guidance phase-accurate: `.opsx/active.yaml`, per-change `state.yaml`, `spec-split-checkpoint`, and TDD-light checks are planned for later phases.
- Use request details already present in the conversation.
- Use inline arguments when available, but confirm ambiguous names or descriptions before mutating files.
```

**Codex action output pattern** (`commands/codex/prompts/opsx-status.md` lines 8-17):
```markdown
Workflow action: `status`
Primary workflow entry: `$opsx <request>`
Explicit action route: `$opsx-status`

Execution rules:
- Follow the `status` playbook from the `opsx` skill and its referenced files.
- CLI quick checks: `opsx check`, `opsx doc`, and `opsx language <en|zh>`.
- Keep guidance phase-accurate: `.opsx/active.yaml`, per-change `state.yaml`, `spec-split-checkpoint`, and TDD-light checks are planned for later phases.
- Use request details already present in the conversation.
- Do not assume text typed after a `$opsx-*` command is reliably available as an inline argument in Codex.
```

**Codex root entry output pattern** (`commands/codex/prompts/opsx.md` lines 8-16):
```markdown
Codex usage model:
- Preferred: `$opsx <request>`
- Explicit routing: `$opsx-*`

Available routes:
- `$opsx-propose` - Create a change and generate planning artifacts in one step.
- `$opsx-explore` - Investigate ideas, constraints, and tradeoffs before committing to a change.
- `$opsx-apply` - Implement tasks from a change and update task state.
- `$opsx-archive` - Archive a completed change and sync specs if needed.
```

**Gemini output wrapper pattern** (`commands/gemini/opsx/status.toml` lines 1-12):
```toml
description = "Show change progress, readiness, and blockers."
prompt = """
---
description: Show change progress, readiness, and blockers.
---
# OpsX route: Status

Use the `opsx` skill for this request.

Workflow action: `status`
Primary workflow entry: `/opsx-<action>`
Explicit action route: `/opsx-status`
```

**Apply:** Refresh these from the generator after central changes. Do not hand-edit generated command files as the primary strategy. Contract tests should compare checked-in generated files against `buildPlatformBundle()` output for all 45 files under `commands/claude`, `commands/codex`, and `commands/gemini`.

---

### `lib/install.js` (service, file-I/O / batch)

**Analog:** `lib/install.js`

**Platform install-root pattern** (lines 58-65):
```javascript
function getPlatformInstallRoots(platform, homeDir) {
  const platformHome = getPlatformHome(platform, homeDir);
  return {
    commandsDir: platform === 'codex'
      ? path.join(platformHome, 'prompts')
      : path.join(platformHome, 'commands'),
    skillDir: path.join(platformHome, 'skills', 'opsx')
  };
}
```

**Codex install normalization pattern** (lines 111-117):
```javascript
function normalizeInstallBundle(platform, bundle) {
  if (platform !== 'codex') return bundle;
  return Object.keys(bundle).reduce((output, relativePath) => {
    const normalizedPath = relativePath.startsWith('prompts/') ? relativePath.slice('prompts/'.length) : relativePath;
    output[normalizedPath] = bundle[relativePath];
    return output;
  }, {});
}
```

**Generated bundle install pattern** (lines 146-156):
```javascript
copyDir(getRepoSkillDir(), sharedSkillDir);

copyDir(getRepoSkillDir(), platformSkillDir);
collectRecordedFiles(platformSkillDir).forEach((filePath) => records.push(filePath));

const sharedOpsxPath = path.join(sharedCommandsDir, 'opsx.md');
const sharedOpsxContent = fs.readFileSync(path.join(REPO_ROOT, 'commands', 'claude', 'opsx.md'), 'utf8');
writeText(sharedOpsxPath, sharedOpsxContent);

const bundle = normalizeInstallBundle(platform, buildPlatformBundle(platform));
writeBundle(platformCommandsDir, bundle, records);
```

**Apply:** If the Codex root prompt is removed or made internal, update install normalization and manifest expectations in the same plan. Installed files must mirror the generated bundle contract; avoid a path-specific one-off in `installPlatform()`.

---

### `lib/cli.js` and `scripts/postinstall.js` (controller/script, request-response)

**Analogs:** `lib/cli.js`, `scripts/postinstall.js`

**CLI help pattern** (`lib/cli.js` lines 38-62):
```javascript
function showHelp() {
  return [
    `${PRODUCT_NAME} v${PACKAGE_VERSION}`,
    PRODUCT_LONG_NAME,
    '',
    'Usage:',
    `  ${PRODUCT_SHORT_NAME} install --platform <claude|codex|gemini[,...]>`,
    `  ${PRODUCT_SHORT_NAME} uninstall --platform <claude|codex|gemini[,...]>`,
    `  ${PRODUCT_SHORT_NAME} check`,
    `  ${PRODUCT_SHORT_NAME} doc`,
    `  ${PRODUCT_SHORT_NAME} language <en|zh>`,
    `  ${PRODUCT_SHORT_NAME} migrate --dry-run`,
    `  ${PRODUCT_SHORT_NAME} migrate`,
    `  ${PRODUCT_SHORT_NAME} status`,
    `  ${PRODUCT_SHORT_NAME} --help`,
    `  ${PRODUCT_SHORT_NAME} --version`,
    '',
    'Compatibility aliases:',
    `  ${PRODUCT_SHORT_NAME} --check`,
    `  ${PRODUCT_SHORT_NAME} --doc`,
    `  ${PRODUCT_SHORT_NAME} --language <en|zh>`,
    '',
    'Codex usage:',
    `  - Prefer \`$${PRODUCT_SHORT_NAME} <request>\` for natural-language workflow requests`
  ].join('\n');
}
```

**Postinstall copy pattern** (`scripts/postinstall.js` lines 4-21):
```javascript
console.log(`
OpsX v${PACKAGE_VERSION} installed successfully.

Next steps:
1. Install assets for one or more tools:
   opsx install --platform claude,codex,gemini

2. For Codex, prefer:
   $opsx <request>

3. Check command help:
   opsx --help

Documentation:
- README.md
- docs/commands.md
- docs/codex.md
- docs/customization.md
`);
```

**Status is CLI migration diagnostics, not route behavior** (`lib/cli.js` lines 73-96):
```javascript
function showStatus(options = {}) {
  const cwd = options.cwd || process.cwd();
  const homeDir = options.homeDir || process.env.HOME;
  const status = getMigrationStatus({ cwd, homeDir });
  const canonicalProjectConfigPath = path.join(cwd, '.opsx', 'config.yaml');
  const legacyProjectConfigPath = path.join(cwd, 'openspec', 'config.yaml');
  return [
    showVersion(),
    'Current phase: Phase 2 (.opsx/ Workspace and Migration)',
    'Durable change-state lifecycle remains scheduled for Phase 4.',
```

**Apply:** Remove `$opsx <request>` from help and postinstall copy. Do not solve CMD-05 by overloading CLI `opsx status`; CMD-05 belongs in generated route prompts and skill playbooks. Keep migration-internal legacy path diagnostics where they describe `opsx migrate` candidates.

---

### `skills/opsx/SKILL.md` and playbooks (skill provider, request-response guidance)

**Analogs:** `skills/opsx/SKILL.md`, `skills/opsx/references/action-playbooks*.md`

**Skill frontmatter and invocation pattern** (`skills/opsx/SKILL.md` lines 1-4, 27-35):
```markdown
---
name: opsx
description: Run OpsX spec-driven development without the OpsX CLI by creating and maintaining `.opsx/changes/*` artifacts, implementing tasks, verifying against requirements, syncing deltas, and archiving changes. Use when users ask for `/opsx-*`, explicit `$opsx-*` actions, or Codex `$opsx <request>` workflow help.
---

## Invocation Model

Canonical workflow name is `opsx`.

- Claude/Gemini preferred: `/opsx-*`
- Codex preferred: `$opsx <request>`
- Codex explicit routes: `$opsx-*`

On Codex, treat explicit action routes as command selection hints, not a reliable inline-argument transport.
```

**Config precedence pattern** (`skills/opsx/SKILL.md` lines 10-24):
```markdown
## Resolve Config

Read config in this target order before replying:
1. `.opsx/changes/<name>/change.yaml` when a specific change is active
2. `.opsx/config.yaml` if present
3. `~/.opsx/config.yaml`

Use the resolved config for:
- `schema`
- `language`
- `context`
- `rules`
- `securityReview`
```

**Reference-loading and execution-loop pattern** (`skills/opsx/SKILL.md` lines 96-115):
```markdown
## Load References On Demand

If `language: zh`:
- Read `references/artifact-templates-zh.md` for artifact writing rules.
- Read `references/action-playbooks-zh.md` for action behavior.

If `language: en`:
- Read `references/artifact-templates.md` for artifact writing rules.
- Read `references/action-playbooks.md` for action behavior.

## Default Execution Loop

1. Identify the active change name.
2. Inspect artifact presence and dependency readiness from the active schema.
3. Apply project context, per-artifact rules, and `securityReview` policy from `.opsx/config.yaml`.
4. Read dependency artifacts before writing a new artifact.
5. Run `spec checkpoint` before entering `tasks`, and `task checkpoint` before entering `apply`.
6. During `apply`, run `execution checkpoint` after each top-level task group.
7. Create or update files using the schema and template rules.
8. Report changed files, current state, next step, and blockers.
```

**Playbook common setup pattern** (`skills/opsx/references/action-playbooks.md` lines 5-14):
```markdown
## Common setup

1. Resolve config from change metadata, project config, then global config.
2. Apply `context` and per-artifact `rules` before writing.
3. Read dependency artifacts from the active schema.
4. If config explicitly marks a change as security-sensitive, require `security-review.md` before `tasks`.
5. If the change matches security heuristics, recommend `security-review.md`; if waived, record the reason in artifacts.
6. Run `spec checkpoint` after `design` and before `tasks`.
7. Run `task checkpoint` after `tasks` and before `apply`.
```

**Existing status playbook pattern** (`skills/opsx/references/action-playbooks.md` lines 80-87):
```markdown
## status

- Report artifact readiness from the active schema.
- Report blockers and next actions.
- Make `security-review` readiness explicit when it is required or recommended.
- Surface checkpoint output using canonical fields: `status`, `findings`, `patchTargets`, and `nextStep`.
- Use `required`, `recommended`, `waived`, and `completed` for security-review state.
- Use `PASS`, `WARN`, and `BLOCK` for checkpoint output.
```

**Apply:** Invert Codex invocation to explicit-only `$opsx-*`; remove `$opsx <request>` from frontmatter and guides. Add missing playbook sections for `resume`, `onboard`, `batch-apply`, and `bulk-archive` in both English and Chinese. Add strict preflight language here too, but keep it honest: missing `.opsx/`, missing `.opsx/active.yaml`, or missing active change should produce guidance for `onboard`, `status`, and `resume`, not implicit state creation.

---

### Public docs, guides, project templates, and `AGENTS.md` (docs, guidance)

**Analogs:** `README*.md`, `docs/*.md`, `skills/opsx/GUIDE-*.md`, `templates/project/rule-file.md.tmpl`, `AGENTS.md`

**Command reference pattern** (`docs/commands.md` lines 3-8, 11-24):
```markdown
## Agent Entrypoints

- Claude/Gemini: `/opsx-<action>`
- Codex (recommended): `$opsx <request>`
- Codex (explicit routes): `$opsx-<action>`

## Workflow Action Routes

- `propose`: `/opsx-propose` or `$opsx-propose`
- `explore`: `/opsx-explore` or `$opsx-explore`
- `new`: `/opsx-new` or `$opsx-new`
- `continue`: `/opsx-continue` or `$opsx-continue`
- `ff`: `/opsx-ff` or `$opsx-ff`
- `status`: `/opsx-status` or `$opsx-status`
- `resume`: `/opsx-resume` or `$opsx-resume`
- `apply`: `/opsx-apply` or `$opsx-apply`
- `verify`: `/opsx-verify` or `$opsx-verify`
- `sync`: `/opsx-sync` or `$opsx-sync`
- `archive`: `/opsx-archive` or `$opsx-archive`
- `batch-apply`: `/opsx-batch-apply` or `$opsx-batch-apply`
- `bulk-archive`: `/opsx-bulk-archive` or `$opsx-bulk-archive`
- `onboard`: `/opsx-onboard` or `$opsx-onboard`
```

**Codex guide pattern** (`docs/codex.md` lines 3-21):
```markdown
## Preferred Entrypoint

Use the skill directly:

```text
$opsx <request>
```

## Explicit Routing

Use these when you want a fixed workflow action:

```text
$opsx-propose
$opsx-apply
$opsx-status
```

If the selected route still needs a change name or description, provide it in the next message.
```

**README Codex usage pattern** (`README.md` lines 36-48):
```markdown
## Codex Usage

Preferred entrypoint:
```text
$opsx <request>
```

Explicit action routes:
```text
$opsx-propose
$opsx-apply
$opsx-status
```
```

**Guide copy pattern** (`skills/opsx/GUIDE-en.md` lines 25-32 and `GUIDE-zh.md` lines 25-32):
```markdown
## Notes

- Install always deploys the full command surface (no `--profile` split).
- `--check` reports installed manifests and treats config `platform` as last selected platform.
- `--doc` prefers package-local guide content over installed shared copies.
- Command bundles are generated during `install`; no extra build/validation command is required.
- In Codex, prefer `$opsx <request>` and `$opsx-*` for explicit routing.
- In Claude/Gemini, use `/opsx-*` commands as the primary route surface.
```

**Project hand-off template pattern** (`templates/project/rule-file.md.tmpl` lines 1-7):
```markdown
# OpsX project hand-off

This repository uses OpsX as the workflow source of truth.
- After OpsX workspace migration, read `.opsx/config.yaml` before creating or updating artifacts.
- Keep active changes under `.opsx/changes/`.
- For Codex, prefer `$opsx <request>`.
- Keep `proposal.md`, `specs/`, `design.md`, and `tasks.md` aligned when work changes scope.
```

**Current repo hand-off pattern** (`AGENTS.md` lines 1-9):
```markdown
# OpenSpec project hand-off

This repository uses OpenSpec as the workflow source of truth.
- Read `openspec/config.yaml` for project context and workflow defaults.
- Keep change artifacts under `openspec/changes/`.
- For Codex, prefer `$openspec <request>`; for Claude/Gemini use `/openspec` or `/opsx:*`.
- Keep `security-review.md` between `design.md` and `tasks.md` when required or recommended.
- Run `spec checkpoint` before `tasks`, `task checkpoint` before `apply`, and `execution checkpoint` after each top-level task group.
- When implementing a change, keep `proposal.md`, `specs/`, `design.md`, and `tasks.md` aligned.
```

**Apply:** Rewrite docs and guide surfaces to list `$opsx-*` as Codex public primary routes. Remove standalone `$opsx`, `$opsx <request>`, `/prompts:*`, `/opsx:*`, `/openspec`, and `$openspec` from current user guidance. Preserve source-lineage sentence in README only if the new public-surface gate explicitly allows lineage; keep real migration internals out of user-facing command route docs.

---

### `scripts/test-workflow-runtime.js` and public-surface gate (test, request-response / batch scan)

**Analogs:** `scripts/test-workflow-runtime.js`, `scripts/check-phase1-legacy-allowlist.js`

**Test harness imports and fixture pattern** (`scripts/test-workflow-runtime.js` lines 3-31, 45-62):
```javascript
const assert = require('assert');
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { copyDir, ensureDir, removePath, writeText } = require('../lib/fs-utils');
const { REPO_ROOT, PACKAGE_VERSION } = require('../lib/constants');
const { buildPlatformBundle } = require('../lib/generator');

function createFixtureRepo() {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-runtime-'));
  copyDir(path.join(REPO_ROOT, 'schemas'), path.join(fixtureRoot, 'schemas'));
  copyDir(path.join(REPO_ROOT, 'skills'), path.join(fixtureRoot, 'skills'));
  ensureDir(path.join(fixtureRoot, '.opsx', 'changes'));
  writeText(path.join(fixtureRoot, '.opsx', 'config.yaml'), [
    'schema: spec-driven',
    'language: en',
    'context: Runtime fixture project',
```

**Current generated bundle contract seam** (`scripts/test-workflow-runtime.js` lines 1058-1118):
```javascript
test('runtime suite locks renamed skill targets, generated bundles, and checked-in command entries', () => {
  const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'opsx-home-surface-'));
  cleanupTargets.push(tempHome);

  const installResults = install({ platform: 'claude,codex,gemini', homeDir: tempHome, language: 'en' });
  assert.strictEqual(installResults.length, 3);
  installResults.forEach((result) => {
    assert(result.platformSkillDir.includes(path.join('skills', 'opsx')));
    assert(!result.platformSkillDir.includes(path.join('skills', 'openspec')));
    assert(fs.existsSync(result.platformSkillDir));
  });

  const generatedBundles = {
    claude: buildPlatformBundle('claude'),
    codex: buildPlatformBundle('codex'),
    gemini: buildPlatformBundle('gemini')
  };
  assert(generatedBundles.claude['opsx.md'].includes('OpsX'));
  assert(generatedBundles.claude['opsx.md'].includes('Primary workflow entry: `/opsx-<action>`'));
  assert(!generatedBundles.claude['opsx.md'].includes('Primary workflow entry: `$opsx <request>`'));
  assert(generatedBundles.codex['prompts/opsx.md'].includes('$opsx <request>'));
  assert(generatedBundles.gemini['opsx.toml'].includes('OpsX Workflow'));
  assert(generatedBundles.gemini['opsx.toml'].includes('Primary workflow entry: `/opsx-<action>`'));
  assert(!generatedBundles.gemini['opsx.toml'].includes('Primary workflow entry: `$opsx <request>`'));
  Object.entries(generatedBundles).forEach(([platform, bundle]) => {
    Object.keys(bundle).forEach((relativePath) => {
      assert(!relativePath.includes('openspec'), `${platform} bundle contains legacy path: ${relativePath}`);
    });
  });
```

**Legacy allowlist gate pattern** (`scripts/check-phase1-legacy-allowlist.js` lines 8-37, 102-109):
```javascript
const LEGACY_TOKEN_PATTERN = /OpenSpec|openspec|\.openspec|\$openspec|\/openspec|\/prompts:openspec|@xenonbyte\/openspec|~\/\.openspec/g;
const README_LINEAGE_SENTENCE = 'OpsX was originally adapted from Fission-AI/OpenSpec.';

const SCAN_TARGETS = [
  'README.md',
  'README-zh.md',
  'CHANGELOG.md',
  'package.json',
  'bin',
  'lib',
  'scripts',
  'commands',
  'skills/opsx',
  'templates',
  'docs',
  'openspec/config.yaml',
  'schemas/spec-driven/schema.json',
  'AGENTS.md'
];

const DEFERRED_ALLOWLIST_FILES = new Set([
  'lib/config.js',
  'lib/constants.js',
  'lib/install.js',
  'lib/runtime-guidance.js',
  'scripts/test-workflow-runtime.js',
  'openspec/config.yaml',
  'schemas/spec-driven/schema.json',
  'AGENTS.md'
]);

function classifySurface(filePath) {
  if (filePath === 'package.json' || filePath.startsWith('bin/')) return 'forbidden public surface';
  if (filePath === 'lib/cli.js') return 'forbidden public surface';
  if (filePath.startsWith('commands/')) return 'forbidden public surface';
  if (filePath.startsWith('skills/opsx/')) return 'forbidden public surface';
  if (filePath.startsWith('docs/')) return 'forbidden public surface';
  if (filePath.startsWith('templates/')) return 'forbidden public surface';
  return 'unexpected legacy reference';
}
```

**Apply:** Replace the stale positive assertion for `$opsx <request>` with negative assertions across generated bundles, installed Codex assets, CLI help, postinstall copy, README/docs/guides, and templates. Keep migration-internal tests separate from public-surface route tests. Add parity checks that each checked-in command file equals the corresponding `buildPlatformBundle()` value. Add CMD-05 tests that generated `onboard`, `status`, and `resume` prompts include non-error missing-workspace/no-active-change guidance and explicitly do not auto-create active state.

---

### `.planning/REQUIREMENTS.md` and `.planning/ROADMAP.md` (planning docs, guidance / traceability)

**Analogs:** `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`

**Requirement surface pattern** (`.planning/REQUIREMENTS.md` lines 26-32):
```markdown
### Commands and Skills

- [ ] **CMD-01**: Claude Code users can use `/opsx-explore`, `/opsx-new`, `/opsx-propose`, `/opsx-continue`, `/opsx-ff`, `/opsx-apply`, `/opsx-verify`, `/opsx-status`, `/opsx-resume`, `/opsx-sync`, `/opsx-archive`, `/opsx-batch-apply`, `/opsx-bulk-archive`, and `/opsx-onboard`.
- [ ] **CMD-02**: Codex users can use the corresponding `$opsx-*` commands as the public primary entrypoints.
- [ ] **CMD-03**: The distributed skill lives at `skills/opsx/` with frontmatter `name: opsx` and reads `.opsx/` and `~/.opsx/` config in the correct precedence order.
- [ ] **CMD-04**: Generated prompts no longer present `/openspec`, `$openspec`, `/prompts:openspec`, or `/opsx:*` as primary workflow entrypoints.
- [ ] **CMD-05**: `opsx-onboard`, `opsx-status`, and `opsx-resume` behave correctly even when no active change exists.
```

**Out-of-scope pattern** (`.planning/REQUIREMENTS.md` lines 87-94):
```markdown
## Out of Scope

| Feature | Reason |
|---------|--------|
| Lite/advanced profiles | User explicitly wants the full command set visible by default. |
| Full autonomous agent engine | Milestone target is lightweight recoverable workflow state, not an auto-runner. |
| Old primary entrypoints in v3.0 | `/openspec`, `$openspec`, `/prompts:openspec`, and `/opsx:*` would preserve the naming confusion this milestone is meant to remove. |
| Hosted service or telemetry | No requirement for remote state, cloud execution, or analytics. |
```

**Roadmap Phase 3 pattern** (`.planning/ROADMAP.md` lines 63-75):
```markdown
### Phase 3: Skill and Command Surface Rewrite

**Goal:** Rewrite all generated commands, prompts, and skill metadata so the user-facing workflow is `/opsx-*`, `$opsx-*`, and `skills/opsx`.

**Requirements:** CMD-01, CMD-02, CMD-03, CMD-04, CMD-05

**Success criteria:**
1. `skills/opsx/SKILL.md` has `name: opsx` and describes `.opsx/changes/*`.
2. Claude command generation produces `/opsx-*` hyphen routes for every supported action.
3. Codex command generation produces `$opsx-*` as public primary routes and stops presenting `/prompts:*` as the main UX.
4. Command prompts read `.opsx/config.yaml`, `.opsx/active.yaml`, and active change `state.yaml` before acting.
5. Status/onboard/resume commands handle an empty project or missing active change gracefully.
```

**Apply:** Update stale NAME-04/Phase 1 allowlist wording only where it conflicts with the Phase 3 hard clean break. Keep Phase 4 state-machine requirements pending; Phase 3 should mention strict prompt preflight/fallback wording but not mark STATE-03/STATE-04 hash or stage enforcement complete.

## Shared Patterns

### Generator-First Source of Truth
**Source:** `lib/workflow.js` lines 9-93, `lib/generator.js` lines 17-34 and 83-111  
**Apply to:** `lib/workflow.js`, `lib/generator.js`, `templates/commands/*`, `commands/**`, tests

Change metadata/helpers/templates first, then refresh checked-in `commands/**`. Generated files are verification artifacts and install payloads, not the primary edit surface.

### Explicit-Only Codex Public Surface
**Source:** `lib/workflow.js` lines 1862-1873, `templates/commands/codex-entry.md.tmpl` lines 8-21, `docs/commands.md` lines 3-8  
**Apply to:** generator, Codex templates, CLI help, postinstall, docs, guides, skill frontmatter, tests

Codex public route list is `$opsx-explore`, `$opsx-new`, `$opsx-propose`, `$opsx-continue`, `$opsx-ff`, `$opsx-apply`, `$opsx-verify`, `$opsx-status`, `$opsx-resume`, `$opsx-sync`, `$opsx-archive`, `$opsx-batch-apply`, `$opsx-bulk-archive`, and `$opsx-onboard`. Do not expose standalone `$opsx`, `$opsx <request>`, or `/prompts:*` as current public UX.

### Strict But Honest Preflight
**Source:** `templates/commands/action.md.tmpl` lines 12-25 and `skills/opsx/SKILL.md` lines 106-115  
**Apply to:** action template, skill execution loop, action playbooks, generated action outputs

Prompt text must require reading `.opsx/config.yaml`, `.opsx/active.yaml`, active change `state.yaml`, `context.md`, and current artifacts when present. Missing files must have explicit fallback wording. Do not implement or claim Phase 4 hash comparison, stage-transition enforcement, allowed/forbidden path enforcement, or durable apply-state mutation.

### Empty-State Guidance Without Mutation
**Source:** `skills/opsx/references/action-playbooks.md` lines 80-87 and `03-CONTEXT.md` D-17 through D-22  
**Apply to:** `status`, `resume`, `onboard` metadata/playbooks/templates/tests

`onboard`, `status`, and `resume` must report missing workspace or missing active change and provide a concrete next action. They must not auto-create `.opsx/active.yaml`, a default active change, or change state from status/resume guidance.

### Public Surface Gate Separate From Migration Internals
**Source:** `scripts/check-phase1-legacy-allowlist.js` lines 8-37 and 102-109; `lib/cli.js` lines 73-96  
**Apply to:** `scripts/test-workflow-runtime.js`, legacy gate script, docs/help/skill assertions

Use positive/negative tests over current public surfaces. Keep `lib/migrate.js`, migration fixtures, and CLI migration diagnostics allowed to reference old paths when those references are actual migration internals.

### Install Mirrors Generated Bundle
**Source:** `lib/install.js` lines 58-65, 111-117, 146-156  
**Apply to:** Codex root entry decision, generated bundle parity tests, installed command asset assertions

Installed platform files should come from `buildPlatformBundle(platform)` with Codex prompt-path normalization only. If the Codex root entry changes, update generator, install, checked-in output, and tests as one contract.

### Bilingual Docs Stay Aligned
**Source:** `README.md` lines 36-48, `README-zh.md` lines 36-48, `skills/opsx/GUIDE-en.md` lines 25-32, `skills/opsx/GUIDE-zh.md` lines 25-32  
**Apply to:** README, README-zh, GUIDE-en, GUIDE-zh, action-playbooks, action-playbooks-zh

Make the same route-model change in English and Chinese surfaces. Keep technical tokens unchanged (`$opsx-*`, `/opsx-*`, `.opsx/config.yaml`, `state.yaml`).

## No Analog Found

None. All Phase 3 file groups map to existing source, template, generated-output, docs, or test analogs.

## Metadata

**Analog search scope:** `lib/`, `templates/`, `commands/`, `skills/opsx/`, `docs/`, `scripts/`, `README*.md`, `AGENTS.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`  
**Files scanned:** 134 by `rg --files`, with core source/templates/docs/tests read with line numbers and representative generated outputs sampled.  
**Pattern extraction date:** 2026-04-27
