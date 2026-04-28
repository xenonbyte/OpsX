# Phase 06: TDD-Light Workflow - Pattern Map

**Mapped:** 2026-04-28
**Files analyzed:** 16 work items (14 direct files, 1 generated command bundle group covering 45 files, 1 optional schema file)
**Analogs found:** 16 / 16

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `lib/config.js` | config utility | transform | `lib/config.js` `normalizeSecurityReviewConfig()` / `normalizeConfig()` | exact |
| `lib/workflow.js` | service/utility | transform, request-response checkpoint result | `lib/workflow.js` `runTaskCheckpoint()` / `runExecutionCheckpoint()` | exact |
| `lib/runtime-guidance.js` | service | request-response, transform | `lib/runtime-guidance.js` `parseTopLevelTaskGroups()` / `buildApplyInstructions()` | exact |
| `lib/change-store.js` | store | file-I/O, state persistence | `lib/change-store.js` `recordTaskGroupExecution()` | exact |
| `lib/change-capsule.js` | renderer utility | transform, file-I/O sidecar rendering | `lib/change-capsule.js` `summarizeLastVerification()` / `renderContextCapsule()` | exact |
| `lib/generator.js` | generator | transform | `lib/generator.js` `buildActionMarkdown()` / `buildPlatformBundle()` | exact |
| `templates/project/config.yaml.tmpl` | config template | static config seed | `templates/project/config.yaml.tmpl` existing `rules` and `securityReview` blocks | exact |
| `skills/opsx/SKILL.md` | skill guidance | request-response workflow instructions | `skills/opsx/SKILL.md` checkpoints, loop, guardrails | exact |
| `skills/opsx/references/artifact-templates.md` | documentation template | static template guidance | existing `tasks.md` section in same file | exact |
| `skills/opsx/references/artifact-templates-zh.md` | documentation template | static template guidance | existing `tasks.md` section in same file | exact |
| `skills/opsx/references/action-playbooks.md` | action playbook | request-response workflow guidance | common setup and `apply` playbook in same file | exact |
| `skills/opsx/references/action-playbooks-zh.md` | action playbook | request-response workflow guidance | common setup and `apply` playbook in same file | exact |
| `commands/{claude,codex,gemini}/**` | generated prompt output | transform/static generated assets | `templates/commands/*.tmpl` + `lib/generator.js` + checked-in command examples | exact |
| `schemas/spec-driven/schema.json` | schema/config | checkpoint catalog, transform | existing `task-checkpoint` and `execution-checkpoint` rows | exact |
| `scripts/test-workflow-runtime.js` | test | batch, file-I/O fixtures, assertions | existing runtime/store/generator parity tests in same file | exact |

## Pattern Assignments

### `lib/config.js` (config utility, transform)

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

**Default config object pattern** (lines 14-20):
```javascript
const DEFAULT_SECURITY_REVIEW_HINT = 'auth, permission, token, session, cookie, upload, payment, admin, pii, secret, tenant, webhook, callback, encryption, signature';
const DEFAULT_SECURITY_REVIEW_CONFIG = {
  mode: 'heuristic',
  required: false,
  allowWaiver: true,
  heuristicHint: DEFAULT_SECURITY_REVIEW_HINT
};
```

**Nested config normalization pattern** (lines 57-69):
```javascript
function normalizeSecurityReviewConfig(config) {
  const normalized = deepMerge(DEFAULT_SECURITY_REVIEW_CONFIG, config && typeof config === 'object' ? config : {});
  if (normalized.mode === 'required') {
    normalized.required = true;
    normalized.mode = 'heuristic';
  }
  if (!['heuristic', 'off'].includes(normalized.mode)) normalized.mode = 'heuristic';
  normalized.required = normalized.required === true;
  normalized.allowWaiver = normalized.allowWaiver !== false;
  if (typeof normalized.heuristicHint !== 'string' || !normalized.heuristicHint.trim()) {
    normalized.heuristicHint = DEFAULT_SECURITY_REVIEW_HINT;
  }
  return normalized;
}
```

**Core config merge pattern** (lines 72-88):
```javascript
function normalizeConfig(config) {
  const normalized = deepMerge({
    version: PACKAGE_VERSION,
    schema: DEFAULT_SCHEMA,
    language: DEFAULT_LANGUAGE,
    context: '',
    rules: {},
    securityReview: DEFAULT_SECURITY_REVIEW_CONFIG
  }, config || {});

  if (!['en', 'zh'].includes(normalized.language)) normalized.language = DEFAULT_LANGUAGE;
  if (!normalized.schema) normalized.schema = DEFAULT_SCHEMA;
  if (!normalized.rules || typeof normalized.rules !== 'object') normalized.rules = {};
  normalized.securityReview = normalizeSecurityReviewConfig(normalized.securityReview);
  if (Object.prototype.hasOwnProperty.call(normalized, 'profile')) delete normalized.profile;
  return normalized;
}
```

**Export pattern** (lines 111-122):
```javascript
module.exports = {
  deepMerge,
  readYamlFile,
  getSharedHome,
  getGlobalConfigPath,
  getLegacySharedHome,
  getLegacyGlobalConfigPath,
  normalizeConfig,
  loadGlobalConfig,
  writeGlobalConfig,
  getRepoSkillDir
};
```

**Planner guidance:** Add `DEFAULT_TDD_CONFIG` beside `DEFAULT_SECURITY_REVIEW_CONFIG`, add a `normalizeTddConfig()` helper beside `normalizeSecurityReviewConfig()`, and call it from `normalizeConfig()` after `normalized.rules` is guaranteed to be an object. Keep invalid `mode` normalization loud in tests but non-throwing in runtime, matching existing config behavior.

---

### `lib/workflow.js` (service/utility, checkpoint transform)

**Analog:** `lib/workflow.js`

**Imports and checkpoint constants pattern** (lines 1-3, 178-181):
```javascript
const { DEFAULT_SCHEMA, PRODUCT_SHORT_NAME, SHARED_HOME_NAME } = require('./constants');
const { loadSchema } = require('./schema');
const { collectSpecSplitEvidence, reviewSpecSplitEvidence } = require('./spec-validator');

const REVIEW_STATES = ['required', 'recommended', 'waived', 'completed'];
const CHECKPOINT_STATES = ['PASS', 'WARN', 'BLOCK'];
const DEFAULT_HEURISTIC_INPUTS = ['request', 'proposal', 'specs', 'design'];
const DEFAULT_CHECKPOINT_IDS = ['spec-split-checkpoint', 'spec-checkpoint', 'task-checkpoint', 'execution-checkpoint'];
```

