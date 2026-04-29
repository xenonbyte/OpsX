#!/usr/bin/env node

const { runRegisteredTopicTests } = require('./test-workflow-shared');
const { PACKAGE_VERSION } = require('../lib/constants');
const {
  buildRuntimeKernel,
  buildStatus,
  buildStatusText,
  buildResumeInstructions,
  buildContinueInstructions
} = require('../lib/runtime-guidance');
const { ensureDir, writeText } = require('../lib/fs-utils');
const { writeChangeState, loadChangeState } = require('../lib/change-store');
const YAML = require('yaml');

function registerTests(test, helpers) {
  const {
    assert,
    fs,
    os,
    path,
    fixtureRoot,
    cleanupTargets,
    createChange,
    createLegacyMigrationRepoFixture,
    createLegacySharedHomeFixture,
    runOpsxCli
  } = helpers;

  test('status and resume read partial state without auto-creating files', () => {
    const changeName = 'partial-state-read-only';
    const changeDir = createChange(fixtureRoot, changeName, {
      'proposal.md': '# Proposal from fixture\n'
    });
    const activePath = path.join(fixtureRoot, '.opsx', 'active.yaml');
    const statePath = path.join(changeDir, 'state.yaml');
    const contextPath = path.join(changeDir, 'context.md');
    const driftPath = path.join(changeDir, 'drift.md');

    writeText(activePath, `${YAML.stringify({
      version: 1,
      activeChange: changeName,
      updatedAt: '2026-04-27T00:00:00.000Z'
    })}\n`);
    writeText(statePath, `${YAML.stringify({
      change: changeName,
      stage: 'SPECS_READY',
      warnings: 'legacy warning from sparse state',
      blockers: ['waiting for review']
    })}\n`);
    const stateBefore = fs.readFileSync(statePath, 'utf8');

    assert.strictEqual(fs.existsSync(contextPath), false);
    assert.strictEqual(fs.existsSync(driftPath), false);

    const status = buildStatus({ repoRoot: fixtureRoot, changeName });
    assert.strictEqual(status.stage, 'SPECS_READY');
    assert.strictEqual(status.nextAction, 'continue');
    assert.strictEqual(status.nextArtifact, 'spec-split-checkpoint');
    assert.strictEqual(status.active.taskGroup, null);
    assert(status.warnings.includes('legacy warning from sparse state'));
    assert(status.warnings.some((warning) => warning.includes('Hash drift detected for proposal.md')));
    assert.deepStrictEqual(status.blockers, ['waiting for review']);

    const statusText = buildStatusText({ repoRoot: fixtureRoot, changeName });
    assert(statusText.includes('Stage: SPECS_READY'));
    assert(statusText.includes('Next action: continue'));
    assert(statusText.includes('Next artifact: spec-split-checkpoint'));

    const resume = buildResumeInstructions({ repoRoot: fixtureRoot, changeName });
    assert.strictEqual(resume.stage, 'SPECS_READY');
    assert.strictEqual(resume.nextAction, 'continue');
    assert.strictEqual(resume.nextArtifact, 'spec-split-checkpoint');
    assert.strictEqual(resume.route, 'opsx-continue');

    assert.strictEqual(fs.readFileSync(statePath, 'utf8'), stateBefore);
    assert.strictEqual(fs.existsSync(contextPath), false);
    assert.strictEqual(fs.existsSync(driftPath), false);
  });

  test('continue routes from persisted stage and active task group', () => {
    const changeName = 'continue-routing-state';
    const changeDir = createChange(fixtureRoot, changeName, {
      'proposal.md': '# Routing fixture\n'
    });
    const statePath = path.join(changeDir, 'state.yaml');
    const initialState = {
      change: changeName,
      stage: 'APPLYING_GROUP',
      active: {
        taskGroup: '2. Runtime instructions'
      }
    };

    writeText(statePath, `${YAML.stringify(initialState)}\n`);
    const beforeContinue = fs.readFileSync(statePath, 'utf8');
    const continueApply = buildContinueInstructions({ repoRoot: fixtureRoot, changeName });

    assert.strictEqual(continueApply.stage, 'APPLYING_GROUP');
    assert.strictEqual(continueApply.nextAction, 'apply');
    assert.strictEqual(continueApply.route, 'opsx-apply');
    assert.strictEqual(continueApply.active.taskGroup, '2. Runtime instructions');
    assert.strictEqual(fs.readFileSync(statePath, 'utf8'), beforeContinue);

    writeText(statePath, `${YAML.stringify({
      change: changeName,
      stage: 'VERIFIED'
    })}\n`);
    const continueSync = buildContinueInstructions({ repoRoot: fixtureRoot, changeName });
    assert.strictEqual(continueSync.nextAction, 'sync');
    assert.strictEqual(continueSync.route, 'opsx-sync');
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

  test('runtime blocks design until specs exist', () => {
    const changeName = 'kernel-design-requires-specs';
    createChange(fixtureRoot, changeName, {
      'proposal.md': '## Why\nNeed runtime graph.'
    });

    const kernel = buildRuntimeKernel({ repoRoot: fixtureRoot, changeName });
    assert.strictEqual(kernel.artifactStates.proposal.state, 'done');
    assert.strictEqual(kernel.artifactStates.specs.state, 'ready');
    assert.strictEqual(kernel.artifactStates.design.state, 'blocked');
    assert.deepStrictEqual(kernel.artifactStates.design.missingDependencies, ['specs']);
    assert.strictEqual(kernel.next.artifactId, 'specs');
  });

  test('runtime respects security-review hard gates, advisory review inactivity, and inactive optional steps', () => {
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

    const waivedChange = 'security-waived';
    createChange(fixtureRoot, waivedChange, {
      '.openspec.yaml': [
        `name: ${waivedChange}`,
        'schema: spec-driven',
        `createdAt: ${new Date('2026-01-03T00:00:00.000Z').toISOString()}`,
        'securityWaiver:',
        '  approved: true',
        '  reason: Reviewed manually outside workflow.'
      ].join('\n'),
      'proposal.md': '## Why\nNeed admin auth workflow guidance.',
      'specs/security/spec.md': [
        '## ADDED Requirements',
        '### Requirement: Auth workflow',
        'The system SHALL support admin auth workflow.'
      ].join('\n'),
      'design.md': [
        '## Context',
        'Admin auth workflow.',
        '## Migration Plan',
        'No migration.'
      ].join('\n'),
      'tasks.md': '## 1. Setup\n- [x] 1.1 Complete task'
    });
    const waivedKernel = buildRuntimeKernel({ repoRoot: fixtureRoot, changeName: waivedChange });
    assert.strictEqual(waivedKernel.review.state, 'waived');
    assert.strictEqual(waivedKernel.review.active, false);
    assert.strictEqual(waivedKernel.artifactStates['security-review'].active, false);
    assert.strictEqual(waivedKernel.next.stage, 'apply');
    assert.strictEqual(waivedKernel.next.artifactId, null);

    const recommendedChange = 'security-recommended';
    createChange(fixtureRoot, recommendedChange, {
      'proposal.md': '## Why\nNeed workflow guidance.',
      'specs/core/spec.md': [
        '## ADDED Requirements',
        '### Requirement: Workflow guidance',
        'The system SHALL support workflow guidance.'
      ].join('\n'),
      'design.md': [
        '## Context',
        'Workflow guidance.',
        '## Migration Plan',
        'No migration.'
      ].join('\n'),
      'tasks.md': '## 1. Setup\n- [x] 1.1 Complete task'
    });
    const recommendedKernel = buildRuntimeKernel({
      repoRoot: fixtureRoot,
      changeName: recommendedChange,
      sources: {
        request: 'add admin auth token workflow'
      }
    });
    assert.strictEqual(recommendedKernel.review.state, 'recommended');
    assert.strictEqual(recommendedKernel.review.active, false);
    assert.strictEqual(recommendedKernel.artifactStates['security-review'].active, false);
    assert.strictEqual(recommendedKernel.next.stage, 'apply');
    assert.strictEqual(recommendedKernel.next.artifactId, null);

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

  test('opsx migrate --dry-run reports deterministic legacy repo/home mapping with zero writes', () => {
    const { fixtureRoot: statusFixture } = createLegacyMigrationRepoFixture({ changeName: 'demo' });
    const statusHome = fs.mkdtempSync(path.join(os.tmpdir(), 'opsx-status-home-'));
    cleanupTargets.push(statusFixture, statusHome);
    createLegacySharedHomeFixture(statusHome, { platform: 'codex' });

    const cliOptions = {
      cwd: statusFixture,
      env: { HOME: statusHome }
    };

    const migrateOutput = runOpsxCli(['migrate', '--dry-run'], cliOptions);
    assert.strictEqual(migrateOutput.status, 0, migrateOutput.stderr);

    [
      'MOVE openspec/config.yaml -> .opsx/config.yaml',
      'MOVE openspec/changes/demo/.openspec.yaml -> .opsx/changes/demo/change.yaml',
      'MOVE ~/.openspec/.opsx-config.yaml -> ~/.opsx/config.yaml',
      'MOVE ~/.openspec/skills/openspec -> ~/.opsx/skills/opsx',
      'MOVE ~/.openspec/commands/openspec.md -> ~/.opsx/commands/opsx.md',
      'CREATE .opsx/active.yaml'
    ].forEach((expectedLine) => {
      assert(
        migrateOutput.stdout.includes(expectedLine),
        `Expected dry-run output line: ${expectedLine}`
      );
    });

    assert(!fs.existsSync(path.join(statusFixture, '.opsx')), 'Dry-run must not create .opsx directory.');
    assert(!fs.existsSync(path.join(statusHome, '.opsx')), 'Dry-run must not create ~/.opsx directory.');

    const dryRunWithExtraToken = runOpsxCli(['migrate', '--dry-run', 'extra'], cliOptions);
    assert.strictEqual(dryRunWithExtraToken.status, 0, dryRunWithExtraToken.stderr);
    assert(dryRunWithExtraToken.stdout.includes('OpsX migration plan (dry-run)'));
    assert(!dryRunWithExtraToken.stdout.includes('OpsX migration complete.'));
    assert(!fs.existsSync(path.join(statusFixture, '.opsx')), 'Dry-run with extra token must not create .opsx directory.');
    assert(!fs.existsSync(path.join(statusHome, '.opsx')), 'Dry-run with extra token must not create ~/.opsx directory.');
  });

  test('opsx migrate executes legacy repo/home moves and creates required scaffolds', () => {
    const changeName = 'demo';
    const { fixtureRoot: executeFixture } = createLegacyMigrationRepoFixture({ changeName });
    const executeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'opsx-execute-home-'));
    cleanupTargets.push(executeFixture, executeHome);
    const sharedHomeFixture = createLegacySharedHomeFixture(executeHome, { platform: 'codex' });

    const cliOptions = {
      cwd: executeFixture,
      env: { HOME: executeHome }
    };

    const migrateOutput = runOpsxCli(['migrate'], cliOptions);
    assert.strictEqual(migrateOutput.status, 0, migrateOutput.stderr);
    assert(migrateOutput.stdout.includes('OpsX migration complete.'));

    assert(fs.existsSync(path.join(executeFixture, '.opsx', 'config.yaml')));
    assert(fs.existsSync(path.join(executeFixture, '.opsx', 'active.yaml')));
    assert(fs.existsSync(path.join(executeFixture, '.opsx', 'changes', changeName, 'change.yaml')));
    assert(fs.existsSync(path.join(executeFixture, '.opsx', 'changes', changeName, 'state.yaml')));
    assert(fs.existsSync(path.join(executeFixture, '.opsx', 'changes', changeName, 'context.md')));
    assert(fs.existsSync(path.join(executeFixture, '.opsx', 'changes', changeName, 'drift.md')));

    assert(fs.existsSync(path.join(executeHome, '.opsx', 'config.yaml')));
    assert(fs.existsSync(path.join(executeHome, '.opsx', 'manifests', `${sharedHomeFixture.platform}.manifest`)));
    assert(fs.existsSync(path.join(executeHome, '.opsx', 'skills', 'opsx', 'SKILL.md')));
    assert(fs.existsSync(path.join(executeHome, '.opsx', 'commands', 'opsx.md')));

    assert(!fs.existsSync(path.join(executeFixture, 'openspec', 'changes', changeName, '.openspec.yaml')));

    const migratedState = loadChangeState(path.join(executeFixture, '.opsx', 'changes', changeName));
    assert.strictEqual(migratedState.stage, 'PROPOSAL_READY');
    assert.strictEqual(migratedState.migration.migrated, true);
    assert(migratedState.warnings.includes('migrated-change-needs-checkpoint-refresh'));
    assert(Object.prototype.hasOwnProperty.call(migratedState.hashes, 'proposal.md'));
    const migratedStatus = buildStatus({ repoRoot: executeFixture, changeName });
    assert.strictEqual(migratedStatus.nextAction, 'continue');
    assert.strictEqual(migratedStatus.nextArtifact, 'specs');
    assert.deepStrictEqual(migratedStatus.hashDriftWarnings, []);
  });

  test('opsx migrate rolls back completed moves and clears journal after mid-run failure', () => {
    const changeName = 'demo';
    const { fixtureRoot: rollbackFixture } = createLegacyMigrationRepoFixture({ changeName });
    const rollbackHome = fs.mkdtempSync(path.join(os.tmpdir(), 'opsx-rollback-home-'));
    cleanupTargets.push(rollbackFixture, rollbackHome);
    const { runMigration } = require('../lib/migrate');

    const legacyConfigPath = path.join(rollbackFixture, 'openspec', 'config.yaml');
    const canonicalConfigPath = path.join(rollbackFixture, '.opsx', 'config.yaml');
    const journalPath = path.join(rollbackFixture, '.opsx-migration-journal.json');
    const legacyConfigBefore = fs.readFileSync(legacyConfigPath, 'utf8');
    const originalRenameSync = fs.renameSync;

    fs.renameSync = (from, to) => {
      if (String(to).endsWith(path.join('.opsx', 'changes'))) {
        throw new Error('simulated migration move failure');
      }
      return originalRenameSync.call(fs, from, to);
    };

    try {
      assert.throws(
        () => runMigration({ cwd: rollbackFixture, homeDir: rollbackHome }),
        /simulated migration move failure/
      );
    } finally {
      fs.renameSync = originalRenameSync;
    }

    assert(fs.existsSync(legacyConfigPath), 'Rollback should restore the moved legacy config.');
    assert.strictEqual(fs.readFileSync(legacyConfigPath, 'utf8'), legacyConfigBefore);
    assert.strictEqual(fs.existsSync(canonicalConfigPath), false);
    assert.strictEqual(fs.existsSync(path.join(rollbackFixture, '.opsx')), false, 'Rollback should remove empty canonical parent directories.');
    assert.strictEqual(fs.existsSync(journalPath), false, 'Successful rollback should remove migration journal.');

    const retryOutput = runMigration({ cwd: rollbackFixture, homeDir: rollbackHome });
    assert(retryOutput.includes('OpsX migration complete.'));
    assert(fs.existsSync(canonicalConfigPath), 'Retry should succeed after rollback removes empty .opsx parent.');
  });

  test('opsx migrate aborts by default when canonical .opsx exists and keeps legacy tree untouched', () => {
    const changeName = 'demo';
    const { fixtureRoot: abortFixture } = createLegacyMigrationRepoFixture({ changeName });
    const abortHome = fs.mkdtempSync(path.join(os.tmpdir(), 'opsx-abort-home-'));
    cleanupTargets.push(abortFixture, abortHome);
    createLegacySharedHomeFixture(abortHome, { platform: 'codex' });

    const legacyConfigPath = path.join(abortFixture, 'openspec', 'config.yaml');
    const legacyMetadataPath = path.join(abortFixture, 'openspec', 'changes', changeName, '.openspec.yaml');
    const legacyConfigBefore = fs.readFileSync(legacyConfigPath, 'utf8');
    const legacyMetadataBefore = fs.readFileSync(legacyMetadataPath, 'utf8');

    ensureDir(path.join(abortFixture, '.opsx'));
    writeText(path.join(abortFixture, '.opsx', 'config.yaml'), 'schema: spec-driven\nlanguage: en\n');

    const abortOutput = runOpsxCli(['migrate'], {
      cwd: abortFixture,
      env: { HOME: abortHome }
    });
    assert.notStrictEqual(abortOutput.status, 0, 'Expected migrate command to fail when .opsx already exists.');
    assert(
      `${abortOutput.stdout}\n${abortOutput.stderr}`.includes('already exists'),
      `Expected abort output to mention existing canonical path, got: ${abortOutput.stderr || abortOutput.stdout}`
    );

    assert(fs.existsSync(legacyConfigPath), 'Legacy project config should remain after abort.');
    assert(fs.existsSync(legacyMetadataPath), 'Legacy metadata should remain after abort.');
    assert.strictEqual(fs.readFileSync(legacyConfigPath, 'utf8'), legacyConfigBefore);
    assert.strictEqual(fs.readFileSync(legacyMetadataPath, 'utf8'), legacyMetadataBefore);
  });

  test('opsx migrate aborts before moves when canonical shared-home parents are files', () => {
    [
      {
        name: 'shared-root',
        createConflict(homeDir) {
          writeText(path.join(homeDir, '.opsx'), 'not a directory\n');
        }
      },
      {
        name: 'skills-parent',
        createConflict(homeDir) {
          ensureDir(path.join(homeDir, '.opsx'));
          writeText(path.join(homeDir, '.opsx', 'skills'), 'not a directory\n');
        }
      }
    ].forEach(({ name, createConflict }) => {
      const changeName = `demo-${name}`;
      const { fixtureRoot: conflictFixture } = createLegacyMigrationRepoFixture({ changeName });
      const conflictHome = fs.mkdtempSync(path.join(os.tmpdir(), `opsx-${name}-home-`));
      cleanupTargets.push(conflictFixture, conflictHome);
      createLegacySharedHomeFixture(conflictHome, { platform: 'codex' });

      const legacyRepoConfigPath = path.join(conflictFixture, 'openspec', 'config.yaml');
      const legacyHomeConfigPath = path.join(conflictHome, '.openspec', '.opsx-config.yaml');
      const legacyRepoConfigBefore = fs.readFileSync(legacyRepoConfigPath, 'utf8');
      const legacyHomeConfigBefore = fs.readFileSync(legacyHomeConfigPath, 'utf8');

      createConflict(conflictHome);

      const abortOutput = runOpsxCli(['migrate'], {
        cwd: conflictFixture,
        env: { HOME: conflictHome }
      });

      assert.notStrictEqual(abortOutput.status, 0, `Expected ${name} conflict to abort migration.`);
      assert(
        `${abortOutput.stdout}\n${abortOutput.stderr}`.includes('Canonical destination parent is not a directory'),
        `Expected ${name} abort output to mention destination parent conflict, got: ${abortOutput.stderr || abortOutput.stdout}`
      );

      assert(fs.existsSync(legacyRepoConfigPath), `${name}: legacy repo config should remain after abort.`);
      assert(fs.existsSync(legacyHomeConfigPath), `${name}: legacy shared config should remain after abort.`);
      assert.strictEqual(fs.readFileSync(legacyRepoConfigPath, 'utf8'), legacyRepoConfigBefore);
      assert.strictEqual(fs.readFileSync(legacyHomeConfigPath, 'utf8'), legacyHomeConfigBefore);
      assert(!fs.existsSync(path.join(conflictFixture, '.opsx', 'config.yaml')), `${name}: repo move must not run before abort.`);
      assert(!fs.existsSync(path.join(conflictHome, '.opsx', 'config.yaml')), `${name}: home config move must not run before abort.`);
    });
  });

  test('opsx status reports truthful migration and initialization guidance when workspace is missing', () => {
    const { fixtureRoot: statusFixture } = createLegacyMigrationRepoFixture({ changeName: 'status-only' });
    const statusHome = fs.mkdtempSync(path.join(os.tmpdir(), 'opsx-status-home-guidance-'));
    cleanupTargets.push(statusFixture, statusHome);

    const statusOutput = runOpsxCli(['status'], {
      cwd: statusFixture,
      env: { HOME: statusHome }
    });
    assert.strictEqual(statusOutput.status, 0, statusOutput.stderr);
    assert(statusOutput.stdout.includes(`OpsX v${PACKAGE_VERSION}`));
    assert(statusOutput.stdout.includes('Workspace not initialized: `.opsx/config.yaml` is missing.'));
    assert(statusOutput.stdout.includes('Next: use `$opsx-new` / `/opsx-new` or `$opsx-propose` / `/opsx-propose` to initialize and select a change.'));
    assert(statusOutput.stdout.includes('Run `opsx migrate --dry-run` to preview migration.'));
    assert(!statusOutput.stdout.includes('Current phase: Phase 2 (.opsx/ Workspace and Migration)'));
    assert(!statusOutput.stdout.includes('Phase 1 status placeholder.'));
  });

  test('opsx status --json emits a deterministic envelope for expected workflow states', () => {
    const expectedKeys = [
      'ok',
      'version',
      'command',
      'workspace',
      'migration',
      'activeChange',
      'changeStatus',
      'warnings',
      'errors'
    ];

    const parseEnvelope = (result, messagePrefix) => {
      assert.strictEqual(result.status, 0, `${messagePrefix} should exit 0: ${result.stderr}`);
      assert.strictEqual(result.stderr.trim(), '', `${messagePrefix} should keep stderr empty.`);
      assert.doesNotThrow(() => JSON.parse(result.stdout), `${messagePrefix} stdout should be valid JSON.`);
      const parsed = JSON.parse(result.stdout);
      assert.deepStrictEqual(Object.keys(parsed), expectedKeys, `${messagePrefix} keys should be deterministic.`);
      assert.strictEqual(parsed.ok, true, `${messagePrefix} should keep ok=true for expected states.`);
      assert.strictEqual(parsed.command, 'status');
      return parsed;
    };

    const { fixtureRoot: missingWorkspaceRoot } = createLegacyMigrationRepoFixture({ changeName: 'json-missing-workspace' });
    const missingWorkspaceHome = fs.mkdtempSync(path.join(os.tmpdir(), 'opsx-json-missing-workspace-home-'));
    cleanupTargets.push(missingWorkspaceRoot, missingWorkspaceHome);
    const missingWorkspace = parseEnvelope(runOpsxCli(['status', '--json'], {
      cwd: missingWorkspaceRoot,
      env: { HOME: missingWorkspaceHome }
    }), 'missing workspace');
    assert.strictEqual(missingWorkspace.workspace.initialized, false);
    assert.strictEqual(missingWorkspace.activeChange, null);
    assert.strictEqual(missingWorkspace.changeStatus, null);
    assert(missingWorkspace.warnings.includes('workspace-not-initialized'));

    const activePointerPath = path.join(fixtureRoot, '.opsx', 'active.yaml');
    if (fs.existsSync(activePointerPath)) {
      fs.unlinkSync(activePointerPath);
    }

    const missingActive = parseEnvelope(runOpsxCli(['status', '--json'], {
      cwd: fixtureRoot
    }), 'missing active change');
    assert.strictEqual(missingActive.workspace.initialized, true);
    assert.strictEqual(missingActive.activeChange, null);
    assert.strictEqual(missingActive.changeStatus, null);
    assert(missingActive.warnings.includes('no-active-change'));

    const activeChangeName = 'json-active-change';
    const activeChangeDir = createChange(fixtureRoot, activeChangeName, {
      'proposal.md': '## Why\nJSON status',
      'specs/core/spec.md': [
        '## ADDED Requirements',
        '### Requirement: JSON status',
        'The system SHALL emit deterministic JSON status.'
      ].join('\n')
    });
    writeText(path.join(fixtureRoot, '.opsx', 'active.yaml'), `${YAML.stringify({
      version: 1,
      activeChange: activeChangeName,
      updatedAt: '2026-04-29T00:00:00.000Z'
    })}\n`);
    writeChangeState(activeChangeDir, {
      change: activeChangeName,
      stage: 'BLOCKED',
      warnings: ['manual warning from blocked state'],
      blockers: ['waiting for approval']
    });

    const blockedState = parseEnvelope(runOpsxCli(['status', '--json'], {
      cwd: fixtureRoot
    }), 'active blocked state');
    assert.strictEqual(blockedState.activeChange, activeChangeName);
    assert(blockedState.changeStatus, 'Expected changeStatus for active change.');
    assert.strictEqual(blockedState.changeStatus.stage, 'BLOCKED');
    assert(blockedState.changeStatus.blockers.includes('waiting for approval'));
    assert(blockedState.changeStatus.warnings.includes('manual warning from blocked state'));
    assert(blockedState.warnings.includes('waiting for approval'));
    assert(blockedState.warnings.includes('manual warning from blocked state'));

    writeText(path.join(fixtureRoot, '.opsx', 'active.yaml'), `${YAML.stringify({
      version: 1,
      activeChange: '../escape',
      updatedAt: '2026-04-29T00:00:00.000Z'
    })}\n`);
    const exceptional = runOpsxCli(['status', '--json'], { cwd: fixtureRoot });
    assert.notStrictEqual(exceptional.status, 0, 'Exceptional failures must keep non-zero exit.');
    assert.strictEqual(exceptional.stdout.trim(), '', 'Exceptional failures should not emit JSON payload.');
    assert.notStrictEqual(exceptional.stderr.trim(), '', 'Exceptional failures should report stderr diagnostics.');
  });
}

if (require.main === module) {
  runRegisteredTopicTests(registerTests);
}

module.exports = { registerTests };
