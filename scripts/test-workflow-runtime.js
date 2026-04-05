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

function expectRuntimeError(run, code) {
  let caught = null;
  try {
    run();
  } catch (error) {
    caught = error;
  }
  assert(caught, `Expected RuntimeGuidanceError with code "${code}"`);
  assert(caught instanceof RuntimeGuidanceError, `Expected RuntimeGuidanceError, got ${caught.name}`);
  assert.strictEqual(caught.code, code, `Expected error code "${code}", got "${caught.code}"`);
}

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
  Object.keys(files).forEach((relativePath) => {
    writeText(path.join(changeDir, relativePath), files[relativePath]);
  });
  return changeDir;
}

function runTests() {
  const tests = [];
  const fixtureRoot = createFixtureRepo();
  const cleanupTargets = [fixtureRoot];

  function test(name, fn) {
    tests.push({ name, fn });
  }

  test('schema graph validation catches duplicate ids, invalid requires, and cycles', () => {
    expectRuntimeError(() => {
      validateSchemaGraph({
        id: 'dup',
        artifacts: [
          { id: 'proposal', path: 'proposal.md', requires: [] },
          { id: 'proposal', path: 'proposal-copy.md', requires: [] }
        ]
      });
    }, 'schema-duplicate-artifact-id');

    expectRuntimeError(() => {
      validateSchemaGraph({
        id: 'invalid-requires',
        artifacts: [
          { id: 'proposal', path: 'proposal.md', requires: [] },
          { id: 'tasks', path: 'tasks.md', requires: ['specs'] }
        ]
      });
    }, 'schema-invalid-requires');

    expectRuntimeError(() => {
      validateSchemaGraph({
        id: 'cycle',
        artifacts: [
          { id: 'proposal', path: 'proposal.md', requires: ['tasks'] },
          { id: 'tasks', path: 'tasks.md', requires: ['proposal'] }
        ]
      });
    }, 'schema-dependency-cycle');
  });

  test('runtime derives progression and blocked states from partial artifacts', () => {
    const changeName = 'kernel-progression';
    createChange(fixtureRoot, changeName, {
      'proposal.md': '## Why\nNeed runtime graph.',
      'design.md': '## Context\nRuntime decomposition'
    });

    const kernel = buildRuntimeKernel({ repoRoot: fixtureRoot, changeName });
    assert.strictEqual(kernel.artifactStates.proposal.state, 'done');
    assert.strictEqual(kernel.artifactStates.specs.state, 'ready');
    assert.strictEqual(kernel.artifactStates.design.state, 'done');
    assert.strictEqual(kernel.artifactStates.tasks.state, 'blocked');
    assert.deepStrictEqual(kernel.artifactStates.tasks.missingDependencies, ['specs']);
    assert.strictEqual(kernel.next.artifactId, 'specs');
    assert.strictEqual(kernel.progress.requiredDone, 2);
    assert.strictEqual(kernel.progress.requiredTotal, 4);
  });

  test('runtime respects security-review hard gates and does not force inactive optional steps', () => {
    const gatedChange = 'security-gated';
    createChange(fixtureRoot, gatedChange, {
      '.openspec.yaml': [
        `name: ${gatedChange}`,
        'schema: spec-driven',
        `createdAt: ${new Date('2026-01-02T00:00:00.000Z').toISOString()}`,
        'securitySensitive: true'
      ].join('\n'),
      'proposal.md': '## Why\nNeed auth hard gate.',
      'specs/security/spec.md': [
        '## ADDED Requirements',
        '### Requirement: Auth gate',
        'The system SHALL enforce auth checks.'
      ].join('\n'),
      'design.md': [
        '## Context',
        'Auth hard gate.',
        '## Migration Plan',
        'N/A'
      ].join('\n')
    });
    const gatedKernel = buildRuntimeKernel({ repoRoot: fixtureRoot, changeName: gatedChange });
    assert.strictEqual(gatedKernel.review.required, true);
    assert.strictEqual(gatedKernel.artifactStates.tasks.state, 'blocked');
    assert(gatedKernel.artifactStates.tasks.missingDependencies.includes('security-review'));
    assert.strictEqual(gatedKernel.next.artifactId, 'security-review');

    const noSecurityChange = 'security-inactive';
    createChange(fixtureRoot, noSecurityChange, {
      'proposal.md': '## Why\nSimple doc tweak.',
      'specs/core/spec.md': [
        '## ADDED Requirements',
        '### Requirement: Simple update',
        'The system SHALL support a simple update.'
      ].join('\n'),
      'design.md': [
        '## Context',
        'Simple change.',
        '## Migration Plan',
        'No migration.'
      ].join('\n'),
      'tasks.md': '## 1. Setup\n- [x] 1.1 Complete task'
    });
    const inactiveKernel = buildRuntimeKernel({ repoRoot: fixtureRoot, changeName: noSecurityChange });
    assert.strictEqual(inactiveKernel.review.active, false);
    assert.strictEqual(inactiveKernel.next.stage, 'apply');
    assert.strictEqual(inactiveKernel.next.artifactId, null);
  });

  test('runtime marks out-of-order artifacts and reports missing dependencies', () => {
    const changeName = 'kernel-out-of-order';
    createChange(fixtureRoot, changeName, {
      'tasks.md': '## 1. Setup\n- [ ] 1.1 Add task first'
    });

    const status = buildStatus({ repoRoot: fixtureRoot, changeName });
    assert.strictEqual(status.artifacts.tasks.state, 'done');
    assert.strictEqual(status.artifacts.tasks.outOfOrder, true);
    assert.deepStrictEqual(status.artifacts.tasks.missingDependencies, ['specs', 'design']);
    assert.strictEqual(status.next.artifactId, 'proposal');
  });

  test('status output is stable and machine-readable across repeated calls', () => {
    const changeName = 'status-stable';
    createChange(fixtureRoot, changeName, {});
    const first = buildStatus({ repoRoot: fixtureRoot, changeName });
    const second = buildStatus({ repoRoot: fixtureRoot, changeName });
    assert.deepStrictEqual(first, second);
    assert.strictEqual(first.artifacts.proposal.state, 'ready');
    assert.strictEqual(first.next.artifactId, 'proposal');
  });

  test('artifact instructions include dependency context, target path, and template', () => {
    const changeName = 'artifact-instructions';
    createChange(fixtureRoot, changeName, {
      'proposal.md': '## Why\nNeed artifact instructions.'
    });

    const blockedTasks = buildArtifactInstructions({
      repoRoot: fixtureRoot,
      changeName,
      artifactId: 'tasks'
    });
    assert.strictEqual(blockedTasks.artifact.readyForWrite, false);
    assert.deepStrictEqual(blockedTasks.artifact.missingDependencies, ['specs', 'design']);
    assert.strictEqual(blockedTasks.artifact.targetPath, 'tasks.md');
    assert(blockedTasks.template.content.includes('- [ ]'));

    const unresolvedSpecs = buildArtifactInstructions({
      repoRoot: fixtureRoot,
      changeName,
      artifactId: 'specs'
    });
    assert.strictEqual(unresolvedSpecs.artifact.targetPath, null);
    assert.strictEqual(unresolvedSpecs.artifact.readyForWrite, false);
    assert(unresolvedSpecs.warnings.some((warning) => warning.includes('Capability is required')));

    const resolvedSpecs = buildArtifactInstructions({
      repoRoot: fixtureRoot,
      changeName,
      artifactId: 'specs',
      capability: 'runtime-core'
    });
    assert.strictEqual(resolvedSpecs.artifact.targetPath, 'specs/runtime-core/spec.md');

    const textMode = buildArtifactInstructions({
      repoRoot: fixtureRoot,
      changeName,
      artifactId: 'tasks',
      format: 'text'
    });
    assert(textMode.includes('# Artifact instructions: tasks'));
    assert(textMode.includes('missingDependencies'));
  });

  test('artifact templates resolve from package even when project repo has no skills folder', () => {
    const minimalRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-no-skills-'));
    cleanupTargets.push(minimalRoot);
    ensureDir(path.join(minimalRoot, 'openspec', 'changes', 'template-source', 'specs', 'core'));
    writeText(path.join(minimalRoot, 'openspec', 'config.yaml'), 'schema: spec-driven\nlanguage: en\n');
    writeText(path.join(minimalRoot, 'openspec', 'changes', 'template-source', '.openspec.yaml'), [
      'name: template-source',
      'schema: spec-driven',
      `createdAt: ${new Date('2026-01-03T00:00:00.000Z').toISOString()}`
    ].join('\n'));
    writeText(path.join(minimalRoot, 'openspec', 'changes', 'template-source', 'proposal.md'), '## Why\nTemplate source.');
    writeText(path.join(minimalRoot, 'openspec', 'changes', 'template-source', 'specs', 'core', 'spec.md'), [
      '## ADDED Requirements',
      '### Requirement: Template',
      'The system SHALL load templates from package references.'
    ].join('\n'));
    writeText(path.join(minimalRoot, 'openspec', 'changes', 'template-source', 'design.md'), [
      '## Context',
      'Template source change.',
      '## Migration Plan',
      'N/A'
    ].join('\n'));

    const payload = buildArtifactInstructions({
      repoRoot: minimalRoot,
      changeName: 'template-source',
      artifactId: 'tasks'
    });
    assert(payload.template.content.includes('- [ ] 1.1 Example task'));
    assert(payload.template.sourcePath.includes(path.join('skills', 'openspec', 'references')));
  });

  test('apply instructions report remaining task groups and prerequisites', () => {
    const changeName = 'apply-instructions';
    createChange(fixtureRoot, changeName, {
      'proposal.md': '## Why\nNeed runtime apply instructions workflow and compatibility migration guidance.',
      'design.md': [
        '## Context',
        'Runtime apply instructions and artifact graph execution guidance.',
        '',
        '## Migration Plan',
        'Migration and rollback compatibility must be documented.'
      ].join('\n'),
      'specs/runtime/spec.md': [
        '## ADDED Requirements',
        '### Requirement: Runtime apply',
        'The system SHALL support runtime apply instructions.',
        '',
        '#### Scenario: Runtime apply progression',
        '- **WHEN** runtime apply instructions run',
        '- **THEN** workflow compatibility and migration checks are visible'
      ].join('\n'),
      'tasks.md': [
        '## 1. Graph kernel',
        '- [x] 1.1 Implement runtime apply instructions graph kernel',
        '- [x] 1.2 Add migration rollback compatibility validators',
        '',
        '## 2. Runtime instructions',
        '- [ ] 2.1 Add runtime apply instructions API implementation',
        '- [ ] 2.2 Add runtime apply verification tests and compatibility checks'
      ].join('\n')
    });

    const apply = buildApplyInstructions({ repoRoot: fixtureRoot, changeName });
    assert.strictEqual(apply.ready, true);
    assert.notStrictEqual(apply.checkpoint.status, 'BLOCK');
    assert.strictEqual(apply.remainingTaskGroups.length, 1);
    assert.strictEqual(apply.nextTaskGroup, '2. Runtime instructions');

    const textMode = buildApplyInstructions({ repoRoot: fixtureRoot, changeName, format: 'text' });
    assert(textMode.includes('# Apply instructions'));
    assert(textMode.includes('2. Runtime instructions'));

    const blockedChange = 'apply-blocked';
    createChange(fixtureRoot, blockedChange, {
      'proposal.md': '## Why\nBlocked apply path.'
    });
    const blockedApply = buildApplyInstructions({ repoRoot: fixtureRoot, changeName: blockedChange });
    assert.strictEqual(blockedApply.ready, false);
    assert(blockedApply.prerequisites.some((entry) => entry.includes('tasks artifact is not completed')));
  });

  test('invalid inputs are rejected for unsafe change names, missing changes, and unknown artifacts', () => {
    expectRuntimeError(() => {
      buildStatus({ repoRoot: fixtureRoot, changeName: '../escape' });
    }, 'invalid-change-name');

    expectRuntimeError(() => {
      buildStatus({ repoRoot: fixtureRoot, changeName: 'missing-change' });
    }, 'change-not-found');

    const changeName = 'invalid-artifact';
    createChange(fixtureRoot, changeName, {});
    expectRuntimeError(() => {
      buildArtifactInstructions({
        repoRoot: fixtureRoot,
        changeName,
        artifactId: 'not-exist'
      });
    }, 'unknown-artifact');

    expectRuntimeError(() => {
      buildRuntimeKernel({ repoRoot: fixtureRoot, changeName, schemaName: 'missing-schema' });
    }, 'schema-not-found');
  });

  test('checkpoint contract validators remain green after runtime module integration', () => {
    assert.deepStrictEqual(validatePhaseOneWorkflowContract(), []);
    assert.deepStrictEqual(validateCheckpointContracts(), []);
  });

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

  test('check output remains accurate after partial uninstall across platforms', () => {
    const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-home-check-'));
    cleanupTargets.push(tempHome);

    install({ platform: 'claude,codex,gemini', homeDir: tempHome, language: 'en' });
    uninstall({ platform: 'gemini', homeDir: tempHome });

    const checkOutput = runCheck({ homeDir: tempHome, cwd: fixtureRoot });
    assert(checkOutput.includes('Found 2 manifest(s)'));
    assert(checkOutput.includes('claude'));
    assert(checkOutput.includes('codex'));
    assert(!checkOutput.includes('Manifest missing for gemini'));
    assert(checkOutput.includes('configured platform `gemini` is not currently installed'));
  });

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

  test('execution checkpoint ignores task-body template wording when inferring new constraints', () => {
    const changeName = 'execution-constraint-wording';
    const tasksText = [
      '## 1. Execution checkpoint automation',
      'Covers: Automatic implementation review',
      'Done when: execution checkpoint can detect implementation drift, new constraints, and missing verification from evidence attached to a completed top-level task group.',
      '- [x] 1.1 Implement execution evidence normalization and comparison.',
      '- [x] 1.2 Add verification tests for execution checkpoint behavior.'
    ].join('\n');

    createChange(fixtureRoot, changeName, {
      'proposal.md': '## Why\nNeed execution checkpoint review automation.',
      'specs/runtime/spec.md': [
        '## ADDED Requirements',
        '### Requirement: Execution checkpoint review',
        'The system SHALL evaluate execution evidence and preserve checkpoint contracts.',
        '',
        '#### Scenario: Completed task-group review',
        '- **WHEN** a completed task group is reviewed',
        '- **THEN** checkpoint findings remain accurate'
      ].join('\n'),
      'design.md': [
        '## Context',
        'Execution checkpoint review automation.',
        '## Migration Plan',
        'No migration.'
      ].join('\n'),
      'tasks.md': tasksText
    });

    const result = runExecutionCheckpoint({
      schemaName: 'spec-driven',
      artifacts: {
        proposal: true,
        specs: true,
        design: true,
        tasks: true
      },
      sources: {
        proposal: '## Why\nNeed execution checkpoint review automation.',
        specs: [
          '## ADDED Requirements',
          '### Requirement: Execution checkpoint review',
          'The system SHALL evaluate execution evidence and preserve checkpoint contracts.'
        ].join('\n'),
        design: [
          '## Context',
          'Execution checkpoint review automation.',
          '## Migration Plan',
          'No migration.'
        ].join('\n'),
        tasks: tasksText
      },
      group: {
        title: '1. Execution checkpoint automation',
        text: tasksText,
        completed: true
      },
      executionEvidence: {
        implementationSummary: 'Implemented execution evidence normalization and added verification tests.',
        verificationSummary: 'Ran execution checkpoint regression tests for completed task groups.'
      }
    });

    assert.strictEqual(result.status, 'PASS');
    assert(!result.findings.some((finding) => finding.code === 'new-constraints-detected'));
  });

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

runTests();
