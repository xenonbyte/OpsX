const fs = require('fs');
const path = require('path');
const YAML = require('yaml');
const { ensureDir, readTextIfFile, writeTextAtomic } = require('./fs-utils');
const { hashTrackedArtifacts } = require('./change-artifacts');
const { renderContextCapsule, appendDriftLedger } = require('./change-capsule');
const { MUTATION_EVENTS, applyMutationEvent } = require('./change-state');
const { createLogger } = require('./logger');
const { ensureWithinBase } = require('./path-utils');
const {
  toNonEmptyString,
  normalizeStringArray
} = require('./string-utils');
const { listSpecFiles } = require('./spec-files');

const DEFAULT_STAGE = 'INIT';
const DEFAULT_NEXT_ACTION = 'continue';

const LEGACY_STAGE_TO_LIFECYCLE = Object.freeze({
  proposal: 'PROPOSAL_READY',
  specs: 'SPECS_READY',
  design: 'DESIGN_READY',
  tasks: 'TASKS_READY',
  metadata: 'INIT',
  bootstrap: 'INIT'
});

const LIFECYCLE_STAGES = new Set([
  'INIT',
  'PROPOSAL_READY',
  'SPECS_READY',
  'SPEC_SPLIT_REVIEWED',
  'DESIGN_READY',
  'SECURITY_REVIEW_REQUIRED',
  'SECURITY_REVIEWED',
  'SPEC_REVIEWED',
  'TASKS_READY',
  'APPLYING_GROUP',
  'GROUP_VERIFIED',
  'IMPLEMENTED',
  'VERIFIED',
  'SYNCED',
  'ARCHIVED',
  'BLOCKED'
]);

const DEFAULT_ARTIFACTS = Object.freeze({
  proposal: 'proposal.md',
  specs: 'specs',
  design: 'design.md',
  securityReview: 'security-review.md',
  tasks: 'tasks.md'
});

const DEFAULT_HASHES = Object.freeze({});

const DEFAULT_CHECKPOINTS = Object.freeze({
  spec: Object.freeze({ status: 'PENDING', updatedAt: null }),
  specSplit: Object.freeze({ status: 'PENDING', updatedAt: null }),
  task: Object.freeze({ status: 'PENDING', updatedAt: null }),
  execution: Object.freeze({ status: 'PENDING', updatedAt: null }),
  implementationConsistency: Object.freeze({ status: 'PENDING', updatedAt: null })
});

const CHECKPOINT_SLOT_ALIASES = Object.freeze({
  spec: Object.freeze(['spec', 'spec-checkpoint']),
  specSplit: Object.freeze(['specSplit', 'spec-split', 'spec-split-checkpoint']),
  task: Object.freeze(['task', 'task-checkpoint']),
  execution: Object.freeze(['execution', 'execution-checkpoint']),
  implementationConsistency: Object.freeze([
    'implementationConsistency',
    'implementation-consistency',
    'implementation-consistency-checkpoint'
  ])
});

const CHECKPOINT_ALIAS_TO_SLOT = Object.freeze(
  Object.entries(CHECKPOINT_SLOT_ALIASES).reduce((output, [slot, aliases]) => {
    aliases.forEach((alias) => {
      output[alias] = slot;
    });
    return output;
  }, {})
);

function normalizeAnyArray(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  const single = String(value).trim();
  return single ? [single] : [];
}

function normalizeHashMap(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.entries(value).reduce((output, [key, entry]) => {
    const normalizedKey = toNonEmptyString(key).replace(/\\/g, '/');
    const normalizedValue = toNonEmptyString(entry);
    if (!normalizedKey) return output;
    output[normalizedKey] = normalizedValue;
    return output;
  }, {});
}

function normalizeLifecycleStage(value) {
  const normalized = toNonEmptyString(value);
  if (!normalized) return DEFAULT_STAGE;
  if (LEGACY_STAGE_TO_LIFECYCLE[normalized.toLowerCase()]) {
    return LEGACY_STAGE_TO_LIFECYCLE[normalized.toLowerCase()];
  }
  return LIFECYCLE_STAGES.has(normalized) ? normalized : DEFAULT_STAGE;
}

