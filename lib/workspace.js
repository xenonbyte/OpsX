const fs = require('fs');
const path = require('path');
const YAML = require('yaml');
const { ensureDir, writeText } = require('./fs-utils');
const { DEFAULT_SCHEMA } = require('./constants');
const { stringifyYaml } = require('./yaml');
const {
  buildChangeStateSkeleton,
  writeActiveChangePointer,
  writeChangeState
} = require('./change-store');
const { hashTrackedArtifacts } = require('./change-artifacts');
const { ensureWithinBase } = require('./path-utils');

const CHANGE_NAME_PATTERN = /^[a-z0-9][a-z0-9-_]*$/i;

const LEGACY_STAGE_TO_LIFECYCLE = Object.freeze({
  proposal: 'PROPOSAL_READY',
  specs: 'SPECS_READY',
  design: 'DESIGN_READY',
  tasks: 'TASKS_READY',
  metadata: 'INIT',
  bootstrap: 'INIT'
});

const NEXT_ACTION_BY_STAGE = Object.freeze({
  INIT: 'continue',
  PROPOSAL_READY: 'continue',
  SPECS_READY: 'continue',
  SPEC_SPLIT_REVIEWED: 'continue',
  DESIGN_READY: 'continue',
  SECURITY_REVIEW_REQUIRED: 'continue',
  SECURITY_REVIEWED: 'continue',
  SPEC_REVIEWED: 'continue',
  TASKS_READY: 'apply',
  APPLYING_GROUP: 'apply',
  GROUP_VERIFIED: 'verify',
  IMPLEMENTED: 'verify',
  VERIFIED: 'sync',
  SYNCED: 'archive',
  ARCHIVED: 'status',
  BLOCKED: 'status'
});

function getCanonicalProjectRoot(repoRoot) {
  return path.join(path.resolve(repoRoot), '.opsx');
}

function getLegacyProjectRoot(repoRoot) {
  return path.join(path.resolve(repoRoot), 'openspec');
}

function getCanonicalChangesDir(repoRoot) {
  return path.join(getCanonicalProjectRoot(repoRoot), 'changes');
}

function getCanonicalActivePath(repoRoot) {
  return path.join(getCanonicalProjectRoot(repoRoot), 'active.yaml');
}

function getLegacyChangeMetadataPath(changeDir) {
  return path.join(path.resolve(changeDir), '.openspec.yaml');
}

function getCanonicalChangeMetadataPath(changeDir) {
  return path.join(path.resolve(changeDir), 'change.yaml');
}

function inferChangeStage(changeDir) {
  const resolvedChangeDir = path.resolve(changeDir);
  const tasksPath = path.join(resolvedChangeDir, 'tasks.md');
  const designPath = path.join(resolvedChangeDir, 'design.md');
  const specsPath = path.join(resolvedChangeDir, 'specs');
  const proposalPath = path.join(resolvedChangeDir, 'proposal.md');
  const metadataPath = getCanonicalChangeMetadataPath(resolvedChangeDir);
  const legacyMetadataPath = getLegacyChangeMetadataPath(resolvedChangeDir);

  if (fs.existsSync(tasksPath)) return 'tasks';
  if (fs.existsSync(designPath)) return 'design';
  if (fs.existsSync(specsPath)) return 'specs';
  if (fs.existsSync(proposalPath)) return 'proposal';
  if (fs.existsSync(metadataPath) || fs.existsSync(legacyMetadataPath)) return 'metadata';
  return 'bootstrap';
}

function normalizeInitialStage(stage) {
  const normalized = String(stage || '').trim();
  return LEGACY_STAGE_TO_LIFECYCLE[normalized.toLowerCase()] || 'INIT';
}

