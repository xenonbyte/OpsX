# Phase 07: Verify, Sync, Archive, and Batch Gates - Pattern Map

**Mapped:** 2026-04-28
**Files analyzed:** 16 work items (15 generated route files grouped as one work item)
**Analogs found:** 16 / 16 (1 partial/no exact analog)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `lib/verify.js` | service/utility | request-response, file-I/O inspection, transform | `lib/runtime-guidance.js`, `lib/workflow.js`, `lib/change-artifacts.js` | role + flow match |
| `lib/sync.js` | service/utility | file-I/O, transform, conservative merge | `lib/spec-validator.js`, `lib/fs-utils.js` | role + flow match |
| `lib/archive.js` | service/utility | file-I/O, state transition, request-response | `lib/change-state.js`, `lib/change-store.js`, `lib/fs-utils.js` | role + flow match |
| `lib/batch.js` | orchestrator service | batch, request-response, file-I/O | `lib/runtime-guidance.js` `buildApplyInstructions()` and runtime fixture tests | role-match |
| `lib/path-scope.js` or equivalent narrow helper | utility | transform/path matching | `lib/runtime-guidance.js` path safety helpers; `package.json` dependency pattern | partial |
| `lib/runtime-guidance.js` | service | request-response, transform | same file: status/apply payload builders | exact |
| `lib/workflow.js` | workflow metadata/checkpoint utility | request-response, transform | same file: `ACTIONS`, fallback lines, checkpoint result shape | exact |
| `lib/generator.js` | generator | transform/static generation | same file: `buildActionMarkdown()` and `buildPlatformBundle()` | exact |
| `templates/commands/action.md.tmpl` | prompt template | static generated prompt transform | same template execution rules block | exact |
| `scripts/test-workflow-runtime.js` | test | batch, file-I/O fixtures, assertions | same file: fixture helpers, checkpoint tests, parity tests | exact |
| `skills/opsx/SKILL.md` | skill guidance | request-response workflow instructions | same file: checkpoints, execution loop, guardrails | exact |
| `skills/opsx/references/action-playbooks.md` | playbook | request-response workflow guidance | same file: common setup and verify/sync/archive/batch sections | exact |
| `skills/opsx/references/action-playbooks-zh.md` | playbook | request-response workflow guidance | same file: bilingual mirror of action behavior | exact |
| `package.json` | config | dependency declaration | existing `yaml` dependency and Node engine block | exact |
| `package-lock.json` | config | dependency lock | existing root package and `node_modules/yaml` lock entries | exact |
| `commands/{claude,codex,gemini}/... verify/sync/archive/batch-apply/bulk-archive` | generated prompt output | generated static assets | `lib/generator.js` + `templates/commands/action.md.tmpl` + parity tests | exact |

## Pattern Assignments

### `lib/verify.js` (service/utility, request-response + file-I/O inspection)

**Analog:** `lib/runtime-guidance.js`, `lib/workflow.js`, `lib/change-artifacts.js`, `lib/change-store.js`

**Imports pattern** from [lib/runtime-guidance.js](/Users/xubo/x-skills/openspec/lib/runtime-guidance.js:1) lines 1-10:
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

**State normalization input pattern** from [lib/change-store.js](/Users/xubo/x-skills/openspec/lib/change-store.js:273) lines 273-311:
```javascript
function normalizeChangeState(raw, options = {}) {
  const input = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const fallbackName = toNonEmptyString(options.changeName)
    || toNonEmptyString(input.change)
    || path.basename(path.resolve(options.changeDir || process.cwd()));
  const now = toNonEmptyString(options.now) || new Date().toISOString();
  const base = buildChangeStateSkeleton(fallbackName, options.changeDir);
  const checkpoints = input.checkpoints && typeof input.checkpoints === 'object' && !Array.isArray(input.checkpoints)
    ? input.checkpoints
    : {};

  return {
    version: Number.isFinite(version) && version > 0 ? version : base.version,
    change: toNonEmptyString(input.change) || base.change,
    stage: normalizeLifecycleStage(input.stage),
    nextAction: toNonEmptyString(input.nextAction) || DEFAULT_NEXT_ACTION,
    artifacts: Object.assign({}, base.artifacts, input.artifacts && typeof input.artifacts === 'object' && !Array.isArray(input.artifacts) ? input.artifacts : {}),
    hashes: Object.assign({}, base.hashes, normalizeHashMap(input.hashes)),
    checkpoints: {
      spec: normalizeCheckpoint(resolveCheckpointSourceValue(checkpoints, 'spec'), base.checkpoints.spec),
      specSplit: normalizeCheckpoint(resolveCheckpointSourceValue(checkpoints, 'specSplit'), base.checkpoints.specSplit),
      task: normalizeCheckpoint(resolveCheckpointSourceValue(checkpoints, 'task'), base.checkpoints.task),
      execution: normalizeCheckpoint(resolveCheckpointSourceValue(checkpoints, 'execution'), base.checkpoints.execution)
    },
    verificationLog: normalizeAnyArray(input.verificationLog),
    blockers: normalizeStringArray(input.blockers),
    warnings: normalizeStringArray(input.warnings),
    allowedPaths: normalizeStringArray(input.allowedPaths),
    forbiddenPaths: normalizeStringArray(input.forbiddenPaths),
    updatedAt: toNonEmptyString(input.updatedAt) || now
  };
}
```

**Hash drift gate pattern** from [lib/change-artifacts.js](/Users/xubo/x-skills/openspec/lib/change-artifacts.js:62) lines 62-79:
```javascript
function detectArtifactHashDrift(storedHashes, currentHashes) {
  const normalizedStored = normalizeHashes(storedHashes);
  const normalizedCurrent = normalizeHashes(currentHashes);
  const comparedPaths = Array.from(
    new Set([
      ...Object.keys(normalizedStored),
      ...Object.keys(normalizedCurrent)
    ])
  ).sort((left, right) => left.localeCompare(right));

  const driftedPaths = comparedPaths.filter((relativePath) => {
    return normalizedStored[relativePath] !== normalizedCurrent[relativePath];
  });

  return {
    driftedPaths,
    warnings: driftedPaths.map((relativePath) => `Hash drift detected for ${relativePath}`)
  };
}
```