function normalizeCheckpoint(rawValue, fallback) {
  if (!rawValue || typeof rawValue !== 'object' || Array.isArray(rawValue)) {
    if (typeof rawValue === 'string' && rawValue.trim()) {
      return {
        status: rawValue.trim(),
        updatedAt: null
      };
    }
    return {
      status: fallback.status,
      updatedAt: fallback.updatedAt
    };
  }

  return Object.assign({}, rawValue, {
    status: toNonEmptyString(rawValue.status) || fallback.status,
    updatedAt: toNonEmptyString(rawValue.updatedAt) || fallback.updatedAt
  });
}

function normalizeCheckpointResult(result) {
  if (typeof result === 'string') {
    return {
      status: toNonEmptyString(result) || 'PENDING',
      accepted: false,
      details: {}
    };
  }
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    return {
      status: 'PENDING',
      accepted: false,
      details: {}
    };
  }

  const status = toNonEmptyString(result.status || result.result) || 'PENDING';
  const details = Object.assign({}, result);
  return {
    status,
    accepted: result.accepted === true,
    details
  };
}

function isAcceptedCheckpointResult(normalizedResult) {
  if (!normalizedResult || typeof normalizedResult !== 'object') return false;
  if (normalizedResult.accepted === true) return true;
  const status = toNonEmptyString(normalizedResult.status).toUpperCase();
  if (!status) return false;
  if (['BLOCK', 'FAIL', 'FAILED', 'ERROR', 'REJECTED'].includes(status)) return false;
  return ['PASS', 'WARN', 'OK', 'DONE', 'ACCEPTED'].includes(status);
}

function normalizeTaskGroupTitle(value) {
  const normalized = toNonEmptyString(value);
  return normalized || null;
}

function normalizeChangedFiles(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => toNonEmptyString(entry))
    .filter(Boolean);
}

function normalizeCompletedSteps(value) {
  return normalizeStringArray(value)
    .map((entry) => {
      const match = entry.match(/^(RED|GREEN|REFACTOR|VERIFY)\b/i);
      return match ? match[1].toUpperCase() : '';
    })
    .filter(Boolean);
}

function normalizeMigration(value, legacyMigrated) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return {
    migrated: source.migrated === true || legacyMigrated === true,
    checkpointRefreshRequired: source.checkpointRefreshRequired === true,
    source: toNonEmptyString(source.source),
    migratedAt: toNonEmptyString(source.migratedAt) || null
  };
}

function resolveTimestamp(value) {
  const candidate = toNonEmptyString(value);
  if (!candidate) return new Date().toISOString();
  const parsed = new Date(candidate);
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString();
  return parsed.toISOString();
}

function createDefaultCheckpoints() {
  return {
    spec: Object.assign({}, DEFAULT_CHECKPOINTS.spec),
    specSplit: Object.assign({}, DEFAULT_CHECKPOINTS.specSplit),
    task: Object.assign({}, DEFAULT_CHECKPOINTS.task),
    execution: Object.assign({}, DEFAULT_CHECKPOINTS.execution),
    implementationConsistency: Object.assign({}, DEFAULT_CHECKPOINTS.implementationConsistency)
  };
}

function resolveCheckpointSourceValue(checkpoints, slot) {
  const aliases = CHECKPOINT_SLOT_ALIASES[slot] || [slot];
  for (const alias of aliases) {
    if (Object.prototype.hasOwnProperty.call(checkpoints, alias)) {
      return checkpoints[alias];
    }
  }
  return undefined;
}

function normalizeActivePointer(raw) {
  const version = Number(raw && raw.version);
  return {
    version: Number.isFinite(version) && version > 0 ? version : 1,
    activeChange: toNonEmptyString(raw && raw.activeChange),
    updatedAt: toNonEmptyString(raw && raw.updatedAt) || null
  };
}

function withTrailingNewline(text) {
  return text.endsWith('\n') ? text : `${text}\n`;
}

function resolveLogger(options = {}) {
  const source = options && typeof options === 'object' && !Array.isArray(options) ? options : {};
  if (source.logger && typeof source.logger === 'object') {
    return source.logger;
  }
  return createLogger(source);
}

function logChangeStore(options, level, event, fields = {}) {
  const logger = resolveLogger(options);
  const write = logger && typeof logger[level] === 'function' ? logger[level] : null;
  if (write) write.call(logger, event, fields);
}

