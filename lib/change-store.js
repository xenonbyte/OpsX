const fs = require('fs');
const path = require('path');
const YAML = require('yaml');
const { ensureDir, writeTextAtomic } = require('./fs-utils');
const { hashTrackedArtifacts } = require('./change-artifacts');
const { renderContextCapsule, appendDriftLedger } = require('./change-capsule');

const DEFAULT_STAGE = 'INIT';
const DEFAULT_NEXT_ACTION = 'Create proposal.md for this change.';

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
  task: Object.freeze({ status: 'PENDING', updatedAt: null }),
  execution: Object.freeze({ status: 'PENDING', updatedAt: null })
});

function ensureWithinBase(basePath, targetPath, errorCode) {
  const resolvedBase = path.resolve(basePath);
  const resolvedTarget = path.resolve(targetPath);
  const relativePath = path.relative(resolvedBase, resolvedTarget);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new Error(`Refusing to use path outside ${errorCode} root: ${targetPath}`);
  }
}

function toNonEmptyString(value) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function normalizeStringArray(value) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => String(entry || '').trim())
      .filter((entry) => entry.length > 0);
  }
  const single = String(value || '').trim();
  return single ? [single] : [];
}

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
    task: Object.assign({}, DEFAULT_CHECKPOINTS.task),
    execution: Object.assign({}, DEFAULT_CHECKPOINTS.execution)
  };
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

function parseYamlFile(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
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
    updatedAt: new Date().toISOString()
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
      spec: normalizeCheckpoint(checkpoints.spec, base.checkpoints.spec),
      task: normalizeCheckpoint(checkpoints.task, base.checkpoints.task),
      execution: normalizeCheckpoint(checkpoints.execution, base.checkpoints.execution)
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

function writeActiveChangePointer(repoRoot, activeChange) {
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

function getChangeContextPath(changeDir) {
  return path.join(path.resolve(changeDir), 'context.md');
}

function getChangeDriftPath(changeDir) {
  return path.join(path.resolve(changeDir), 'drift.md');
}

function recordCheckpointResult(changeDir, checkpointId, result, currentHashes) {
  const checkpointKey = toNonEmptyString(checkpointId);
  if (!checkpointKey) {
    throw new Error('checkpointId is required.');
  }

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

  return writeChangeState(changeDir, nextState);
}

function setActiveTaskGroup(changeDir, taskGroupTitle, nextTaskGroupTitle) {
  const state = loadChangeState(changeDir);
  const nextState = Object.assign({}, state, {
    active: Object.assign({}, state.active, {
      taskGroup: normalizeTaskGroupTitle(taskGroupTitle),
      nextTaskGroup: normalizeTaskGroupTitle(nextTaskGroupTitle)
    })
  });
  return writeChangeState(changeDir, nextState);
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

  if (Array.isArray(payload.driftEntries)) {
    payload.driftEntries.forEach((entry) => entries.push(entry));
  }

  return entries;
}

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
  const checkpointStatus = toNonEmptyString(payload.checkpointStatus) || 'PENDING';
  const verificationEntry = {
    at: timestamp,
    taskGroup: completedTaskGroup,
    verificationCommand: toNonEmptyString(payload.verificationCommand) || 'UNCONFIRMED',
    verificationResult: toNonEmptyString(payload.verificationResult) || 'UNCONFIRMED',
    changedFiles,
    checkpointStatus
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
    accepted: checkpointStatus !== 'BLOCK' && checkpointStatus !== 'FAILED',
    taskGroup: completedTaskGroup,
    verificationCommand: verificationEntry.verificationCommand,
    verificationResult: verificationEntry.verificationResult,
    changedFiles: verificationEntry.changedFiles
  };
  const refreshedHashes = hashTrackedArtifacts(resolvedChangeDir);
  const checkpointed = recordCheckpointResult(
    resolvedChangeDir,
    'execution',
    checkpointResult,
    refreshedHashes
  );

  const persistedState = writeChangeState(resolvedChangeDir, Object.assign({}, checkpointed, {
    active: Object.assign({}, checkpointed.active, {
      taskGroup: nextTaskGroup,
      nextTaskGroup: nextTaskGroup
    }),
    checkpoints: Object.assign({}, checkpointed.checkpoints, {
      execution: Object.assign({}, checkpointed.checkpoints && checkpointed.checkpoints.execution ? checkpointed.checkpoints.execution : {}, {
        status: checkpointStatus,
        updatedAt: timestamp
      })
    }),
    verificationLog: [...normalizeAnyArray(checkpointed.verificationLog), verificationEntry],
    hashes: normalizeHashMap(refreshedHashes),
    warnings: nextWarnings,
    allowedPaths: allowedPaths.length ? allowedPaths : checkpointed.allowedPaths,
    forbiddenPaths: forbiddenPaths.length ? forbiddenPaths : checkpointed.forbiddenPaths
  }));

  const contextPath = getChangeContextPath(resolvedChangeDir);
  ensureWithinBase(resolvedChangeDir, contextPath, 'change');
  const contextText = renderContextCapsule(persistedState, {
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