**Structured gate result pattern** from [lib/workflow.js](/Users/xubo/x-skills/openspec/lib/workflow.js:939) lines 939-955:
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

**Execution proof pattern** from [lib/workflow.js](/Users/xubo/x-skills/openspec/lib/workflow.js:1639) lines 1639-1663 and 1749-1758:
```javascript
if (evidence.group.completed === true) {
  const missingProofFields = [];
  if (!Array.isArray(evidence.execution.completedSteps) || evidence.execution.completedSteps.length === 0) {
    missingProofFields.push('completedSteps');
  }
  if (!evidence.execution.verificationCommand) {
    missingProofFields.push('verificationCommand');
  }
  if (!evidence.execution.verificationResult) {
    missingProofFields.push('verificationResult');
  }
  if (!evidence.execution.diffSummary) {
    missingProofFields.push('diffSummary');
  }
  if (!evidence.execution.driftStatus) {
    missingProofFields.push('driftStatus');
  }
  if (missingProofFields.length) {
    addFinding(findings, {
      severity: 'WARN',
      code: 'execution-proof-missing',
      message: `Completed task-group execution proof is missing: ${missingProofFields.join(', ')}.`,
      patchTargets: ['tasks']
    });
  }
}

const result = buildCheckpointResult(schema, 'execution-checkpoint', findings, { phase: 'execution' });
result.executionEvidence = {
  completedSteps: evidence.execution.completedSteps,
  verificationCommand: evidence.execution.verificationCommand,
  verificationResult: evidence.execution.verificationResult,
  diffSummary: evidence.execution.diffSummary,
  driftStatus: evidence.execution.driftStatus,
  driftSummary: evidence.execution.driftSummary
};
return result;
```

**Planner guidance:** `evaluateVerifyGate()` should return `{ status: 'PASS'|'WARN'|'BLOCK', findings, patchTargets, nextAction }`. It should read normalized state through `loadChangeState()`, recompute hashes through `hashTrackedArtifacts()`, apply `detectArtifactHashDrift()`, inspect `verificationLog` and `checkpoints.execution`, reuse `runTaskCheckpoint()` for strict TDD evidence, and parse `tasks.md` with the same top-level group semantics as `runtime-guidance`.

---

### `lib/sync.js` (service/utility, conservative spec merge)

**Analog:** `lib/spec-validator.js`, `lib/fs-utils.js`

**Spec file parser pattern** from [lib/spec-validator.js](/Users/xubo/x-skills/openspec/lib/spec-validator.js:132) lines 132-253:
```javascript
function parseSpecFile(filePath, text) {
  const normalizedPath = toPosixPath(filePath);
  const sourceText = toText(text);
  const lines = sourceText.split(/\r?\n/);
  const requirements = [];
  const fencedBlocks = [];
  const capability = deriveCapabilityFromPath(normalizedPath);
  let inFence = false;
  let currentFence = null;
  let currentSection = 'root';
  let currentRequirement = null;
  let orphanScenarioCount = 0;

  function flushRequirement() {
    if (!currentRequirement) return;
    const bodyText = currentRequirement.bodyLines.join('\n').trim();
    const requirementText = `${currentRequirement.title}\n${bodyText}`;
    requirements.push({
      ref: `${normalizedPath}#${requirements.length + 1}`,
      path: normalizedPath,
      capability,
      section: currentRequirement.section,
      title: currentRequirement.title,
      id: normalizeRequirementId(currentRequirement.title),
      body: bodyText,
      scenarioCount: currentRequirement.scenarioTitles.length,
      scenarioTitles: currentRequirement.scenarioTitles.slice(),
      hasNegativeNormative,
      hasPositiveNormative
    });
    currentRequirement = null;
  }

  return {
    path: normalizedPath,
    text: sourceText,
    capability,
    requirements,
    scenarioCount: requirements.reduce((sum, requirement) => sum + requirement.scenarioCount, 0) + orphanScenarioCount,
    fencedBlocks,
    requirementCount: requirements.length,
    orphanScenarioCount
  };
}
```

**Evidence + review pattern** from [lib/spec-validator.js](/Users/xubo/x-skills/openspec/lib/spec-validator.js:297) lines 297-323 and [lib/spec-validator.js](/Users/xubo/x-skills/openspec/lib/spec-validator.js:335) lines 335-345:
```javascript
function collectSpecSplitEvidence(options = {}) {
  const proposalPath = options.proposalPath || (options.changeDir ? path.join(options.changeDir, 'proposal.md') : null);
  const proposalText = typeof options.proposalText === 'string'
    ? options.proposalText
    : (proposalPath && fs.existsSync(proposalPath) ? fs.readFileSync(proposalPath, 'utf8') : '');
  const proposalScope = parseProposalScope(proposalText);
  const parsedSpecFiles = resolveSpecFileInputs(options)
    .map((entry) => parseSpecFile(entry.path, entry.text))
    .sort((left, right) => left.path.localeCompare(right.path));
  const requirements = parsedSpecFiles.flatMap((specFile) => specFile.requirements);

  return {
    proposal: {
      path: 'proposal',
      text: proposalText,
      scopeLines: proposalScope.lines,
      scopeTokens: proposalScope.tokens
    },
    specFiles: parsedSpecFiles,
    requirements,
    counts: {
      specFileCount: parsedSpecFiles.length,
      requirementCount: requirements.length,
      scenarioCount: parsedSpecFiles.reduce((sum, specFile) => sum + specFile.scenarioCount, 0),
      fencedBlockCount: parsedSpecFiles.reduce((sum, specFile) => sum + specFile.fencedBlocks.length, 0)
    }
  };
}