function buildInitialState(changeName, changeDir) {
  const resolvedChangeDir = path.resolve(changeDir);
  const stage = normalizeInitialStage(inferChangeStage(resolvedChangeDir));
  const state = Object.assign({}, buildChangeStateSkeleton(changeName, resolvedChangeDir), {
    stage,
    nextAction: NEXT_ACTION_BY_STAGE[stage] || 'proposal',
    hashes: hashTrackedArtifacts(resolvedChangeDir),
    migration: {
      migrated: true,
      checkpointRefreshRequired: true,
      source: 'openspec',
      migratedAt: new Date().toISOString()
    },
    warnings: ['migrated-change-needs-checkpoint-refresh']
  });
  return YAML.stringify(state).trimEnd();
}

function buildInitialContext(changeName, changeDir) {
  const resolvedChangeDir = path.resolve(changeDir);
  const artifacts = [];
  const metadataPath = getCanonicalChangeMetadataPath(resolvedChangeDir);
  const proposalPath = path.join(resolvedChangeDir, 'proposal.md');
  const specsPath = path.join(resolvedChangeDir, 'specs');
  const designPath = path.join(resolvedChangeDir, 'design.md');
  const tasksPath = path.join(resolvedChangeDir, 'tasks.md');

  if (fs.existsSync(metadataPath)) artifacts.push('- change.yaml');
  if (fs.existsSync(proposalPath)) artifacts.push('- proposal.md');
  if (fs.existsSync(specsPath)) artifacts.push('- specs/');
  if (fs.existsSync(designPath)) artifacts.push('- design.md');
  if (fs.existsSync(tasksPath)) artifacts.push('- tasks.md');

  if (!artifacts.length) artifacts.push('- None detected during migration.');

  return [
    '# Context',
    '',
    `Migrated change: ${String(changeName || '').trim() || path.basename(resolvedChangeDir)}`,
    '',
    '## Existing Artifacts',
    ...artifacts,
    '',
    '## Notes',
    '- Placeholder created by opsx migrate.',
    '- Requirements were not summarized automatically.'
  ].join('\n');
}

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

function buildNewChangeContext(state) {
  const blockers = Array.isArray(state.blockers) && state.blockers.length
    ? state.blockers.map((entry) => `- ${entry}`)
    : ['- None'];
  const warnings = Array.isArray(state.warnings) && state.warnings.length
    ? state.warnings.map((entry) => `- ${entry}`)
    : ['- None'];

  return [
    '# Context',
    '',
    `- Change: ${state.change}`,
    `- Stage: ${state.stage}`,
    `- Next Action: ${state.nextAction}`,
    '',
    '## Active Task Group',
    '- None',
    '',
    '## Blockers',
    ...blockers,
    '',
    '## Warnings',
    ...warnings
  ].join('\n');
}

function validateChangeName(value) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    throw new Error('changeName is required.');
  }
  if (normalized.includes('/') || normalized.includes('\\') || normalized.includes('..')) {
    throw new Error('changeName must not include path separators or traversal markers.');
  }
  if (!CHANGE_NAME_PATTERN.test(normalized)) {
    throw new Error('changeName contains unsupported characters.');
  }
  return normalized;
}

function normalizeCreatedAt(value) {
  if (!value) return new Date().toISOString();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('createdAt must be a valid ISO-8601 timestamp.');
  }
  return parsed.toISOString();
}

function buildProjectConfigSkeleton(options = {}) {
  const projectConfig = options.projectConfig && typeof options.projectConfig === 'object' && !Array.isArray(options.projectConfig)
    ? options.projectConfig
    : {};
  const config = {
    schema: String(options.schemaName || DEFAULT_SCHEMA).trim() || DEFAULT_SCHEMA
  };

  if (['en', 'zh'].includes(projectConfig.language)) {
    config.language = projectConfig.language;
  }
  if (typeof projectConfig.context === 'string' && projectConfig.context.trim()) {
    config.context = projectConfig.context;
  }
  if (projectConfig.rules && typeof projectConfig.rules === 'object' && !Array.isArray(projectConfig.rules)) {
    config.rules = projectConfig.rules;
  }
  if (projectConfig.securityReview && typeof projectConfig.securityReview === 'object' && !Array.isArray(projectConfig.securityReview)) {
    config.securityReview = projectConfig.securityReview;
  }

  return `${stringifyYaml(config)}\n`;
}