function parseYamlFile(filePath) {
  const text = readTextIfFile(filePath, '');
  if (!text) return {};
  const parsed = YAML.parse(text);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {};
  }
  return parsed;
}

function buildChangeStateSkeleton(changeName, changeDir) {
  const resolvedDir = path.resolve(changeDir || process.cwd());
  const fallbackName = path.basename(resolvedDir);
  const normalizedName = toNonEmptyString(changeName) || fallbackName;

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
    sync: {
      acceptedAt: '',
      canonicalOutputs: [],
      writesApplied: 0
    },
    migration: normalizeMigration(null, false),
    updatedAt: new Date().toISOString()
  };
}

function normalizeSyncState(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const writesApplied = Number(source.writesApplied);
  return {
    acceptedAt: toNonEmptyString(source.acceptedAt),
    canonicalOutputs: normalizeStringArray(source.canonicalOutputs),
    writesApplied: Number.isFinite(writesApplied) && writesApplied >= 0 ? writesApplied : 0
  };
}

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
  const active = input.active && typeof input.active === 'object' && !Array.isArray(input.active)
    ? input.active
    : {};
  const version = Number(input.version);

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
      execution: normalizeCheckpoint(resolveCheckpointSourceValue(checkpoints, 'execution'), base.checkpoints.execution),
      implementationConsistency: normalizeCheckpoint(
        resolveCheckpointSourceValue(checkpoints, 'implementationConsistency'),
        base.checkpoints.implementationConsistency
      )
    },
    active: Object.assign({}, active, {
      taskGroup: Object.prototype.hasOwnProperty.call(active, 'taskGroup') ? active.taskGroup : null,
      nextTaskGroup: Object.prototype.hasOwnProperty.call(active, 'nextTaskGroup') ? active.nextTaskGroup : null
    }),
    verificationLog: normalizeAnyArray(input.verificationLog),
    blockers: normalizeStringArray(input.blockers),
    warnings: normalizeStringArray(input.warnings),
    allowedPaths: normalizeStringArray(input.allowedPaths),
    forbiddenPaths: normalizeStringArray(input.forbiddenPaths),
    sync: normalizeSyncState(input.sync),
    migration: normalizeMigration(input.migration, input.migrated === true),
    updatedAt: toNonEmptyString(input.updatedAt) || now
  };
}

function getActivePointerPath(repoRoot) {
  return path.join(path.resolve(repoRoot), '.opsx', 'active.yaml');
}

function getChangeStatePath(changeDir) {
  return path.join(path.resolve(changeDir), 'state.yaml');
}

function loadActiveChangePointer(repoRoot) {
  const activePath = getActivePointerPath(repoRoot);
  const projectRoot = path.join(path.resolve(repoRoot), '.opsx');
  ensureWithinBase(projectRoot, activePath, '.opsx project');

  if (!fs.existsSync(activePath)) {
    return normalizeActivePointer({});
  }

  return normalizeActivePointer(parseYamlFile(activePath));
}

function writeActiveChangePointer(repoRoot, activeChange, options = {}) {
  const activePath = getActivePointerPath(repoRoot);
  const projectRoot = path.join(path.resolve(repoRoot), '.opsx');
  ensureWithinBase(projectRoot, activePath, '.opsx project');
  ensureDir(path.dirname(activePath));

  const payload = normalizeActivePointer({
    version: 1,
    activeChange,
    updatedAt: new Date().toISOString()
  });
  writeTextAtomic(activePath, withTrailingNewline(YAML.stringify(payload)));
  logChangeStore(options, 'info', 'active-change.write', {
    repoRoot: path.resolve(repoRoot),
    activeChange: payload.activeChange || null,
    path: activePath
  });
  return payload;
}

function loadChangeState(changeDir) {
  const resolvedChangeDir = path.resolve(changeDir);
  const statePath = getChangeStatePath(resolvedChangeDir);
  ensureWithinBase(resolvedChangeDir, statePath, 'change');

  if (!fs.existsSync(statePath)) {
    return buildChangeStateSkeleton(path.basename(resolvedChangeDir), resolvedChangeDir);
  }

  const parsed = parseYamlFile(statePath);
  return normalizeChangeState(parsed, {
    changeName: path.basename(resolvedChangeDir),
    changeDir: resolvedChangeDir
  });
}