function reviewSpecSplitEvidence(evidence, options = {}) {
  const findings = [];
  const specFiles = Array.isArray(evidence && evidence.specFiles) ? evidence.specFiles : [];
  const requirements = Array.isArray(evidence && evidence.requirements)
    ? evidence.requirements
    : specFiles.flatMap((specFile) => specFile.requirements || []);
```

**Conflict finding pattern** from [lib/spec-validator.js](/Users/xubo/x-skills/openspec/lib/spec-validator.js:388) lines 388-445:
```javascript
const duplicateIdGroups = new Map();
requirements.forEach((requirement) => {
  if (!requirement.id) return;
  const list = duplicateIdGroups.get(requirement.id) || [];
  list.push(requirement);
  duplicateIdGroups.set(requirement.id, list);
});

duplicateIdGroups.forEach((group, id) => {
  if (group.length < 2) return;
  findings.push(buildFinding(
    'BLOCK',
    'duplicate-requirement-id',
    `Requirement id "${id}" appears multiple times across split specs.`,
    group.map((entry) => entry.path)
  ));
});

conflictCandidates.forEach((pair) => {
  const left = pair.left;
  const right = pair.right;
  const hasOppositePolarity = (
    (left.hasNegativeNormative && right.hasPositiveNormative)
    || (right.hasNegativeNormative && left.hasPositiveNormative)
  );
  if (!hasOppositePolarity || nounOverlap === 0) return;

  findings.push(buildFinding(
    'BLOCK',
    'conflicting-requirements',
    `Requirements "${left.title}" and "${right.title}" conflict on overlapping behavior tokens.`,
    [left.path, right.path]
  ));
});
```

**Atomic write pattern** from [lib/fs-utils.js](/Users/xubo/x-skills/openspec/lib/fs-utils.js:13) lines 13-20:
```javascript
function writeTextAtomic(filePath, content) {
  const directory = path.dirname(filePath);
  const baseName = path.basename(filePath);
  const tempPath = path.join(directory, `.${baseName}.${process.pid}.${Date.now()}.tmp`);
  ensureDir(directory);
  fs.writeFileSync(tempPath, content, 'utf8');
  fs.renameSync(tempPath, filePath);
}
```

**Planner guidance:** Build `planSync()` as an in-memory operation first. It should collect change-local `specs/**/spec.md`, read matching `.opsx/specs/**/spec.md`, parse both with `parseSpecFile()`, run conflict/duplicate checks before writes, and return `BLOCK` with patch targets on any conflict or omission. Only `applySyncPlan()` should call `writeTextAtomic()`, and only after the whole plan is conflict-free.

---

### `lib/archive.js` (service/utility, lifecycle + file move)

**Analog:** `lib/change-state.js`, `lib/change-store.js`, `lib/fs-utils.js`, `lib/workspace.js`

**Lifecycle event constants** from [lib/change-state.js](/Users/xubo/x-skills/openspec/lib/change-state.js:31) lines 31-45:
```javascript
const MUTATION_EVENTS = Object.freeze({
  NEW_SKELETON_CREATED: 'NEW_SKELETON_CREATED',
  PROPOSAL_ACCEPTED: 'PROPOSAL_ACCEPTED',
  SPECS_ACCEPTED: 'SPECS_ACCEPTED',
  SPEC_SPLIT_ACCEPTED: 'SPEC_SPLIT_ACCEPTED',
  DESIGN_ACCEPTED: 'DESIGN_ACCEPTED',
  SECURITY_REVIEW_MARKED_REQUIRED: 'SECURITY_REVIEW_MARKED_REQUIRED',
  SECURITY_REVIEW_ACCEPTED: 'SECURITY_REVIEW_ACCEPTED',
  TASKS_ACCEPTED: 'TASKS_ACCEPTED',
  START_TASK_GROUP: 'START_TASK_GROUP',
  COMPLETE_TASK_GROUP: 'COMPLETE_TASK_GROUP',
  VERIFY_ACCEPTED: 'VERIFY_ACCEPTED',
  SYNC_ACCEPTED: 'SYNC_ACCEPTED',
  ARCHIVE_ACCEPTED: 'ARCHIVE_ACCEPTED',
  BLOCK: 'BLOCK'
});
```

**Verified -> synced -> archived transition pattern** from [lib/change-state.js](/Users/xubo/x-skills/openspec/lib/change-state.js:212) lines 212-223:
```javascript
IMPLEMENTED: Object.freeze({
  [MUTATION_EVENTS.VERIFY_ACCEPTED]: () => ({ stage: 'VERIFIED' }),
  [MUTATION_EVENTS.BLOCK]: () => ({ stage: 'BLOCKED' })
}),
VERIFIED: Object.freeze({
  [MUTATION_EVENTS.SYNC_ACCEPTED]: () => ({ stage: 'SYNCED' }),
  [MUTATION_EVENTS.BLOCK]: () => ({ stage: 'BLOCKED' })
}),
SYNCED: Object.freeze({
  [MUTATION_EVENTS.ARCHIVE_ACCEPTED]: () => ({ stage: 'ARCHIVED' }),
  [MUTATION_EVENTS.BLOCK]: () => ({ stage: 'BLOCKED' })
}),
```

**Mutation application pattern** from [lib/change-state.js](/Users/xubo/x-skills/openspec/lib/change-state.js:266) lines 266-307:
```javascript
function applyMutationEvent(state, event) {
  const normalizedState = normalizeState(state);
  const normalizedEvent = normalizeEvent(event);
  const eventType = normalizedEvent.type;

  if (!eventType || !Object.prototype.hasOwnProperty.call(MUTATION_EVENTS, eventType)) {
    return buildLifecycleBlockResult(
      'invalid-transition',
      `Unknown lifecycle event "${eventType || 'empty'}" for stage "${normalizedState.stage}".`,
      normalizedEvent.patchTargets,
      'Use a supported mutation event from MUTATION_EVENTS.'
    );
  }

  const stageTransitions = TRANSITIONS[normalizedState.stage] || {};
  const transition = stageTransitions[eventType];
  if (typeof transition !== 'function') {
    return buildLifecycleBlockResult(
      'invalid-transition',
      `Invalid transition: ${normalizedState.stage} -> ${eventType}.`,
      normalizedEvent.patchTargets,
      'Review state.yaml stage and choose a valid next mutation event.'
    );
  }

  const transitionResult = transition(normalizedState, normalizedEvent) || {};
  const nextState = {
    ...normalizedState,
    ...transitionResult,
    stage: nextStage
  };

  return {
    status: 'OK',
    stage: nextState.stage,
    nextAction: resolveContinueAction(nextState),
    state: nextState,
    event: eventType
  };
}
```

**Persisted state write pattern** from [lib/change-store.js](/Users/xubo/x-skills/openspec/lib/change-store.js:365) lines 365-377:
```javascript
function writeChangeState(changeDir, state) {
  const resolvedChangeDir = path.resolve(changeDir);
  const statePath = getChangeStatePath(resolvedChangeDir);
  ensureWithinBase(resolvedChangeDir, statePath, 'change');
  ensureDir(path.dirname(statePath));

  const payload = normalizeChangeState(state, {
    changeName: path.basename(resolvedChangeDir),
    changeDir: resolvedChangeDir,
    now: new Date().toISOString()
  });
  writeTextAtomic(statePath, withTrailingNewline(YAML.stringify(payload)));
  return payload;
}
```

**Path safety pattern** from [lib/workspace.js](/Users/xubo/x-skills/openspec/lib/workspace.js:43) lines 43-50:
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

**Planner guidance:** `archive` should call verify first, then safe sync if state is only `VERIFIED`, then move only after `SYNCED`. Use `applyMutationEvent(... ARCHIVE_ACCEPTED)` and `writeChangeState()` for lifecycle state. Archive file moves must verify both source `.opsx/changes/<change>` and target `.opsx/archive/<change>` stay inside `.opsx`.

---

### `lib/batch.js` (orchestrator service, batch + per-change isolation)

**Analog:** `lib/runtime-guidance.js`, `scripts/test-workflow-runtime.js`

**Per-change runtime load pattern** from [lib/runtime-guidance.js](/Users/xubo/x-skills/openspec/lib/runtime-guidance.js:653) lines 653-659:
```javascript
function buildRuntimeKernel(options = {}) {
  const runtime = resolveRuntimeConfig(options);
  const schemaName = options.schemaName || runtime.changeConfig.schema || runtime.config.schema || DEFAULT_SCHEMA;
  const schema = ensureSchema(schemaName, options);
  const graph = validateSchemaGraph(schema, { schemaName });
  const completion = detectArtifactCompletion({ graph, changeDir: runtime.changeDir });
  const sources = mergeRuntimeSources(options.sources, collectArtifactSources(runtime.changeDir));
```

**Apply readiness payload pattern** from [lib/runtime-guidance.js](/Users/xubo/x-skills/openspec/lib/runtime-guidance.js:950) lines 950-1068:
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
  const persistedState = loadPersistedStateView(kernel.paths.changeDir);
  const driftInspection = inspectReadOnlyHashDrift(kernel.paths.changeDir, persistedState);
  const driftAwareState = driftInspection.stateView;

  const prerequisites = [];
  const incompleteRequiredArtifacts = kernel.graph.artifacts
    .filter((artifact) => artifact.optional !== true)
    .filter((artifact) => !(kernel.artifactStates[artifact.id] && kernel.artifactStates[artifact.id].done === true))
    .map((artifact) => artifact.id);

  incompleteRequiredArtifacts.forEach((artifactId) => {
    prerequisites.push(`${artifactId} artifact is not completed`);
  });

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
      })),
      tddFindings: tddCheckpointFindings
    },
    remainingTaskGroups: remainingGroups,
    nextTaskGroup: remainingGroups.length ? remainingGroups[0].title : null,
    hashDriftWarnings: driftInspection.drift.warnings.slice(),
    allowedPathWarnings,
    forbiddenPathWarnings
  };
```

**Fixture creation pattern** from [scripts/test-workflow-runtime.js](/Users/xubo/x-skills/openspec/scripts/test-workflow-runtime.js:262) lines 262-297:
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

**Planner guidance:** Batch modules should expose a plain per-change loop, not a shared mutable active-change context. Every iteration should call the same single-change helper (`buildApplyInstructions()`, `evaluateArchiveGate()`, etc.) with its own `changeName`. Return aggregate counts and per-change `{ change, status, reason, findings }`; global errors should be reserved for invalid target set or missing workspace.

---

### `lib/path-scope.js` or equivalent narrow helper (utility, path matching)

**Analog:** No exact glob matcher exists. Partial analogs: `runtime-guidance` path safety and `package.json` dependency convention.

**Existing normalization/path safety pattern** from [lib/runtime-guidance.js](/Users/xubo/x-skills/openspec/lib/runtime-guidance.js:36) lines 36-38 and [lib/runtime-guidance.js](/Users/xubo/x-skills/openspec/lib/runtime-guidance.js:86) lines 86-94:
```javascript
function toUnixPath(value) {
  return String(value || '').replace(/\\/g, '/');
}

function ensureInside(baseDir, targetPath, code = 'invalid-path') {
  const relative = path.relative(baseDir, targetPath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new RuntimeGuidanceError(code, 'Resolved path escapes the expected base directory.', {
      baseDir,
      targetPath
    });
  }
}
```

**Existing exact template-pattern helper, not sufficient for glob `**`** from [lib/runtime-guidance.js](/Users/xubo/x-skills/openspec/lib/runtime-guidance.js:260) lines 260-273:
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

**Dependency declaration pattern** from [package.json](/Users/xubo/x-skills/openspec/package.json:12) lines 12-14 and [package.json](/Users/xubo/x-skills/openspec/package.json:49) lines 49-50:
```json
"dependencies": {
  "yaml": "2.8.3"
},
"engines": {
  "node": ">=14.14.0"
}
```

**Planner guidance:** If Phase 7 keeps `lib/**` / `*.pem` semantics, add a small Node 14 compatible matcher helper and dependency (`picomatch` per research). Keep its API narrow, e.g. `matchPathScope(changedFiles, { allowedPaths, forbiddenPaths })`, and return normalized findings rather than throwing for normal mismatch cases.

---

### `lib/runtime-guidance.js` (service, route payload builders)

**Analog:** same file

**Error class pattern** from [lib/runtime-guidance.js](/Users/xubo/x-skills/openspec/lib/runtime-guidance.js:27) lines 27-33:
```javascript
class RuntimeGuidanceError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'RuntimeGuidanceError';
    this.code = code;
    this.details = details;
  }
}
```

**Persisted state + read-only drift inspection pattern** from [lib/runtime-guidance.js](/Users/xubo/x-skills/openspec/lib/runtime-guidance.js:628) lines 628-650:
```javascript
function loadPersistedStateView(changeDir) {
  const state = loadChangeState(changeDir);
  return normalizePersistedStateView(state);
}

function inspectReadOnlyHashDrift(changeDir, persistedStateView) {
  const currentHashes = hashTrackedArtifacts(changeDir);
  const firstPass = detectArtifactHashDrift(persistedStateView.hashes, currentHashes);
  if (!firstPass.driftedPaths.length) {
    return {
      stateView: persistedStateView,
      currentHashes,
      drift: firstPass
    };
  }

  // Reload normalized state from disk before continuing with read-only guidance.
  const reloadedStateView = loadPersistedStateView(changeDir);
  return {
    stateView: reloadedStateView,
    currentHashes,
    drift: detectArtifactHashDrift(reloadedStateView.hashes, currentHashes)
  };
}
```

**Status response pattern** from [lib/runtime-guidance.js](/Users/xubo/x-skills/openspec/lib/runtime-guidance.js:705) lines 705-748:
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
    forbiddenPaths: driftAwareState.forbiddenPaths.slice(),
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

**Planner guidance:** Add route-specific helpers only if needed, e.g. `buildVerifyInstructions()`, `buildSyncInstructions()`, `buildArchiveInstructions()`, `buildBatchApplyInstructions()`, `buildBulkArchiveInstructions()`. Keep the established pattern: build a structured payload, then add `format === 'text'` rendering without mutating unrelated state.

---

### `lib/workflow.js` (workflow metadata/checkpoint utility)

**Analog:** same file

**Action metadata pattern** from [lib/workflow.js](/Users/xubo/x-skills/openspec/lib/workflow.js:10) lines 10-75:
```javascript
const ACTIONS = [
  {
    id: 'apply',
    title: 'Apply',
    summary: 'Implement tasks from a change and update task state.',
    scope: 'Read the relevant change artifacts before modifying product code.'
  },
  {
    id: 'archive',
    title: 'Archive',
    summary: 'Archive a completed change and sync specs if needed.',
    scope: 'Archive only completed or explicitly user-approved incomplete changes.'
  },
  {
    id: 'verify',
    title: 'Verify',
    summary: 'Check completeness, correctness, and coherence against artifacts.',
    scope: 'Report findings with severity and cite the relevant artifact or file path.'
  },
  {
    id: 'sync',
    title: 'Sync',
    summary: 'Merge delta specs from a change into the main spec set.',
    scope: 'Merge only the requested delta specs and report conflicts explicitly.'
  },
  {
    id: 'bulk-archive',
    title: 'Bulk archive',
    summary: 'Archive multiple completed changes together.',
    scope: 'Ask the user to confirm the target set when it is not explicit.'
  },
  {
    id: 'batch-apply',
    title: 'Batch apply',
    summary: 'Apply multiple ready changes in a controlled sequence.',
    scope: 'Clarify execution order or target changes when that affects behavior.'
  }
];
```

**Fallback source-of-truth pattern** from [lib/workflow.js](/Users/xubo/x-skills/openspec/lib/workflow.js:105) lines 105-170:
```javascript
const ACTION_FALLBACK_LINES = Object.freeze({
  apply: Object.freeze([
    'If `.opsx/config.yaml` is missing, stop and redirect to `{{onboardRoute}}`.',
    'If `.opsx/active.yaml` is missing or points to a missing change, stop and ask the user to run `{{newRoute}}` or `{{proposeRoute}}`.',
    'Execute exactly one top-level task group by default.',
    'After that group, record one execution checkpoint, refresh `context.md` / `drift.md`, and stop for the next run.',
    'Update stored artifact hashes only after accepted checkpoint/state writes.'
  ])
});

const MUTATION_HEAVY_ACTION_IDS = new Set([
  'apply',
  'archive',
  'continue',
  'ff',
  'sync',
  'verify',
  'batch-apply',
  'bulk-archive'
]);

const DEFAULT_MUTATION_FALLBACK_LINES = Object.freeze([
  'If `.opsx/config.yaml` is missing, stop and redirect to `{{onboardRoute}}`.',
  'If `.opsx/active.yaml` is missing or points to a missing change, stop and ask the user to run `{{newRoute}}` or `{{proposeRoute}}`.',
  'Do not invent an active change, state file, or task state when required artifacts are absent.'
]);
```

**Fallback rendering/export pattern** from [lib/workflow.js](/Users/xubo/x-skills/openspec/lib/workflow.js:2475) lines 2475-2503:
```javascript
function buildFallbackRoutes(platform) {
  if (!['claude', 'codex', 'gemini'].includes(platform)) {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  return {
    onboardRoute: getActionSyntax(platform, 'onboard'),
    newRoute: getActionSyntax(platform, 'new'),
    proposeRoute: getActionSyntax(platform, 'propose')
  };
}

function getActionFallbackLines(platform, actionId) {
  const routes = buildFallbackRoutes(platform);
  const lines = ACTION_FALLBACK_LINES[actionId]
    || (MUTATION_HEAVY_ACTION_IDS.has(actionId) ? DEFAULT_MUTATION_FALLBACK_LINES : DEFAULT_NON_MUTATION_FALLBACK_LINES);
  return lines.map((line) => renderFallbackLine(line, routes));
}
```

**Planner guidance:** Update `archive.scope` to remove the incomplete-change escape hatch. Add explicit fallback lines for `verify`, `sync`, `archive`, `batch-apply`, and `bulk-archive` if prompt output needs route-specific hard gate wording. Keep `ACTIONS` as the source for generated route inventory.

---

### `lib/generator.js` and `templates/commands/action.md.tmpl` (generator + template)

**Analog:** same files

**Generator source-of-truth pattern** from [lib/generator.js](/Users/xubo/x-skills/openspec/lib/generator.js:46) lines 46-67:
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
    execution_checkpoint_note: getExecutionCheckpointNote(action.id),
    checkpoint_state_note: CHECKPOINT_STATES.map((state) => `\`${state}\``).join(', '),
    preflight_note: preflightLines,
    fallback_note: fallbackLines
  });
}
```

**Bundle generation pattern** from [lib/generator.js](/Users/xubo/x-skills/openspec/lib/generator.js:118) lines 118-144:
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
}
```

