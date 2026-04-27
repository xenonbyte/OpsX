const fs = require('fs');
const path = require('path');
const YAML = require('yaml');
const { ensureDir, writeText } = require('./fs-utils');
const { stringifyYaml } = require('./yaml');
const {
  buildChangeStateSkeleton,
  writeActiveChangePointer,
  writeChangeState
} = require('./change-store');

function ensureWithinBase(basePath, targetPath, errorCode) {
  const resolvedBase = path.resolve(basePath);
  const resolvedTarget = path.resolve(targetPath);
  const relativePath = path.relative(resolvedBase, resolvedTarget);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new Error(`Refusing to use path outside ${errorCode} root: ${targetPath}`);
  }
}

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
        : stage === 'specs'
          ? 'Create design.md after validating specs.'
          : stage === 'proposal'
            ? 'Create specs from proposal before design.'
            : stage === 'metadata'
              ? 'Create proposal.md for this change.'
              : 'Create change.yaml and proposal.md to start.',
    artifacts: {
      metadata: 'change.yaml',
      proposal: 'proposal.md',
      specs: 'specs',
      design: 'design.md',
      tasks: 'tasks.md'
    },
    blockers: '',
    warnings: ''
  });
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

function createChangeSkeleton(options = {}) {
  const repoRoot = path.resolve(options.repoRoot || process.cwd());
  const changeName = String(options.changeName || '').trim();
  if (!changeName) {
    throw new Error('changeName is required.');
  }

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

  const schemaName = String(options.schemaName || 'spec-driven').trim() || 'spec-driven';
  const createdAt = options.createdAt ? new Date(options.createdAt).toISOString() : new Date().toISOString();
  const securitySensitive = options.securitySensitive === true;

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

  const proposalText = [
    '# Proposal',
    '',
    '## Why',
    '',
    '## What Changes',
    '',
    '## Impact',
    ''
  ].join('\n');
  const designText = [
    '# Design',
    '',
    '## Context',
    '',
    '## Approach',
    '',
    '## Risks',
    ''
  ].join('\n');
  const tasksText = [
    '# Tasks',
    '',
    '## 1. Planning',
    '',
    '- [ ] 1.1 Replace placeholders with real task groups after planning checkpoints.',
    ''
  ].join('\n');

  writeText(path.join(changeDir, 'change.yaml'), `${YAML.stringify(metadata)}`);
  writeText(path.join(changeDir, 'proposal.md'), proposalText);
  writeText(path.join(changeDir, 'design.md'), designText);
  writeText(path.join(changeDir, 'tasks.md'), tasksText);
  ensureDir(path.join(changeDir, 'specs'));
  writeText(path.join(changeDir, 'specs', 'README.md'), 'Create capability specs as specs/<capability>/spec.md.\n');

  const state = writeChangeState(changeDir, buildChangeStateSkeleton(changeName, changeDir));
  writeText(path.join(changeDir, 'context.md'), `${buildNewChangeContext(state)}\n`);
  writeText(path.join(changeDir, 'drift.md'), `${buildInitialDrift()}\n`);
  const active = writeActiveChangePointer(repoRoot, changeName);

  return {
    repoRoot,
    changeName,
    changeDir,
    files: {
      metadata: path.join(changeDir, 'change.yaml'),
      proposal: path.join(changeDir, 'proposal.md'),
      design: path.join(changeDir, 'design.md'),
      tasks: path.join(changeDir, 'tasks.md'),
      specsReadme: path.join(changeDir, 'specs', 'README.md'),
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
  createChangeSkeleton,
  writeActiveStateIfMissing,
  writeChangeScaffoldsIfMissing
};