function writeChangeState(changeDir, state, options = {}) {
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
  logChangeStore(options, 'info', 'change-state.write', {
    change: payload.change,
    stage: payload.stage,
    nextAction: payload.nextAction,
    path: statePath
  });
  return payload;
}

function getChangeContextPath(changeDir) {
  return path.join(path.resolve(changeDir), 'context.md');
}

function getChangeDriftPath(changeDir) {
  return path.join(path.resolve(changeDir), 'drift.md');
}

function readOptionalText(filePath) {
  return readTextIfFile(filePath);
}

function collectSpecText(specsDir) {
  return listSpecFiles(specsDir)
    .map((filePath) => fs.readFileSync(filePath, 'utf8'))
    .join('\n\n');
}

function loadContextSources(changeDir) {
  const resolvedChangeDir = path.resolve(changeDir);
  return {
    proposal: readOptionalText(path.join(resolvedChangeDir, 'proposal.md')),
    specs: collectSpecText(path.join(resolvedChangeDir, 'specs')),
    design: readOptionalText(path.join(resolvedChangeDir, 'design.md')),
    tasks: readOptionalText(path.join(resolvedChangeDir, 'tasks.md'))
  };
}

function recordCheckpointResult(changeDir, checkpointId, result, currentHashes, options = {}) {
  const rawCheckpointKey = toNonEmptyString(checkpointId);
  if (!rawCheckpointKey) {
    throw new Error('checkpointId is required.');
  }
  const checkpointKey = CHECKPOINT_ALIAS_TO_SLOT[rawCheckpointKey] || rawCheckpointKey;

  const normalizedResult = normalizeCheckpointResult(result);
  const now = new Date().toISOString();
  const state = loadChangeState(changeDir);
  const checkpointPayload = {
    status: normalizedResult.status || 'PENDING',
    updatedAt: now
  };
  if (Object.keys(normalizedResult.details).length) {
    checkpointPayload.result = normalizedResult.details;
  }

  const nextState = Object.assign({}, state, {
    checkpoints: Object.assign({}, state.checkpoints, {
      [checkpointKey]: checkpointPayload
    })
  });

  if (isAcceptedCheckpointResult(normalizedResult)) {
    const hashes = normalizeHashMap(currentHashes || hashTrackedArtifacts(changeDir));
    nextState.hashes = hashes;
  }

  const persisted = writeChangeState(changeDir, nextState, options);
  logChangeStore(options, 'info', 'checkpoint.record', {
    change: persisted.change,
    checkpoint: checkpointKey,
    status: checkpointPayload.status,
    accepted: isAcceptedCheckpointResult(normalizedResult)
  });
  return persisted;
}

function setActiveTaskGroup(changeDir, taskGroupTitle, nextTaskGroupTitle, options = {}) {
  const state = loadChangeState(changeDir);
  const nextState = Object.assign({}, state, {
    active: Object.assign({}, state.active, {
      taskGroup: normalizeTaskGroupTitle(taskGroupTitle),
      nextTaskGroup: normalizeTaskGroupTitle(nextTaskGroupTitle)
    })
  });
  const persisted = writeChangeState(changeDir, nextState, options);
  logChangeStore(options, 'info', 'task-group.active-set', {
    change: persisted.change,
    taskGroup: persisted.active.taskGroup,
    nextTaskGroup: persisted.active.nextTaskGroup
  });
  return persisted;
}

function buildDriftEntriesFromExecutionPayload(payload = {}, timestamp) {
  const entries = [];
  const hashWarnings = normalizeStringArray(payload.hashDriftWarnings);
  hashWarnings.forEach((warning) => {
    entries.push({
      section: 'scopeChanges',
      text: warning,
      at: timestamp
    });
  });

  const allowedPaths = normalizeStringArray(payload.allowedPaths);
  if (allowedPaths.length) {
    entries.push({
      section: 'newAssumptions',
      text: `Allowed path scope recorded: ${allowedPaths.join(', ')}`,
      at: timestamp
    });
  }

  const forbiddenPaths = normalizeStringArray(payload.forbiddenPaths);
  forbiddenPaths.forEach((forbiddenPath) => {
    entries.push({
      section: 'outOfBoundFileChanges',
      text: `Forbidden path warning: ${forbiddenPath}`,
      at: timestamp
    });
  });

  const driftSummary = toNonEmptyString(payload.driftSummary);
  if (driftSummary) {
    entries.push({
      section: 'scopeChanges',
      text: driftSummary,
      at: timestamp
    });
  }

  if (Array.isArray(payload.driftEntries)) {
    payload.driftEntries.forEach((entry) => entries.push(entry));
  }

  return entries;
}