function writeProjectConfigIfMissing(repoRoot, options = {}) {
  const projectRoot = getCanonicalProjectRoot(repoRoot);
  const configPath = path.join(projectRoot, 'config.yaml');
  ensureWithinBase(projectRoot, configPath, '.opsx project');
  if (fs.existsSync(configPath)) {
    return { path: configPath, created: false };
  }

  ensureDir(projectRoot);
  writeText(configPath, buildProjectConfigSkeleton(options));
  return { path: configPath, created: true };
}

function createChangeSkeleton(options = {}) {
  const repoRoot = path.resolve(options.repoRoot || process.cwd());
  const changeName = validateChangeName(options.changeName);
  const schemaName = String(options.schemaName || 'spec-driven').trim() || 'spec-driven';
  const createdAt = normalizeCreatedAt(options.createdAt);
  const securitySensitive = options.securitySensitive === true;

  const changesDir = getCanonicalChangesDir(repoRoot);
  const changeDir = path.join(changesDir, changeName);
  ensureWithinBase(changesDir, changeDir, '.opsx changes');
  ensureDir(changesDir);

  if (fs.existsSync(changeDir)) {
    const existingEntries = fs.readdirSync(changeDir);
    if (existingEntries.length > 0) {
      throw new Error(`Change already exists: ${changeName}`);
    }
  } else {
    ensureDir(changeDir);
  }

  const projectConfig = writeProjectConfigIfMissing(repoRoot, {
    schemaName,
    projectConfig: options.projectConfig
  });

  const metadata = {
    name: changeName,
    schema: schemaName,
    createdAt,
    securitySensitive,
    securityWaiver: {
      approved: false,
      reason: ''
    }
  };

  writeText(path.join(changeDir, 'change.yaml'), `${YAML.stringify(metadata)}`);
  ensureDir(path.join(changeDir, 'specs'));

  const state = writeChangeState(changeDir, Object.assign(
    buildChangeStateSkeleton(changeName, changeDir),
    { hashes: hashTrackedArtifacts(changeDir) }
  ));
  writeText(path.join(changeDir, 'context.md'), `${buildNewChangeContext(state)}\n`);
  writeText(path.join(changeDir, 'drift.md'), `${buildInitialDrift()}\n`);
  const active = writeActiveChangePointer(repoRoot, changeName);

  return {
    repoRoot,
    changeName,
    changeDir,
    files: {
      projectConfig: projectConfig.path,
      metadata: path.join(changeDir, 'change.yaml'),
      specsDir: path.join(changeDir, 'specs'),
      state: path.join(changeDir, 'state.yaml'),
      context: path.join(changeDir, 'context.md'),
      drift: path.join(changeDir, 'drift.md')
    },
    active
  };
}

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
  return { path: activePath, created: true };
}

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
  if (!fs.existsSync(contextPath)) {
    writeText(contextPath, `${buildInitialContext(changeName, resolvedChangeDir)}\n`);
    outputs.push(contextPath);
  }
  if (!fs.existsSync(driftPath)) {
    writeText(driftPath, `${buildInitialDrift()}\n`);
    outputs.push(driftPath);
  }

  return {
    changeDir: resolvedChangeDir,
    created: outputs
  };
}

module.exports = {
  getCanonicalProjectRoot,
  getLegacyProjectRoot,
  getCanonicalChangesDir,
  getCanonicalActivePath,
  getLegacyChangeMetadataPath,
  getCanonicalChangeMetadataPath,
  inferChangeStage,
  buildInitialState,
  buildInitialContext,
  buildInitialDrift,
  buildProjectConfigSkeleton,
  writeProjectConfigIfMissing,
  createChangeSkeleton,
  writeActiveStateIfMissing,
  writeChangeScaffoldsIfMissing
};