**Text and checklist parsing pattern** (lines 253-313):
```javascript
function getTextBlock(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join('\n');
  return typeof value === 'string' ? value : '';
}

function hasSection(text, sectionName) {
  return new RegExp(`^##\\s+${sectionName.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`, 'mi').test(getTextBlock(text));
}

function normalizeChecklistItem(item = '') {
  return getTextBlock(item)
    .replace(/^- \[[ xX]\]\s*/g, '')
    .replace(/^\d+(\.\d+)*\s*/g, '')
    .trim();
}

function extractChecklistItems(text) {
  return Array.from(getTextBlock(text).matchAll(/^- \[[ xX]\]\s+.+$/gm))
    .map((match) => match[0].trim());
}
```

**Planning evidence shape pattern** (lines 523-556):
```javascript
return {
  proposal: {
    text: proposalText,
    present: Boolean(proposalText),
    terms: Array.from(toTokenSet(proposalText))
  },
  specs: {
    text: specsText,
    present: Boolean(specsText),
    requirementCount: countMatches(specsText, /^### Requirement:/gm),
    scenarioCount: countMatches(specsText, /^#### Scenario:/gm),
    terms: Array.from(toTokenSet(specsText))
  },
  design: {
    text: designText,
    present: Boolean(designText),
    terms: Array.from(toTokenSet(designText))
  },
  tasks: {
    text: tasksText,
    present: Boolean(tasksText),
    groups: taskGroups,
    checklistItems,
    outOfScopeTaskItems,
    scopeTerms: Array.from(scopeTerms),
    taskCoverage
  },
  rollout,
  commitmentSources: Object.keys(commitmentSources).reduce((output, category) => {
    output[category] = Array.from(commitmentSources[category]);
    return output;
  }, {}),
  legacy: normalizeLegacyPlanningFlags(options.flags || {})
};
```

**Checkpoint finding/status pattern** (lines 702-726):
```javascript
function normalizeFinding(finding = {}) {
  return {
    severity: finding.severity === 'BLOCK' ? 'BLOCK' : 'WARN',
    code: finding.code || 'workflow-check',
    message: finding.message || '',
    patchTargets: normalizePatchTargets(finding.patchTargets || finding.artifacts),
    artifacts: normalizePatchTargets(finding.artifacts || finding.patchTargets)
  };
}

function addFinding(findings = [], finding = {}) {
  if (!finding || !finding.code) return;
  if (!hasFinding(findings, finding.code)) findings.push(finding);
}

function resolveCheckpointStatus(findings = []) {
  const normalized = findings.map(normalizeFinding);
  if (normalized.some((finding) => finding.severity === 'BLOCK')) return 'BLOCK';
  if (normalized.length) return 'WARN';
  return 'PASS';
}
```

**Checkpoint result contract** (lines 900-916):
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

**Numbered task-group parser pattern** (lines 919-930):
```javascript
function extractTopLevelTaskGroups(tasksText) {
  const text = getTextBlock(tasksText);
  const matches = Array.from(text.matchAll(/^##\s+(\d+\.\s+.+)$/gm));
  return matches.map((match, index) => {
    const start = match.index;
    const end = index + 1 < matches.length ? matches[index + 1].index : text.length;
    const body = text.slice(start, end).trim();
    return {
      heading: match[1].trim(),
      text: body,
      items: Array.from(body.matchAll(/^- \[[ xX]\]\s+.+$/gm)).map((item) => item[0])
```

**Task checkpoint pattern** (lines 1166-1240):
```javascript
function runTaskCheckpoint(options = {}) {
  const schema = resolveSchema(options);
  const findings = [];
  const review = options.review || resolveSecurityReviewState(options);
  const evidence = resolvePlanningEvidence(options);
  const tasksText = evidence.tasks ? evidence.tasks.text : '';
  const groups = evidence.tasks && Array.isArray(evidence.tasks.groups) ? evidence.tasks.groups : [];
  const checklistItems = evidence.tasks && Array.isArray(evidence.tasks.checklistItems) ? evidence.tasks.checklistItems : [];

  if (!evidence.tasks || !evidence.tasks.present) {
    findings.push({ severity: 'BLOCK', code: 'tasks-missing', message: 'Tasks content is required before apply.', patchTargets: ['tasks'] });
  }
  if (evidence.tasks && evidence.tasks.present && groups.length === 0) {
    findings.push({ severity: 'BLOCK', code: 'task-groups-missing', message: 'Tasks must be organized into top-level task groups.', patchTargets: ['tasks'] });
  }
  if (tasksText && !hasAnyKeyword(tasksText, ['test', 'verify'])) {
    findings.push({ severity: 'WARN', code: 'test-coverage-missing', message: 'Tasks should include testing or verification coverage.', patchTargets: ['tasks'] });
  }
  appendRolloutFindings(findings, evidence, { includeTasks: true });
  appendTaskCoverageFindings(findings, evidence);

  return buildCheckpointResult(schema, 'task-checkpoint', findings, { phase: 'planning' });
}
```

**Execution evidence normalization pattern** (lines 631-696):
```javascript
function normalizeExecutionEvidence(options = {}) {
  const group = options.group || {};
  const explicit = options.executionEvidence && typeof options.executionEvidence === 'object' ? options.executionEvidence : {};
  const legacy = normalizeLegacyExecutionFlags(options.flags || {});
  const groupTitle = explicit.groupId || explicit.groupTitle || group.id || group.title || '';
  const groupText = getTextBlock(explicit.groupText || group.text);
  const completedItems = Array.isArray(explicit.completedItems) && explicit.completedItems.length
    ? explicit.completedItems.map((item) => getTextBlock(item).trim()).filter(Boolean)
    : extractCompletedChecklistItems(groupText).map((item) => normalizeChecklistItem(item));
  const changedFiles = normalizeChangedFiles(explicit.changedFiles || group.changedFiles || options.changedFiles);
  const implementationSummary = getTextBlock(explicit.implementationSummary || options.implementationSummary || group.summary);
  const verificationSummary = getTextBlock(explicit.verificationSummary || explicit.verification || options.verification || group.verification);

  return {
    group: {
      id: groupTitle,
      text: groupText,
      completed: explicit.completed === true || group.completed === true,
      completedItems,
      scopeTerms: Array.from(scopeTerms)
    },
    verification: {
      requiresTesting,
      present: verificationPresent,
      summary: verificationSummary
    },
    legacy
  };
}
```

**Execution checkpoint pattern** (lines 1243-1348):
```javascript
function runExecutionCheckpoint(options = {}) {
  const schema = resolveSchema(options);
  const review = options.review || resolveSecurityReviewState(options);
  const findings = [];
  const evidence = normalizeExecutionEvidence(options);
  const planningEvidence = resolvePlanningEvidence(options);

  if (!groupId) {
    findings.push({ severity: 'BLOCK', code: 'task-group-missing', message: 'Execution checkpoint requires a top-level task-group title.', patchTargets: ['tasks'] });
  }
  if (evidence.group.completed !== true) {
    findings.push({ severity: 'BLOCK', code: 'task-group-incomplete', message: 'Execution checkpoint can run only after a top-level task group is completed.', patchTargets: ['tasks'] });
  }
  if (
    evidence.legacy.qualityGap === true
    || (
      evidence.verification.requiresTesting
      && evidence.behavior.changed
      && evidence.behavior.docsOnly !== true
      && evidence.verification.present !== true
    )
  ) {
    addFinding(findings, {
      severity: 'WARN',
      code: 'quality-gap',
      message: 'Task-group output should include testing or verification work before moving on.',
      patchTargets: ['tasks']
    });
  }

  return buildCheckpointResult(schema, 'execution-checkpoint', findings, { phase: 'execution' });
}
```

**Export pattern** (lines 2066-2087):
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
  runSpecSplitCheckpoint,
  runSpecCheckpoint,
  runTaskCheckpoint,
  runExecutionCheckpoint,
  validatePhaseOneWorkflowContract,
  validateCheckpointContracts
};
```

**Planner guidance:** Keep TDD-light logic inside existing task/execution checkpoint ids. Add helpers near existing parsing/normalization helpers: `extractTestPlan()`, `classifyTaskGroupTdd()`, and TDD finding appenders. Let explicit markers/exemption text win before heuristics. Strict mode should add `BLOCK` findings only for missing RED or VERIFY on required classes; light mode should add the same finding codes as `WARN`; off mode should skip TDD findings.

---

### `lib/runtime-guidance.js` (service, request-response)

**Analog:** `lib/runtime-guidance.js`

**Imports pattern** (lines 1-10):
```javascript
const fs = require('fs');
const path = require('path');
const { REPO_ROOT, DEFAULT_SCHEMA } = require('./constants');
const { loadSchema, getSchemaPath } = require('./schema');
const { readYamlFile, loadGlobalConfig, normalizeConfig, deepMerge } = require('./config');
const { listFiles, readText } = require('./fs-utils');
const { runTaskCheckpoint, resolveSecurityReviewState } = require('./workflow');
const { loadChangeState } = require('./change-store');
const { resolveContinueAction } = require('./change-state');
const { hashTrackedArtifacts, detectArtifactHashDrift } = require('./change-artifacts');
```

**Source normalization and task group parsing pattern** (lines 521-581):
```javascript
function normalizeSourceBlock(value) {
  if (Array.isArray(value)) {
    return value
      .filter((entry) => entry !== undefined && entry !== null)
      .map((entry) => String(entry))
      .join('\n');
  }
  if (value === undefined || value === null) return '';
  return String(value);
}

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
    return {
      title: match[1].trim(),
      text: block,
      items: checklist,
      completed: checklist.length > 0 && checklist.every((item) => item.done),
      pendingItems: checklist.filter((item) => !item.done).map((item) => item.text),
      completedItems: checklist.filter((item) => item.done).map((item) => item.text)
    };
  });
}
```

**Apply guidance checkpoint integration pattern** (lines 950-1037):
```javascript
function buildApplyInstructions(options = {}) {
  const kernel = buildRuntimeKernel(options);
  const tasksState = kernel.artifactStates.tasks;
  const tasksText = normalizeSourceBlock(kernel.sources ? kernel.sources.tasks : '');
  const groups = parseTopLevelTaskGroups(tasksText);
  const pendingGroups = groups
    .filter((group) => group.completed !== true)
    .map((group) => ({
      title: group.title,
      pendingItems: group.pendingItems.slice(),
      completedItems: group.completedItems.slice()
    }));

  const checkpoint = runTaskCheckpoint({
    schemaName: kernel.schema,
    artifacts: kernel.graph.artifacts.reduce((output, artifact) => {
      output[artifact.id] = kernel.artifactStates[artifact.id].done === true;
      return output;
    }, {}),
    sources,
    config: kernel.config,
    change: kernel.changeConfig
  });

  const prerequisites = [];
  if (checkpoint.status === 'BLOCK') {
    checkpoint.findings.forEach((finding) => prerequisites.push(finding.message));
  }

  const payload = {
    change: kernel.change,
    schema: kernel.schema,
    ready: prerequisites.length === 0,
    prerequisites,
    checkpoint: {
      status: checkpoint.status,
      findings: checkpoint.findings.map((finding) => ({
        severity: finding.severity,
        code: finding.code,
        patchTargets: finding.patchTargets
      }))
    },
    remainingTaskGroups: remainingGroups,
    nextTaskGroup: remainingGroups.length ? remainingGroups[0].title : null
  };
```

**Text output pattern** (lines 1039-1070):
```javascript
if (options.format === 'text') {
  const lines = [
    '# Apply instructions',
    `- change: ${payload.change}`,
    `- ready: ${payload.ready ? 'yes' : 'no'}`,
    `- taskCheckpoint: ${payload.checkpoint.status}`,
    `- nextTaskGroup: ${payload.nextTaskGroup || '(none)'}`,
    '',
    '## Remaining task groups'
  ];
  if (!remainingGroups.length) {
    lines.push('- none');
  } else {
    remainingGroups.forEach((group) => {
      lines.push(`- ${group.title}`);
      group.pendingItems.forEach((item) => lines.push(`  - [ ] ${item}`));
    });
  }
  if (prerequisites.length) {
    lines.push('', '## Prerequisites', ...prerequisites.map((item) => `- ${item}`));
  }
  return lines.join('\n');
}
```

**Export pattern** (lines 1075-1094):
```javascript
module.exports = {
  RuntimeGuidanceError,
  ensureSafeChangeName,
  ensureSafeCapability,
  resolveRuntimeConfig,
  ensureSchema,
  validateSchemaGraph,
  detectArtifactCompletion,
  deriveArtifactStates,
  loadArtifactTemplateIndex,
  loadArtifactTemplate,
  buildRuntimeKernel,
  buildStatus,
  buildStatusText,
  buildResumeInstructions,
  buildContinueInstructions,
  buildArtifactInstructions,
  buildApplyInstructions,
  parseTopLevelTaskGroups
};
```

**Planner guidance:** Keep `## Test Plan` separate from numbered apply groups. If `workflow.js` exports shared TDD parsing/classification helpers, import them here instead of duplicating a second TDD parser. Surface TDD mode, required/exempt classification, and TDD blockers in `payload.checkpoint.findings` and text prerequisites; do not make light-mode `WARN` set `ready: false`.

---

### `lib/change-store.js` (store, file-I/O)

**Analog:** `lib/change-store.js`

**Imports and sidecar ownership pattern** (lines 1-6):
```javascript
const fs = require('fs');
const path = require('path');
const YAML = require('yaml');
const { ensureDir, writeTextAtomic } = require('./fs-utils');
const { hashTrackedArtifacts } = require('./change-artifacts');
const { renderContextCapsule, appendDriftLedger } = require('./change-capsule');
```

**Accepted checkpoint status pattern** (lines 168-175):
```javascript
function isAcceptedCheckpointResult(normalizedResult) {
  if (!normalizedResult || typeof normalizedResult !== 'object') return false;
  if (normalizedResult.accepted === true) return true;
  const status = toNonEmptyString(normalizedResult.status).toUpperCase();
  if (!status) return false;
  if (['BLOCK', 'FAIL', 'FAILED', 'ERROR', 'REJECTED'].includes(status)) return false;
  return ['PASS', 'WARN', 'OK', 'DONE', 'ACCEPTED'].includes(status);
}
```

**State skeleton and normalization pattern** (lines 238-260, 279-302):
```javascript
return {
  version: 1,
  change: normalizedName,
  stage: DEFAULT_STAGE,
  nextAction: DEFAULT_NEXT_ACTION,
  artifacts: Object.assign({}, DEFAULT_ARTIFACTS),
  hashes: Object.assign({}, DEFAULT_HASHES),
  checkpoints: createDefaultCheckpoints(),
  active: {
    taskGroup: null,
    nextTaskGroup: null
  },
  verificationLog: [],
  blockers: [],
  warnings: [],
  allowedPaths: [],
  forbiddenPaths: [],
  updatedAt: new Date().toISOString()
};

return {
  version: Number.isFinite(version) && version > 0 ? version : base.version,
  change: toNonEmptyString(input.change) || base.change,
  stage: normalizeLifecycleStage(input.stage),
  nextAction: toNonEmptyString(input.nextAction) || DEFAULT_NEXT_ACTION,
  verificationLog: normalizeAnyArray(input.verificationLog),
  blockers: normalizeStringArray(input.blockers),
  warnings: normalizeStringArray(input.warnings),
  allowedPaths: normalizeStringArray(input.allowedPaths),
  forbiddenPaths: normalizeStringArray(input.forbiddenPaths),
  updatedAt: toNonEmptyString(input.updatedAt) || now
};
```

**Execution persistence pattern** (lines 458-557):
```javascript
function recordTaskGroupExecution(changeDir, payload = {}) {
  const resolvedChangeDir = path.resolve(changeDir);
  const timestamp = resolveTimestamp(payload.at);
  const state = loadChangeState(resolvedChangeDir);
  const completedTaskGroup = normalizeTaskGroupTitle(payload.taskGroup)
    || normalizeTaskGroupTitle(state.active && state.active.taskGroup)
    || 'Unknown task group';
  const nextTaskGroup = Object.prototype.hasOwnProperty.call(payload, 'nextTaskGroup')
    ? normalizeTaskGroupTitle(payload.nextTaskGroup)
    : normalizeTaskGroupTitle(state.active && state.active.nextTaskGroup);
  const changedFiles = normalizeChangedFiles(payload.changedFiles);
  const checkpointStatus = (toNonEmptyString(payload.checkpointStatus) || 'PENDING').toUpperCase();
  const acceptedCheckpoint = isAcceptedCheckpointResult({ status: checkpointStatus });
  const verificationEntry = {
    at: timestamp,
    taskGroup: completedTaskGroup,
    verificationCommand: toNonEmptyString(payload.verificationCommand) || 'UNCONFIRMED',
    verificationResult: toNonEmptyString(payload.verificationResult) || 'UNCONFIRMED',
    changedFiles,
    checkpointStatus
  };

  const persistedState = writeChangeState(resolvedChangeDir, Object.assign({}, checkpointed, {
    active: acceptedCheckpoint
      ? Object.assign({}, checkpointed.active, {
        taskGroup: nextTaskGroup,
        nextTaskGroup: nextTaskGroup
      })
      : checkpointed.active,
    verificationLog: [...normalizeAnyArray(checkpointed.verificationLog), verificationEntry],
    hashes: acceptedCheckpoint ? normalizeHashMap(refreshedHashes) : checkpointed.hashes,
    warnings: nextWarnings,
    blockers: acceptedCheckpoint
      ? checkpointed.blockers
      : Array.from(new Set([
        ...normalizeStringArray(checkpointed.blockers),
        `Execution checkpoint blocked for ${completedTaskGroup}`
      ]))
  }));

  const contextText = renderContextCapsule(persistedState, {
    hashStatus: hashDriftWarnings.length ? 'drift warning' : 'up-to-date',
    hashDriftWarnings
  });
  writeTextAtomic(contextPath, contextText);
  return loadChangeState(resolvedChangeDir);
}
```

**Planner guidance:** Extend `verificationEntry` additively, e.g. `tddSteps`, `diffSummary`, and `driftSummary`; do not introduce `tdd-log.md`. Preserve `WARN` as accepted so `rules.tdd.mode: light` records proof and advances the active group. Normalize new array/object fields the same way `verificationLog`, `changedFiles`, and warnings are normalized.

---

### `lib/change-capsule.js` (renderer utility, transform)

**Analog:** `lib/change-capsule.js`

**State normalization pattern** (lines 29-52):
```javascript
function normalizeState(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    return {
      stage: 'INIT',
      nextAction: 'status',
      active: {},
      warnings: [],
      blockers: [],
      verificationLog: [],
      hashes: {}
    };
  }
  const active = state.active && typeof state.active === 'object' && !Array.isArray(state.active)
    ? state.active
    : {};
  return {
    stage: typeof state.stage === 'string' && state.stage.trim() ? state.stage.trim() : 'INIT',
    nextAction: typeof state.nextAction === 'string' && state.nextAction.trim() ? state.nextAction.trim() : 'status',
    active,
    warnings: toStringArray(state.warnings),
    blockers: toStringArray(state.blockers),
    verificationLog: Array.isArray(state.verificationLog) ? state.verificationLog : [],
    hashes: state.hashes && typeof state.hashes === 'object' && !Array.isArray(state.hashes) ? state.hashes : {}
  };
}
```

**Last verification rendering pattern** (lines 63-96):
```javascript
function summarizeLastVerification(entry) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    return ['- None recorded'];
  }

  const at = typeof entry.at === 'string' && entry.at.trim() ? entry.at.trim() : 'unknown';
  const taskGroup = typeof entry.taskGroup === 'string' && entry.taskGroup.trim()
    ? entry.taskGroup.trim()
    : 'unknown';
  const verificationCommand = typeof entry.verificationCommand === 'string' && entry.verificationCommand.trim()
    ? entry.verificationCommand.trim()
    : 'unknown';
  const verificationResult = typeof entry.verificationResult === 'string' && entry.verificationResult.trim()
    ? entry.verificationResult.trim()
    : 'unknown';

  const lines = [
    `- At: ${at}`,
    `- Task Group: ${taskGroup}`,
    `- Verification: ${verificationCommand}`,
    `- Result: ${verificationResult}`,
    `- Checkpoint: ${checkpointStatus}`
  ];
  if (changedFiles.length) {
    lines.push(`- Changed Files: ${changedFiles.join(', ')}`);
  }
  return lines;
}
```

**Capsule section pattern** (lines 98-147):
```javascript
function renderContextCapsule(state, options = {}) {
  const normalized = normalizeState(state);
  const verificationLog = normalized.verificationLog;
  const lastVerification = verificationLog.length ? verificationLog[verificationLog.length - 1] : null;
  const hashWarnings = toStringArray(options.hashDriftWarnings || []);
  const hashStatus = String(options.hashStatus || '').trim() || (hashWarnings.length ? 'drift warning' : 'up-to-date');

  const lines = [
    '# Context Capsule',
    '',
    '## Stage',
    `- Stage: ${normalized.stage}`,
    `- Next Action: ${normalized.nextAction}`,
    '',
    '## Active Task Group',
    `- Current: ${activeTaskGroup || 'None'}`,
    `- Next: ${nextTaskGroup || 'None'}`,
    '',
    '## Warnings'
  ];
  renderList(lines, dedupWarnings);

  lines.push('', '## Last Verification');
  summarizeLastVerification(lastVerification).forEach((line) => lines.push(line));

  lines.push('', '## Hash Status', `- Status: ${hashStatus}`);
  return `${lines.join('\n')}\n`;
}
```

**Planner guidance:** Extend only `summarizeLastVerification()` for new execution-proof fields. Keep section headings stable (`## Last Verification`, `## Hash Status`) so existing tests and human readers keep working.

---

### `templates/project/config.yaml.tmpl` (config template, static config seed)

**Analog:** `templates/project/config.yaml.tmpl`

**Template config pattern** (lines 1-15):
```yaml
# Save as .opsx/config.yaml
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
  heuristicHint: "auth, permission, token, session, cookie, upload, payment, admin, pii, secret, tenant, webhook, callback, encryption, signature"
```

**Planner guidance:** Add `rules.tdd` under `rules`, not as a top-level key. Match runtime defaults exactly: `mode: "strict"`, `requireFor: ["behavior-change", "bugfix"]`, `exempt: ["docs-only", "copy-only", "config-only"]`.

---

### `skills/opsx/SKILL.md` (skill guidance, request-response)

**Analog:** `skills/opsx/SKILL.md`

**Config resolution pattern** (lines 10-24):
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

If `language: zh`, respond in Chinese (简体中文). Otherwise respond in English.
```

**Checkpoint guidance pattern** (lines 94-106):
```markdown
## Checkpoints

- `spec-split-checkpoint`: after `specs`, before `design`
- `spec checkpoint`: after `design`, before `tasks`
- `task checkpoint`: after `tasks`, before `apply`
- `execution checkpoint`: after each top-level task group during `apply`
- Canonical checkpoint states are `PASS`, `WARN`, and `BLOCK`.
- Checkpoints do not create `spec-review.md`, `task-review.md`, or `execution-review.md`.
- When a checkpoint finds issues, update existing artifacts such as `proposal.md`, `specs/*.md`, `design.md`, `security-review.md`, or `tasks.md`.
```

**Execution loop pattern** (lines 117-128):
```markdown
## Default Execution Loop

1. Identify the workflow action and target change.
2. Resolve config from change metadata, project config, then global config.
3. Run the strict preflight reads (`.opsx/config.yaml`, `.opsx/active.yaml`, active `state.yaml`, active `context.md`, and current artifacts when present).
8. Run `spec-split-checkpoint` after `specs` and before `design`; run `spec checkpoint` before entering `tasks`, and `task checkpoint` before entering `apply`.
9. During `apply`, execute one top-level task group, run `execution checkpoint`, persist verification command/result plus changed files, refresh `context.md` / `drift.md`, then stop.
10. Report changed files, current state, next step, and blockers.
```

**Guardrail update target** (lines 130-137):
```markdown
## Guardrails

- Ask concise clarification questions when missing scope can materially change behavior.
- Keep `status` and `resume` strictly read-only; do not mutate `.opsx/active.yaml`, `state.yaml`, `context.md`, or `drift.md` from those routes.
- When artifact hash drift is detected, warn and reload from disk first; refresh stored hashes only after accepted checkpoint/state writes.
- Treat `allowedPaths` / `forbiddenPaths` as warnings during Phase 4. Do not hard-block `verify` or `archive` yet.
- TDD-light RED/GREEN/REFACTOR/VERIFY workflow rules are deferred to Phase 6.
- Hard enforcement for `verify` / `archive` path and drift gates is deferred to Phase 7.
```

**Planner guidance:** Replace the deferral line with shipped TDD-light semantics. Keep route naming and checkpoint ids unchanged. Add a short note that `rules.tdd.mode` controls whether missing RED/VERIFY is off, WARN, or BLOCK.

---

### `skills/opsx/references/artifact-templates.md` and `artifact-templates-zh.md` (documentation template, static)

**Analog:** same files' existing `tasks.md` sections.

**English tasks template pattern** (lines 64-76):
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
- If a checkpoint finds drift or missing coverage, patch `tasks.md` instead of creating a separate review artifact.
````

**Chinese tasks template pattern** (lines 64-76):
````markdown
## tasks.md

```markdown
## 1. Setup
- [ ] 1.1 Example task
```

规则：
- 必须使用 `- [ ] X.Y Description`。
- 已完成任务改成 `- [x]`。
- 按依赖顺序编排任务。
- 使用 `## 1. Setup` 这类一级任务组；`execution checkpoint` 会在每个一级任务组后运行。
- 如果 checkpoint 发现问题，回写 `tasks.md`，不要新增独立 review 工件。
````

**Planner guidance:** Insert `## Test Plan` above numbered groups. For behavior-change and bugfix examples, use child tasks with `RED`, `GREEN`, optional `REFACTOR`, and `VERIFY`. For exempt examples, include visible exemption reason plus verification action. Keep numbered `## 1. ...` groups intact so parsers continue to identify apply groups.

---

### `skills/opsx/references/action-playbooks.md` and `action-playbooks-zh.md` (action playbook, request-response)

**Analog:** same files' common setup and `apply` sections.

**English common setup pattern** (lines 7-21):
```markdown
1. Resolve config from change metadata, project config, then global config.
2. Apply `context` and per-artifact `rules` before writing.
3. Read `.opsx/config.yaml` and `.opsx/active.yaml` when those files exist.
4. When an active change exists, read active `state.yaml`, `context.md`, and current artifacts (`proposal.md`, `specs/`, `design.md`, optional `security-review.md`, and `tasks.md`) before mutating files.
11. Run `spec checkpoint` after `design` and before `tasks`.
12. Run `task checkpoint` after `tasks` and before `apply`.
14. TDD-light RED/GREEN/REFACTOR/VERIFY rules are deferred to Phase 6.
15. Hard verify/archive enforcement remains deferred to Phase 7.
```

**English apply pattern** (lines 79-88):
```markdown
## apply

- Read proposal, specs, design if present, and tasks.
- Execute exactly one top-level task group by default.
- Run `execution checkpoint` after that one top-level task group.
- Record verification command/result plus changed files, refresh `context.md` / `drift.md`, and stop for the next run.
- If `execution checkpoint` returns `WARN` or `BLOCK`, patch existing artifacts before continuing.
- Mark completed tasks with `- [x]` for the executed group only.
- Surface `allowedPaths` / `forbiddenPaths` as warnings only in Phase 4; hard-block verify/archive enforcement is deferred to Phase 7.
```

**Planner guidance:** Update English and Chinese playbooks in the same plan. Replace Phase 6 deferral with `rules.tdd.mode` behavior. Update `apply` to require execution checkpoint proof of completed TDD steps, verification command/result, diff summary, and drift status after one group.

---

### `lib/generator.js` and `commands/{claude,codex,gemini}/**` (generator + generated prompt outputs, transform)

**Analog:** `lib/generator.js`, `templates/commands/*.tmpl`, checked-in commands.

**Generator imports pattern** (lines 1-13):
```javascript
const path = require('path');
const { REPO_ROOT } = require('./constants');
const { readText } = require('./fs-utils');
const { renderTemplate } = require('./template');
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

**Checkpoint note source pattern** (lines 29-34):
```javascript
function getPlanningCheckpointNote(actionId) {
  if (['propose', 'continue', 'ff'].includes(actionId)) {
    return '`spec-split-checkpoint` runs after `specs` and before `design`; `spec checkpoint` runs after `design` and before `tasks`; `task checkpoint` runs after `tasks` and before `apply`.';
  }
  return '`spec checkpoint` runs after `design` and before `tasks`; `task checkpoint` runs after `tasks` and before `apply`.';
}
```

**Action prompt rendering pattern** (lines 36-57):
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
    review_state_note: REVIEW_STATES.map((state) => `\`${state}\``).join(', '),
    planning_checkpoint_note: getPlanningCheckpointNote(action.id),
    execution_checkpoint_note: '`execution checkpoint` runs after each top-level task group during `apply`.',
    checkpoint_state_note: CHECKPOINT_STATES.map((state) => `\`${state}\``).join(', '),
    preflight_note: preflightLines,
    fallback_note: fallbackLines
  });
}
```

**Bundle output pattern** (lines 108-136):
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
}
```

**Command template pattern** (`templates/commands/action.md.tmpl` lines 12-29):
```markdown
Execution rules:
- Follow the `{{action}}` playbook from the `opsx` skill and its referenced files.
- CLI quick checks: `opsx check`, `opsx doc`, and `opsx language <en|zh>`.
- Preflight before acting:
{{preflight_note}}
- If required artifacts are missing, report that honestly and apply route-specific fallback guidance.
- {{planning_checkpoint_note}}
- {{execution_checkpoint_note}}
- Checkpoint outcomes use {{checkpoint_state_note}} and update existing artifacts instead of creating new review files.
- When files are mutated, report changed files, current state, next step, and blockers.
```

**Checked-in Codex output pattern** (`commands/codex/prompts/opsx-apply.md` lines 12-37):
```markdown
Execution rules:
- Follow the `apply` playbook from the `opsx` skill and its referenced files.
- CLI quick checks: `opsx check`, `opsx doc`, and `opsx language <en|zh>`.
- Preflight before acting:
- Read `.opsx/config.yaml` if present to confirm schema, language, and workspace rules.
- Execute exactly one top-level task group by default.
- After that group, record one execution checkpoint, refresh `context.md` / `drift.md`, and stop for the next run.
- `spec checkpoint` runs after `design` and before `tasks`; `task checkpoint` runs after `tasks` and before `apply`.
- `execution checkpoint` runs after each top-level task group during `apply`.
- Checkpoint outcomes use `PASS`, `WARN`, `BLOCK` and update existing artifacts instead of creating new review files.
```

**Planner guidance:** If wording changes, edit the source (`lib/generator.js` and/or `templates/commands/*.tmpl`) and refresh generated command files, then keep parity exact. Do not hand-edit only `commands/**`.

---

### `schemas/spec-driven/schema.json` (schema/config, checkpoint catalog)

**Analog:** same file.

**Checkpoint catalog pattern** (lines 25-44):
```json
{
  "id": "task-checkpoint",
  "phase": "planning",
  "trigger": "after-tasks-before-apply",
  "insertion": {
    "after": ["tasks"],
    "before": ["apply"]
  },
  "states": ["PASS", "WARN", "BLOCK"]
},
{
  "id": "execution-checkpoint",
  "phase": "execution",
  "trigger": "after-each-top-level-task-group",
  "insertion": {
    "within": ["apply"],
    "frequency": "per-top-level-task-group"
  },
  "states": ["PASS", "WARN", "BLOCK"]
}
```

**Task artifact pattern** (lines 100-104):
```json
{
  "id": "tasks",
  "path": "tasks.md",
  "requires": ["specs", "design"]
}
```

**Planner guidance:** Do not add a new `tdd-checkpoint` id. Touch this file only for wording/schema guidance that preserves existing `task-checkpoint` and `execution-checkpoint` ids.

---

### `scripts/test-workflow-runtime.js` (test, batch/file-I/O)

**Analog:** `scripts/test-workflow-runtime.js`

**Imports pattern** (lines 1-39):
```javascript
#!/usr/bin/env node

const assert = require('assert');
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createHash } = require('node:crypto');
const YAML = require('yaml');
const { copyDir, ensureDir, removePath, writeText } = require('../lib/fs-utils');
const { REPO_ROOT, PACKAGE_VERSION } = require('../lib/constants');
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
const {
  runSpecSplitCheckpoint,
  runExecutionCheckpoint,
  summarizeWorkflowState,
  validatePhaseOneWorkflowContract,
  validateCheckpointContracts,
  getAllActions,
  getActionSyntax
} = require('../lib/workflow');
const { buildPlatformBundle } = require('../lib/generator');
```

**Fixture pattern** (lines 245-280):
```javascript
function createFixtureRepo() {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-runtime-'));
  copyDir(path.join(REPO_ROOT, 'schemas'), path.join(fixtureRoot, 'schemas'));
  copyDir(path.join(REPO_ROOT, 'skills'), path.join(fixtureRoot, 'skills'));
  ensureDir(path.join(fixtureRoot, '.opsx', 'changes'));
  writeText(path.join(fixtureRoot, '.opsx', 'config.yaml'), [
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
  const changeDir = path.join(fixtureRoot, '.opsx', 'changes', changeName);
  ensureDir(changeDir);
  if (!files['change.yaml'] && !files['.openspec.yaml']) {
    writeText(path.join(changeDir, 'change.yaml'), [
      `name: ${changeName}`,
      'schema: spec-driven',
      `createdAt: ${new Date('2026-01-01T00:00:00.000Z').toISOString()}`
    ].join('\n'));
  }
  Object.keys(files).forEach((relativePath) => {
    const normalizedPath = relativePath === '.openspec.yaml' ? 'change.yaml' : relativePath;
    writeText(path.join(changeDir, normalizedPath), files[relativePath]);
  });
  return changeDir;
}
```

**Test registration and cleanup pattern** (lines 411-418, 2935-2953):
```javascript
function runTests() {
  const tests = [];
  const fixtureRoot = createFixtureRepo();
  const cleanupTargets = [fixtureRoot];

  function test(name, fn) {
    tests.push({ name, fn });
  }

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
```

**State/capsule assertion pattern** (lines 1329-1384):
```javascript
test('context capsule mirrors normalized state and last verification', () => {
  const { recordTaskGroupExecution, writeChangeState } = require('../lib/change-store');
  const changeName = 'context-capsule-mirror';
  const changeDir = createChange(fixtureRoot, changeName, {
    'proposal.md': '# Proposal\n',
    'design.md': '# Design\n',
    'tasks.md': [
      '## 1. Runtime setup',
      '- [x] 1.1 Setup workspace',
      '',
      '## 2. Runtime integration',
      '- [ ] 2.1 Build integration'
    ].join('\n'),
    'specs/runtime/spec.md': '## ADDED Requirements\n### Requirement: Runtime\n'
  });

  const persisted = recordTaskGroupExecution(changeDir, {
    taskGroup: '1. Runtime setup',
    nextTaskGroup: '2. Runtime integration',
    verificationCommand: 'npm run test:workflow-runtime',
    verificationResult: 'PASS',
    changedFiles: ['lib/change-store.js', 'lib/runtime-guidance.js'],
    checkpointStatus: 'PASS'
  });

  assert(Array.isArray(persisted.verificationLog));
  assert.strictEqual(persisted.verificationLog.length, 1);
  assert.deepStrictEqual(Object.keys(persisted.verificationLog[0]), [
    'at',
    'taskGroup',
    'verificationCommand',
    'verificationResult',
    'changedFiles',
    'checkpointStatus'
  ]);

  const contextText = fs.readFileSync(path.join(changeDir, 'context.md'), 'utf8');
  assert(contextText.includes('## Last Verification'));
  assert(contextText.includes('npm run test:workflow-runtime'));
});
```

**Apply/checkpoint test pattern** (lines 1768-1820):
```javascript
test('status and apply instructions preserve caller-provided request text for review heuristics', () => {
  const changeName = 'request-source-review';
  createChange(fixtureRoot, changeName, {
    'proposal.md': [
      '## Why',
      'Need runtime status output with rollout migration, rollback, and compatibility guidance.'
    ].join('\n'),
    'tasks.md': [
      '## 1. Runtime status guidance',
      '- [x] 1.1 Add runtime status output implementation',
      '- [x] 1.2 Add verification, security, and compatibility checks',
      '- [x] 1.3 Document rollout migration and rollback guidance'
    ].join('\n')
  });

  const apply = buildApplyInstructions({
    repoRoot: fixtureRoot,
    changeName,
    sources: {
      request: 'add admin auth token workflow'
    }
  });
  assert.strictEqual(apply.checkpoint.status, 'WARN');
  assert(apply.checkpoint.findings.some((finding) => finding.code === 'security-review-recommended-task-checkpoint'));
});
```

**Generator parity test pattern** (lines 2589-2599, 2701-2719):
```javascript
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

const bundleParity = Object.fromEntries(
  Object.entries(generatedBundles).map(([platform, bundle]) => [
    platform,
    collectBundleParity(platform, bundle)
  ])
);
Object.entries(bundleParity).forEach(([platform, parity]) => {
  assert.deepStrictEqual(parity.missing, [], `${platform} checked-in bundle is missing generated files`);
  assert.deepStrictEqual(parity.mismatched, [], `${platform} checked-in bundle content must exactly match generated output`);
  assert.deepStrictEqual(parity.extra, [], `${platform} checked-in bundle has extra tracked files outside generated output`);
  assert.strictEqual(parity.totalGenerated, parity.totalCheckedIn, `${platform} tracked checked-in count must match generated count`);
});
```

**Validation command source** (`package.json` lines 8-11):
```json
"scripts": {
  "postinstall": "node scripts/postinstall.js",
  "test:workflow-runtime": "node scripts/test-workflow-runtime.js"
}
```

**Planner guidance:** Add Wave 0 tests in this existing file. Import `normalizeConfig` if needed. Use fixture helpers for `.opsx` project/change state. Add matrix tests for `rules.tdd.mode` (`off`, `light`, `strict`), required versus exempt classes, visible exemptions, manual verification rationale, richer `verificationLog` fields, capsule rendering, and generated bundle parity.

## Shared Patterns

### CommonJS Module Style
**Source:** `lib/config.js` lines 1-12 and `module.exports` lines 111-122; `lib/workflow.js` lines 2066-2087.
**Apply to:** All runtime JS changes.
```javascript
const { parseYaml, stringifyYaml } = require('./yaml');

module.exports = {
  normalizeConfig,
  loadGlobalConfig
};
```

### Checkpoint Result Contract
**Source:** `lib/workflow.js` lines 900-916.
**Apply to:** `runTaskCheckpoint()`, `runExecutionCheckpoint()`, runtime guidance, tests.
```javascript
return {
  checkpoint: checkpoint.id,
  phase: checkpoint.phase || extra.phase || 'planning',
  status,
  findings: normalizedFindings,
  nextStep: extra.nextStep || buildCheckpointNextStep(checkpoint.id, status, patchTargets),
  patchTargets,
  updatesExistingArtifactsOnly: true,
  createsArtifacts: []
};
```

### Finding Severity Semantics
**Source:** `lib/workflow.js` lines 702-726; `lib/change-store.js` lines 168-175.
**Apply to:** TDD `off` / `light` / `strict` enforcement.
```javascript
if (normalized.some((finding) => finding.severity === 'BLOCK')) return 'BLOCK';
if (normalized.length) return 'WARN';
return 'PASS';

if (['BLOCK', 'FAIL', 'FAILED', 'ERROR', 'REJECTED'].includes(status)) return false;
return ['PASS', 'WARN', 'OK', 'DONE', 'ACCEPTED'].includes(status);
```

### Numbered Task Groups
**Source:** `lib/workflow.js` lines 919-930 and `lib/runtime-guidance.js` lines 561-581.
**Apply to:** `## Test Plan` integration and TDD step detection.
```javascript
const matches = Array.from(text.matchAll(/^##\s+(\d+\.\s+.+)$/gm));
```

`## Test Plan` must be parsed separately because existing apply group selection intentionally recognizes only numbered `##` headings.

### Execution Proof Persistence
**Source:** `lib/change-store.js` lines 471-478 and 526-545; `lib/change-capsule.js` lines 63-96.
**Apply to:** TDD-04 richer proof.
```javascript
const verificationEntry = {
  at: timestamp,
  taskGroup: completedTaskGroup,
  verificationCommand: toNonEmptyString(payload.verificationCommand) || 'UNCONFIRMED',
  verificationResult: toNonEmptyString(payload.verificationResult) || 'UNCONFIRMED',
  changedFiles,
  checkpointStatus
};

verificationLog: [...normalizeAnyArray(checkpointed.verificationLog), verificationEntry],
```

### Generated Command Parity
**Source:** `lib/generator.js` lines 108-136; `scripts/test-workflow-runtime.js` lines 2701-2719.
**Apply to:** Any prompt wording update under `commands/**`.
```javascript
const generatedBundles = {
  claude: buildPlatformBundle('claude'),
  codex: buildPlatformBundle('codex'),
  gemini: buildPlatformBundle('gemini')
};

assert.deepStrictEqual(parity.mismatched, [], `${platform} checked-in bundle content must exactly match generated output`);
```

### Test Runner Pattern
**Source:** `scripts/test-workflow-runtime.js` lines 411-418 and 2935-2953.
**Apply to:** All Phase 6 regression tests.
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
  }
});
```

## No Analog Found

None. Every Phase 6 work item has an exact same-file or same-system analog. The only caution is `commands/**`: generated outputs should copy generator/template patterns, not be edited as the primary source.

## Metadata

**Analog search scope:** `lib/`, `templates/project/`, `templates/commands/`, `skills/opsx/`, `schemas/spec-driven/`, `scripts/`, `commands/`.

**Files scanned:** 14 direct Phase 6 files, 3 command templates, 45 generated command files, plus `package.json` for the test command.

**Pattern extraction date:** 2026-04-28

**Primary implementation advice:** Keep Phase 6 additive: normalized `rules.tdd` defaults, explicit `## Test Plan` parsing, TDD-specific checkpoint findings on existing checkpoint ids, and richer proof in existing `verificationLog` / `context.md` / `drift.md` paths.