**Template execution rules block** from [templates/commands/action.md.tmpl](/Users/xubo/x-skills/openspec/templates/commands/action.md.tmpl:12) lines 12-29:
```markdown
Execution rules:
- Follow the `{{action}}` playbook from the `opsx` skill and its referenced files.
- CLI quick checks: `opsx check`, `opsx doc`, and `opsx language <en|zh>`.
- Preflight before acting:
{{preflight_note}}
- If required artifacts are missing, report that honestly and apply route-specific fallback guidance.
- Route fallback guidance:
{{fallback_note}}
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

**Planner guidance:** Prefer updating `lib/workflow.js` fallback/scope lines and playbooks before changing the template. Use `lib/generator.js` only when a new template variable or action-specific generator helper is needed. Generated files must come from `buildPlatformBundle()`, not hand edits.

---

### `scripts/test-workflow-runtime.js` (test, fixtures + parity)

**Analog:** same file

**Imports pattern** from [scripts/test-workflow-runtime.js](/Users/xubo/x-skills/openspec/scripts/test-workflow-runtime.js:3) lines 3-41:
```javascript
const assert = require('assert');
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createHash } = require('node:crypto');
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
const {
  runSpecSplitCheckpoint,
  runTaskCheckpoint,
  runExecutionCheckpoint,
  summarizeWorkflowState,
  validatePhaseOneWorkflowContract,
  validateCheckpointContracts,
  getAllActions,
  getActionSyntax
} = require('../lib/workflow');
const { buildPlatformBundle } = require('../lib/generator');
```

**Test registration pattern** from [scripts/test-workflow-runtime.js](/Users/xubo/x-skills/openspec/scripts/test-workflow-runtime.js:428) lines 428-435:
```javascript
function runTests() {
  const tests = [];
  const fixtureRoot = createFixtureRepo();
  const cleanupTargets = [fixtureRoot];

  function test(name, fn) {
    tests.push({ name, fn });
  }
```

**State transition test pattern** from [scripts/test-workflow-runtime.js](/Users/xubo/x-skills/openspec/scripts/test-workflow-runtime.js:540) lines 540-567:
```javascript
test('change-state blocks invalid transitions and routes continue by persisted stage', () => {
  const { applyMutationEvent, resolveContinueAction } = require('../lib/change-state');
  const blocked = applyMutationEvent({ stage: 'INIT' }, 'COMPLETE_TASK_GROUP');
  assert.strictEqual(blocked.status, 'BLOCK');
  assert.strictEqual(blocked.code, 'invalid-transition');
  assert(Array.isArray(blocked.patchTargets));
  assert.strictEqual(resolveContinueAction({ stage: 'INIT' }), 'proposal');
  assert.strictEqual(resolveContinueAction({ stage: 'IMPLEMENTED' }), 'verify');
  assert.strictEqual(resolveContinueAction({ stage: 'VERIFIED' }), 'sync');
  assert.strictEqual(resolveContinueAction({ stage: 'SYNCED' }), 'archive');
});
```

**Execution evidence persistence test pattern** from [scripts/test-workflow-runtime.js](/Users/xubo/x-skills/openspec/scripts/test-workflow-runtime.js:1449) lines 1449-1487:
```javascript
test('recordTaskGroupExecution persists extended verification evidence', () => {
  const { recordTaskGroupExecution, writeChangeState } = require('../lib/change-store');
  const changeName = 'persist-extended-verification-evidence';
  const changeDir = createChange(fixtureRoot, changeName, {
    'proposal.md': '# Proposal\n',
    'design.md': '# Design\n',
    'tasks.md': '## 1. Runtime evidence\n- [x] 1.1 Persist execution proof\n',
    'specs/runtime/spec.md': '## ADDED Requirements\n### Requirement: Runtime evidence\n'
  });

  writeChangeState(changeDir, {
    change: changeName,
    stage: 'APPLYING_GROUP',
    active: {
      taskGroup: '1. Runtime evidence',
      nextTaskGroup: null
    }
  });

  const persisted = recordTaskGroupExecution(changeDir, {
    taskGroup: '1. Runtime evidence',
    nextTaskGroup: null,
    verificationCommand: 'npm run test:workflow-runtime',
    verificationResult: 'PASS',
    changedFiles: ['lib/workflow.js', 'lib/change-store.js'],
    checkpointStatus: 'PASS',
    completedSteps: ['RED', 'GREEN', 'VERIFY'],
    diffSummary: 'Persisted execution-proof fields in existing verification log.',
    driftStatus: 'clean'
  });

  assert.strictEqual(persisted.verificationLog.length, 1);
  assert.deepStrictEqual(persisted.verificationLog[0].completedSteps, ['RED', 'GREEN', 'VERIFY']);
  assert.strictEqual(persisted.verificationLog[0].driftStatus, 'clean');
});
```

**Prompt parity pattern** from [scripts/test-workflow-runtime.js](/Users/xubo/x-skills/openspec/scripts/test-workflow-runtime.js:3370) lines 3370-3379 and [scripts/test-workflow-runtime.js](/Users/xubo/x-skills/openspec/scripts/test-workflow-runtime.js:3544) lines 3544-3561:
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
  assert(parity.totalGenerated > 0, `${platform} generated bundle must not be empty`);
  assert.deepStrictEqual(parity.missing, [], `${platform} checked-in bundle is missing generated files`);
  assert.deepStrictEqual(parity.mismatched, [], `${platform} checked-in bundle has generated mismatches`);
  assert.deepStrictEqual(parity.extra, [], `${platform} checked-in bundle has extra tracked files outside generated output`);
  assert.strictEqual(parity.totalGenerated, parity.totalCheckedIn, `${platform} tracked checked-in count must match generated count`);
  assert.deepStrictEqual(parity.checkedInEntries, parity.generatedEntries, `${platform} checked-in entries must exactly match generated entries`);
});
```

**Planner guidance:** Add Phase 7 tests to this same file. Use temp fixture repos, create multiple `.opsx/changes/<name>` folders for batch isolation, and assert both generated source output and checked-in prompts for the 15 affected route files.

---

### `skills/opsx/SKILL.md` and bilingual playbooks (skill/playbook guidance)

**Analog:** same files

**Skill checkpoint and loop pattern** from [skills/opsx/SKILL.md](/Users/xubo/x-skills/openspec/skills/opsx/SKILL.md:94) lines 94-128:
```markdown
## Checkpoints

- `spec-split-checkpoint`: after `specs`, before `design`
- `spec checkpoint`: after `design`, before `tasks`
- `task checkpoint`: after `tasks`, before `apply`
- `execution checkpoint`: after each top-level task group during `apply`
- Canonical checkpoint states are `PASS`, `WARN`, and `BLOCK`.
- Checkpoints do not create `spec-review.md`, `task-review.md`, or `execution-review.md`.
- When a checkpoint finds issues, update existing artifacts such as `proposal.md`, `specs/*.md`, `design.md`, `security-review.md`, or `tasks.md`.

## Default Execution Loop

1. Identify the workflow action and target change.
2. Resolve config from change metadata, project config, then global config.
3. Run the strict preflight reads (`.opsx/config.yaml`, `.opsx/active.yaml`, active `state.yaml`, active `context.md`, and current artifacts when present).
4. Read persisted runtime state (`stage`, `nextAction`, `warnings`, `blockers`, and artifact hash status) from `state.yaml`; treat `context.md` and `drift.md` as persisted sidecars, not chat memory.
```

**Skill stale wording to replace** from [skills/opsx/SKILL.md](/Users/xubo/x-skills/openspec/skills/opsx/SKILL.md:130) lines 130-139:
```markdown
## Guardrails

- Ask concise clarification questions when missing scope can materially change behavior.
- Keep `status` and `resume` strictly read-only; do not mutate `.opsx/active.yaml`, `state.yaml`, `context.md`, or `drift.md` from those routes.
- When artifact hash drift is detected, warn and reload from disk first; refresh stored hashes only after accepted checkpoint/state writes.
- Treat `allowedPaths` / `forbiddenPaths` as warnings during Phase 4. Do not hard-block `verify` or `archive` yet.
- `task checkpoint` uses `rules.tdd.mode`; required groups must expose `RED` and `VERIFY`, `REFACTOR` stays optional, and exempt groups must include visible `TDD Exemption:` reasons.
- Hard enforcement for `verify` / `archive` path and drift gates is deferred to Phase 7.
- Do not skip dependency checks silently.
- Do not archive incomplete changes unless the user explicitly accepts the risk.
```

**English playbook sections to update** from [skills/opsx/references/action-playbooks.md](/Users/xubo/x-skills/openspec/skills/opsx/references/action-playbooks.md:89) lines 89-120:
```markdown
## batch-apply

- Confirm the target set and execution order before mutating files.
- Apply only changes that are actually ready to execute.
- If no ready changes are found, stop and recommend the platform-specific `status` route: Codex `$opsx-status`, Claude/Gemini `/opsx-status`.
- Do not auto-create missing state, do not fabricate ready tasks, and do not skip checkpoint requirements.

## verify

- Check completeness, correctness, and coherence.
- Report `CRITICAL`, `WARNING`, and `SUGGESTION` items.
- In Phase 4, drift and path-boundary findings remain warnings. Hard verify/archive gates begin in Phase 7.

## sync

- Merge delta specs into `.opsx/specs/`.
- Preserve unrelated content.
- Report conflicts.

## archive

- Confirm task completion state.
- Sync specs when needed.
- Move the change to archive.
- In Phase 4, do not treat `allowedPaths` / `forbiddenPaths` drift as an automatic hard block here; that hard gate is deferred to Phase 7.
```

**Chinese playbook mirror** from [skills/opsx/references/action-playbooks-zh.md](/Users/xubo/x-skills/openspec/skills/opsx/references/action-playbooks-zh.md:89) lines 89-120:
```markdown
## batch-apply

- 执行前先确认目标变更集合与执行顺序。
- 仅对真实 READY 的 changes 执行批量 apply。
- 若未找到 READY changes，立即停止并建议对应平台的 `status` 路由：Codex `$opsx-status`，Claude/Gemini `/opsx-status`。
- 不要 auto-create 缺失状态，不要伪造 READY 任务，也不要跳过 checkpoint 要求。

## verify

- 从 Completeness、Correctness、Coherence 三个维度检查。
- 输出 `CRITICAL`、`WARNING`、`SUGGESTION`。
- Phase 4 里 drift 与路径边界问题先按告警处理；verify/archive 的硬门禁从 Phase 7 开始。

## sync

- 将 delta specs 合并进 `.opsx/specs/`。
- 保留无关内容不变。
- 输出冲突点。

## archive

- 确认任务完成状态。
- 需要时先做 spec sync。
- 将 change 移入 archive。
- Phase 4 不要把 `allowedPaths` / `forbiddenPaths` 的 drift 直接当成 archive 硬阻塞；该硬门禁延后到 Phase 7。
```

**Planner guidance:** Replace all "deferred to Phase 7" and incomplete-archive escape hatch wording. Keep route labels platform-specific when mentioning Codex `$opsx-*`; if a shared line mentions `$opsx-*`, include Claude/Gemini `/opsx-*` on the same line.

---

### `package.json` and `package-lock.json` (dependency config)

**Analog:** existing `yaml` dependency entries

**Package dependency pattern** from [package.json](/Users/xubo/x-skills/openspec/package.json:12) lines 12-14:
```json
"dependencies": {
  "yaml": "2.8.3"
}
```

**Lockfile root dependency pattern** from [package-lock.json](/Users/xubo/x-skills/openspec/package-lock.json:6) lines 6-25:
```json
"packages": {
  "": {
    "name": "@xenonbyte/opsx",
    "version": "3.0.0",
    "hasInstallScript": true,
    "license": "MIT",
    "os": [
      "darwin",
      "linux"
    ],
    "dependencies": {
      "yaml": "2.8.3"
    },
    "engines": {
      "node": ">=14.14.0"
    }
  }
}
```

**Planner guidance:** If path glob semantics are kept, add `picomatch` to both files through package tooling. Do not rely on `path.matchesGlob()` because the package engine floor is Node `>=14.14.0`.

---

### Generated route outputs: 15 checked-in files

**Analog:** `lib/generator.js`, `templates/commands/action.md.tmpl`, parity tests

**Files in scope:**
- `commands/claude/opsx/verify.md`
- `commands/claude/opsx/sync.md`
- `commands/claude/opsx/archive.md`
- `commands/claude/opsx/batch-apply.md`
- `commands/claude/opsx/bulk-archive.md`
- `commands/codex/prompts/opsx-verify.md`
- `commands/codex/prompts/opsx-sync.md`
- `commands/codex/prompts/opsx-archive.md`
- `commands/codex/prompts/opsx-batch-apply.md`
- `commands/codex/prompts/opsx-bulk-archive.md`
- `commands/gemini/opsx/verify.toml`
- `commands/gemini/opsx/sync.toml`
- `commands/gemini/opsx/archive.toml`
- `commands/gemini/opsx/batch-apply.toml`
- `commands/gemini/opsx/bulk-archive.toml`

**Route path mapping pattern** from [scripts/test-workflow-runtime.js](/Users/xubo/x-skills/openspec/scripts/test-workflow-runtime.js:95) lines 95-113:
```javascript
const PLATFORM_BUNDLE_TARGETS = Object.freeze({
  claude: Object.freeze({
    checkedInRoot: path.join(REPO_ROOT, 'commands', 'claude'),
    entryPath: 'opsx.md',
    actionPath: (actionId) => `opsx/${actionId}.md`,
    isTrackedBundlePath: (relativePath) => relativePath === 'opsx.md' || relativePath.startsWith('opsx/')
  }),
  codex: Object.freeze({
    checkedInRoot: path.join(REPO_ROOT, 'commands', 'codex'),
    entryPath: 'prompts/opsx.md',
    actionPath: (actionId) => `prompts/opsx-${actionId}.md`,
    isTrackedBundlePath: (relativePath) => relativePath === 'prompts/opsx.md' || relativePath.startsWith('prompts/opsx-')
  }),
  gemini: Object.freeze({
    checkedInRoot: path.join(REPO_ROOT, 'commands', 'gemini'),
    entryPath: 'opsx.toml',
    actionPath: (actionId) => `opsx/${actionId}.toml`,
    isTrackedBundlePath: (relativePath) => relativePath === 'opsx.toml' || relativePath.startsWith('opsx/')
  })
});
```

**Planner guidance:** Treat generated route files as mechanical output. The implementation plan should update source-of-truth first, regenerate these 15 files, then add assertions that source output and checked-in output mention hard verify/archive gates, safe sync, internal archive sync, per-change isolation, skipped reasons, and no old "deferred to Phase 7" wording.

## Shared Patterns

### PASS/WARN/BLOCK Findings

**Source:** [lib/workflow.js](/Users/xubo/x-skills/openspec/lib/workflow.js:939)
**Apply to:** `verify`, `sync`, `archive`, batch reports, runtime prompt payloads

Use canonical `PASS`, `WARN`, `BLOCK`, `findings`, `patchTargets`, and `nextStep` fields. Reuse this shape even for new gate modules that are not formal schema checkpoints.

### Lifecycle Mutations

**Source:** [lib/change-state.js](/Users/xubo/x-skills/openspec/lib/change-state.js:31), [lib/change-store.js](/Users/xubo/x-skills/openspec/lib/change-store.js:365)
**Apply to:** `verify`, `sync`, `archive`

Accepted writes should use `MUTATION_EVENTS.VERIFY_ACCEPTED`, `MUTATION_EVENTS.SYNC_ACCEPTED`, and `MUTATION_EVENTS.ARCHIVE_ACCEPTED`, then persist with `writeChangeState()`. Do not assign `stage` manually.

### Artifact Hash Drift

**Source:** [lib/change-artifacts.js](/Users/xubo/x-skills/openspec/lib/change-artifacts.js:29), [lib/runtime-guidance.js](/Users/xubo/x-skills/openspec/lib/runtime-guidance.js:633)
**Apply to:** `verify`, `archive`, read-only status/resume parity

Recompute current artifact hashes and compare to persisted hashes before accepted gate mutations. Read-only routes warn and reload; verify/archive should convert unresolved drift to gate findings.

### Drift Ledger Headings

**Source:** [lib/change-capsule.js](/Users/xubo/x-skills/openspec/lib/change-capsule.js:5), [lib/change-capsule.js](/Users/xubo/x-skills/openspec/lib/change-capsule.js:254)
**Apply to:** `verify`, `archive`, execution evidence checks

Stable sections are `New Assumptions`, `Scope Changes`, `Out-of-Bound File Changes`, `Discovered Requirements`, and `User Approval Needed`. Phase 7 should treat unresolved `User Approval Needed`, scope changes, discovered requirements, and forbidden paths as hard gate inputs.

### Atomic File Writes

**Source:** [lib/fs-utils.js](/Users/xubo/x-skills/openspec/lib/fs-utils.js:13)
**Apply to:** `sync`, `archive`, state/spec writes

Use `writeTextAtomic()` for `.opsx/specs/**` and state writes. Archive moves should also validate source/target roots before renaming.

### Generated Prompt Parity

**Source:** [lib/generator.js](/Users/xubo/x-skills/openspec/lib/generator.js:118), [scripts/test-workflow-runtime.js](/Users/xubo/x-skills/openspec/scripts/test-workflow-runtime.js:3544)
**Apply to:** all generated route outputs

All generated command files must match `buildPlatformBundle()`. Add Phase 7 wording assertions in the existing parity block rather than creating a separate test harness.

## No Exact Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `lib/path-scope.js` or equivalent | utility | transform/path matching | Existing code has path safety and template path matching, but no Node 14 compatible glob matcher for `lib/**` / `*.pem`. Use partial analogs and research recommendation. |

## Metadata

**Analog search scope:** `lib/`, `scripts/`, `skills/opsx/`, `templates/commands/`, `commands/{claude,codex,gemini}/`, `package.json`, `package-lock.json`
**Required files read:** `AGENTS.md`, `CONTINUITY.md`, `07-CONTEXT.md`, `07-RESEARCH.md`, `07-VALIDATION.md`, required `lib/*`, `scripts/test-workflow-runtime.js`, `skills/opsx/*`, and `templates/commands/action.md.tmpl`
**Project instructions checked:** `AGENTS.md`; no `CLAUDE.md`, `.claude/skills/`, or `.agents/skills/` found in repo root
**Pattern extraction date:** 2026-04-28