function recordTaskGroupExecution(changeDir, payload = {}) {
  const resolvedChangeDir = path.resolve(changeDir);
  const timestamp = resolveTimestamp(payload.at);
  const state = loadChangeState(resolvedChangeDir);
  const queuedTaskGroup = normalizeTaskGroupTitle(state.active && state.active.nextTaskGroup);
  const executionTaskGroup = normalizeTaskGroupTitle(payload.taskGroup)
    || normalizeTaskGroupTitle(state.active && state.active.taskGroup)
    || (state.stage === 'GROUP_VERIFIED' ? queuedTaskGroup : '');
  const verificationTaskGroup = executionTaskGroup || 'Unknown task group';
  const nextTaskGroup = Object.prototype.hasOwnProperty.call(payload, 'nextTaskGroup')
    ? normalizeTaskGroupTitle(payload.nextTaskGroup)
    : (state.stage === 'GROUP_VERIFIED' ? null : queuedTaskGroup);
  const changedFiles = normalizeChangedFiles(payload.changedFiles);
  const completedSteps = normalizeCompletedSteps(payload.completedSteps);
  const diffSummary = toNonEmptyString(payload.diffSummary);
  const driftStatus = toNonEmptyString(payload.driftStatus);
  const checkpointStatus = (toNonEmptyString(payload.checkpointStatus) || 'PENDING').toUpperCase();
  const acceptedCheckpoint = isAcceptedCheckpointResult({ status: checkpointStatus });
  const verificationEntry = {
    at: timestamp,
    taskGroup: verificationTaskGroup,
    verificationCommand: toNonEmptyString(payload.verificationCommand) || 'UNCONFIRMED',
    verificationResult: toNonEmptyString(payload.verificationResult) || 'UNCONFIRMED',
    changedFiles,
    checkpointStatus,
    completedSteps,
    diffSummary,
    driftStatus
  };

  const hashDriftWarnings = normalizeStringArray(payload.hashDriftWarnings);
  const allowedPaths = normalizeStringArray(payload.allowedPaths);
  const forbiddenPaths = normalizeStringArray(payload.forbiddenPaths);

  const existingWarnings = normalizeStringArray(state.warnings);
  const pathWarnings = [];
  if (allowedPaths.length) {
    pathWarnings.push(`Allowed path scope recorded: ${allowedPaths.join(', ')}`);
  }
  forbiddenPaths.forEach((entry) => {
    pathWarnings.push(`Forbidden path warning: ${entry}`);
  });
  const nextWarnings = Array.from(new Set([
    ...existingWarnings,
    ...hashDriftWarnings,
    ...pathWarnings
  ]));

  const checkpointResult = {
    status: checkpointStatus,
    accepted: acceptedCheckpoint,
    taskGroup: verificationTaskGroup,
    verificationCommand: verificationEntry.verificationCommand,
    verificationResult: verificationEntry.verificationResult,
    changedFiles: verificationEntry.changedFiles,
    completedSteps: verificationEntry.completedSteps,
    diffSummary: verificationEntry.diffSummary,
    driftStatus: verificationEntry.driftStatus
  };
  const refreshedHashes = hashTrackedArtifacts(resolvedChangeDir);
  const checkpointed = recordCheckpointResult(
    resolvedChangeDir,
    'execution',
    checkpointResult,
    refreshedHashes,
    payload
  );
  let lifecycleState = checkpointed;
  const lifecycleBlockers = [];
  if (acceptedCheckpoint) {
    let transitionSource = checkpointed;
    if (transitionSource.stage === 'TASKS_READY' || transitionSource.stage === 'GROUP_VERIFIED') {
      if (!executionTaskGroup) {
        lifecycleBlockers.push('Execution checkpoint lifecycle start transition failed: missing task group.');
      } else {
        const startSource = transitionSource.stage === 'GROUP_VERIFIED'
          ? Object.assign({}, transitionSource, {
            active: Object.assign({}, transitionSource.active, {
              taskGroup: executionTaskGroup,
              nextTaskGroup: nextTaskGroup || null
            })
          })
          : transitionSource;
        const startTransition = applyMutationEvent(startSource, {
          type: MUTATION_EVENTS.START_TASK_GROUP,
          taskGroup: executionTaskGroup,
          nextTaskGroup
        });
        if (startTransition.status === 'OK') {
          transitionSource = Object.assign({}, startTransition.state, {
            nextAction: startTransition.nextAction
          });
        } else {
          lifecycleBlockers.push(startTransition.message || 'Execution checkpoint lifecycle start transition failed.');
        }
      }
    }

    if (!lifecycleBlockers.length) {
      const completeTransition = applyMutationEvent(transitionSource, {
        type: MUTATION_EVENTS.COMPLETE_TASK_GROUP,
        taskGroup: executionTaskGroup,
        nextTaskGroup
      });
      if (completeTransition.status === 'OK') {
        lifecycleState = Object.assign({}, completeTransition.state, {
          nextAction: completeTransition.nextAction
        });
      } else {
        lifecycleBlockers.push(completeTransition.message || 'Execution checkpoint lifecycle completion transition failed.');
      }
    }
  }

  const persistedState = writeChangeState(resolvedChangeDir, Object.assign({}, lifecycleState, {
    checkpoints: Object.assign({}, checkpointed.checkpoints, {
      execution: Object.assign({}, checkpointed.checkpoints && checkpointed.checkpoints.execution ? checkpointed.checkpoints.execution : {}, {
        status: checkpointStatus,
        updatedAt: timestamp
      })
    }),
    verificationLog: [...normalizeAnyArray(checkpointed.verificationLog), verificationEntry],
    hashes: acceptedCheckpoint ? normalizeHashMap(refreshedHashes) : checkpointed.hashes,
    warnings: nextWarnings,
    blockers: acceptedCheckpoint && !lifecycleBlockers.length
      ? lifecycleState.blockers
      : Array.from(new Set([
        ...normalizeStringArray(lifecycleState.blockers),
        ...(lifecycleBlockers.length ? lifecycleBlockers : [`Execution checkpoint blocked for ${verificationTaskGroup}`])
      ])),
    allowedPaths: allowedPaths.length ? allowedPaths : checkpointed.allowedPaths,
    forbiddenPaths: forbiddenPaths.length ? forbiddenPaths : checkpointed.forbiddenPaths
  }), payload);

  logChangeStore(payload, 'info', 'task-group.execution.record', {
    change: persistedState.change,
    taskGroup: verificationTaskGroup,
    checkpointStatus,
    accepted: acceptedCheckpoint,
    stage: persistedState.stage,
    blockers: normalizeStringArray(persistedState.blockers).length
  });

  const contextPath = getChangeContextPath(resolvedChangeDir);
  ensureWithinBase(resolvedChangeDir, contextPath, 'change');
  const contextText = renderContextCapsule(persistedState, {
    sources: loadContextSources(resolvedChangeDir),
    hashStatus: hashDriftWarnings.length ? 'drift warning' : 'up-to-date',
    hashDriftWarnings
  });
  writeTextAtomic(contextPath, contextText);

  const driftPath = getChangeDriftPath(resolvedChangeDir);
  ensureWithinBase(resolvedChangeDir, driftPath, 'change');
  const driftEntries = buildDriftEntriesFromExecutionPayload(payload, timestamp);
  if (driftEntries.length) {
    appendDriftLedger(driftPath, driftEntries);
  } else if (!fs.existsSync(driftPath)) {
    appendDriftLedger(driftPath, []);
  }

  return loadChangeState(resolvedChangeDir);
}

module.exports = {
  buildChangeStateSkeleton,
  normalizeChangeState,
  loadActiveChangePointer,
  writeActiveChangePointer,
  loadChangeState,
  writeChangeState,
  recordCheckpointResult,
  setActiveTaskGroup,
  recordTaskGroupExecution
};
