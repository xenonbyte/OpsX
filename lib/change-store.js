const fs = require('fs');
const path = require('path');
const YAML = require('yaml');
const { ensureDir, writeTextAtomic } = require('./fs-utils');

const DEFAULT_STAGE = 'INIT';
const DEFAULT_NEXT_ACTION = 'Create proposal.md for this change.';

const DEFAULT_ARTIFACTS = Object.freeze({
  proposal: 'proposal.md',
  specs: 'specs',
  design: 'design.md',
  securityReview: 'security-review.md',
  tasks: 'tasks.md'
});

const DEFAULT_HASHES = Object.freeze({
  proposal: '',
  specs: '',
  design: '',
  securityReview: '',
  tasks: ''
});

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
    stage: toNonEmptyString(input.stage) || DEFAULT_STAGE,
    nextAction: toNonEmptyString(input.nextAction) || DEFAULT_NEXT_ACTION,
    artifacts: Object.assign({}, base.artifacts, input.artifacts && typeof input.artifacts === 'object' && !Array.isArray(input.artifacts) ? input.artifacts : {}),
    hashes: Object.assign({}, base.hashes, input.hashes && typeof input.hashes === 'object' && !Array.isArray(input.hashes) ? input.hashes : {}),
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

module.exports = {
  buildChangeStateSkeleton,
  normalizeChangeState,
  loadActiveChangePointer,
  writeActiveChangePointer,
  loadChangeState,
  writeChangeState
};
