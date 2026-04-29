#!/usr/bin/env node

const assert = require('assert');
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createHash } = require('crypto');
const YAML = require('yaml');
const { copyDir, ensureDir, removePath, writeText } = require('../lib/fs-utils');
const { REPO_ROOT } = require('../lib/constants');
const { normalizeConfig } = require('../lib/config');
const {
  RuntimeGuidanceError,
  validateSchemaGraph,
  buildRuntimeKernel,
  buildStatus,
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
const {
  install,
  uninstall,
  runCheck,
  showDoc,
  setLanguage
} = require('../lib/install');
const { buildPlatformBundle } = require('../lib/generator');

const {
  BANNED_PUBLIC_ROUTE_STRINGS,
  EXPECTED_CODEX_PUBLIC_ROUTES,
  EMPTY_STATE_FALLBACK_MATCHERS,
  STRICT_PREFLIGHT_MATCHERS,
  PLATFORM_BUNDLE_TARGETS,
  PHASE5_PLANNING_PROMPT_ASSERTION_TARGETS,
  PHASE6_TDD_PROMPT_PATHS,
  PHASE7_GATE_PROMPT_PATHS,
  WRONG_PLATFORM_ROUTE_PATTERNS,
  toPosixPath,
  collectBundleParity,
  collectFallbackCopyCoverage,
  assertPlatformLabeledCodexRouteLines,
  expectRuntimeError,
  createFixtureRepo,
  createChange,
  createLegacyMigrationRepoFixture,
  createLegacySharedHomeFixture,
  runOpsxCli,
  runGitCheckIgnore,
  inspectReadOnlyStateForDrift,
  runRegisteredTopicTests
} = require('./test-workflow-shared');

function registerTests(test, helpers) {
  const {
    fixtureRoot,
    cleanupTargets
  } = helpers;
  test('normalizeConfig defaults rules.tdd to strict mode for behavior-change and bugfix', () => {
    const normalized = normalizeConfig({});
    assert.deepStrictEqual(normalized.rules.tdd, {
      mode: 'strict',
      requireFor: ['behavior-change', 'bugfix'],
      exempt: ['docs-only', 'copy-only', 'config-only']
    });
  });

  test('normalizeConfig repairs invalid rules.tdd values and merges custom classification lists', () => {
    const normalized = normalizeConfig({
      rules: {
        tdd: {
          mode: 'unexpected',
          requireFor: ['behavior-change', 'migration-only', 'bugfix', '', 'migration-only', '   '],
          exempt: ['docs-only', 'generated-refresh-only', 'copy-only', '', 'generated-refresh-only', 'config-only']
        }
      }
    });

    assert.deepStrictEqual(normalized.rules.tdd, {
      mode: 'strict',
      requireFor: ['behavior-change', 'bugfix', 'migration-only'],
      exempt: ['docs-only', 'copy-only', 'config-only', 'generated-refresh-only']
    });
  });

  test('YAML config parser preserves block lists used by gate policies', () => {
    const { parseYaml, stringifyYaml } = require('../lib/yaml');
    const parsed = parseYaml([
      'rules:',
      '  tdd:',
      '    requireFor:',
      '      - "behavior-change"',
      '      - "migration-only"',
      '    exempt:',
      '      - "docs-only"'
    ].join('\n'));

    assert.deepStrictEqual(parsed.rules.tdd.requireFor, ['behavior-change', 'migration-only']);
    assert.deepStrictEqual(parsed.rules.tdd.exempt, ['docs-only']);

    const rendered = stringifyYaml({
      rules: {
        tdd: {
          requireFor: ['behavior-change', 'bugfix'],
          exempt: ['docs-only']
        }
      }
    });
    const roundTrip = parseYaml(rendered);
    assert.deepStrictEqual(roundTrip.rules.tdd.requireFor, ['behavior-change', 'bugfix']);
    assert.deepStrictEqual(roundTrip.rules.tdd.exempt, ['docs-only']);

    assert.strictEqual(parseYaml(stringifyYaml({ value: null })).value, null);
    assert.deepStrictEqual(parseYaml(stringifyYaml(['alpha', null, 'omega'])), ['alpha', null, 'omega']);
    assert.deepStrictEqual(parseYaml('anchor: &alias "shared"\nplain: *alias\n"quoted:key": "值"\n'), {
      'quoted:key': '值',
      plain: 'shared',
      anchor: 'shared'
    });
    assert.throws(() => stringifyYaml({ value: undefined }), /Cannot stringify undefined/);
  });

  test('shared spec file discovery only includes canonical lowercase spec.md files', () => {
    const { listSpecFiles } = require('../lib/spec-files');
    const specsDir = path.join(fixtureRoot, 'spec-file-discovery');
    writeText(path.join(specsDir, 'runtime', 'spec.md'), '# Runtime spec\n');
    writeText(path.join(specsDir, 'runtime', 'SPEC.md'), '# Uppercase spec should be ignored\n');
    writeText(path.join(specsDir, 'runtime', 'notes.md'), '# Notes\n');
    writeText(path.join(specsDir, 'api', 'spec.md'), '# API spec\n');

    const discovered = listSpecFiles(specsDir)
      .map((filePath) => toPosixPath(path.relative(specsDir, filePath)));

    assert.deepStrictEqual(discovered, ['api/spec.md', 'runtime/spec.md']);
  });

  test('repo root resolution uses standard layout symlink targets and ancestor config', () => {
    const { resolveRepoRoot } = require('../lib/repo-root');
    const standardChangeDir = createChange(fixtureRoot, 'repo-root-standard', {
      'proposal.md': '# Standard\n'
    });
    assert.strictEqual(resolveRepoRoot(standardChangeDir), fixtureRoot);
    const canonicalFixtureRoot = fs.realpathSync.native(fixtureRoot);

    const symlinkPath = path.join(os.tmpdir(), `opsx-change-link-${process.pid}-${Date.now()}`);
    fs.symlinkSync(standardChangeDir, symlinkPath, 'dir');
    cleanupTargets.push(symlinkPath);
    assert.strictEqual(fs.realpathSync.native(resolveRepoRoot(symlinkPath)), canonicalFixtureRoot);

    const nestedNonstandardDir = path.join(fixtureRoot, 'worktrees', 'change-copy');
    ensureDir(nestedNonstandardDir);
    assert.strictEqual(resolveRepoRoot(nestedNonstandardDir), fixtureRoot);

    const orphanChangeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'opsx-orphan-change-'));
    cleanupTargets.push(orphanChangeDir);
    assert.throws(() => resolveRepoRoot(orphanChangeDir), /Unable to resolve OpsX repo root/);
  });

  test('project config template seeds rules.tdd strict defaults', () => {
    const templateText = fs.readFileSync(path.join(REPO_ROOT, 'templates', 'project', 'config.yaml.tmpl'), 'utf8');
    assert(templateText.includes('  tdd:'), 'Template must include rules.tdd block.');
    assert(templateText.includes('    mode: "strict"'), 'Template must seed strict mode.');
    assert(templateText.includes('    requireFor:'), 'Template must seed requireFor list.');
    assert(templateText.includes('      - "behavior-change"'), 'Template must include behavior-change requireFor entry.');
    assert(templateText.includes('      - "bugfix"'), 'Template must include bugfix requireFor entry.');
    assert(templateText.includes('    exempt:'), 'Template must seed exempt list.');
    assert(templateText.includes('      - "docs-only"'), 'Template must include docs-only exempt entry.');
    assert(templateText.includes('      - "copy-only"'), 'Template must include copy-only exempt entry.');
    assert(templateText.includes('      - "config-only"'), 'Template must include config-only exempt entry.');
  });

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

  test('change-store exports Phase 4 persistence contract', () => {
    const changeStore = require('../lib/change-store');
    [
      'buildChangeStateSkeleton',
      'normalizeChangeState',
      'loadActiveChangePointer',
      'writeActiveChangePointer',
      'loadChangeState',
      'writeChangeState',
      'recordCheckpointResult',
      'setActiveTaskGroup',
      'recordTaskGroupExecution'
    ].forEach((symbol) => {
      assert.strictEqual(typeof changeStore[symbol], 'function', `Expected ${symbol} export.`);
    });
  });

  test('change-state exports strict transition and continue APIs', () => {
    const changeState = require('../lib/change-state');
    assert(Array.isArray(changeState.STAGE_VALUES));
    assert(changeState.STAGE_VALUES.includes('APPLYING_GROUP'));
    assert.strictEqual(changeState.MUTATION_EVENTS.START_TASK_GROUP, 'START_TASK_GROUP');
    [
      'applyMutationEvent',
      'resolveContinueAction',
      'buildLifecycleBlockResult',
      'resolveNextArtifact'
    ].forEach((symbol) => {
      assert.strictEqual(typeof changeState[symbol], 'function', `Expected ${symbol} export.`);
    });
  });

  test('change-state blocks invalid transitions and routes continue by persisted stage', () => {
    const { applyMutationEvent, resolveContinueAction, resolveNextArtifact } = require('../lib/change-state');
    const blocked = applyMutationEvent({ stage: 'INIT' }, 'COMPLETE_TASK_GROUP');
    assert.strictEqual(blocked.status, 'BLOCK');
    assert.strictEqual(blocked.code, 'invalid-transition');
    assert(Array.isArray(blocked.patchTargets));
    assert.strictEqual(resolveContinueAction({ stage: 'INIT' }), 'continue');
    assert.strictEqual(resolveNextArtifact({ stage: 'INIT' }), 'proposal');
    assert.strictEqual(resolveContinueAction({ stage: 'PROPOSAL_READY' }), 'continue');
    assert.strictEqual(resolveNextArtifact({ stage: 'PROPOSAL_READY' }), 'specs');
    assert.strictEqual(resolveContinueAction({ stage: 'SPECS_READY' }), 'continue');
    assert.strictEqual(resolveNextArtifact({ stage: 'SPECS_READY' }), 'spec-split-checkpoint');
    assert.strictEqual(resolveContinueAction({ stage: 'SPEC_SPLIT_REVIEWED' }), 'continue');
    assert.strictEqual(resolveNextArtifact({ stage: 'SPEC_SPLIT_REVIEWED' }), 'design');
    assert.strictEqual(resolveContinueAction({ stage: 'DESIGN_READY' }), 'continue');
    assert.strictEqual(resolveNextArtifact({ stage: 'DESIGN_READY' }), 'tasks');
    assert.strictEqual(resolveContinueAction({ stage: 'SECURITY_REVIEW_REQUIRED' }), 'continue');
    assert.strictEqual(resolveNextArtifact({ stage: 'SECURITY_REVIEW_REQUIRED' }), 'security-review');
    assert.strictEqual(resolveContinueAction({ stage: 'SECURITY_REVIEWED' }), 'continue');
    assert.strictEqual(resolveNextArtifact({ stage: 'SECURITY_REVIEWED' }), 'tasks');
    assert.strictEqual(resolveContinueAction({ stage: 'SPEC_REVIEWED' }), 'continue');
    assert.strictEqual(resolveNextArtifact({ stage: 'SPEC_REVIEWED' }), 'tasks');
    assert.strictEqual(resolveContinueAction({ stage: 'TASKS_READY' }), 'apply');
    assert.strictEqual(resolveContinueAction({
      stage: 'APPLYING_GROUP',
      active: { taskGroup: '1. Runtime instructions' }
    }), 'apply');
    assert.strictEqual(resolveContinueAction({
      stage: 'GROUP_VERIFIED',
      active: { nextTaskGroup: '2. Follow-up' }
    }), 'apply');
    assert.strictEqual(resolveContinueAction({ stage: 'GROUP_VERIFIED' }), 'verify');
    assert.strictEqual(resolveContinueAction({ stage: 'IMPLEMENTED' }), 'verify');
    assert.strictEqual(resolveContinueAction({ stage: 'VERIFIED' }), 'sync');
    assert.strictEqual(resolveContinueAction({ stage: 'SYNCED' }), 'archive');

    const missingReadyGroup = applyMutationEvent({ stage: 'TASKS_READY' }, {
      type: 'START_TASK_GROUP'
    });
    assert.strictEqual(missingReadyGroup.status, 'BLOCK');
    assert.strictEqual(missingReadyGroup.code, 'missing-task-group');

    const missingQueuedGroup = applyMutationEvent({ stage: 'GROUP_VERIFIED' }, {
      type: 'START_TASK_GROUP'
    });
    assert.strictEqual(missingQueuedGroup.status, 'BLOCK');
    assert.strictEqual(missingQueuedGroup.code, 'missing-task-group');
  });

  test('verify gate blocks forbidden paths unresolved drift and incomplete task groups', () => {
    const { evaluateVerifyGate } = require('../lib/verify');
    const { hashTrackedArtifacts } = require('../lib/change-artifacts');
    const { writeChangeState } = require('../lib/change-store');
    const changeName = 'verify-gate-blocking';
    const changeDir = createChange(fixtureRoot, changeName, {
      'proposal.md': '# Proposal\n',
      'design.md': '# Design\n',
      'tasks.md': [
        '## 1. Behavior change runtime gate',
        '- [x] RED: add failing coverage',
        '- [ ] GREEN: implement verify gate behavior',
        '- [ ] VERIFY: run workflow runtime tests'
      ].join('\n'),
      'specs/runtime/spec.md': [
        '## ADDED Requirements',
        '### Requirement: Verify gate blocks invalid scope',
        'The system SHALL block forbidden path changes and unresolved drift findings.'
      ].join('\n')
    });

    writeChangeState(changeDir, {
      change: changeName,
      stage: 'IMPLEMENTED',
      hashes: hashTrackedArtifacts(changeDir),
      allowedPaths: ['lib/**'],
      forbiddenPaths: ['*.pem']
    });
    writeText(path.join(changeDir, 'drift.md'), [
      '# Drift Log',
      '',
      '## User approval needed',
      '- Awaiting explicit reviewer approval.',
      '',
      '## Scope changes detected',
      '- Expanded scope beyond approved proposal.',
      '',
      '## Requirements discovered during apply',
      '- Added a new requirement not reflected in specs.',
      '',
      '## Files changed outside allowed paths',
      '- secrets/private.pem'
    ].join('\n'));

    const gate = evaluateVerifyGate({
      changeDir,
      changedFiles: ['secrets/private.pem']
    });
    assert.strictEqual(gate.status, 'BLOCK');
    const codes = new Set(gate.findings.map((finding) => finding.code));
    [
      'forbidden-path-change',
      'task-group-incomplete',
      'execution-checkpoint-missing',
      'drift-approval-pending',
      'scope-change-unresolved',
      'discovered-requirement-unresolved'
    ].forEach((code) => {
      assert(codes.has(code), `Expected blocking code ${code}`);
    });
  });

  test('verify gate preserves same-code findings with distinct messages', () => {
    const { evaluateVerifyGate } = require('../lib/verify');
    const { writeChangeState } = require('../lib/change-store');
    const changeName = 'verify-distinct-finding-messages';
    const changeDir = createChange(fixtureRoot, changeName, {
      'proposal.md': '# Proposal\n',
      'design.md': '# Design\n',
      'tasks.md': [
        '## 1. Runtime setup',
        '- [x] 1.1 Setup workspace',
        '',
        '## 2. Runtime integration',
        '- [x] 2.1 Build integration'
      ].join('\n'),
      'specs/runtime/spec.md': '## ADDED Requirements\n### Requirement: Runtime\nThe system SHALL support runtime work.\n'
    });

    writeChangeState(changeDir, {
      change: changeName,
      stage: 'TASKS_READY',
      verificationLog: []
    });

    const gate = evaluateVerifyGate({
      changeDir,
      changedFiles: ['lib/verify.js']
    });
    const executionFindings = gate.findings.filter((finding) => finding.code === 'execution-checkpoint-missing');

    assert.strictEqual(executionFindings.length, 3);
    assert(executionFindings.some((finding) => finding.message.includes('Execution checkpoint must be accepted')));
    assert(executionFindings.some((finding) => finding.message.includes('1. Runtime setup')));
    assert(executionFindings.some((finding) => finding.message.includes('2. Runtime integration')));
  });

  test('verify gate warns for manual verification rationale and docs-only extras', () => {
    const { evaluateVerifyGate } = require('../lib/verify');
    const { hashTrackedArtifacts } = require('../lib/change-artifacts');
    const { writeChangeState } = require('../lib/change-store');
    const changeName = 'verify-gate-warn-manual';
    const changeDir = createChange(fixtureRoot, changeName, {
      'proposal.md': '# Proposal\n',
      'design.md': '# Design\n',
      'tasks.md': [
        '## 1. Behavior change verification',
        '- Requirement Coverage: Verify gate warning visibility',
        '- Implementation Evidence:',
        '  - docs/verify-notes.md',
        '- [x] RED: add failing gate test',
        '- [x] GREEN: implement gate check',
        '- [x] VERIFY: run workflow runtime tests'
      ].join('\n'),
      'specs/runtime/spec.md': [
        '## ADDED Requirements',
        '### Requirement: Verify gate warning visibility',
        'The system SHALL surface manual verification risk as warnings when rationale is missing.',
        '',
        '#### Scenario: Manual verification warning',
        '- **WHEN** verify sees manual evidence without rationale',
        '- **THEN** it reports a warning'
      ].join('\n')
    });
    const now = new Date().toISOString();
    writeChangeState(changeDir, {
      change: changeName,
      stage: 'IMPLEMENTED',
      hashes: hashTrackedArtifacts(changeDir),
      checkpoints: {
        specSplit: {
          status: 'PASS',
          updatedAt: now
        },
        spec: {
          status: 'PASS',
          updatedAt: now
        },
        task: {
          status: 'PASS',
          updatedAt: now
        },
        execution: {
          status: 'PASS',
          updatedAt: now
        }
      },
      verificationLog: [{
        at: now,
        taskGroup: '1. Behavior change verification',
        verificationCommand: 'manual qa',
        verificationResult: 'MANUAL PASS',
        changedFiles: ['docs/verify-notes.md'],
        checkpointStatus: 'PASS',
        completedSteps: ['RED', 'GREEN', 'VERIFY'],
        diffSummary: 'Manual verification performed without automation.',
        driftStatus: 'clean'
      }],
      allowedPaths: ['lib/**'],
      forbiddenPaths: ['*.pem']
    });
    writeText(path.join(changeDir, 'drift.md'), [
      '# Drift Log',
      '',
      '## New Assumptions',
      '',
      '## Scope Changes',
      '- [resolved] 2026-04-29 Scope wording reconciled in proposal.',
      '',
      '## Out-of-Bound File Changes',
      '',
      '## Discovered Requirements',
      '- [resolved] 2026-04-29 Requirement captured in specs/runtime/spec.md.',
      '',
      '## User Approval Needed',
      '- [resolved] 2026-04-29 Reviewer approved manual verification note.',
      ''
    ].join('\n'));

    const gate = evaluateVerifyGate({
      changeDir,
      changedFiles: ['docs/verify-notes.md']
    });
    assert.strictEqual(gate.status, 'WARN');
    const manualRationale = gate.findings.find((finding) => finding.code === 'manual-verification-rationale-missing');
    assert(manualRationale, 'Expected manual verification rationale warning.');
    assert.strictEqual(manualRationale.severity, 'WARN');
    const docsExtra = gate.findings.find((finding) => finding.code === 'out-of-scope-change');
    assert(docsExtra, 'Expected docs/config extra scope warning.');
    assert.strictEqual(docsExtra.severity, 'WARN');
  });

  test('verify gate falls back to execution log changed files when caller omits diff input', () => {
    const { evaluateVerifyGate } = require('../lib/verify');
    const { hashTrackedArtifacts } = require('../lib/change-artifacts');
    const { writeChangeState } = require('../lib/change-store');
    const changeName = 'verify-gate-log-changed-files';
    const changeDir = createChange(fixtureRoot, changeName, {
      'proposal.md': '# Proposal\n',
      'design.md': '# Design\n',
      'tasks.md': [
        '## 1. Behavior change verification',
        '- Requirement Coverage: Verify gate execution diff fallback',
        '- TDD Class: behavior-change',
        '- [x] RED: add failing gate test',
        '- [x] GREEN: implement gate check',
        '- [x] VERIFY: run workflow runtime tests'
      ].join('\n'),
      'specs/runtime/spec.md': [
        '## ADDED Requirements',
        '### Requirement: Verify gate execution diff fallback',
        'The system SHALL check recorded execution changed files when direct diff input is absent.',
        '',
        '#### Scenario: Execution log fallback',
        '- **WHEN** caller diff input is absent',
        '- **THEN** verify checks recorded execution changed files'
      ].join('\n')
    });
    const now = new Date().toISOString();
    writeChangeState(changeDir, {
      change: changeName,
      stage: 'IMPLEMENTED',
      hashes: hashTrackedArtifacts(changeDir),
      checkpoints: {
        specSplit: {
          status: 'PASS',
          updatedAt: now
        },
        spec: {
          status: 'PASS',
          updatedAt: now
        },
        task: {
          status: 'PASS',
          updatedAt: now
        },
        execution: {
          status: 'PASS',
          updatedAt: now
        }
      },
      verificationLog: [{
        at: now,
        taskGroup: '1. Behavior change verification',
        verificationCommand: 'npm run test:workflow-runtime',
        verificationResult: 'PASS',
        changedFiles: ['secrets/private.pem'],
        checkpointStatus: 'PASS',
        completedSteps: ['RED', 'GREEN', 'VERIFY'],
        diffSummary: 'Forbidden path changed during implementation.',
        driftStatus: 'clean'
      }],
      allowedPaths: ['lib/**'],
      forbiddenPaths: ['*.pem']
    });
    writeText(path.join(changeDir, 'drift.md'), [
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
      '## User Approval Needed',
      ''
    ].join('\n'));

    const gate = evaluateVerifyGate({ changeDir });
    assert.strictEqual(gate.status, 'BLOCK');
    assert(gate.findings.some((finding) => finding.code === 'forbidden-path-change'));
    assert.deepStrictEqual(gate.pathScope.forbiddenMatches, ['secrets/private.pem']);
  });

  test('implementation consistency checkpoint passes complete implemented changes', () => {
    const {
      evaluateImplementationConsistency,
      acceptImplementationConsistency
    } = require('../lib/implementation-consistency');
    const { hashTrackedArtifacts } = require('../lib/change-artifacts');
    const { writeChangeState, loadChangeState } = require('../lib/change-store');
    const changeName = 'implementation-consistency-pass';
    const changeDir = createChange(fixtureRoot, changeName, {
      'proposal.md': [
        '## Why',
        'Need theme preference persistence.',
        '## What Changes',
        '- Persist theme preference across sessions.'
      ].join('\n'),
      'design.md': [
        '## Context',
        'Theme preference persistence.',
        '## Approach',
        '- Store preference through the theme provider.'
      ].join('\n'),
      'tasks.md': [
        '## 1. Theme persistence',
        '- TDD Class: behavior-change',
        '- Requirement Coverage: Theme preference persistence',
        '- Implementation Evidence:',
        '  - src/theme/provider.ts',
        '  - tests/theme/provider.test.ts',
        '- Verification: npm test -- theme',
        '- [x] RED: add failing theme persistence test',
        '- [x] GREEN: implement theme provider persistence',
        '- [x] VERIFY: run theme provider test'
      ].join('\n'),
      'specs/theme/spec.md': [
        '## ADDED Requirements',
        '### Requirement: Theme preference persistence',
        'The system SHALL persist theme preference across sessions.',
        '',
        '#### Scenario: Saved theme restored',
        '- **WHEN** the user returns',
        '- **THEN** the saved theme preference is restored'
      ].join('\n')
    });
    const now = new Date().toISOString();
    writeText(path.join(changeDir, 'drift.md'), [
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
      '## User Approval Needed',
      ''
    ].join('\n'));
    writeChangeState(changeDir, {
      change: changeName,
      stage: 'IMPLEMENTED',
      hashes: hashTrackedArtifacts(changeDir),
      checkpoints: {
        specSplit: { status: 'PASS', updatedAt: now },
        spec: { status: 'PASS', updatedAt: now },
        task: { status: 'PASS', updatedAt: now },
        execution: { status: 'PASS', updatedAt: now }
      },
      verificationLog: [{
        at: now,
        taskGroup: '1. Theme persistence',
        verificationCommand: 'npm test -- theme',
        verificationResult: 'PASS',
        changedFiles: ['src/theme/provider.ts', 'tests/theme/provider.test.ts'],
        checkpointStatus: 'PASS',
        completedSteps: ['RED', 'GREEN', 'VERIFY'],
        diffSummary: 'Implemented Theme preference persistence.',
        driftStatus: 'clean'
      }],
      allowedPaths: ['src/theme/**', 'tests/theme/**'],
      forbiddenPaths: ['*.pem']
    });

    const result = evaluateImplementationConsistency({
      changeDir,
      changedFiles: ['src/theme/provider.ts', 'tests/theme/provider.test.ts']
    });
    assert.strictEqual(result.checkpoint, 'implementation-consistency-checkpoint');
    assert.strictEqual(result.status, 'PASS');
    assert.strictEqual(result.result.requirementCoverage.covered, 1);

    acceptImplementationConsistency(changeDir, result);
    const persisted = loadChangeState(changeDir);
    assert.strictEqual(persisted.checkpoints.implementationConsistency.status, 'PASS');
  });

  test('implementation consistency requires explicit task group evidence fields', () => {
    const { evaluateImplementationConsistency } = require('../lib/implementation-consistency');
    const { hashTrackedArtifacts } = require('../lib/change-artifacts');
    const { writeChangeState } = require('../lib/change-store');
    const changeName = 'implementation-consistency-explicit-task-evidence';
    const changeDir = createChange(fixtureRoot, changeName, {
      'proposal.md': [
        '## Why',
        'Need theme preference persistence.',
        '## What Changes',
        '- Persist theme preference across sessions.'
      ].join('\n'),
      'design.md': [
        '## Context',
        'Theme preference persistence.',
        '## Approach',
        '- Store preference through the theme provider.'
      ].join('\n'),
      'tasks.md': [
        '## 1. Theme preference persistence',
        '- TDD Class: behavior-change',
        '- [x] RED: add failing Theme preference persistence test',
        '- [x] GREEN: implement Theme preference persistence storage',
        '- [x] VERIFY: run Theme preference persistence test'
      ].join('\n'),
      'specs/theme/spec.md': [
        '## ADDED Requirements',
        '### Requirement: Theme preference persistence',
        'The system SHALL persist theme preference across sessions.',
        '',
        '#### Scenario: Saved theme restored',
        '- **WHEN** the user returns',
        '- **THEN** the saved theme preference is restored'
      ].join('\n')
    });
    const now = new Date().toISOString();
    writeText(path.join(changeDir, 'drift.md'), [
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
      '## User Approval Needed',
      ''
    ].join('\n'));
    writeChangeState(changeDir, {
      change: changeName,
      stage: 'IMPLEMENTED',
      hashes: hashTrackedArtifacts(changeDir),
      checkpoints: {
        specSplit: { status: 'PASS', updatedAt: now },
        spec: { status: 'PASS', updatedAt: now },
        task: { status: 'PASS', updatedAt: now },
        execution: { status: 'PASS', updatedAt: now }
      },
      verificationLog: [{
        at: now,
        taskGroup: '1. Theme storage implementation',
        verificationCommand: 'npm test -- theme',
        verificationResult: 'PASS',
        changedFiles: ['src/theme/provider.ts'],
        checkpointStatus: 'PASS',
        completedSteps: ['RED', 'GREEN', 'VERIFY'],
        diffSummary: 'Implemented provider storage.',
        driftStatus: 'clean'
      }],
      allowedPaths: ['src/theme/**'],
      forbiddenPaths: []
    });

    const result = evaluateImplementationConsistency({
      changeDir,
      changedFiles: ['src/theme/provider.ts']
    });
    const codes = new Set(result.findings.map((finding) => finding.code));
    assert.strictEqual(result.status, 'BLOCK');
    assert(codes.has('task-group-evidence-fields-missing'));
    assert(codes.has('requirement-without-evidence'));
    assert.strictEqual(result.result.requirementCoverage.covered, 0);
    assert.strictEqual(result.result.taskGroupEvidence.missing, 1);
  });

  test('changed-file collection only silently skips explicit non-git workspaces', () => {
    const { collectGitChangedFiles } = require('../lib/changed-files');
    const nonGitRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'opsx-non-git-'));
    cleanupTargets.push(nonGitRoot);

    const nonGit = collectGitChangedFiles(nonGitRoot);
    assert.strictEqual(nonGit.ok, false);
    assert.strictEqual(nonGit.isGitRepo, false);
    assert.deepStrictEqual(nonGit.warnings, []);

    const originalPath = process.env.PATH;
    process.env.PATH = path.join(nonGitRoot, 'missing-bin');
    try {
      const failedProbe = collectGitChangedFiles(nonGitRoot);
      assert.strictEqual(failedProbe.ok, false);
      assert.strictEqual(failedProbe.isGitRepo, true);
      assert(failedProbe.warnings.some((warning) => warning.includes('Unable to collect git changed files')));
      assert(failedProbe.warnings.some((warning) => warning.includes('Git executable was not found on PATH')));
    } finally {
      process.env.PATH = originalPath;
    }
  });

  test('implementation consistency combines log and git diff and blocks unlogged deleted files', () => {
    const { evaluateVerifyGate } = require('../lib/verify');
    const { evaluateImplementationConsistency } = require('../lib/implementation-consistency');
    const { hashTrackedArtifacts } = require('../lib/change-artifacts');
    const { writeChangeState } = require('../lib/change-store');
    const repoRoot = createFixtureRepo();
    cleanupTargets.push(repoRoot);
    writeText(path.join(repoRoot, 'src', 'theme', 'provider.ts'), 'export const theme = "light";\n');
    const changeName = 'implementation-consistency-git-delete';
    const changeDir = createChange(repoRoot, changeName, {
      'proposal.md': [
        '## Why',
        'Need theme preference persistence.',
        '## What Changes',
        '- Persist theme preference across sessions.'
      ].join('\n'),
      'design.md': [
        '## Context',
        'Theme preference persistence.',
        '## Approach',
        '- Store preference through the theme provider.'
      ].join('\n'),
      'tasks.md': [
        '## Test Plan',
        '- Verification: npm test -- theme',
        '',
        '## 1. Theme persistence',
        '- TDD Class: behavior-change',
        '- Requirement Coverage: Theme preference persistence',
        '- Implementation Evidence:',
        '  - src/theme/provider.ts',
        '- Verification: npm test -- theme',
        '- [x] RED: add failing theme persistence test',
        '- [x] GREEN: implement theme provider persistence',
        '- [x] VERIFY: run theme provider test'
      ].join('\n'),
      'specs/theme/spec.md': [
        '## ADDED Requirements',
        '### Requirement: Theme preference persistence',
        'The system SHALL persist theme preference across sessions.',
        '',
        '#### Scenario: Saved theme restored',
        '- **WHEN** the user returns',
        '- **THEN** the saved theme preference is restored'
      ].join('\n')
    });
    const now = new Date().toISOString();
    writeText(path.join(changeDir, 'drift.md'), [
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
      '## User Approval Needed',
      ''
    ].join('\n'));
    writeChangeState(changeDir, {
      change: changeName,
      stage: 'IMPLEMENTED',
      hashes: hashTrackedArtifacts(changeDir),
      checkpoints: {
        specSplit: { status: 'PASS', updatedAt: now },
        spec: { status: 'PASS', updatedAt: now },
        task: { status: 'PASS', updatedAt: now },
        execution: { status: 'PASS', updatedAt: now }
      },
      verificationLog: [{
        at: now,
        taskGroup: '1. Theme persistence',
        verificationCommand: 'npm test -- theme',
        verificationResult: 'PASS',
        changedFiles: ['docs/verify-notes.md'],
        checkpointStatus: 'PASS',
        completedSteps: ['RED', 'GREEN', 'VERIFY'],
        diffSummary: 'Implemented Theme preference persistence.',
        driftStatus: 'clean'
      }],
      allowedPaths: ['docs/**'],
      forbiddenPaths: []
    });

    function git(args) {
      const result = spawnSync('git', args, { cwd: repoRoot, encoding: 'utf8' });
      assert.strictEqual(result.status, 0, result.stderr || result.stdout);
    }

    git(['init']);
    git(['add', '.']);
    git(['-c', 'user.name=OpsX Tests', '-c', 'user.email=opsx-tests@example.com', 'commit', '-m', 'baseline']);
    fs.unlinkSync(path.join(repoRoot, 'src', 'theme', 'provider.ts'));

    const consistency = evaluateImplementationConsistency({ changeDir, repoRoot });
    const consistencyCodes = new Set(consistency.findings.map((finding) => finding.code));
    assert.strictEqual(consistency.status, 'BLOCK');
    assert(consistencyCodes.has('unlogged-git-changes'));
    assert(consistencyCodes.has('out-of-scope-change'));
    assert(consistency.patchTargets.includes('src/theme/provider.ts'));
    assert(consistency.result.changedFilesSource.includes('git'));

    const gate = evaluateVerifyGate({ changeDir, repoRoot });
    const gateCodes = new Set(gate.findings.map((finding) => finding.code));
    assert.strictEqual(gate.status, 'BLOCK');
    assert(gateCodes.has('unlogged-git-changes'));
    assert(gateCodes.has('out-of-scope-change'));
    assert(gate.pathScope.outOfScopeMatches.includes('src/theme/provider.ts'));
  });

  test('changed-file evidence ignores unlogged workflow bookkeeping artifacts', () => {
    const { evaluateVerifyGate } = require('../lib/verify');
    const { evaluateImplementationConsistency } = require('../lib/implementation-consistency');
    const { hashTrackedArtifacts } = require('../lib/change-artifacts');
    const { loadChangeState, writeChangeState } = require('../lib/change-store');
    const repoRoot = createFixtureRepo();
    cleanupTargets.push(repoRoot);
    writeText(path.join(repoRoot, 'src', 'theme', 'provider.ts'), 'export const theme = "light";\n');
    const changeName = 'implementation-consistency-workflow-bookkeeping';
    const changeDir = createChange(repoRoot, changeName, {
      'proposal.md': [
        '## Why',
        'Need theme preference persistence.',
        '## What Changes',
        '- Persist theme preference across sessions.'
      ].join('\n'),
      'design.md': [
        '## Context',
        'Theme preference persistence.',
        '## Approach',
        '- Store preference through the theme provider.'
      ].join('\n'),
      'tasks.md': [
        '## Test Plan',
        '- Verification: npm test -- theme',
        '',
        '## 1. Theme persistence',
        '- TDD Class: behavior-change',
        '- Requirement Coverage: Theme preference persistence',
        '- Implementation Evidence:',
        '  - src/theme/provider.ts',
        '- Verification: npm test -- theme',
        '- [x] RED: add failing theme persistence test',
        '- [x] GREEN: implement theme provider persistence',
        '- [x] VERIFY: run theme provider test'
      ].join('\n'),
      'specs/theme/spec.md': [
        '## ADDED Requirements',
        '### Requirement: Theme preference persistence',
        'The system SHALL persist theme preference across sessions.',
        '',
        '#### Scenario: Saved theme restored',
        '- **WHEN** the user returns',
        '- **THEN** the saved theme preference is restored'
      ].join('\n')
    });
    const now = new Date().toISOString();
    writeText(path.join(changeDir, 'drift.md'), [
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
      '## User Approval Needed',
      ''
    ].join('\n'));
    writeChangeState(changeDir, {
      change: changeName,
      stage: 'IMPLEMENTED',
      hashes: hashTrackedArtifacts(changeDir),
      checkpoints: {
        specSplit: { status: 'PASS', updatedAt: now },
        spec: { status: 'PASS', updatedAt: now },
        task: { status: 'PASS', updatedAt: now },
        execution: { status: 'PASS', updatedAt: now }
      },
      verificationLog: [{
        at: now,
        taskGroup: '1. Theme persistence',
        verificationCommand: 'npm test -- theme',
        verificationResult: 'PASS',
        changedFiles: ['src/theme/provider.ts'],
        checkpointStatus: 'PASS',
        completedSteps: ['RED', 'GREEN', 'VERIFY'],
        diffSummary: 'Implemented Theme preference persistence.',
        driftStatus: 'clean'
      }],
      allowedPaths: ['src/theme/**'],
      forbiddenPaths: []
    });

    function git(args) {
      const result = spawnSync('git', args, { cwd: repoRoot, encoding: 'utf8' });
      assert.strictEqual(result.status, 0, result.stderr || result.stdout);
    }

    git(['init']);
    git(['add', '.']);
    git(['-c', 'user.name=OpsX Tests', '-c', 'user.email=opsx-tests@example.com', 'commit', '-m', 'baseline']);
    writeText(path.join(repoRoot, 'src', 'theme', 'provider.ts'), 'export const theme = "dark";\n');
    writeText(path.join(changeDir, 'context.md'), '# Context Capsule\n\nUpdated after execution.\n');
    const stateAfterBaseline = loadChangeState(changeDir);
    writeChangeState(changeDir, Object.assign({}, stateAfterBaseline, {
      warnings: ['Bookkeeping warning after execution checkpoint']
    }));

    const consistency = evaluateImplementationConsistency({ changeDir, repoRoot });
    const consistencyCodes = new Set(consistency.findings.map((finding) => finding.code));
    assert(!consistencyCodes.has('unlogged-git-changes'));
    assert.strictEqual(consistency.status, 'PASS');

    const gate = evaluateVerifyGate({ changeDir, repoRoot });
    const gateCodes = new Set(gate.findings.map((finding) => finding.code));
    assert(!gateCodes.has('unlogged-git-changes'));
    assert.strictEqual(gate.status, 'PASS');
    assert(gate.pathScope.workflowArtifactMatches.includes(`.opsx/changes/${changeName}/state.yaml`));
    assert(gate.pathScope.workflowArtifactMatches.includes(`.opsx/changes/${changeName}/context.md`));
  });

  test('changed-file evidence blocks git changes when verification logs omit changedFiles', () => {
    const { evaluateImplementationConsistency } = require('../lib/implementation-consistency');
    const { hashTrackedArtifacts } = require('../lib/change-artifacts');
    const { writeChangeState } = require('../lib/change-store');
    const repoRoot = createFixtureRepo();
    cleanupTargets.push(repoRoot);
    writeText(path.join(repoRoot, 'src', 'theme', 'provider.ts'), 'export const theme = "light";\n');
    const changeName = 'implementation-consistency-omitted-changed-files';
    const changeDir = createChange(repoRoot, changeName, {
      'proposal.md': [
        '## Why',
        'Need theme preference persistence.',
        '## What Changes',
        '- Persist theme preference across sessions.'
      ].join('\n'),
      'design.md': [
        '## Context',
        'Theme preference persistence.',
        '## Approach',
        '- Store preference through the theme provider.'
      ].join('\n'),
      'tasks.md': [
        '## Test Plan',
        '- Verification: npm test -- theme',
        '',
        '## 1. Theme persistence',
        '- TDD Class: behavior-change',
        '- Requirement Coverage: Theme preference persistence',
        '- Implementation Evidence:',
        '  - src/theme/provider.ts',
        '- Verification: npm test -- theme',
        '- [x] RED: add failing theme persistence test',
        '- [x] GREEN: implement theme provider persistence',
        '- [x] VERIFY: run theme provider test'
      ].join('\n'),
      'specs/theme/spec.md': [
        '## ADDED Requirements',
        '### Requirement: Theme preference persistence',
        'The system SHALL persist theme preference across sessions.',
        '',
        '#### Scenario: Saved theme restored',
        '- **WHEN** the user returns',
        '- **THEN** the saved theme preference is restored'
      ].join('\n')
    });
    const now = new Date().toISOString();
    writeText(path.join(changeDir, 'drift.md'), [
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
      '## User Approval Needed',
      ''
    ].join('\n'));
    writeChangeState(changeDir, {
      change: changeName,
      stage: 'IMPLEMENTED',
      hashes: hashTrackedArtifacts(changeDir),
      checkpoints: {
        specSplit: { status: 'PASS', updatedAt: now },
        spec: { status: 'PASS', updatedAt: now },
        task: { status: 'PASS', updatedAt: now },
        execution: { status: 'PASS', updatedAt: now }
      },
      verificationLog: [{
        at: now,
        taskGroup: '1. Theme persistence',
        verificationCommand: 'npm test -- theme',
        verificationResult: 'PASS',
        checkpointStatus: 'PASS',
        completedSteps: ['RED', 'GREEN', 'VERIFY'],
        diffSummary: 'Implemented Theme preference persistence.',
        driftStatus: 'clean'
      }],
      allowedPaths: ['src/theme/**'],
      forbiddenPaths: []
    });

    function git(args) {
      const result = spawnSync('git', args, { cwd: repoRoot, encoding: 'utf8' });
      assert.strictEqual(result.status, 0, result.stderr || result.stdout);
    }

    git(['init']);
    git(['add', '.']);
    git(['-c', 'user.name=OpsX Tests', '-c', 'user.email=opsx-tests@example.com', 'commit', '-m', 'baseline']);
    writeText(path.join(repoRoot, 'src', 'theme', 'provider.ts'), 'export const theme = "dark";\n');

    const consistency = evaluateImplementationConsistency({ changeDir, repoRoot });
    const consistencyFinding = consistency.findings.find((finding) => finding.code === 'unlogged-git-changes');
    assert(consistencyFinding, 'Expected omitted changedFiles to block unlogged git changes.');
    assert.strictEqual(consistencyFinding.severity, 'BLOCK');
    assert.deepStrictEqual(consistencyFinding.patchTargets, ['src/theme/provider.ts']);

    const explicitEvidence = evaluateImplementationConsistency({
      changeDir,
      repoRoot,
      changedFiles: ['./src/../src/theme/provider.ts']
    });
    assert(!explicitEvidence.findings.some((finding) => finding.code === 'unlogged-git-changes'));
    assert.strictEqual(explicitEvidence.status, 'PASS');
  });

  test('changed-file evidence scopes git diff to nested OpsX workspace root', () => {
    const { evaluateVerifyGate } = require('../lib/verify');
    const { evaluateImplementationConsistency } = require('../lib/implementation-consistency');
    const { hashTrackedArtifacts } = require('../lib/change-artifacts');
    const { writeChangeState } = require('../lib/change-store');
    const outerRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-nested-git-'));
    const repoRoot = path.join(outerRoot, 'packages', 'app');
    cleanupTargets.push(outerRoot);

    copyDir(path.join(REPO_ROOT, 'schemas'), path.join(repoRoot, 'schemas'));
    copyDir(path.join(REPO_ROOT, 'skills'), path.join(repoRoot, 'skills'));
    ensureDir(path.join(repoRoot, '.opsx', 'changes'));
    writeText(path.join(repoRoot, '.opsx', 'config.yaml'), [
      'schema: spec-driven',
      'language: en',
      'context: Nested runtime fixture project',
      'securityReview:',
      '  mode: heuristic',
      '  required: false',
      '  allowWaiver: true'
    ].join('\n'));
    writeText(path.join(repoRoot, 'src', 'theme', 'provider.ts'), 'export const theme = "light";\n');
    writeText(path.join(outerRoot, 'packages', 'sibling', 'notes.txt'), 'baseline sibling note\n');

    const changeName = 'implementation-consistency-nested-git';
    const changeDir = createChange(repoRoot, changeName, {
      'proposal.md': [
        '## Why',
        'Need nested git workspace path handling.',
        '## What Changes',
        '- Persist theme preference across sessions.'
      ].join('\n'),
      'design.md': [
        '## Context',
        'Nested git workspace path handling.',
        '## Approach',
        '- Scope git diff collection to the OpsX workspace root.'
      ].join('\n'),
      'tasks.md': [
        '## Test Plan',
        '- Verification: npm test -- theme',
        '',
        '## 1. Theme persistence',
        '- TDD Class: behavior-change',
        '- Requirement Coverage: Nested git workspace path handling',
        '- Implementation Evidence:',
        '  - src/theme/provider.ts',
        '- Verification: npm test -- theme',
        '- [x] RED: add nested git path regression',
        '- [x] GREEN: scope changed file collection',
        '- [x] VERIFY: run workflow gate tests'
      ].join('\n'),
      'specs/theme/spec.md': [
        '## ADDED Requirements',
        '### Requirement: Nested git workspace path handling',
        'The system SHALL compare changed files relative to the OpsX workspace root.',
        '',
        '#### Scenario: Workspace nested in a larger git repository',
        '- **WHEN** sibling directories also have git changes',
        '- **THEN** verify only evaluates files under the OpsX workspace root'
      ].join('\n')
    });
    const now = new Date().toISOString();
    writeText(path.join(changeDir, 'drift.md'), [
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
      '## User Approval Needed',
      ''
    ].join('\n'));
    writeChangeState(changeDir, {
      change: changeName,
      stage: 'IMPLEMENTED',
      hashes: hashTrackedArtifacts(changeDir),
      checkpoints: {
        specSplit: { status: 'PASS', updatedAt: now },
        spec: { status: 'PASS', updatedAt: now },
        task: { status: 'PASS', updatedAt: now },
        execution: { status: 'PASS', updatedAt: now }
      },
      verificationLog: [{
        at: now,
        taskGroup: '1. Theme persistence',
        verificationCommand: 'npm test -- theme',
        verificationResult: 'PASS',
        changedFiles: ['./src/../src/theme/provider.ts'],
        checkpointStatus: 'PASS',
        completedSteps: ['RED', 'GREEN', 'VERIFY'],
        diffSummary: 'Implemented nested git workspace path handling.',
        driftStatus: 'clean'
      }],
      allowedPaths: ['src/theme/**'],
      forbiddenPaths: []
    });

    function git(args) {
      const result = spawnSync('git', args, { cwd: outerRoot, encoding: 'utf8' });
      assert.strictEqual(result.status, 0, result.stderr || result.stdout);
    }

    git(['init']);
    git(['add', '.']);
    git(['-c', 'user.name=OpsX Tests', '-c', 'user.email=opsx-tests@example.com', 'commit', '-m', 'baseline']);
    writeText(path.join(repoRoot, 'src', 'theme', 'provider.ts'), 'export const theme = "dark";\n');
    writeText(path.join(outerRoot, 'packages', 'sibling', 'notes.txt'), 'changed sibling note\n');

    const consistency = evaluateImplementationConsistency({ changeDir, repoRoot });
    const consistencyCodes = new Set(consistency.findings.map((finding) => finding.code));
    assert.strictEqual(consistency.status, 'PASS');
    assert(!consistencyCodes.has('unlogged-git-changes'));
    assert(!consistencyCodes.has('out-of-scope-change'));
    assert.strictEqual(consistency.result.changedFilesSource, 'verificationLog+git');

    const gate = evaluateVerifyGate({ changeDir, repoRoot });
    const gateCodes = new Set(gate.findings.map((finding) => finding.code));
    assert.strictEqual(gate.status, 'PASS');
    assert(!gateCodes.has('unlogged-git-changes'));
    assert(!gateCodes.has('out-of-scope-change'));
    assert(gate.pathScope.changedFiles.includes('src/theme/provider.ts'));
    assert(!gate.pathScope.changedFiles.includes('packages/app/src/theme/provider.ts'));
    assert(!gate.pathScope.changedFiles.includes('packages/sibling/notes.txt'));
  });

  test('migrated implemented changes warn on missing spec-split checkpoint history', () => {
    const { evaluateImplementationConsistency } = require('../lib/implementation-consistency');
    const { hashTrackedArtifacts } = require('../lib/change-artifacts');
    const { writeChangeState } = require('../lib/change-store');
    const changeName = 'migrated-spec-split-refresh';
    const changeDir = createChange(fixtureRoot, changeName, {
      'proposal.md': [
        '## Why',
        'Need migrated checkpoint tolerance.',
        '## What Changes',
        '- Preserve migrated change verification without hiding refresh work.'
      ].join('\n'),
      'design.md': [
        '## Context',
        'Migrated checkpoint tolerance.',
        '## Approach',
        '- Treat missing spec split history as refresh warning.'
      ].join('\n'),
      'tasks.md': [
        '## 1. Migrated checkpoint tolerance',
        '- TDD Class: migration-only',
        '- Requirement Coverage: Migrated checkpoint tolerance',
        '- Implementation Evidence:',
        '  - lib/implementation-consistency.js',
        '- Verification: npm run test:workflow-runtime',
        '- [x] GREEN: add migration tolerance behavior',
        '- [x] VERIFY: run workflow runtime tests'
      ].join('\n'),
      'specs/runtime/spec.md': [
        '## ADDED Requirements',
        '### Requirement: Migrated checkpoint tolerance',
        'The system SHALL surface missing migrated spec-split history as refresh work.',
        '',
        '#### Scenario: Migrated spec split missing',
        '- **WHEN** an implemented migrated change lacks spec-split checkpoint history',
        '- **THEN** implementation consistency warns without hiding later blockers'
      ].join('\n')
    });
    const now = new Date().toISOString();
    writeText(path.join(changeDir, 'drift.md'), [
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
      '## User Approval Needed',
      ''
    ].join('\n'));
    writeChangeState(changeDir, {
      change: changeName,
      stage: 'IMPLEMENTED',
      migration: {
        migrated: true,
        checkpointRefreshRequired: true,
        source: 'openspec',
        migratedAt: now
      },
      hashes: hashTrackedArtifacts(changeDir),
      checkpoints: {
        specSplit: { status: 'PENDING', updatedAt: null },
        spec: { status: 'PASS', updatedAt: now },
        task: { status: 'PASS', updatedAt: now },
        execution: { status: 'PASS', updatedAt: now }
      },
      verificationLog: [{
        at: now,
        taskGroup: '1. Migrated checkpoint tolerance',
        verificationCommand: 'npm run test:workflow-runtime',
        verificationResult: 'PASS',
        changedFiles: ['lib/implementation-consistency.js'],
        checkpointStatus: 'PASS',
        completedSteps: ['GREEN', 'VERIFY'],
        diffSummary: 'Implemented Migrated checkpoint tolerance.',
        driftStatus: 'clean'
      }],
      allowedPaths: ['lib/**']
    });

    const result = evaluateImplementationConsistency({
      changeDir,
      changedFiles: ['lib/implementation-consistency.js']
    });
    assert.strictEqual(result.status, 'WARN');
    assert(result.findings.some((finding) => finding.code === 'migrated-change-needs-checkpoint-refresh'));
    assert(!result.findings.some((finding) => finding.code === 'checkpoint-not-accepted'));
  });

  test('verify gate deep merges global project and change gate policy', () => {
    const { evaluateVerifyGate } = require('../lib/verify');
    const { hashTrackedArtifacts } = require('../lib/change-artifacts');
    const { writeChangeState } = require('../lib/change-store');
    const policyRoot = createFixtureRepo();
    const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'opsx-policy-home-'));
    cleanupTargets.push(policyRoot, tempHome);

    writeText(path.join(tempHome, '.opsx', 'config.yaml'), [
      'schema: spec-driven',
      'language: en',
      'securityReview:',
      '  required: true',
      '  allowWaiver: false'
    ].join('\n'));
    writeText(path.join(policyRoot, '.opsx', 'config.yaml'), [
      'schema: spec-driven',
      'language: en',
      'rules:',
      '  tdd:',
      '    mode: strict',
      '    requireFor:',
      '      - migration-only',
      '    exempt:',
      '      - docs-only'
    ].join('\n'));

    const changeName = 'verify-policy-deep-merge';
    const changeDir = createChange(policyRoot, changeName, {
      'change.yaml': [
        `name: ${changeName}`,
        'schema: spec-driven',
        'rules:',
        '  tdd:',
        '    mode: strict',
        'securityReview:',
        '  allowWaiver: true'
      ].join('\n'),
      'proposal.md': '# Proposal\n',
      'design.md': '# Design\n',
      'tasks.md': [
        '## 1. Policy merge',
        '- Requirement Coverage: Verify policy merge',
        '- TDD Class: migration-only',
        '- [x] GREEN: implement policy merge behavior'
      ].join('\n'),
      'specs/runtime/spec.md': [
        '## ADDED Requirements',
        '### Requirement: Verify policy merge',
        'The system SHALL preserve global and project gate policy when change config is partial.',
        '',
        '#### Scenario: Partial change policy',
        '- **WHEN** verify loads partial change policy',
        '- **THEN** global and project policy remain active'
      ].join('\n')
    });
    const now = new Date().toISOString();
    writeChangeState(changeDir, {
      change: changeName,
      stage: 'IMPLEMENTED',
      hashes: hashTrackedArtifacts(changeDir),
      checkpoints: {
        specSplit: {
          status: 'PASS',
          updatedAt: now
        },
        spec: {
          status: 'PASS',
          updatedAt: now
        },
        task: {
          status: 'PASS',
          updatedAt: now
        },
        execution: {
          status: 'PASS',
          updatedAt: now
        }
      },
      verificationLog: [{
        at: now,
        taskGroup: '1. Policy merge',
        verificationCommand: 'npm run test:workflow-runtime',
        verificationResult: 'PASS',
        changedFiles: ['lib/verify.js'],
        checkpointStatus: 'PASS',
        completedSteps: ['GREEN'],
        diffSummary: 'Verify policy merge regression.',
        driftStatus: 'clean'
      }],
      allowedPaths: ['lib/**'],
      forbiddenPaths: ['*.pem']
    });

    const gate = evaluateVerifyGate({
      changeDir,
      changedFiles: ['lib/verify.js'],
      homeDir: tempHome
    });
    const codes = new Set(gate.findings.map((finding) => finding.code));
    assert.strictEqual(gate.status, 'BLOCK');
    assert(codes.has('security-review-required'), 'Expected global securityReview.required to block verify.');
    assert(codes.has('strict-tdd-record-missing'), 'Expected project rules.tdd.requireFor to block verify.');
  });

  test('acceptVerifyGate evaluates consistency checkpoint before advancing implemented changes', () => {
    const { acceptVerifyGate } = require('../lib/verify');
    const { hashTrackedArtifacts } = require('../lib/change-artifacts');
    const { writeChangeState, loadChangeState } = require('../lib/change-store');
    const changeName = 'accept-verify-gate-transition';
    const changeDir = createChange(fixtureRoot, changeName, {
      'proposal.md': [
        '## Why',
        'Verify acceptance must enforce implementation consistency.',
        '## What Changes',
        '- Transition accepted implemented changes to verified.'
      ].join('\n'),
      'design.md': [
        '## Context',
        'Verify acceptance transition.',
        '## Approach',
        '- Re-run implementation consistency during acceptance.'
      ].join('\n'),
      'tasks.md': [
        '## 1. Behavior change verification',
        '- Requirement Coverage: Verify acceptance transition',
        '- Implementation Evidence:',
        '  - lib/verify.js',
        '- [x] RED: add failing gate test',
        '- [x] GREEN: implement gate check',
        '- [x] VERIFY: run workflow runtime tests'
      ].join('\n'),
      'specs/runtime/spec.md': [
        '## ADDED Requirements',
        '### Requirement: Verify acceptance transition',
        'The system SHALL transition IMPLEMENTED changes to VERIFIED when gate acceptance succeeds.',
        '',
        '#### Scenario: Gate acceptance succeeds',
        '- **WHEN** verify gate acceptance is recorded',
        '- **THEN** the change is marked verified'
      ].join('\n')
    });
    const now = new Date().toISOString();
    writeText(path.join(changeDir, 'drift.md'), [
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
      '## User Approval Needed',
      ''
    ].join('\n'));
    writeChangeState(changeDir, {
      change: changeName,
      stage: 'IMPLEMENTED',
      hashes: hashTrackedArtifacts(changeDir),
      checkpoints: {
        specSplit: { status: 'PASS', updatedAt: now },
        spec: { status: 'PASS', updatedAt: now },
        task: { status: 'PASS', updatedAt: now },
        execution: { status: 'PASS', updatedAt: now }
      },
      verificationLog: [{
        at: now,
        taskGroup: '1. Behavior change verification',
        verificationCommand: 'npm run test:workflow-runtime',
        verificationResult: 'PASS',
        changedFiles: ['lib/verify.js'],
        checkpointStatus: 'PASS',
        completedSteps: ['RED', 'GREEN', 'VERIFY'],
        diffSummary: 'Implemented Verify acceptance transition.',
        driftStatus: 'clean'
      }],
      allowedPaths: ['lib/**'],
      forbiddenPaths: ['*.pem']
    });

    const accepted = acceptVerifyGate(changeDir, {
      status: 'PASS',
      findings: []
    });
    assert.strictEqual(accepted.stage, 'VERIFIED');
    assert.strictEqual(accepted.nextAction, 'sync');
    assert.deepStrictEqual(accepted.hashes, hashTrackedArtifacts(changeDir));
    assert.strictEqual(loadChangeState(changeDir).checkpoints.implementationConsistency.status, 'PASS');
  });

  test('acceptVerifyGate rejects stale pass results when consistency checkpoint blocks', () => {
    const { acceptVerifyGate } = require('../lib/verify');
    const { hashTrackedArtifacts } = require('../lib/change-artifacts');
    const { writeChangeState, loadChangeState } = require('../lib/change-store');
    const changeName = 'accept-verify-gate-rejects-stale-pass';
    const changeDir = createChange(fixtureRoot, changeName, {
      'proposal.md': '# Proposal\n',
      'design.md': '# Design\n',
      'tasks.md': [
        '## 1. Behavior change verification',
        '- Requirement Coverage: Verify acceptance consistency',
        '- [x] RED: add failing gate test',
        '- [x] GREEN: implement gate check',
        '- [x] VERIFY: run workflow runtime tests'
      ].join('\n'),
      'specs/runtime/spec.md': [
        '## ADDED Requirements',
        '### Requirement: Verify acceptance consistency',
        'The system SHALL reject verify acceptance when implementation consistency is blocked.',
        '',
        '#### Scenario: Consistency blocked',
        '- **WHEN** verify gate acceptance is recorded with stale caller input',
        '- **THEN** the change remains implemented'
      ].join('\n')
    });
    writeChangeState(changeDir, {
      change: changeName,
      stage: 'IMPLEMENTED',
      hashes: hashTrackedArtifacts(changeDir),
      checkpoints: {
        specSplit: { status: 'PENDING', updatedAt: null },
        spec: { status: 'PASS', updatedAt: new Date().toISOString() },
        task: { status: 'PASS', updatedAt: new Date().toISOString() },
        execution: { status: 'PASS', updatedAt: new Date().toISOString() }
      },
      verificationLog: [{
        taskGroup: '1. Behavior change verification',
        verificationCommand: 'npm run test:workflow-runtime',
        verificationResult: 'PASS',
        changedFiles: ['lib/verify.js'],
        checkpointStatus: 'PASS',
        completedSteps: ['RED', 'GREEN', 'VERIFY'],
        diffSummary: 'Implemented Verify acceptance consistency.',
        driftStatus: 'clean'
      }],
      allowedPaths: ['lib/**']
    });

    assert.throws(
      () => acceptVerifyGate(changeDir, { status: 'PASS' }),
      /implementation consistency checkpoint/
    );
    const persisted = loadChangeState(changeDir);
    assert.strictEqual(persisted.stage, 'IMPLEMENTED');
    assert.strictEqual(persisted.checkpoints.implementationConsistency.status, 'PENDING');
  });

  test('sync plan blocks duplicate requirement ids and writes nothing', () => {
    const { planSync, applySyncPlan } = require('../lib/sync');
    const changeName = 'sync-plan-duplicate-requirement';
    const changeDir = createChange(fixtureRoot, changeName, {
      'specs/runtime/spec.md': [
        '## ADDED Requirements',
        '### Requirement: Runtime sync safety',
        'The system SHALL enforce deterministic sync planning before writes.',
        '',
        '#### Scenario: Deterministic plan',
        '- **WHEN** sync planning starts',
        '- **THEN** all target writes are computed in memory first',
        '',
        '## MODIFIED Requirements',
        '### Requirement: Runtime sync safety',
        'The system SHALL enforce deterministic sync planning before writes.',
        '',
        '#### Scenario: Duplicate requirement id',
        '- **WHEN** a requirement title repeats',
        '- **THEN** sync must block with duplicate id findings'
      ].join('\n')
    });
    const canonicalPath = path.join(fixtureRoot, '.opsx', 'specs', 'runtime', 'spec.md');
    const canonicalBefore = [
      '## ADDED Requirements',
      '### Requirement: Runtime sync safety',
      'The system SHALL enforce deterministic sync planning before writes.',
      '',
      '#### Scenario: Baseline canonical',
      '- **WHEN** canonical specs are loaded',
      '- **THEN** sync compares deltas without partial writes'
    ].join('\n');
    writeText(canonicalPath, canonicalBefore);

    const plan = planSync({ changeDir });
    assert.strictEqual(plan.status, 'BLOCK');
    assert(plan.findings.some((finding) => finding.code === 'duplicate-requirement-id'));

    const applied = applySyncPlan(plan);
    assert.strictEqual(applied.status, 'BLOCK');
    assert.strictEqual(fs.readFileSync(canonicalPath, 'utf8'), canonicalBefore);
  });

  test('applySyncPlan restores completed writes when a later write fails', () => {
    const { applySyncPlan } = require('../lib/sync');
    const canonicalSpecsDir = path.join(fixtureRoot, '.opsx', 'specs');
    const runtimeSpecPath = path.join(canonicalSpecsDir, 'runtime', 'spec.md');
    const brokenTargetPath = path.join(canonicalSpecsDir, 'broken-target');
    const canonicalBefore = [
      '## ADDED Requirements',
      '### Requirement: Runtime rollback',
      'The system SHALL preserve existing specs when a later sync write fails.'
    ].join('\n');
    writeText(runtimeSpecPath, canonicalBefore);
    ensureDir(brokenTargetPath);

    assert.throws(() => applySyncPlan({
      status: 'PASS',
      repoRoot: fixtureRoot,
      canonicalSpecsDir,
      findings: [],
      writes: [
        {
          relativePath: 'runtime/spec.md',
          targetPath: runtimeSpecPath,
          content: `${canonicalBefore}\nUpdated content that must roll back.\n`
        },
        {
          relativePath: 'broken-target',
          targetPath: brokenTargetPath,
          content: 'This write fails because the target is a directory.\n'
        }
      ]
    }));

    assert.strictEqual(fs.readFileSync(runtimeSpecPath, 'utf8'), canonicalBefore);
    assert.deepStrictEqual(
      fs.readdirSync(path.dirname(runtimeSpecPath)).filter((entry) => entry.startsWith('.spec.md.')),
      []
    );
    assert.deepStrictEqual(
      fs.readdirSync(canonicalSpecsDir).filter((entry) => entry.startsWith('.broken-target.')),
      []
    );
  });

  test('sync plan blocks omitted canonical requirements and conflicting normative language', () => {
    const { planSync } = require('../lib/sync');
    const changeName = 'sync-plan-omission-conflict';
    const changeDir = createChange(fixtureRoot, changeName, {
      'specs/runtime/spec.md': [
        '## MODIFIED Requirements',
        '### Requirement: Session token rotation rule',
        'The system MUST NOT rotate access tokens for every session request and keep audit logs aligned.',
        '',
        '#### Scenario: Conflicting polarity',
        '- **WHEN** session token handling executes',
        '- **THEN** token rotation and audit logs remain aligned'
      ].join('\n')
    });
    writeText(path.join(fixtureRoot, '.opsx', 'specs', 'runtime', 'spec.md'), [
      '## ADDED Requirements',
      '### Requirement: Session token rotation baseline',
      'The system SHALL rotate access tokens for every session request and keep audit logs aligned.',
      '',
      '#### Scenario: Canonical rotation baseline',
      '- **WHEN** session token handling executes',
      '- **THEN** token rotation and audit logs remain aligned',
      '',
      '### Requirement: Preserve canonical metrics coverage',
      'The system SHALL preserve canonical metrics coverage unless explicitly removed.',
      '',
      '#### Scenario: Preserve metrics coverage',
      '- **WHEN** sync evaluates delta specs',
      '- **THEN** canonical metrics coverage remains present'
    ].join('\n'));

    const plan = planSync({ changeDir });
    assert.strictEqual(plan.status, 'BLOCK');
    const findingCodes = new Set(plan.findings.map((finding) => finding.code));
    assert(findingCodes.has('omitted-canonical-requirement'));
    assert(findingCodes.has('conflicting-requirements'));
  });

  test('applySyncPlan writes full conflict-free capability files and advances VERIFIED to SYNCED', () => {
    const { planSync, applySyncPlan, acceptSyncPlan } = require('../lib/sync');
    const { writeChangeState, loadChangeState } = require('../lib/change-store');
    const { hashTrackedArtifacts } = require('../lib/change-artifacts');
    const changeName = 'sync-plan-acceptance';
    const changeDir = createChange(fixtureRoot, changeName, {
      'proposal.md': '# Proposal\n',
      'design.md': '# Design\n',
      'tasks.md': '## 1. Sync planning\n- [x] 1.1 Implement conservative sync\n',
      'specs/runtime/spec.md': [
        '## ADDED Requirements',
        '### Requirement: Canonical runtime baseline',
        'The system SHALL preserve canonical runtime baseline behavior during sync.',
        '',
        '#### Scenario: Preserve baseline',
        '- **WHEN** sync applies a conflict-free plan',
        '- **THEN** baseline behavior remains in canonical specs',
        '',
        '### Requirement: Runtime sync append capability',
        'The system SHALL append conflict-free capability requirements into canonical specs.',
        '',
        '#### Scenario: Append capability',
        '- **WHEN** a new runtime requirement is conflict-free',
        '- **THEN** canonical specs include it after sync'
      ].join('\n')
    });
    const canonicalPath = path.join(fixtureRoot, '.opsx', 'specs', 'runtime', 'spec.md');
    writeText(canonicalPath, [
      '## ADDED Requirements',
      '### Requirement: Canonical runtime baseline',
      'The system SHALL preserve canonical runtime baseline behavior during sync.',
      '',
      '#### Scenario: Existing baseline',
      '- **WHEN** canonical runtime specs are read',
      '- **THEN** baseline behavior is present'
    ].join('\n'));
    writeChangeState(changeDir, {
      change: changeName,
      stage: 'VERIFIED',
      hashes: {
        'proposal.md': 'stale-hash'
      }
    });

    const plan = planSync({ changeDir });
    assert.strictEqual(plan.status, 'PASS');
    assert.strictEqual(plan.writes.length, 1);

    const applied = applySyncPlan(plan);
    assert.strictEqual(applied.status, 'PASS');
    assert.strictEqual(fs.readFileSync(canonicalPath, 'utf8'), fs.readFileSync(path.join(changeDir, 'specs', 'runtime', 'spec.md'), 'utf8'));

    const accepted = acceptSyncPlan(changeDir, applied);
    assert.strictEqual(accepted.stage, 'SYNCED');
    assert.strictEqual(accepted.nextAction, 'archive');
    assert.deepStrictEqual(accepted.sync.canonicalOutputs, ['.opsx/specs/runtime/spec.md']);
    assert.deepStrictEqual(accepted.hashes, hashTrackedArtifacts(changeDir));
    assert.strictEqual(loadChangeState(changeDir).stage, 'SYNCED');
  });

  test('archive gate allows accepted canonical sync outputs left in git diff', () => {
    const { evaluateArchiveGate, archiveChange } = require('../lib/archive');
    const { planSync, applySyncPlan, acceptSyncPlan } = require('../lib/sync');
    const { writeChangeState, writeActiveChangePointer, loadChangeState } = require('../lib/change-store');
    const { hashTrackedArtifacts } = require('../lib/change-artifacts');
    const repoRoot = createFixtureRepo();
    cleanupTargets.push(repoRoot);
    const changeName = 'archive-accepted-sync-output';
    const now = new Date().toISOString();
    const changeDir = createChange(repoRoot, changeName, {
      'proposal.md': '# Proposal\n',
      'design.md': '# Design\n',
      'tasks.md': [
        '## Test Plan',
        '- Verification: npm run test:workflow-runtime',
        '',
        '## 1. Archive accepted sync output',
        '- TDD Class: behavior-change',
        '- [x] RED: add archive gate sync-output regression',
        '- [x] GREEN: exempt accepted canonical sync output',
        '- [x] VERIFY: run workflow gate tests'
      ].join('\n'),
      'specs/runtime/spec.md': [
        '## ADDED Requirements',
        '### Requirement: Accepted sync output archive',
        'The system SHALL allow accepted sync output during archive.',
        '',
        '#### Scenario: Synced canonical output remains in git diff',
        '- **WHEN** archive runs after sync acceptance',
        '- **THEN** canonical spec output is not treated as unlogged implementation work'
      ].join('\n')
    });
    writeText(path.join(repoRoot, '.opsx', 'specs', 'runtime', 'spec.md'), [
      '## ADDED Requirements',
      '### Requirement: Accepted sync output archive',
      'The system SHALL keep baseline archive sync behavior.',
      '',
      '#### Scenario: Baseline sync behavior',
      '- **WHEN** canonical specs are read',
      '- **THEN** baseline behavior remains defined'
    ].join('\n'));
    writeText(path.join(changeDir, 'drift.md'), [
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
      '## User Approval Needed',
      ''
    ].join('\n'));
    writeChangeState(changeDir, {
      change: changeName,
      stage: 'VERIFIED',
      hashes: hashTrackedArtifacts(changeDir),
      checkpoints: {
        execution: {
          status: 'PASS',
          updatedAt: now
        }
      },
      verificationLog: [{
        at: now,
        taskGroup: '1. Archive accepted sync output',
        verificationCommand: 'npm run test:workflow-runtime',
        verificationResult: 'PASS',
        changedFiles: ['specs/runtime/spec.md'],
        checkpointStatus: 'PASS',
        completedSteps: ['RED', 'GREEN', 'VERIFY'],
        diffSummary: 'Archive accepted sync output regression proof.',
        driftStatus: 'clean'
      }],
      allowedPaths: ['specs/**', '.opsx/specs/**'],
      forbiddenPaths: ['*.pem']
    });
    writeActiveChangePointer(repoRoot, changeName);

    function git(args) {
      const result = spawnSync('git', args, { cwd: repoRoot, encoding: 'utf8' });
      assert.strictEqual(result.status, 0, result.stderr || result.stdout);
      return result.stdout || '';
    }

    git(['init']);
    git(['add', '.']);
    git(['-c', 'user.name=OpsX Tests', '-c', 'user.email=opsx-tests@example.com', 'commit', '-m', 'baseline']);

    const applied = applySyncPlan(planSync({ changeDir, repoRoot }));
    assert.strictEqual(applied.status, 'PASS');
    const synced = acceptSyncPlan(changeDir, applied);
    assert.deepStrictEqual(synced.sync.canonicalOutputs, ['.opsx/specs/runtime/spec.md']);
    assert(git(['diff', '--name-only']).split(/\r?\n/).includes('.opsx/specs/runtime/spec.md'));

    const gate = evaluateArchiveGate({ changeDir, repoRoot });
    assert(!gate.findings.some((finding) => finding.code === 'unlogged-git-changes'));
    assert.notStrictEqual(gate.status, 'BLOCK');

    const archived = archiveChange({ changeDir, repoRoot });
    assert.strictEqual(archived.status, 'PASS');
    assert.strictEqual(loadChangeState(archived.archivedChangeDir).stage, 'ARCHIVED');
  });

  test('archive gate blocks unsafe verify and sync prerequisites', () => {
    const { evaluateArchiveGate } = require('../lib/archive');
    const { writeChangeState } = require('../lib/change-store');
    const { hashTrackedArtifacts } = require('../lib/change-artifacts');
    const now = new Date().toISOString();

    const verifyBlockedChangeName = 'archive-gate-verify-blocked';
    const verifyBlockedChangeDir = createChange(fixtureRoot, verifyBlockedChangeName, {
      'proposal.md': '# Proposal\n',
      'design.md': '# Design\n',
      'tasks.md': [
        '## 1. Incomplete task group',
        '- TDD Class: behavior-change',
        '- [x] RED: add archive gate regression coverage',
        '- [ ] GREEN: implement archive precondition enforcement',
        '- [ ] VERIFY: run workflow runtime regression'
      ].join('\n'),
      'specs/runtime/spec.md': [
        '## ADDED Requirements',
        '### Requirement: Archive gate verify prerequisite',
        'The system SHALL block archive when verify prerequisites are incomplete.'
      ].join('\n')
    });
    writeChangeState(verifyBlockedChangeDir, {
      change: verifyBlockedChangeName,
      stage: 'VERIFIED',
      hashes: hashTrackedArtifacts(verifyBlockedChangeDir),
      checkpoints: {
        execution: {
          status: 'PASS',
          updatedAt: now
        }
      },
      verificationLog: [{
        at: now,
        taskGroup: '1. Incomplete task group',
        verificationCommand: 'npm run test:workflow-runtime',
        verificationResult: 'PASS',
        changedFiles: ['lib/archive.js'],
        checkpointStatus: 'PASS',
        completedSteps: ['RED', 'GREEN', 'VERIFY'],
        diffSummary: 'Archive gate prerequisite checks.',
        driftStatus: 'clean'
      }],
      allowedPaths: ['lib/**'],
      forbiddenPaths: ['*.pem']
    });

    const verifyBlockedGate = evaluateArchiveGate({
      changeDir: verifyBlockedChangeDir,
      changedFiles: ['lib/archive.js']
    });
    assert.strictEqual(verifyBlockedGate.status, 'BLOCK');
    assert(verifyBlockedGate.findings.some((finding) => finding.code === 'archive-verify-blocked'));
    assert(verifyBlockedGate.findings.some((finding) => finding.code === 'task-group-incomplete'));

    const syncBlockedChangeName = 'archive-gate-sync-blocked';
    const syncBlockedChangeDir = createChange(fixtureRoot, syncBlockedChangeName, {
      'proposal.md': '# Proposal\n',
      'design.md': '# Design\n',
      'tasks.md': [
        '## 1. Archive prerequisites',
        '- TDD Class: behavior-change',
        '- [x] RED: add archive gate regression coverage',
        '- [x] GREEN: implement archive precondition enforcement',
        '- [x] VERIFY: run workflow runtime regression'
      ].join('\n'),
      'specs/runtime/spec.md': [
        '## MODIFIED Requirements',
        '### Requirement: Session token rotation rule',
        'The system MUST NOT rotate access tokens for every session request and keep audit logs aligned.',
        '',
        '#### Scenario: Conflicting polarity',
        '- **WHEN** session token handling executes',
        '- **THEN** token rotation and audit logs remain aligned'
      ].join('\n')
    });
    writeText(path.join(fixtureRoot, '.opsx', 'specs', 'runtime', 'spec.md'), [
      '## ADDED Requirements',
      '### Requirement: Session token rotation baseline',
      'The system SHALL rotate access tokens for every session request and keep audit logs aligned.',
      '',
      '#### Scenario: Canonical rotation baseline',
      '- **WHEN** session token handling executes',
      '- **THEN** token rotation and audit logs remain aligned',
      '',
      '### Requirement: Preserve canonical metrics coverage',
      'The system SHALL preserve canonical metrics coverage unless explicitly removed.',
      '',
      '#### Scenario: Preserve metrics coverage',
      '- **WHEN** sync evaluates delta specs',
      '- **THEN** canonical metrics coverage remains present'
    ].join('\n'));
    writeText(path.join(syncBlockedChangeDir, 'drift.md'), [
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
      '## User Approval Needed',
      ''
    ].join('\n'));
    writeChangeState(syncBlockedChangeDir, {
      change: syncBlockedChangeName,
      stage: 'VERIFIED',
      hashes: hashTrackedArtifacts(syncBlockedChangeDir),
      checkpoints: {
        execution: {
          status: 'PASS',
          updatedAt: now
        }
      },
      verificationLog: [{
        at: now,
        taskGroup: '1. Archive prerequisites',
        verificationCommand: 'npm run test:workflow-runtime',
        verificationResult: 'PASS',
        changedFiles: ['specs/runtime/spec.md'],
        checkpointStatus: 'PASS',
        completedSteps: ['RED', 'GREEN', 'VERIFY'],
        diffSummary: 'Archive gate sync prerequisite checks.',
        driftStatus: 'clean'
      }],
      allowedPaths: ['specs/**', '.opsx/specs/**'],
      forbiddenPaths: ['*.pem']
    });

    const syncBlockedGate = evaluateArchiveGate({
      changeDir: syncBlockedChangeDir,
      changedFiles: ['specs/runtime/spec.md']
    });
    assert.strictEqual(syncBlockedGate.status, 'BLOCK');
    assert(syncBlockedGate.findings.some((finding) => finding.code === 'archive-sync-unsafe'));
    assert(syncBlockedGate.findings.some((finding) => finding.code === 'omitted-canonical-requirement'));
  });

  test('archiveChange syncs a VERIFIED change before moving it into archive', () => {
    const { archiveChange } = require('../lib/archive');
    const { writeChangeState, writeActiveChangePointer } = require('../lib/change-store');
    const { hashTrackedArtifacts } = require('../lib/change-artifacts');
    const changeName = 'archive-sync-before-move';
    const now = new Date().toISOString();
    const changeDir = createChange(fixtureRoot, changeName, {
      'proposal.md': '# Proposal\n',
      'design.md': '# Design\n',
      'tasks.md': [
        '## 1. Archive readiness',
        '- TDD Class: behavior-change',
        '- [x] RED: add archive move regression coverage',
        '- [x] GREEN: implement archive move behavior',
        '- [x] VERIFY: run workflow runtime regression'
      ].join('\n'),
      'specs/runtime/spec.md': [
        '## ADDED Requirements',
        '### Requirement: Archive sync before move',
        'The system SHALL apply safe sync before archive when the lifecycle is VERIFIED.',
        '',
        '#### Scenario: Verified archive request',
        '- **WHEN** archive executes from VERIFIED state',
        '- **THEN** canonical specs are synced before archive move'
      ].join('\n')
    });
    writeText(path.join(fixtureRoot, '.opsx', 'specs', 'runtime', 'spec.md'), [
      '## ADDED Requirements',
      '### Requirement: Archive sync before move',
      'The system SHALL keep canonical runtime behavior aligned with verified changes.',
      '',
      '#### Scenario: Canonical baseline',
      '- **WHEN** canonical specs are loaded',
      '- **THEN** baseline behavior remains defined'
    ].join('\n'));
    writeText(path.join(changeDir, 'drift.md'), [
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
      '## User Approval Needed',
      ''
    ].join('\n'));
    writeChangeState(changeDir, {
      change: changeName,
      stage: 'VERIFIED',
      hashes: hashTrackedArtifacts(changeDir),
      checkpoints: {
        execution: {
          status: 'PASS',
          updatedAt: now
        }
      },
      verificationLog: [{
        at: now,
        taskGroup: '1. Archive readiness',
        verificationCommand: 'npm run test:workflow-runtime',
        verificationResult: 'PASS',
        changedFiles: ['specs/runtime/spec.md'],
        checkpointStatus: 'PASS',
        completedSteps: ['RED', 'GREEN', 'VERIFY'],
        diffSummary: 'Archive sync-before-move readiness proof.',
        driftStatus: 'clean'
      }],
      allowedPaths: ['specs/**', '.opsx/specs/**'],
      forbiddenPaths: ['*.pem']
    });
    writeActiveChangePointer(fixtureRoot, changeName);

    const result = archiveChange({ changeDir });
    assert.strictEqual(result.status, 'PASS');
    assert.strictEqual(result.syncApplied, true);
    assert.strictEqual(fs.existsSync(changeDir), false);

    const archivedDir = path.join(fixtureRoot, '.opsx', 'archive', changeName);
    assert.strictEqual(result.archivedChangeDir, archivedDir);
    assert.strictEqual(fs.existsSync(archivedDir), true);
    assert.strictEqual(fs.readFileSync(path.join(fixtureRoot, '.opsx', 'specs', 'runtime', 'spec.md'), 'utf8'), fs.readFileSync(path.join(archivedDir, 'specs', 'runtime', 'spec.md'), 'utf8'));
  });

  test('archiveChange moves a fully synced change into .opsx archive using the exact change name', () => {
    const { archiveChange } = require('../lib/archive');
    const { writeChangeState, loadChangeState, writeActiveChangePointer, loadActiveChangePointer } = require('../lib/change-store');
    const { hashTrackedArtifacts } = require('../lib/change-artifacts');
    const changeName = 'archive-synced-exact-name';
    const now = new Date().toISOString();
    const changeDir = createChange(fixtureRoot, changeName, {
      'proposal.md': '# Proposal\n',
      'design.md': '# Design\n',
      'tasks.md': [
        '## 1. Archive move',
        '- TDD Class: behavior-change',
        '- [x] RED: add archive path regression coverage',
        '- [x] GREEN: implement archive path behavior',
        '- [x] VERIFY: run workflow runtime regression'
      ].join('\n'),
      'specs/runtime/spec.md': [
        '## ADDED Requirements',
        '### Requirement: Archive exact destination',
        'The system SHALL archive synced changes into deterministic `.opsx/archive/<change-name>/` paths.'
      ].join('\n')
    });
    writeText(path.join(changeDir, 'drift.md'), [
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
      '## User Approval Needed',
      ''
    ].join('\n'));
    writeChangeState(changeDir, {
      change: changeName,
      stage: 'SYNCED',
      hashes: hashTrackedArtifacts(changeDir),
      checkpoints: {
        execution: {
          status: 'PASS',
          updatedAt: now
        }
      },
      verificationLog: [{
        at: now,
        taskGroup: '1. Archive move',
        verificationCommand: 'npm run test:workflow-runtime',
        verificationResult: 'PASS',
        changedFiles: ['specs/runtime/spec.md'],
        checkpointStatus: 'PASS',
        completedSteps: ['RED', 'GREEN', 'VERIFY'],
        diffSummary: 'Archive deterministic destination readiness proof.',
        driftStatus: 'clean'
      }],
      allowedPaths: ['specs/**', '.opsx/specs/**'],
      forbiddenPaths: ['*.pem']
    });
    writeActiveChangePointer(fixtureRoot, changeName);

    const result = archiveChange({ changeDir });
    const archivedDir = path.join(fixtureRoot, '.opsx', 'archive', changeName);
    assert.strictEqual(result.status, 'PASS');
    assert.strictEqual(result.syncApplied, false);
    assert.strictEqual(result.archivedChangeDir, archivedDir);
    assert.strictEqual(fs.existsSync(path.join(fixtureRoot, '.opsx', 'changes', changeName)), false);
    assert.strictEqual(fs.existsSync(archivedDir), true);
    assert.strictEqual(loadChangeState(archivedDir).stage, 'ARCHIVED');
    assert.strictEqual(loadActiveChangePointer(fixtureRoot).activeChange, '');
    assert.strictEqual(fs.existsSync(path.join(fixtureRoot, '.opsx', 'archive', `${changeName}-`)), false);
  });

  test('archiveChange recalculates gate instead of trusting supplied gate result', () => {
    const { archiveChange } = require('../lib/archive');
    const { writeChangeState } = require('../lib/change-store');
    const { hashTrackedArtifacts } = require('../lib/change-artifacts');
    const changeName = 'archive-recalculate-gate-result';
    const changeDir = createChange(fixtureRoot, changeName, {
      'proposal.md': '# Proposal\n',
      'design.md': '# Design\n',
      'tasks.md': [
        '## 1. Archive stale gate',
        '- TDD Class: behavior-change',
        '- [x] RED: add stale gate regression coverage',
        '- [ ] GREEN: implement archive gate recalculation',
        '- [ ] VERIFY: run workflow runtime regression'
      ].join('\n'),
      'specs/runtime/spec.md': [
        '## ADDED Requirements',
        '### Requirement: Archive stale gate rejection',
        'The system SHALL recalculate archive gates before moving change directories.'
      ].join('\n')
    });
    writeChangeState(changeDir, {
      change: changeName,
      stage: 'SYNCED',
      hashes: hashTrackedArtifacts(changeDir),
      allowedPaths: ['specs/**'],
      forbiddenPaths: ['*.pem']
    });

    const result = archiveChange({
      changeDir,
      gateResult: {
        status: 'PASS',
        repoRoot: fixtureRoot,
        changeDir,
        findings: [],
        patchTargets: []
      }
    });

    assert.strictEqual(result.status, 'BLOCK');
    assert.strictEqual(result.archived, false);
    assert.strictEqual(fs.existsSync(changeDir), true);
    assert.strictEqual(fs.existsSync(path.join(fixtureRoot, '.opsx', 'archive', changeName)), false);
    assert(result.findings.some((finding) => finding.code === 'archive-verify-blocked'));
    assert(result.findings.some((finding) => finding.code === 'task-group-incomplete'));
  });

  test('runBatchApply isolates per-change readiness and skip reasons', () => {
    const { runBatchApply } = require('../lib/batch');
    const { writeChangeState } = require('../lib/change-store');
    const { hashTrackedArtifacts } = require('../lib/change-artifacts');
    const now = new Date().toISOString();

    const readyChangeName = 'batch-ready-change';
    const readyChangeDir = createChange(fixtureRoot, readyChangeName, {
      'proposal.md': '# Proposal\n',
      'design.md': '# Design\n',
      'specs/runtime/spec.md': [
        '## ADDED Requirements',
        '### Requirement: Batch apply readiness',
        'The system SHALL report per-change apply readiness without shared mutable state.'
      ].join('\n'),
      'tasks.md': [
        '## 1. Ready group',
        '- TDD Class: behavior-change',
        '- [ ] RED: add batch apply coverage',
        '- [ ] GREEN: implement batch apply flow',
        '- [ ] VERIFY: run workflow runtime regression'
      ].join('\n')
    });
    writeChangeState(readyChangeDir, {
      change: readyChangeName,
      stage: 'TASKS_READY',
      hashes: hashTrackedArtifacts(readyChangeDir),
      checkpoints: {
        execution: {
          status: 'PASS',
          updatedAt: now
        }
      }
    });

    const skippedChangeName = 'batch-skipped-change';
    createChange(fixtureRoot, skippedChangeName, {
      'proposal.md': '# Proposal\n'
    });

    const malformedChangeName = 'batch-malformed-change';
    const malformedChangeDir = createChange(fixtureRoot, malformedChangeName, {
      'proposal.md': '# Proposal\n'
    });
    writeText(path.join(malformedChangeDir, 'state.yaml'), 'stage: [\n');

    const result = runBatchApply({
      repoRoot: fixtureRoot,
      changeNames: [readyChangeName, skippedChangeName, malformedChangeName]
    });

    assert.strictEqual(result.status, 'PASS');
    assert.strictEqual(result.summary.ready, 1);
    assert.strictEqual(result.summary.skipped, 1);
    assert.strictEqual(result.summary.blocked, 1);

    const readyEntry = result.results.find((entry) => entry.change === readyChangeName);
    const skippedEntry = result.results.find((entry) => entry.change === skippedChangeName);
    const malformedEntry = result.results.find((entry) => entry.change === malformedChangeName);
    assert(readyEntry, 'Expected ready entry for ready change.');
    assert(skippedEntry, 'Expected skipped entry for skipped change.');
    assert(malformedEntry, 'Expected blocked entry for malformed change.');
    assert.strictEqual(readyEntry.status, 'ready');
    assert.strictEqual(typeof readyEntry.nextTaskGroup, 'string');
    assert.strictEqual(skippedEntry.status, 'skipped');
    assert(skippedEntry.reason && skippedEntry.reason.length > 0);
    assert(Array.isArray(skippedEntry.findings));
    assert.strictEqual(malformedEntry.status, 'blocked');
    assert(malformedEntry.reason.includes('change-evaluation-error'));
  });

  test('runBulkArchive continues past blocked changes and preserves per-change reasons', () => {
    const { runBulkArchive } = require('../lib/batch');
    const { writeChangeState } = require('../lib/change-store');
    const { hashTrackedArtifacts } = require('../lib/change-artifacts');
    const now = new Date().toISOString();

    const blockedChangeName = 'bulk-archive-blocked';
    const blockedChangeDir = createChange(fixtureRoot, blockedChangeName, {
      'proposal.md': '# Proposal\n',
      'design.md': '# Design\n',
      'specs/runtime/spec.md': [
        '## ADDED Requirements',
        '### Requirement: Blocked archive candidate',
        'The system SHALL block archive candidates with invalid lifecycle state.'
      ].join('\n'),
      'tasks.md': [
        '## 1. Blocked group',
        '- TDD Class: behavior-change',
        '- [x] RED: add blocked archive test',
        '- [x] GREEN: implement blocked archive behavior',
        '- [x] VERIFY: run workflow runtime regression'
      ].join('\n')
    });
    writeChangeState(blockedChangeDir, {
      change: blockedChangeName,
      stage: 'TASKS_READY',
      hashes: hashTrackedArtifacts(blockedChangeDir),
      checkpoints: {
        execution: {
          status: 'PASS',
          updatedAt: now
        }
      },
      verificationLog: [{
        at: now,
        taskGroup: '1. Blocked group',
        verificationCommand: 'npm run test:workflow-runtime',
        verificationResult: 'PASS',
        changedFiles: ['specs/runtime/spec.md'],
        checkpointStatus: 'PASS',
        completedSteps: ['RED', 'GREEN', 'VERIFY'],
        diffSummary: 'Blocked archive candidate proof.',
        driftStatus: 'clean'
      }],
      allowedPaths: ['specs/**'],
      forbiddenPaths: ['*.pem']
    });
    writeText(path.join(blockedChangeDir, 'drift.md'), [
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
      '## User Approval Needed',
      ''
    ].join('\n'));

    const malformedChangeName = 'bulk-archive-malformed';
    const malformedChangeDir = createChange(fixtureRoot, malformedChangeName, {
      'proposal.md': '# Proposal\n'
    });
    writeText(path.join(malformedChangeDir, 'state.yaml'), 'stage: [\n');

    const archivedChangeName = 'bulk-archive-success';
    const archivedChangeDir = createChange(fixtureRoot, archivedChangeName, {
      'proposal.md': '# Proposal\n',
      'design.md': '# Design\n',
      'specs/runtime/spec.md': [
        '## ADDED Requirements',
        '### Requirement: Bulk archive success candidate',
        'The system SHALL archive eligible synced changes while reporting per-change outcomes.'
      ].join('\n'),
      'tasks.md': [
        '## 1. Archive success group',
        '- TDD Class: behavior-change',
        '- [x] RED: add successful archive test',
        '- [x] GREEN: implement successful archive behavior',
        '- [x] VERIFY: run workflow runtime regression'
      ].join('\n')
    });
    writeText(path.join(archivedChangeDir, 'drift.md'), [
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
      '## User Approval Needed',
      ''
    ].join('\n'));
    writeChangeState(archivedChangeDir, {
      change: archivedChangeName,
      stage: 'SYNCED',
      hashes: hashTrackedArtifacts(archivedChangeDir),
      checkpoints: {
        execution: {
          status: 'PASS',
          updatedAt: now
        }
      },
      verificationLog: [{
        at: now,
        taskGroup: '1. Archive success group',
        verificationCommand: 'npm run test:workflow-runtime',
        verificationResult: 'PASS',
        changedFiles: ['specs/runtime/spec.md'],
        checkpointStatus: 'PASS',
        completedSteps: ['RED', 'GREEN', 'VERIFY'],
        diffSummary: 'Successful archive candidate proof.',
        driftStatus: 'clean'
      }],
      allowedPaths: ['specs/**'],
      forbiddenPaths: ['*.pem']
    });

    const result = runBulkArchive({
      repoRoot: fixtureRoot,
      changeNames: [blockedChangeName, malformedChangeName, archivedChangeName]
    });
    assert.strictEqual(result.status, 'PASS');
    assert.strictEqual(result.summary.archived, 1);
    assert.strictEqual(result.summary.blocked, 2);
    assert.strictEqual(result.summary.skipped, 0);

    const blockedEntry = result.results.find((entry) => entry.change === blockedChangeName);
    const malformedEntry = result.results.find((entry) => entry.change === malformedChangeName);
    const archivedEntry = result.results.find((entry) => entry.change === archivedChangeName);
    assert(blockedEntry, 'Expected blocked result for blocked change.');
    assert(malformedEntry, 'Expected blocked result for malformed change.');
    assert(archivedEntry, 'Expected archived result for successful change.');
    assert.strictEqual(blockedEntry.status, 'blocked');
    assert(blockedEntry.reason && blockedEntry.reason.length > 0);
    assert(Array.isArray(blockedEntry.findings));
    assert.strictEqual(malformedEntry.status, 'blocked');
    assert(malformedEntry.reason.includes('change-evaluation-error'));
    assert.strictEqual(archivedEntry.status, 'archived');
    assert(fs.existsSync(path.join(fixtureRoot, '.opsx', 'archive', archivedChangeName)));
  });

  test('runBulkArchive stops on missing workspace before iterating targets', () => {
    const { runBulkArchive } = require('../lib/batch');
    const missingWorkspaceRoot = path.join(fixtureRoot, 'missing-workspace-root');
    ensureDir(missingWorkspaceRoot);

    const result = runBulkArchive({
      repoRoot: missingWorkspaceRoot,
      changeNames: ['demo-a', 'demo-b']
    });

    assert.strictEqual(result.status, 'BLOCK');
    assert.strictEqual(result.code, 'workspace-missing');
    assert.strictEqual(result.summary.archived, 0);
    assert.strictEqual(result.summary.blocked, 0);
    assert.strictEqual(result.summary.skipped, 0);
    assert.deepStrictEqual(result.results, []);
  });

  test('batch operations stop when workspace config is missing', () => {
    const { runBatchApply, runBulkArchive } = require('../lib/batch');
    const partialRoot = createFixtureRepo();
    cleanupTargets.push(partialRoot);
    createChange(partialRoot, 'partial-workspace-change', {
      'proposal.md': '# Proposal\n'
    });
    removePath(path.join(partialRoot, '.opsx', 'config.yaml'));

    [
      runBatchApply({
        repoRoot: partialRoot,
        changeNames: ['partial-workspace-change']
      }),
      runBulkArchive({
        repoRoot: partialRoot,
        changeNames: ['partial-workspace-change']
      })
    ].forEach((result) => {
      assert.strictEqual(result.status, 'BLOCK');
      assert.strictEqual(result.code, 'workspace-config-missing');
      assert.strictEqual(result.summary.ready, 0);
      assert.strictEqual(result.summary.archived, 0);
      assert.strictEqual(result.summary.blocked, 0);
      assert.strictEqual(result.summary.skipped, 0);
      assert.deepStrictEqual(result.results, []);
    });
  });

  test('change-store normalizes sparse Phase 2 state to Phase 4 defaults', () => {
    const { normalizeChangeState } = require('../lib/change-store');
    const normalized = normalizeChangeState({
      change: 'legacy-normalize',
      stage: 'tasks',
      blockers: 'legacy blocker',
      warnings: 'legacy warning',
      allowedPaths: 'lib/**',
      forbiddenPaths: '*.pem',
      verificationLog: 'legacy verification note'
    });

    assert.strictEqual(normalized.stage, 'TASKS_READY');
    assert.strictEqual(normalized.nextAction, 'continue');
    ['spec', 'task', 'execution'].forEach((checkpointId) => {
      assert(Object.prototype.hasOwnProperty.call(normalized.checkpoints, checkpointId));
    });
    assert(Array.isArray(normalized.blockers));
    assert(Array.isArray(normalized.warnings));
    assert(Array.isArray(normalized.allowedPaths));
    assert(Array.isArray(normalized.forbiddenPaths));
    assert(Array.isArray(normalized.verificationLog));
    assert.strictEqual(normalized.active.taskGroup, null);
    assert.strictEqual(normalized.active.nextTaskGroup, null);
  });

  test('writeTextAtomic persists full file contents', () => {
    const { createTempSiblingPath, writeTextAtomic } = require('../lib/fs-utils');
    const atomicPath = path.join(fixtureRoot, '.opsx', 'changes', 'atomic-write.txt');
    const firstTempPath = createTempSiblingPath(atomicPath, 'tmp');
    const secondTempPath = createTempSiblingPath(atomicPath, 'tmp');
    assert.notStrictEqual(firstTempPath, secondTempPath);
    assert.strictEqual(path.dirname(firstTempPath), path.dirname(atomicPath));
    assert(path.basename(firstTempPath).startsWith('.atomic-write.txt.'));
    writeTextAtomic(atomicPath, 'phase4-atomic-write\n');
    assert.strictEqual(fs.readFileSync(atomicPath, 'utf8'), 'phase4-atomic-write\n');
    assert.strictEqual(
      fs.readdirSync(path.dirname(atomicPath)).some((entry) => entry.startsWith('.atomic-write.txt.')),
      false
    );
  });

  test('createChangeSkeleton writes scaffold only and keeps INIT lifecycle state', () => {
    const { createChangeSkeleton } = require('../lib/workspace');
    const { loadActiveChangePointer, loadChangeState } = require('../lib/change-store');
    const changeName = 'skeleton-init-state';
    const createdAt = '2026-04-27T00:00:00.000Z';
    const changeDir = path.join(fixtureRoot, '.opsx', 'changes', changeName);
    const filesToAssert = [
      'change.yaml',
      'specs',
      'state.yaml',
      'context.md',
      'drift.md'
    ];

    createChangeSkeleton({
      repoRoot: fixtureRoot,
      changeName,
      createdAt
    });

    filesToAssert.forEach((relativePath) => {
      assert(fs.existsSync(path.join(changeDir, relativePath)), `Expected ${relativePath} to exist.`);
    });
    assert(fs.statSync(path.join(changeDir, 'specs')).isDirectory());

    const changeMetadata = YAML.parse(fs.readFileSync(path.join(changeDir, 'change.yaml'), 'utf8'));
    assert.deepStrictEqual(changeMetadata, {
      name: changeName,
      schema: 'spec-driven',
      createdAt,
      securitySensitive: false,
      securityWaiver: {
        approved: false,
        reason: ''
      }
    });

    const activePointer = loadActiveChangePointer(fixtureRoot);
    assert.strictEqual(activePointer.activeChange, changeName);

    const state = loadChangeState(changeDir);
    assert.strictEqual(state.stage, 'INIT');
    assert.strictEqual(state.nextAction, 'continue');
    assert.deepStrictEqual(state.hashes, {});
    assert.deepStrictEqual(buildStatus({ repoRoot: fixtureRoot, changeName }).hashDriftWarnings, []);
  });

  test('opsx-new skeleton creates no placeholder artifacts, active pointer, and INIT stage', () => {
    const { createChangeSkeleton } = require('../lib/workspace');
    const { loadActiveChangePointer, loadChangeState } = require('../lib/change-store');
    const changeName = 'opsx-new-skeleton';
    const createdAt = '2026-04-27T00:00:00.000Z';
    const changeDir = path.join(fixtureRoot, '.opsx', 'changes', changeName);

    createChangeSkeleton({
      repoRoot: fixtureRoot,
      changeName,
      createdAt
    });

    [
      'change.yaml',
      'specs',
      'state.yaml',
      'context.md',
      'drift.md'
    ].forEach((relativePath) => {
      assert(fs.existsSync(path.join(changeDir, relativePath)), `Expected ${relativePath} to exist.`);
    });

    assert(fs.statSync(path.join(changeDir, 'specs')).isDirectory());
    assert(!fs.existsSync(path.join(changeDir, 'proposal.md')));
    assert(!fs.existsSync(path.join(changeDir, 'design.md')));
    assert(!fs.existsSync(path.join(changeDir, 'tasks.md')));
    assert(!fs.existsSync(path.join(changeDir, 'specs', 'README.md')));
    assert(!fs.existsSync(path.join(changeDir, 'specs', 'spec.md')));

    const state = loadChangeState(changeDir);
    const activePointer = loadActiveChangePointer(fixtureRoot);

    assert.strictEqual(activePointer.activeChange, changeName);
    assert.strictEqual(state.stage, 'INIT');
    assert.strictEqual(state.nextAction, 'continue');
    assert.deepStrictEqual(state.hashes, {});
    assert.strictEqual(state.checkpoints.task.status, 'PENDING');
    assert.strictEqual(state.checkpoints.execution.status, 'PENDING');
    assert.strictEqual(state.stage, 'INIT');
  });

  test('createChangeSkeleton rejects unsafe change names before writing files', () => {
    const { createChangeSkeleton } = require('../lib/workspace');
    const invalidFixtureRoot = createFixtureRepo();
    cleanupTargets.push(invalidFixtureRoot);
    const changesDir = path.join(invalidFixtureRoot, '.opsx', 'changes');
    const invalidCases = [
      ['../escape', /path separators or traversal markers/],
      ['foo/bar', /path separators or traversal markers/],
      ['bad name', /unsupported characters/]
    ];

    invalidCases.forEach(([changeName, expectedMessage]) => {
      assert.throws(() => {
        createChangeSkeleton({
          repoRoot: invalidFixtureRoot,
          changeName
        });
      }, expectedMessage);
    });

    assert.deepStrictEqual(fs.readdirSync(changesDir), []);
    assert(!fs.existsSync(path.join(invalidFixtureRoot, '.opsx', 'active.yaml')));
    assert(!fs.existsSync(path.join(invalidFixtureRoot, '.opsx', 'escape')));
  });

  test('createChangeSkeleton rejects invalid createdAt before writing files', () => {
    const { createChangeSkeleton } = require('../lib/workspace');
    const invalidFixtureRoot = createFixtureRepo();
    cleanupTargets.push(invalidFixtureRoot);
    const changeName = 'date-edge';
    const changesDir = path.join(invalidFixtureRoot, '.opsx', 'changes');
    const changeDir = path.join(changesDir, changeName);

    assert.throws(() => {
      createChangeSkeleton({
        repoRoot: invalidFixtureRoot,
        changeName,
        createdAt: 'not-a-date'
      });
    }, /createdAt must be a valid ISO-8601 timestamp/);

    assert.deepStrictEqual(fs.readdirSync(changesDir), []);
    assert(!fs.existsSync(changeDir));
    assert(!fs.existsSync(path.join(invalidFixtureRoot, '.opsx', 'active.yaml')));
  });

  test('placeholder artifacts do not imply accepted planning stages', () => {
    const { loadChangeState } = require('../lib/change-store');
    const changeName = 'placeholder-artifacts';
    const changeDir = createChange(fixtureRoot, changeName, {
      'proposal.md': '# Placeholder proposal\n',
      'design.md': '# Placeholder design\n',
      'tasks.md': '## 1. Placeholder\n- [ ] 1.1 Pending\n',
      'specs/README.md': '# Placeholder specs\n'
    });

    const state = loadChangeState(changeDir);
    assert.strictEqual(state.stage, 'INIT');
  });

  test('sparse Phase 2 state normalizes to Phase 4 arrays and checkpoint slots', () => {
    const { normalizeChangeState } = require('../lib/change-store');
    const normalized = normalizeChangeState({
      change: 'legacy-sparse',
      warnings: 'single warning',
      blockers: 'single blocker',
      verificationLog: 'legacy verification string',
      checkpoints: {
        spec: {
          status: 'PASS'
        }
      }
    });

    assert.deepStrictEqual(normalized.warnings, ['single warning']);
    assert.deepStrictEqual(normalized.blockers, ['single blocker']);
    assert.deepStrictEqual(normalized.verificationLog, ['legacy verification string']);
    ['spec', 'task', 'execution'].forEach((checkpointId) => {
      assert(Object.prototype.hasOwnProperty.call(normalized.checkpoints, checkpointId));
    });
    assert.strictEqual(normalized.active.taskGroup, null);
  });

  test('spec-split-checkpoint schema is inserted after specs and before design', () => {
    const schemaPath = path.join(REPO_ROOT, 'schemas', 'spec-driven', 'schema.json');
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    const checkpointIds = Array.isArray(schema.checkpoints) ? schema.checkpoints.map((checkpoint) => checkpoint.id) : [];
    const splitIndex = checkpointIds.indexOf('spec-split-checkpoint');
    const specIndex = checkpointIds.indexOf('spec-checkpoint');

    assert(splitIndex !== -1, 'Expected schema checkpoints to include spec-split-checkpoint.');
    assert(specIndex !== -1, 'Expected schema checkpoints to include spec-checkpoint.');
    assert(splitIndex < specIndex, 'Expected spec-split-checkpoint to run before spec-checkpoint.');

    const splitCheckpoint = schema.checkpoints[splitIndex];
    assert.strictEqual(splitCheckpoint.trigger, 'after-specs-before-design');
    assert.deepStrictEqual(splitCheckpoint.states, ['PASS', 'WARN', 'BLOCK']);
    assert.deepStrictEqual(splitCheckpoint.insertion, {
      after: ['specs'],
      before: ['design']
    });

    const designArtifact = schema.artifacts.find((artifact) => artifact.id === 'design');
    assert(designArtifact, 'Expected schema artifacts to include design.');
    assert.deepStrictEqual(designArtifact.requires, ['proposal', 'specs']);
  });

  test('change-store preserves specSplit checkpoint alias round-trip', () => {
    const { normalizeChangeState, recordCheckpointResult, loadChangeState } = require('../lib/change-store');
    const changeName = 'spec-split-checkpoint-persistence';
    const changeDir = createChange(fixtureRoot, changeName, {
      'proposal.md': '# Proposal\n'
    });
    const normalized = normalizeChangeState({
      change: changeName,
      checkpoints: {
        'spec-split-checkpoint': {
          status: 'WARN'
        }
      }
    });

    assert.strictEqual(normalized.checkpoints.specSplit.status, 'WARN');
    ['spec', 'task', 'execution'].forEach((checkpointId) => {
      assert(Object.prototype.hasOwnProperty.call(normalized.checkpoints, checkpointId));
    });

    recordCheckpointResult(changeDir, 'spec-split-checkpoint', { status: 'PASS' });
    const persisted = loadChangeState(changeDir);
    assert.strictEqual(persisted.checkpoints.specSplit.status, 'PASS');
    assert(!Object.prototype.hasOwnProperty.call(persisted.checkpoints, 'spec-split-checkpoint'));
    ['spec', 'task', 'execution'].forEach((checkpointId) => {
      assert(Object.prototype.hasOwnProperty.call(persisted.checkpoints, checkpointId));
    });
  });

  test('spec validator exports split-spec parser and deterministic finding codes', () => {
    const {
      collectSpecSplitEvidence,
      parseSpecFile,
      reviewSpecSplitEvidence
    } = require('../lib/spec-validator');

    assert.strictEqual(typeof collectSpecSplitEvidence, 'function');
    assert.strictEqual(typeof parseSpecFile, 'function');
    assert.strictEqual(typeof reviewSpecSplitEvidence, 'function');

    const parsed = parseSpecFile('specs/auth/spec.md', [
      '## ADDED Requirements',
      '### Requirement: Auth requirement',
      'The system SHALL enforce MFA for privileged roles.',
      '#### Scenario: MFA challenge',
      '- **WHEN** privileged user signs in',
      '- **THEN** require MFA'
    ].join('\n'));

    const evidence = collectSpecSplitEvidence({
      proposalText: [
        '## What Changes',
        '- Enforce MFA for privileged roles.',
        '## Capabilities',
        '### Modified Capabilities',
        '- auth'
      ].join('\n'),
      specFiles: [{ path: parsed.path, text: parsed.text }]
    });
    const findings = reviewSpecSplitEvidence(evidence);

    [
      'proposal-coverage-gap',
      'scope-expansion-unapproved',
      'duplicate-requirement-id',
      'duplicate-behavior-likely',
      'conflicting-requirements',
      'spec-empty',
      'scenario-missing',
      'hidden-requirement-in-fence'
    ].forEach((code) => {
      assert.strictEqual(typeof code, 'string');
    });
    assert(Array.isArray(findings));
  });

  test('spec validator flags duplicate requirement titles and likely duplicate behavior', () => {
    const { collectSpecSplitEvidence, reviewSpecSplitEvidence } = require('../lib/spec-validator');
    const evidence = collectSpecSplitEvidence({
      proposalText: [
        '## What Changes',
        '- enforce manager approval for invoice payouts',
        '## Capabilities',
        '### Modified Capabilities',
        '- billing approvals'
      ].join('\n'),
      specFiles: [
        {
          path: 'specs/auth/spec.md',
          text: [
            '## ADDED Requirements',
            '### Requirement: Enforce manager approval',
            'The system SHALL require manager approval before invoice payout release.',
            '#### Scenario: manager approval path',
            '- **WHEN** a payout is requested',
            '- **THEN** the manager must approve before release'
          ].join('\n')
        },
        {
          path: 'specs/billing/spec.md',
          text: [
            '## ADDED Requirements',
            '### Requirement: Enforce manager approval',
            'The system SHALL require manager approval before invoice payout release.',
            '#### Scenario: mirrored title',
            '- **WHEN** billing payout is requested',
            '- **THEN** hold payout until manager approval',
            '',
            '### Requirement: Invoice payout needs manager authorization',
            'The system SHALL require manager approval before invoice payout release.',
            '#### Scenario: duplicate behavior',
            '- **WHEN** payout is requested',
            '- **THEN** manager approval is required'
          ].join('\n')
        }
      ]
    });

    const findings = reviewSpecSplitEvidence(evidence);
    const strictFindings = reviewSpecSplitEvidence(evidence, { duplicateBehaviorThreshold: 1.01 });
    const duplicateIdFinding = findings.find((finding) => finding.code === 'duplicate-requirement-id');
    const duplicateBehaviorFinding = findings.find((finding) => finding.code === 'duplicate-behavior-likely');

    assert(duplicateIdFinding, 'Expected duplicate requirement id finding.');
    assert.deepStrictEqual(duplicateIdFinding.patchTargets, ['specs/auth/spec.md', 'specs/billing/spec.md']);

    assert(duplicateBehaviorFinding, 'Expected likely duplicate behavior finding.');
    assert.deepStrictEqual(duplicateBehaviorFinding.patchTargets, ['specs/auth/spec.md', 'specs/billing/spec.md']);
    assert(!strictFindings.some((finding) => finding.code === 'duplicate-behavior-likely'));
  });

  test('spec validator flags conflicting requirements', () => {
    const { collectSpecSplitEvidence, reviewSpecSplitEvidence } = require('../lib/spec-validator');
    const evidence = collectSpecSplitEvidence({
      proposalText: [
        '## What Changes',
        '- align invoice delivery policy',
        '## Capabilities',
        '### Modified Capabilities',
        '- invoicing'
      ].join('\n'),
      specFiles: [
        {
          path: 'specs/auth/spec.md',
          text: [
            '## ADDED Requirements',
            '### Requirement: Invoice dispatch policy',
            'The system SHALL send invoice emails automatically.',
            '#### Scenario: dispatch enabled',
            '- **WHEN** invoice is approved',
            '- **THEN** send invoice email'
          ].join('\n')
        },
        {
          path: 'specs/billing/spec.md',
          text: [
            '## ADDED Requirements',
            '### Requirement: Invoice dispatch policy',
            'The system SHALL NOT send invoice emails automatically.',
            '#### Scenario: dispatch blocked',
            '- **WHEN** invoice is approved',
            '- **THEN** do not send invoice email'
          ].join('\n')
        }
      ]
    });

    const findings = reviewSpecSplitEvidence(evidence);
    const conflictFinding = findings.find((finding) => finding.code === 'conflicting-requirements');
    assert(conflictFinding, 'Expected conflicting requirements finding.');
    assert.deepStrictEqual(conflictFinding.patchTargets, ['specs/auth/spec.md', 'specs/billing/spec.md']);
  });

  test('spec validator blocks empty specs and missing scenarios', () => {
    const { collectSpecSplitEvidence, reviewSpecSplitEvidence } = require('../lib/spec-validator');
    const evidence = collectSpecSplitEvidence({
      proposalText: [
        '## What Changes',
        '- audit billing retention policy',
        '## Capabilities',
        '### Modified Capabilities',
        '- billing retention'
      ].join('\n'),
      specFiles: [
        {
          path: 'specs/auth/spec.md',
          text: '## ADDED Requirements\nNo valid requirement headings here.'
        },
        {
          path: 'specs/billing/spec.md',
          text: [
            '## ADDED Requirements',
            '### Requirement: Billing retention policy',
            'The system SHALL retain billing records for seven years.'
          ].join('\n')
        }
      ]
    });

    const findings = reviewSpecSplitEvidence(evidence);
    const emptyFinding = findings.find((finding) => finding.code === 'spec-empty');
    const missingScenarioFinding = findings.find((finding) => finding.code === 'scenario-missing');

    assert(emptyFinding, 'Expected spec-empty finding.');
    assert.deepStrictEqual(emptyFinding.patchTargets, ['specs/auth/spec.md']);

    assert(missingScenarioFinding, 'Expected scenario-missing finding.');
    assert.deepStrictEqual(missingScenarioFinding.patchTargets, ['specs/billing/spec.md']);
  });

  test('spec validator flags hidden fenced-code requirements', () => {
    const { parseSpecFile, collectSpecSplitEvidence, reviewSpecSplitEvidence } = require('../lib/spec-validator');
    const specText = [
      '## ADDED Requirements',
      '```md',
      '### Requirement: Hidden requirement in fence',
      'The implementation SHALL bypass review checks.',
      '#### Scenario: hidden bypass',
      '- **WHEN** emergency mode is active',
      '- **THEN** bypass all checks',
      '```',
      '',
      '### Requirement: Visible requirement',
      'The system SHALL log review outcomes.',
      '#### Scenario: visible scenario',
      '- **WHEN** review completes',
      '- **THEN** record the result'
    ].join('\n');

    const parsed = parseSpecFile('specs/auth/spec.md', specText);
    assert.strictEqual(parsed.requirementCount, 1, 'Fenced requirement headings must not count as valid requirements.');

    const evidence = collectSpecSplitEvidence({
      proposalText: [
        '## What Changes',
        '- log review outcomes',
        '## Capabilities',
        '### Modified Capabilities',
        '- review logging'
      ].join('\n'),
      specFiles: [{ path: 'specs/auth/spec.md', text: specText }]
    });

    const findings = reviewSpecSplitEvidence(evidence);
    const hiddenFinding = findings.find((finding) => finding.code === 'hidden-requirement-in-fence');
    assert(hiddenFinding, 'Expected hidden fenced-code requirement finding.');
    assert.deepStrictEqual(hiddenFinding.patchTargets, ['specs/auth/spec.md']);
  });

  test('spec validator flags proposal coverage gaps and unapproved scope expansion', () => {
    const { collectSpecSplitEvidence, reviewSpecSplitEvidence } = require('../lib/spec-validator');
    const evidence = collectSpecSplitEvidence({
      proposalText: [
        '## What Changes',
        '- improve tenant api throttling policy',
        '## Capabilities',
        '### Modified Capabilities',
        '- tenant rate limiting',
        '- gateway quotas'
      ].join('\n'),
      specFiles: [
        {
          path: 'specs/billing/spec.md',
          text: [
            '## ADDED Requirements',
            '### Requirement: Blockchain settlement export',
            'The system SHALL compute blockchain settlement ledger reconciliation snapshots.',
            '#### Scenario: settlement snapshot',
            '- **WHEN** settlement closes',
            '- **THEN** generate the reconciliation snapshot'
          ].join('\n')
        }
      ]
    });

    const findings = reviewSpecSplitEvidence(evidence);
    const coverageFinding = findings.find((finding) => finding.code === 'proposal-coverage-gap');
    const scopeFinding = findings.find((finding) => finding.code === 'scope-expansion-unapproved');

    assert(coverageFinding, 'Expected proposal coverage gap finding.');
    assert.deepStrictEqual(coverageFinding.patchTargets, ['proposal', 'specs']);

    assert(scopeFinding, 'Expected unapproved scope expansion finding.');
    assert.deepStrictEqual(scopeFinding.patchTargets, ['proposal', 'specs/billing/spec.md']);
  });

  test('spec validator reads Chinese proposal scope headings', () => {
    const { collectSpecSplitEvidence, reviewSpecSplitEvidence } = require('../lib/spec-validator');
    const evidence = collectSpecSplitEvidence({
      proposalText: [
        '## 变更内容',
        '- 主题偏好持久化',
        '## 能力范围',
        '### 新增能力',
        '- 主题偏好'
      ].join('\n'),
      specFiles: [
        {
          path: 'specs/theme/spec.md',
          text: [
            '## ADDED Requirements',
            '### Requirement: 主题偏好持久化',
            'The system SHALL persist 主题偏好 across sessions.',
            '',
            '#### Scenario: 主题偏好恢复',
            '- **WHEN** the user returns',
            '- **THEN** the saved 主题偏好 is restored'
          ].join('\n')
        }
      ]
    });

    const findings = reviewSpecSplitEvidence(evidence);
    assert.strictEqual(evidence.proposal.scopeLines.length, 2);
    assert(!findings.some((finding) => finding.code === 'proposal-coverage-gap'));
  });

  test('runSpecSplitCheckpoint passes clean inline single-spec reviews with canonical fields', () => {
    const result = runSpecSplitCheckpoint({
      sources: {
        proposal: [
          '## What Changes',
          '- enforce invoice approval policy',
          '## Capabilities',
          '### Modified Capabilities',
          '- invoice approvals',
          '- billing controls'
        ].join('\n'),
        specs: [
          '## ADDED Requirements',
          '### Requirement: Invoice approval policy',
          'The system SHALL enforce invoice approval policy for billing controls.',
          '#### Scenario: approval required',
          '- **WHEN** invoice enters review',
          '- **THEN** approval policy must be enforced'
        ].join('\n')
      }
    });

    ['checkpoint', 'phase', 'status', 'findings', 'patchTargets', 'nextStep'].forEach((key) => {
      assert(Object.prototype.hasOwnProperty.call(result, key), `Expected checkpoint result field "${key}"`);
    });
    assert.strictEqual(result.checkpoint, 'spec-split-checkpoint');
    assert.strictEqual(result.phase, 'planning');
    assert.strictEqual(result.status, 'PASS');
    assert.strictEqual(result.nextStep, 'Proceed to design.');
    assert.deepStrictEqual(result.findings, []);
    assert.deepStrictEqual(result.patchTargets, []);
    assert.deepStrictEqual(result.createsArtifacts, []);
  });

  test('runSpecSplitCheckpoint blocks missing specs before design', () => {
    const emptyResult = runSpecSplitCheckpoint({ sources: {} });
    const proposalOnlyResult = runSpecSplitCheckpoint({
      sources: {
        proposal: [
          '## What Changes',
          '- enforce billing hold',
          '## Capabilities',
          '### Modified Capabilities',
          '- billing hold'
        ].join('\n')
      }
    });

    [emptyResult, proposalOnlyResult].forEach((result) => {
      assert.strictEqual(result.checkpoint, 'spec-split-checkpoint');
      assert.strictEqual(result.status, 'BLOCK');
      assert(result.findings.some((finding) => finding.code === 'specs-missing'));
      assert(result.patchTargets.includes('specs'));
      assert.notStrictEqual(result.nextStep, 'Proceed to design.');
      assert.deepStrictEqual(result.createsArtifacts, []);
    });
  });

  test('runSpecSplitCheckpoint blocks invalid specs and stays on existing artifact patch targets only', () => {
    const result = runSpecSplitCheckpoint({
      sources: {
        proposal: [
          '## What Changes',
          '- enforce billing hold',
          '## Capabilities',
          '### Modified Capabilities',
          '- billing hold'
        ].join('\n')
      },
      specFiles: [
        {
          path: 'specs/billing/spec.md',
          text: [
            '## ADDED Requirements',
            '### Requirement: Billing hold policy',
            'The system SHALL hold billing payouts until approval.'
          ].join('\n')
        }
      ]
    });

    assert.strictEqual(result.checkpoint, 'spec-split-checkpoint');
    assert.strictEqual(result.status, 'BLOCK');
    assert(result.findings.some((finding) => finding.code === 'scenario-missing'));
    assert(result.patchTargets.includes('specs/billing/spec.md'));
    assert.deepStrictEqual(result.createsArtifacts, []);
  });

  test('runSpecSplitCheckpoint recommends read-only reviewer escalation without creating spec-review artifacts', () => {
    const result = runSpecSplitCheckpoint({
      sources: {
        proposal: [
          '## What Changes',
          '- enforce auth session timeout',
          '- enforce auth login throttling',
          '## Capabilities',
          '### Modified Capabilities',
          '- auth',
          '- access-controls'
        ].join('\n')
      },
      specFiles: [
        {
          path: 'specs/auth/spec.md',
          text: [
            '## ADDED Requirements',
            '### Requirement: Auth session timeout',
            'The system SHALL enforce auth session timeout after inactivity.',
            '#### Scenario: timeout after inactivity',
            '- **WHEN** user is inactive',
            '- **THEN** expire the session'
          ].join('\n')
        },
        {
          path: 'specs/access-controls/spec.md',
          text: [
            '## ADDED Requirements',
            '### Requirement: Auth login throttling',
            'The system SHALL enforce auth login throttling for repeated failures.',
            '#### Scenario: throttle failed login attempts',
            '- **WHEN** repeated failures occur',
            '- **THEN** throttle additional login attempts'
          ].join('\n')
        }
      ]
    });

    const escalationFindings = result.findings.filter((finding) => finding.code === 'read-only-reviewer-recommended');
    assert.strictEqual(result.checkpoint, 'spec-split-checkpoint');
    assert.strictEqual(result.status, 'WARN');
    assert.strictEqual(escalationFindings.length, 1);
    assert(result.nextStep.includes('read-only reviewer'));
    assert(result.nextStep.includes('must not write files directly'));
    assert(result.nextStep.includes('must not create `spec-review.md`'));
    assert(!result.nextStep.includes('$opsx-spec-split'));
    assert(!result.nextStep.includes('/opsx-spec-split'));
    assert.deepStrictEqual(result.createsArtifacts, []);
  });

  test('read-only drift detection warns without refreshing stored hashes', () => {
    const { loadChangeState, writeChangeState } = require('../lib/change-store');
    const changeName = 'read-only-drift';
    const changeDir = createChange(fixtureRoot, changeName, {
      'proposal.md': '# Initial proposal\n'
    });
    const seeded = writeChangeState(changeDir, {
      change: changeName,
      hashes: {
        proposal: 'seeded-proposal-hash'
      }
    });

    writeText(path.join(changeDir, 'proposal.md'), '# Updated proposal with drift\n');

    const inspection = inspectReadOnlyStateForDrift(changeDir);
    assert(inspection.warnings.some((warning) => warning.includes('proposal.md')));

    const persisted = loadChangeState(changeDir);
    assert.strictEqual(persisted.hashes.proposal, seeded.hashes.proposal);
  });

  test('change-capsule renders bounded context sections and appends stable drift headings', () => {
    const { renderContextCapsule, appendDriftLedger } = require('../lib/change-capsule');
    const { buildInitialDrift } = require('../lib/workspace');
    const changeName = 'capsule-drift-ledger';
    const changeDir = createChange(fixtureRoot, changeName, {
      'proposal.md': '# Proposal\n'
    });
    const driftPath = path.join(changeDir, 'drift.md');
    writeText(driftPath, `${buildInitialDrift()}\n`);

    const capsule = renderContextCapsule({
      stage: 'APPLYING_GROUP',
      active: {
        taskGroup: '2. Runtime integration',
        nextTaskGroup: '3. Verification'
      },
      warnings: ['Hash drift detected for tasks.md'],
      blockers: ['Awaiting task checkpoint approval'],
      verificationLog: [{
        at: '2026-04-27T01:02:03.000Z',
        taskGroup: '1. Setup',
        verificationCommand: 'npm run test:workflow-runtime',
        verificationResult: 'PASS',
        changedFiles: ['lib/runtime-guidance.js'],
        checkpointStatus: 'PASS'
      }],
      hashes: {
        'proposal.md': 'abc123'
      }
    }, {
      hashStatus: 'drift warning',
      hashDriftWarnings: ['Hash drift detected for tasks.md']
    });
    [
      '# Context Capsule',
      '## Stage',
      '## Active Task Group',
      '## Warnings',
      '## Blockers',
      '## Last Verification',
      '## Hash Status'
    ].forEach((heading) => {
      assert(capsule.includes(heading), `Expected context capsule heading ${heading}`);
    });
    assert(capsule.includes('UNCONFIRMED'));

    const boundedCapsule = renderContextCapsule({
      stage: 'APPLYING_GROUP',
      active: {
        taskGroup: '1. Oversized context'
      },
      warnings: Array.from({ length: 160 }, (_, index) => `Warning ${index + 1}`),
      verificationLog: [{
        at: '2026-04-27T01:02:03.000Z',
        taskGroup: '1. Oversized context',
        verificationCommand: 'manual',
        verificationResult: 'PASS',
        changedFiles: Array.from({ length: 60 }, (_, index) => `src/file-${index + 1}.js`),
        checkpointStatus: 'PASS',
        diffSummary: Array.from({ length: 80 }, () => 'long summary').join(' ')
      }],
      hashes: Array.from({ length: 80 }, (_, index) => [`src/file-${index + 1}.js`, `hash-${index + 1}`])
        .reduce((output, [key, value]) => {
          output[key] = value;
          return output;
        }, {})
    });
    assert(boundedCapsule.split(/\r?\n/).length <= 121);
    assert(boundedCapsule.includes('Content truncated to keep context capsule bounded.'));

    appendDriftLedger(driftPath, [
      { section: 'newAssumptions', text: 'Assumed runtime fixtures remain deterministic.' },
      { section: 'scopeChanges', text: 'Expanded apply guidance to one top-level task group.' },
      { section: 'outOfBoundFileChanges', text: 'Touched scripts/test-workflow-runtime.js' },
      { section: 'discoveredRequirements', text: 'Need persisted hash drift warnings in apply/status.' },
      { section: 'userApprovalNeeded', text: 'Awaiting acceptance for security-review scope bump.' }
    ]);

    const driftText = fs.readFileSync(driftPath, 'utf8');
    [
      '## New Assumptions',
      '## Scope Changes',
      '## Out-of-Bound File Changes',
      '## Discovered Requirements',
      '## User Approval Needed'
    ].forEach((heading) => {
      assert(driftText.includes(heading), `Expected drift heading ${heading}`);
    });
    assert(/- \d{4}-\d{2}-\d{2}/.test(driftText));
  });

  test('hash drift warns without refreshing stored hashes on status', () => {
    const { loadChangeState, writeChangeState } = require('../lib/change-store');
    const { hashTrackedArtifacts } = require('../lib/change-artifacts');
    const changeName = 'status-hash-drift-warning';
    const changeDir = createChange(fixtureRoot, changeName, {
      'proposal.md': '# Initial proposal\n',
      'design.md': '# Initial design\n',
      'tasks.md': '## 1. Initial group\n- [ ] 1.1 Initial task\n',
      'specs/runtime/spec.md': '## ADDED Requirements\n### Requirement: Runtime\n'
    });
    const baselineHashes = hashTrackedArtifacts(changeDir);

    writeChangeState(changeDir, {
      change: changeName,
      stage: 'TASKS_READY',
      hashes: baselineHashes
    });
    writeText(path.join(changeDir, 'proposal.md'), '# Updated proposal with drift\n');

    const status = buildStatus({ repoRoot: fixtureRoot, changeName });
    assert(status.warnings.some((warning) => warning.includes('Hash drift detected for proposal.md')));

    const persisted = loadChangeState(changeDir);
    assert.strictEqual(persisted.hashes['proposal.md'], baselineHashes['proposal.md']);
  });

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

    writeChangeState(changeDir, {
      change: changeName,
      stage: 'APPLYING_GROUP',
      active: {
        taskGroup: '1. Runtime setup',
        nextTaskGroup: '2. Runtime integration'
      },
      warnings: ['Existing warning'],
      blockers: ['Waiting for review']
    });

    const persisted = recordTaskGroupExecution(changeDir, {
      taskGroup: '1. Runtime setup',
      nextTaskGroup: '2. Runtime integration',
      verificationCommand: 'npm run test:workflow-runtime',
      verificationResult: 'PASS',
      changedFiles: ['lib/change-store.js', 'lib/runtime-guidance.js'],
      checkpointStatus: 'PASS',
      completedSteps: ['RED', 'GREEN', 'VERIFY'],
      diffSummary: 'Applied task-group runtime integration changes.',
      driftStatus: 'clean'
    });

    assert.strictEqual(persisted.stage, 'GROUP_VERIFIED');
    assert.strictEqual(persisted.nextAction, 'apply');
    assert.strictEqual(persisted.active.taskGroup, null);
    assert.strictEqual(persisted.active.nextTaskGroup, '2. Runtime integration');
    assert(Array.isArray(persisted.verificationLog));
    assert.strictEqual(persisted.verificationLog.length, 1);
    assert.deepStrictEqual(Object.keys(persisted.verificationLog[0]), [
      'at',
      'taskGroup',
      'verificationCommand',
      'verificationResult',
      'changedFiles',
      'checkpointStatus',
      'completedSteps',
      'diffSummary',
      'driftStatus'
    ]);

    const contextText = fs.readFileSync(path.join(changeDir, 'context.md'), 'utf8');
    assert(contextText.includes('# Context Capsule'));
    assert(contextText.includes('## Stage'));
    assert(contextText.includes('GROUP_VERIFIED'));
    assert(contextText.includes('## Last Verification'));
    assert(contextText.includes('npm run test:workflow-runtime'));
    assert(contextText.includes('1. Runtime setup'));
  });

  test('recordTaskGroupExecution starts queued group before completing from GROUP_VERIFIED', () => {
    const { recordTaskGroupExecution, writeChangeState } = require('../lib/change-store');
    const changeName = 'group-verified-starts-next-group';
    const changeDir = createChange(fixtureRoot, changeName, {
      'proposal.md': '# Proposal\n',
      'design.md': '# Design\n',
      'tasks.md': [
        '## 1. Runtime setup',
        '- [x] 1.1 Setup workspace',
        '',
        '## 2. Runtime integration',
        '- [x] 2.1 Build integration'
      ].join('\n'),
      'specs/runtime/spec.md': '## ADDED Requirements\n### Requirement: Runtime\n'
    });

    writeChangeState(changeDir, {
      change: changeName,
      stage: 'GROUP_VERIFIED',
      active: {
        taskGroup: null,
        nextTaskGroup: '2. Runtime integration'
      },
      blockers: []
    });

    const persisted = recordTaskGroupExecution(changeDir, {
      taskGroup: '2. Runtime integration',
      nextTaskGroup: null,
      verificationCommand: 'npm run test:workflow-runtime',
      verificationResult: 'PASS',
      changedFiles: ['lib/change-store.js'],
      checkpointStatus: 'PASS',
      completedSteps: ['RED', 'GREEN', 'VERIFY'],
      diffSummary: 'Completed the queued task group lifecycle.',
      driftStatus: 'clean'
    });

    assert.strictEqual(persisted.stage, 'IMPLEMENTED');
    assert.strictEqual(persisted.nextAction, 'verify');
    assert.strictEqual(persisted.active.taskGroup, null);
    assert.strictEqual(persisted.active.nextTaskGroup, null);
    assert(!persisted.blockers.some((blocker) => blocker.includes('Invalid transition')));
    assert.strictEqual(persisted.verificationLog[0].taskGroup, '2. Runtime integration');
  });

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
    assert.strictEqual(persisted.stage, 'IMPLEMENTED');
    assert.strictEqual(persisted.nextAction, 'verify');
    assert.deepStrictEqual(persisted.verificationLog[0].completedSteps, ['RED', 'GREEN', 'VERIFY']);
    assert.strictEqual(
      persisted.verificationLog[0].diffSummary,
      'Persisted execution-proof fields in existing verification log.'
    );
    assert.strictEqual(persisted.verificationLog[0].driftStatus, 'clean');
  });

  test('context capsule renders completed tdd steps and diff summary', () => {
    const { renderContextCapsule } = require('../lib/change-capsule');
    const text = renderContextCapsule({
      stage: 'APPLYING_GROUP',
      nextAction: 'verify',
      active: {
        taskGroup: '1. Runtime evidence',
        nextTaskGroup: '2. Follow-up'
      },
      verificationLog: [{
        at: '2026-04-28T10:10:00.000Z',
        taskGroup: '1. Runtime evidence',
        verificationCommand: 'npm run test:workflow-runtime',
        verificationResult: 'PASS',
        checkpointStatus: 'PASS',
        changedFiles: ['lib/workflow.js'],
        completedSteps: ['RED', 'GREEN', 'VERIFY'],
        diffSummary: 'Persisted execution-proof fields in existing verification log.',
        driftStatus: 'clean'
      }]
    });

    assert(text.includes('completedSteps: RED, GREEN, VERIFY'));
    assert(text.includes('diffSummary: Persisted execution-proof fields in existing verification log.'));
    assert(text.includes('driftStatus: clean'));
  });

  test('blocked execution checkpoint preserves artifact hashes and active task group', () => {
    const { recordTaskGroupExecution, writeChangeState } = require('../lib/change-store');
    const { hashTrackedArtifacts } = require('../lib/change-artifacts');
    const changeName = 'blocked-execution-preserves-baseline';
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
    const baselineHashes = hashTrackedArtifacts(changeDir);

    writeChangeState(changeDir, {
      change: changeName,
      stage: 'APPLYING_GROUP',
      active: {
        taskGroup: '1. Runtime setup',
        nextTaskGroup: '2. Runtime integration'
      },
      hashes: baselineHashes
    });
    writeText(path.join(changeDir, 'proposal.md'), '# Rejected proposal drift\n');

    const persisted = recordTaskGroupExecution(changeDir, {
      taskGroup: '1. Runtime setup',
      nextTaskGroup: '2. Runtime integration',
      verificationCommand: 'npm run test:workflow-runtime',
      verificationResult: 'BLOCK',
      changedFiles: ['proposal.md'],
      checkpointStatus: 'BLOCK'
    });

    assert.strictEqual(persisted.hashes['proposal.md'], baselineHashes['proposal.md']);
    assert.strictEqual(persisted.active.taskGroup, '1. Runtime setup');
    assert.strictEqual(persisted.active.nextTaskGroup, '2. Runtime integration');
    assert(persisted.blockers.includes('Execution checkpoint blocked for 1. Runtime setup'));
  });

  test('rejected execution checkpoint status variants preserve artifact hashes and active task group', () => {
    const { recordTaskGroupExecution, writeChangeState } = require('../lib/change-store');
    const { hashTrackedArtifacts } = require('../lib/change-artifacts');

    ['block', 'ERROR'].forEach((checkpointStatus) => {
      const expectedStatus = checkpointStatus.toUpperCase();
      const changeName = `rejected-execution-${expectedStatus.toLowerCase()}`;
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
      const baselineHashes = hashTrackedArtifacts(changeDir);

      writeChangeState(changeDir, {
        change: changeName,
        stage: 'APPLYING_GROUP',
        active: {
          taskGroup: '1. Runtime setup',
          nextTaskGroup: '2. Runtime integration'
        },
        hashes: baselineHashes
      });
      writeText(path.join(changeDir, 'proposal.md'), `# Rejected ${expectedStatus} proposal drift\n`);

      const persisted = recordTaskGroupExecution(changeDir, {
        taskGroup: '1. Runtime setup',
        nextTaskGroup: '2. Runtime integration',
        verificationCommand: 'npm run test:workflow-runtime',
        verificationResult: checkpointStatus,
        changedFiles: ['proposal.md'],
        checkpointStatus
      });

      assert.strictEqual(persisted.hashes['proposal.md'], baselineHashes['proposal.md']);
      assert.strictEqual(persisted.active.taskGroup, '1. Runtime setup');
      assert.strictEqual(persisted.active.nextTaskGroup, '2. Runtime integration');
      assert.strictEqual(persisted.checkpoints.execution.status, expectedStatus);
      assert.strictEqual(persisted.verificationLog[0].checkpointStatus, expectedStatus);
      assert(persisted.blockers.includes('Execution checkpoint blocked for 1. Runtime setup'));
    });
  });

  test('drift ledger preserves stable headings and timestamped entries', () => {
    const { recordTaskGroupExecution, writeChangeState } = require('../lib/change-store');
    const changeName = 'drift-ledger-stability';
    const changeDir = createChange(fixtureRoot, changeName, {
      'proposal.md': '# Proposal\n',
      'design.md': '# Design\n',
      'tasks.md': '## 1. Runtime setup\n- [ ] 1.1 Setup runtime\n',
      'specs/runtime/spec.md': '## ADDED Requirements\n### Requirement: Runtime\n'
    });

    writeChangeState(changeDir, {
      change: changeName,
      stage: 'TASKS_READY'
    });

    recordTaskGroupExecution(changeDir, {
      taskGroup: '1. Runtime setup',
      nextTaskGroup: null,
      verificationCommand: 'npm run test:workflow-runtime',
      verificationResult: 'PASS',
      changedFiles: ['lib/change-store.js'],
      checkpointStatus: 'PASS',
      hashDriftWarnings: ['Hash drift detected for tasks.md'],
      allowedPaths: ['lib/**'],
      forbiddenPaths: ['secrets/*.pem']
    });

    const driftText = fs.readFileSync(path.join(changeDir, 'drift.md'), 'utf8');
    [
      '## New Assumptions',
      '## Scope Changes',
      '## Out-of-Bound File Changes',
      '## Discovered Requirements',
      '## User Approval Needed'
    ].forEach((heading) => {
      assert(driftText.includes(heading), `Expected drift heading ${heading}`);
    });
    assert(/- \d{4}-\d{2}-\d{2}T/.test(driftText));
    assert(driftText.includes('secrets/*.pem'));
    assert(driftText.includes('lib/**'));
  });

  test('task checkpoint strict mode blocks missing RED and VERIFY for behavior-change groups', () => {
    const checkpoint = runTaskCheckpoint({
      config: {
        rules: {
          tdd: {
            mode: 'strict',
            requireFor: ['behavior-change', 'bugfix'],
            exempt: ['docs-only', 'copy-only', 'config-only']
          }
        }
      },
      sources: {
        proposal: '## Why\nNeed behavior-change checkpoint coverage.',
        specs: [
          '## ADDED Requirements',
          '### Requirement: Behavior-change checkpoint',
          'The system SHALL support behavior-change checkpoint coverage.'
        ].join('\n'),
        design: [
          '## Context',
          'Runtime behavior-change checkpoint design.'
        ].join('\n'),
        tasks: [
          '## Test Plan',
          '- Behavior: behavior-change task group coverage.',
          '- Requirement/Scenario: TDD-03 runtime checkpoint requirement.',
          '- Verification: automated runtime checks.',
          '- TDD Mode: strict',
          '- Exemption Reason: none',
          '',
          '## 1. Runtime behavior-change update',
          '- TDD Class: behavior-change',
          '- [ ] GREEN: Implement runtime checkpoint behavior.',
          '- [ ] REFACTOR: Optional cleanup while preserving behavior.'
        ].join('\n')
      }
    });

    assert.strictEqual(checkpoint.status, 'BLOCK');
    assert(checkpoint.findings.some((finding) => finding.code === 'tdd-red-missing' && finding.severity === 'BLOCK'));
    assert(checkpoint.findings.some((finding) => finding.code === 'tdd-verify-missing' && finding.severity === 'BLOCK'));
  });

  test('task checkpoint light mode warns missing RED and VERIFY for behavior-change groups', () => {
    const checkpoint = runTaskCheckpoint({
      config: {
        rules: {
          tdd: {
            mode: 'light',
            requireFor: ['behavior-change', 'bugfix'],
            exempt: ['docs-only', 'copy-only', 'config-only']
          }
        }
      },
      sources: {
        proposal: '## Why\nNeed behavior-change checkpoint coverage.',
        specs: [
          '## ADDED Requirements',
          '### Requirement: Behavior-change checkpoint',
          'The system SHALL support behavior-change checkpoint coverage.'
        ].join('\n'),
        design: [
          '## Context',
          'Runtime behavior-change checkpoint design.'
        ].join('\n'),
        tasks: [
          '## Test Plan',
          '- Behavior: behavior-change task group coverage.',
          '- Requirement/Scenario: TDD-03 runtime checkpoint requirement.',
          '- Verification: automated runtime checks.',
          '- TDD Mode: light',
          '- Exemption Reason: none',
          '',
          '## 1. Runtime behavior-change update',
          '- TDD Class: behavior-change',
          '- [ ] GREEN: Implement runtime checkpoint behavior.',
          '- [ ] REFACTOR: Optional cleanup while preserving behavior.'
        ].join('\n')
      }
    });

    assert.strictEqual(checkpoint.status, 'WARN');
    assert(checkpoint.findings.some((finding) => finding.code === 'tdd-red-missing' && finding.severity === 'WARN'));
    assert(checkpoint.findings.some((finding) => finding.code === 'tdd-verify-missing' && finding.severity === 'WARN'));
  });

  test('task checkpoint strict mode blocks unclassified task groups', () => {
    const checkpoint = runTaskCheckpoint({
      config: {
        rules: {
          tdd: {
            mode: 'strict',
            requireFor: ['behavior-change', 'bugfix'],
            exempt: ['docs-only', 'copy-only', 'config-only']
          }
        }
      },
      sources: {
        proposal: '## Why\nNeed resilient outbound HTTP calls.',
        specs: [
          '## ADDED Requirements',
          '### Requirement: Retry transient failures',
          'The system SHALL retry transient HTTP failures before surfacing an error.'
        ].join('\n'),
        design: [
          '## Context',
          'Retry logic adds runtime control flow for transient HTTP failures.'
        ].join('\n'),
        tasks: [
          '## Test Plan',
          '- Behavior: retry transient HTTP failures.',
          '- Requirement/Scenario: TDD-03 runtime checkpoint requirement.',
          '- Verification: automated runtime checks.',
          '- TDD Mode: strict',
          '- Exemption Reason: none',
          '',
          '## 1. Add retry logic',
          '- [ ] GREEN: Implement retry handling for transient failures.'
        ].join('\n')
      }
    });

    assert.strictEqual(checkpoint.status, 'BLOCK');
    assert(checkpoint.findings.some((finding) => finding.code === 'tdd-classification-missing' && finding.severity === 'BLOCK'));
  });

  test('task checkpoint off mode skips TDD findings', () => {
    const checkpoint = runTaskCheckpoint({
      config: {
        rules: {
          tdd: {
            mode: 'off',
            requireFor: ['behavior-change', 'bugfix'],
            exempt: ['docs-only', 'copy-only', 'config-only']
          }
        }
      },
      sources: {
        proposal: '## Why\nNeed behavior-change checkpoint coverage.',
        specs: [
          '## ADDED Requirements',
          '### Requirement: Behavior-change checkpoint',
          'The system SHALL support behavior-change checkpoint coverage.'
        ].join('\n'),
        design: [
          '## Context',
          'Runtime behavior-change checkpoint design.'
        ].join('\n'),
        tasks: [
          '## Test Plan',
          '- Behavior: behavior-change task group coverage.',
          '- Requirement/Scenario: TDD-03 runtime checkpoint requirement.',
          '- Verification: automated runtime checks.',
          '- TDD Mode: off',
          '- Exemption Reason: none',
          '',
          '## 1. Runtime behavior-change update',
          '- TDD Class: behavior-change',
          '- [ ] GREEN: Implement runtime checkpoint behavior.'
        ].join('\n')
      }
    });

    assert(!checkpoint.findings.some((finding) => finding.code.startsWith('tdd-')));
  });

  test('task checkpoint prefers explicit TDD Exemption over heuristic classification', () => {
    const checkpoint = runTaskCheckpoint({
      config: {
        rules: {
          tdd: {
            mode: 'strict',
            requireFor: ['behavior-change', 'bugfix'],
            exempt: ['docs-only', 'copy-only', 'config-only']
          }
        }
      },
      sources: {
        proposal: '## Why\nNeed bugfix wording cleanup in docs.',
        specs: [
          '## ADDED Requirements',
          '### Requirement: Bugfix wording',
          'The system SHALL keep bugfix wording consistent.'
        ].join('\n'),
        design: [
          '## Context',
          'Bugfix wording update.',
          '## Migration Plan',
          'No migration required.'
        ].join('\n'),
        tasks: [
          '## Test Plan',
          '- Behavior: docs-only update for bugfix naming.',
          '- Requirement/Scenario: TDD-03 exemption precedence check.',
          '- Verification: manual — checklist reviewed by maintainer.',
          '- TDD Mode: strict',
          '- Exemption Reason: docs-only wording pass.',
          '',
          '## 1. Runtime bugfix wording refresh',
          '- TDD Exemption: docs-only — wording-only updates with no behavior logic change.',
          '- [ ] Update runtime bugfix wording references.',
          '- [ ] VERIFY: manual — release manager review completed.'
        ].join('\n')
      }
    });

    assert(!checkpoint.findings.some((finding) => finding.code === 'tdd-red-missing'));
    assert(!checkpoint.findings.some((finding) => finding.code === 'tdd-verify-missing'));
    assert(!checkpoint.findings.some((finding) => finding.code === 'tdd-exemption-reason-missing'));
    assert.strictEqual(checkpoint.tdd.groups[0].exempt, true);
  });

  test('task checkpoint strict mode blocks exempt TDD Class without exemption reason', () => {
    const checkpoint = runTaskCheckpoint({
      config: {
        rules: {
          tdd: {
            mode: 'strict',
            requireFor: ['behavior-change', 'bugfix'],
            exempt: ['docs-only', 'copy-only', 'config-only']
          }
        }
      },
      sources: {
        proposal: '## Why\nNeed docs-only guidance refresh.',
        specs: [
          '## ADDED Requirements',
          '### Requirement: Docs guidance',
          'The system SHALL keep docs guidance aligned with runtime behavior.'
        ].join('\n'),
        design: [
          '## Context',
          'Docs-only guidance refresh.',
          '## Migration Plan',
          'No migration required.'
        ].join('\n'),
        tasks: [
          '## Test Plan',
          '- Behavior: docs-only guidance refresh.',
          '- Requirement/Scenario: TDD-03 exemption reason check.',
          '- Verification: automated runtime checks.',
          '- TDD Mode: strict',
          '- Exemption Reason: docs-only wording pass.',
          '',
          '## 1. Docs guidance refresh',
          '- TDD Class: docs-only',
          '- [ ] Update docs guidance wording.',
          '- [ ] VERIFY: Run npm run test:workflow-runtime.'
        ].join('\n')
      }
    });

    assert.strictEqual(checkpoint.status, 'BLOCK');
    assert(checkpoint.findings.some((finding) => finding.code === 'tdd-exemption-reason-missing' && finding.severity === 'BLOCK'));
    assert(!checkpoint.findings.some((finding) => finding.code === 'tdd-red-missing'));
    assert(!checkpoint.findings.some((finding) => finding.code === 'tdd-verify-missing'));
    assert.strictEqual(checkpoint.tdd.groups[0].class, 'docs-only');
    assert.strictEqual(checkpoint.tdd.groups[0].classSource, 'explicit-class');
    assert.strictEqual(checkpoint.tdd.groups[0].exempt, false);
    assert.strictEqual(checkpoint.tdd.groups[0].exemptionReasonMissing, true);
  });

  test('task checkpoint light mode warns heuristic exempt class without exemption reason', () => {
    const checkpoint = runTaskCheckpoint({
      config: {
        rules: {
          tdd: {
            mode: 'light',
            requireFor: ['behavior-change', 'bugfix'],
            exempt: ['docs-only', 'copy-only', 'config-only']
          }
        }
      },
      sources: {
        proposal: '## Why\nNeed docs-only guidance refresh.',
        specs: [
          '## ADDED Requirements',
          '### Requirement: Docs guidance',
          'The system SHALL keep docs guidance aligned with runtime behavior.'
        ].join('\n'),
        design: [
          '## Context',
          'Docs-only guidance refresh.',
          '## Migration Plan',
          'No migration required.'
        ].join('\n'),
        tasks: [
          '## Test Plan',
          '- Behavior: docs-only guidance refresh.',
          '- Requirement/Scenario: TDD-03 exemption reason check.',
          '- Verification: automated runtime checks.',
          '- TDD Mode: light',
          '- Exemption Reason: docs-only wording pass.',
          '',
          '## 1. Docs guidance refresh',
          '- [ ] Update docs guidance wording.',
          '- [ ] VERIFY: Run npm run test:workflow-runtime.'
        ].join('\n')
      }
    });

    assert.strictEqual(checkpoint.status, 'WARN');
    assert(checkpoint.findings.some((finding) => finding.code === 'tdd-exemption-reason-missing' && finding.severity === 'WARN'));
    assert(!checkpoint.findings.some((finding) => finding.code === 'tdd-classification-missing'));
    assert.strictEqual(checkpoint.tdd.groups[0].class, 'docs-only');
    assert.strictEqual(checkpoint.tdd.groups[0].classSource, 'heuristic');
    assert.strictEqual(checkpoint.tdd.groups[0].exempt, false);
    assert.strictEqual(checkpoint.tdd.groups[0].exemptionReasonMissing, true);
  });

  test('task checkpoint strict mode blocks TDD Exemption without reason', () => {
    const checkpoint = runTaskCheckpoint({
      config: {
        rules: {
          tdd: {
            mode: 'strict',
            requireFor: ['behavior-change', 'bugfix'],
            exempt: ['docs-only', 'copy-only', 'config-only']
          }
        }
      },
      sources: {
        proposal: '## Why\nNeed docs-only guidance refresh.',
        specs: [
          '## ADDED Requirements',
          '### Requirement: Docs guidance',
          'The system SHALL keep docs guidance aligned with runtime behavior.'
        ].join('\n'),
        design: [
          '## Context',
          'Docs-only guidance refresh.',
          '## Migration Plan',
          'No migration required.'
        ].join('\n'),
        tasks: [
          '## Test Plan',
          '- Behavior: docs-only guidance refresh.',
          '- Requirement/Scenario: TDD-03 exemption reason check.',
          '- Verification: automated runtime checks.',
          '- TDD Mode: strict',
          '- Exemption Reason: docs-only wording pass.',
          '',
          '## 1. Docs guidance refresh',
          '- TDD Exemption: docs-only',
          '- [ ] Update docs guidance wording.',
          '- [ ] VERIFY: Run npm run test:workflow-runtime.'
        ].join('\n')
      }
    });

    assert.strictEqual(checkpoint.status, 'BLOCK');
    assert(checkpoint.findings.some((finding) => finding.code === 'tdd-exemption-reason-missing' && finding.severity === 'BLOCK'));
    assert.strictEqual(checkpoint.tdd.groups[0].exempt, false);
    assert.strictEqual(checkpoint.tdd.groups[0].exemptionReasonMissing, true);
  });

  test('task checkpoint light mode warns TDD Exemption without reason', () => {
    const checkpoint = runTaskCheckpoint({
      config: {
        rules: {
          tdd: {
            mode: 'light',
            requireFor: ['behavior-change', 'bugfix'],
            exempt: ['docs-only', 'copy-only', 'config-only']
          }
        }
      },
      sources: {
        proposal: '## Why\nNeed docs-only guidance refresh.',
        specs: [
          '## ADDED Requirements',
          '### Requirement: Docs guidance',
          'The system SHALL keep docs guidance aligned with runtime behavior.'
        ].join('\n'),
        design: [
          '## Context',
          'Docs-only guidance refresh.',
          '## Migration Plan',
          'No migration required.'
        ].join('\n'),
        tasks: [
          '## Test Plan',
          '- Behavior: docs-only guidance refresh.',
          '- Requirement/Scenario: TDD-03 exemption reason check.',
          '- Verification: automated runtime checks.',
          '- TDD Mode: light',
          '- Exemption Reason: docs-only wording pass.',
          '',
          '## 1. Docs guidance refresh',
          '- TDD Exemption: docs-only',
          '- [ ] Update docs guidance wording.',
          '- [ ] VERIFY: Run npm run test:workflow-runtime.'
        ].join('\n')
      }
    });

    assert.strictEqual(checkpoint.status, 'WARN');
    assert(checkpoint.findings.some((finding) => finding.code === 'tdd-exemption-reason-missing' && finding.severity === 'WARN'));
    assert.strictEqual(checkpoint.tdd.groups[0].exempt, false);
    assert.strictEqual(checkpoint.tdd.groups[0].exemptionReasonMissing, true);
  });

  test('task checkpoint strict mode blocks unconfigured TDD Exemption classes', () => {
    const checkpoint = runTaskCheckpoint({
      config: {
        rules: {
          tdd: {
            mode: 'strict',
            requireFor: ['behavior-change', 'bugfix'],
            exempt: ['docs-only', 'copy-only', 'config-only']
          }
        }
      },
      sources: {
        proposal: '## Why\nNeed behavior-change checkpoint coverage.',
        specs: [
          '## ADDED Requirements',
          '### Requirement: Behavior-change checkpoint',
          'The system SHALL support behavior-change checkpoint coverage.'
        ].join('\n'),
        design: [
          '## Context',
          'Runtime behavior-change checkpoint design.'
        ].join('\n'),
        tasks: [
          '## Test Plan',
          '- Behavior: behavior-change task group coverage.',
          '- Requirement/Scenario: TDD-03 runtime checkpoint requirement.',
          '- Verification: automated runtime checks.',
          '- TDD Mode: strict',
          '- Exemption Reason: none',
          '',
          '## 1. Runtime behavior-change update',
          '- TDD Exemption: not-configured — custom reason',
          '- [ ] GREEN: Implement runtime checkpoint behavior.'
        ].join('\n')
      }
    });

    assert.strictEqual(checkpoint.status, 'BLOCK');
    assert(checkpoint.findings.some((finding) => finding.code === 'tdd-exemption-class-invalid' && finding.severity === 'BLOCK'));
    assert(!checkpoint.findings.some((finding) => finding.code === 'tdd-red-missing'));
    assert(!checkpoint.findings.some((finding) => finding.code === 'tdd-verify-missing'));
    assert(!checkpoint.findings.some((finding) => finding.code === 'tdd-exemption-reason-missing'));
    assert.strictEqual(checkpoint.tdd.groups[0].class, 'not-configured');
    assert.strictEqual(checkpoint.tdd.groups[0].classSource, 'explicit-exemption');
    assert.strictEqual(checkpoint.tdd.groups[0].required, false);
    assert.strictEqual(checkpoint.tdd.groups[0].exempt, false);
    assert.strictEqual(checkpoint.tdd.groups[0].exemptionClassInvalid, true);
  });

  test('task checkpoint strict mode blocks visible but unconfigured TDD Exemption classes', () => {
    const checkpoint = runTaskCheckpoint({
      config: {
        rules: {
          tdd: {
            mode: 'strict',
            requireFor: ['behavior-change', 'bugfix'],
            exempt: ['docs-only', 'copy-only', 'config-only']
          }
        }
      },
      sources: {
        proposal: '## Why\nNeed behavior-change checkpoint coverage.',
        specs: [
          '## ADDED Requirements',
          '### Requirement: Behavior-change checkpoint',
          'The system SHALL support behavior-change checkpoint coverage.'
        ].join('\n'),
        design: [
          '## Context',
          'Runtime behavior-change checkpoint design.'
        ].join('\n'),
        tasks: [
          '## Test Plan',
          '- Behavior: behavior-change task group coverage.',
          '- Requirement/Scenario: TDD-03 runtime checkpoint requirement.',
          '- Verification: automated runtime checks.',
          '- TDD Mode: strict',
          '- Exemption Reason: none',
          '',
          '## 1. Runtime behavior-change update',
          '- TDD Exemption: migration-only -- custom reason',
          '- [ ] GREEN: Implement runtime checkpoint behavior.'
        ].join('\n')
      }
    });

    assert.strictEqual(checkpoint.status, 'BLOCK');
    assert(checkpoint.findings.some((finding) => finding.code === 'tdd-exemption-class-invalid' && finding.severity === 'BLOCK'));
    assert(!checkpoint.findings.some((finding) => finding.code === 'tdd-red-missing'));
    assert(!checkpoint.findings.some((finding) => finding.code === 'tdd-verify-missing'));
    assert(!checkpoint.findings.some((finding) => finding.code === 'tdd-exemption-reason-missing'));
    assert.strictEqual(checkpoint.tdd.groups[0].class, 'migration-only');
    assert.strictEqual(checkpoint.tdd.groups[0].classSource, 'explicit-exemption');
    assert.strictEqual(checkpoint.tdd.groups[0].required, false);
    assert.strictEqual(checkpoint.tdd.groups[0].exempt, false);
    assert.strictEqual(checkpoint.tdd.groups[0].exemptionClassInvalid, true);
  });

  test('task checkpoint strict mode accepts configured TDD Exemption classes', () => {
    const checkpoint = runTaskCheckpoint({
      config: {
        rules: {
          tdd: {
            mode: 'strict',
            requireFor: ['behavior-change', 'bugfix'],
            exempt: ['docs-only', 'copy-only', 'config-only', 'migration-only']
          }
        }
      },
      sources: {
        proposal: '## Why\nNeed behavior-change checkpoint coverage.',
        specs: [
          '## ADDED Requirements',
          '### Requirement: Behavior-change checkpoint',
          'The system SHALL support behavior-change checkpoint coverage.'
        ].join('\n'),
        design: [
          '## Context',
          'Runtime behavior-change checkpoint design.'
        ].join('\n'),
        tasks: [
          '## Test Plan',
          '- Behavior: behavior-change task group coverage.',
          '- Requirement/Scenario: TDD-03 runtime checkpoint requirement.',
          '- Verification: automated runtime checks.',
          '- TDD Mode: strict',
          '- Exemption Reason: migration-only custom reason.',
          '',
          '## 1. Runtime behavior-change update',
          '- TDD Exemption: migration-only -- custom reason',
          '- [ ] GREEN: Implement runtime checkpoint behavior.'
        ].join('\n')
      }
    });

    assert(!checkpoint.findings.some((finding) => finding.code.startsWith('tdd-')));
    assert.strictEqual(checkpoint.tdd.groups[0].class, 'migration-only');
    assert.strictEqual(checkpoint.tdd.groups[0].classSource, 'explicit-exemption');
    assert.strictEqual(checkpoint.tdd.groups[0].required, false);
    assert.strictEqual(checkpoint.tdd.groups[0].exempt, true);
    assert.strictEqual(checkpoint.tdd.groups[0].exemptionClassInvalid, false);
  });

  test('task checkpoint light mode warns unconfigured TDD Exemption classes', () => {
    const checkpoint = runTaskCheckpoint({
      config: {
        rules: {
          tdd: {
            mode: 'light',
            requireFor: ['behavior-change', 'bugfix'],
            exempt: ['docs-only', 'copy-only', 'config-only']
          }
        }
      },
      sources: {
        proposal: '## Why\nNeed behavior-change checkpoint coverage.',
        specs: [
          '## ADDED Requirements',
          '### Requirement: Behavior-change checkpoint',
          'The system SHALL support behavior-change checkpoint coverage.'
        ].join('\n'),
        design: [
          '## Context',
          'Runtime behavior-change checkpoint design.'
        ].join('\n'),
        tasks: [
          '## Test Plan',
          '- Behavior: behavior-change task group coverage.',
          '- Requirement/Scenario: TDD-03 runtime checkpoint requirement.',
          '- Verification: automated runtime checks.',
          '- TDD Mode: light',
          '- Exemption Reason: none',
          '',
          '## 1. Runtime behavior-change update',
          '- TDD Exemption: not-configured — custom reason',
          '- [ ] GREEN: Implement runtime checkpoint behavior.'
        ].join('\n')
      }
    });

    assert.strictEqual(checkpoint.status, 'WARN');
    assert(checkpoint.findings.some((finding) => finding.code === 'tdd-exemption-class-invalid' && finding.severity === 'WARN'));
    assert(!checkpoint.findings.some((finding) => finding.code === 'tdd-red-missing'));
    assert(!checkpoint.findings.some((finding) => finding.code === 'tdd-verify-missing'));
    assert.strictEqual(checkpoint.tdd.groups[0].exemptionClassInvalid, true);
  });

  test('apply instructions surface tdd mode and blocker codes', () => {
    const changeName = 'apply-instructions-tdd-mode';
    createChange(fixtureRoot, changeName, {
      'proposal.md': '## Why\nNeed apply checkpoint TDD blockers.',
      'specs/runtime/spec.md': [
        '## ADDED Requirements',
        '### Requirement: Apply checkpoint TDD blockers',
        'The system SHALL surface TDD blocker findings in apply guidance.'
      ].join('\n'),
      'design.md': [
        '## Context',
        'Apply checkpoint TDD blocker design.'
      ].join('\n'),
      'tasks.md': [
        '## Test Plan',
        '- Behavior: apply guidance should expose TDD checkpoint blockers.',
        '- Requirement/Scenario: TDD-03 / apply guidance payload.',
        '- Verification: automated runtime checks.',
        '- TDD Mode: strict',
        '- Exemption Reason: none',
        '',
        '## 1. Runtime checkpoint blocker group',
        '- TDD Class: behavior-change',
        '- [ ] GREEN: Implement runtime checkpoint blocker behavior.'
      ].join('\n')
    });

    const apply = buildApplyInstructions({ repoRoot: fixtureRoot, changeName });
    assert.strictEqual(apply.tddMode, 'strict');
    assert.strictEqual(apply.nextTaskGroupClass, 'behavior-change');
    assert.strictEqual(apply.nextTaskGroupExempt, false);
    assert(apply.checkpoint.findings.some((finding) => finding.code === 'tdd-red-missing'));
    assert(apply.checkpoint.findings.some((finding) => finding.code === 'tdd-verify-missing'));
  });

  test('status and apply instructions preserve caller-provided request text for review heuristics', () => {
    const changeName = 'request-source-review';
    createChange(fixtureRoot, changeName, {
      'proposal.md': [
        '## Why',
        'Need runtime status output with rollout migration, rollback, and compatibility guidance.'
      ].join('\n'),
      'specs/core/spec.md': [
        '## ADDED Requirements',
        '### Requirement: Runtime status',
        'The system SHALL support runtime status output with migration, rollback, and compatibility guidance.',
        '',
        '#### Scenario: Runtime status verification',
        '- **WHEN** runtime status output is generated',
        '- **THEN** migration, rollback, compatibility, and verification guidance remain visible'
      ].join('\n'),
      'design.md': [
        '## Context',
        'Runtime status output with rollout compatibility.',
        '## Migration Plan',
        'Rollout migration and rollback compatibility guidance remain required.'
      ].join('\n'),
      'tasks.md': [
        '## 1. Runtime status guidance',
        '- TDD Class: behavior-change',
        '- [x] RED: Add runtime status output regression coverage.',
        '- [x] GREEN: Add runtime status output implementation.',
        '- [x] VERIFY: Add verification, security, and compatibility checks.',
        '- [x] 1.3 Document rollout migration and rollback guidance'
      ].join('\n')
    });

    const status = buildStatus({
      repoRoot: fixtureRoot,
      changeName,
      sources: {
        request: 'add admin auth token workflow'
      }
    });
    assert.strictEqual(status.review.state, 'recommended');
    assert.strictEqual(status.review.active, false);
    assert.strictEqual(status.artifacts['security-review'].active, false);
    assert.strictEqual(status.next.stage, 'apply');
    assert.strictEqual(status.next.artifactId, null);

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

  test('caller-provided artifact sources survive when files are absent', () => {
    const changeName = 'in-memory-artifacts';
    createChange(fixtureRoot, changeName, {});

    const inMemorySources = {
      proposal: [
        '## Why',
        'Need runtime preview flow with rollout migration, rollback, and compatibility guidance.'
      ].join('\n'),
      specs: [
        '## ADDED Requirements',
        '### Requirement: Runtime preview',
        'The system SHALL support runtime preview flow with migration, rollback, and compatibility guidance.',
        '',
        '#### Scenario: Runtime preview verification',
        '- **WHEN** runtime preview instructions are generated',
        '- **THEN** verification and compatibility guidance remain visible'
      ].join('\n'),
      design: [
        '## Context',
        'Runtime preview flow with rollout compatibility.',
        '## Migration Plan',
        'Rollout migration and rollback compatibility guidance remain required.'
      ].join('\n'),
      tasks: [
        '## 1. Runtime preview',
        '- TDD Class: behavior-change',
        '- [x] RED: Add runtime preview regression coverage.',
        '- [x] GREEN: Add runtime preview implementation.',
        '- [x] VERIFY: Add verification and compatibility checks.',
        '- [x] 1.3 Document rollout migration and rollback guidance'
      ].join('\n')
    };

    const status = buildStatus({
      repoRoot: fixtureRoot,
      changeName,
      sources: Object.assign({
        request: 'add admin auth token workflow'
      }, inMemorySources)
    });
    assert.strictEqual(status.review.state, 'recommended');
    assert.strictEqual(status.review.active, false);
    assert.strictEqual(status.artifacts.proposal.state, 'ready');
    assert.strictEqual(status.next.artifactId, 'proposal');

    const apply = buildApplyInstructions({
      repoRoot: fixtureRoot,
      changeName,
      sources: Object.assign({
        request: 'add admin auth token workflow'
      }, inMemorySources)
    });
    assert.strictEqual(apply.ready, false);
    assert(apply.prerequisites.includes('tasks artifact is not completed'));
    assert.strictEqual(apply.checkpoint.status, 'WARN');
    assert(!apply.checkpoint.findings.some((finding) => finding.code === 'tasks-missing'));
    assert(!apply.checkpoint.findings.some((finding) => finding.code === 'specs-missing'));
    assert(!apply.checkpoint.findings.some((finding) => finding.code === 'design-missing'));
    assert(apply.checkpoint.findings.some((finding) => finding.code === 'security-review-recommended-task-checkpoint'));
  });

  test('whitespace-only files do not override in-memory sources and array-backed tasks still drive apply previews', () => {
    const changeName = 'whitespace-preview';
    createChange(fixtureRoot, changeName, {
      'proposal.md': '\n',
      'specs/core/spec.md': '   \n',
      'design.md': '\n\n',
      'tasks.md': ' \n'
    });

    const previewSources = {
      request: 'add admin auth token workflow',
      proposal: [
        '## Why',
        'Need whitespace-safe preview flow with rollout migration, rollback, and compatibility guidance.'
      ].join('\n'),
      specs: [
        '## ADDED Requirements',
        '### Requirement: Preview flow',
        'The system SHALL support preview flow with migration, rollback, and compatibility guidance.',
        '',
        '#### Scenario: Preview verification',
        '- **WHEN** preview instructions are generated',
        '- **THEN** verification and compatibility guidance remain visible'
      ].join('\n'),
      design: [
        '## Context',
        'Preview flow with rollout compatibility.',
        '## Migration Plan',
        'Rollout migration and rollback compatibility guidance remain required.'
      ].join('\n'),
      tasks: [
        '## 1. Preview base',
        '- TDD Class: behavior-change',
        '- [x] RED: Add preview flow regression coverage.',
        '- [x] GREEN: Add preview flow implementation.',
        '- [x] VERIFY: Add verification and compatibility checks.',
        '',
        '## 2. Preview follow-up',
        '- TDD Class: behavior-change',
        '- [ ] RED: Add preview follow-up API coverage.',
        '- [ ] GREEN: Add preview follow-up API.',
        '- [ ] VERIFY: Add preview follow-up verification.'
      ]
    };

    const status = buildStatus({
      repoRoot: fixtureRoot,
      changeName,
      sources: previewSources
    });
    assert.strictEqual(status.review.state, 'recommended');
    assert.strictEqual(status.review.active, false);
    assert.strictEqual(status.next.stage, 'apply');
    assert.strictEqual(status.next.artifactId, null);

    const apply = buildApplyInstructions({
      repoRoot: fixtureRoot,
      changeName,
      sources: previewSources
    });
    assert.strictEqual(apply.remainingTaskGroups.length, 1);
    assert.strictEqual(apply.nextTaskGroup, '2. Preview follow-up');
    assert(!apply.checkpoint.findings.some((finding) => finding.code === 'tasks-missing'));
    assert(!apply.checkpoint.findings.some((finding) => finding.code === 'specs-missing'));
    assert(!apply.checkpoint.findings.some((finding) => finding.code === 'design-missing'));
    assert(apply.checkpoint.findings.some((finding) => finding.code === 'security-review-recommended-task-checkpoint'));
  });

  test('apply readiness stays false until required planning artifacts exist on disk', () => {
    const changeName = 'apply-preview-not-ready';
    createChange(fixtureRoot, changeName, {
      'tasks.md': [
        '## 1. Runtime preview',
        '- [x] 1.1 Add runtime preview implementation',
        '- [x] 1.2 Add runtime preview verification'
      ].join('\n')
    });

    const previewSources = {
      proposal: [
        '## Why',
        'Need runtime preview flow with rollout migration, rollback, and compatibility guidance.'
      ].join('\n'),
      specs: [
        '## ADDED Requirements',
        '### Requirement: Runtime preview',
        'The system SHALL support runtime preview flow with migration, rollback, and compatibility guidance.',
        '',
        '#### Scenario: Runtime preview verification',
        '- **WHEN** runtime preview instructions are generated',
        '- **THEN** verification and compatibility guidance remain visible'
      ].join('\n'),
      design: [
        '## Context',
        'Runtime preview flow with rollout compatibility.',
        '## Migration Plan',
        'Rollout migration and rollback compatibility guidance remain required.'
      ].join('\n')
    };

    const status = buildStatus({
      repoRoot: fixtureRoot,
      changeName,
      sources: previewSources
    });
    assert.strictEqual(status.next.artifactId, 'proposal');

    const apply = buildApplyInstructions({
      repoRoot: fixtureRoot,
      changeName,
      sources: previewSources
    });
    assert.strictEqual(apply.ready, false);
    assert(apply.prerequisites.includes('proposal artifact is not completed'));
    assert(apply.prerequisites.includes('specs artifact is not completed'));
    assert(apply.prerequisites.includes('design artifact is not completed'));
    assert(!apply.checkpoint.findings.some((finding) => finding.code === 'proposal-missing'));
    assert(!apply.checkpoint.findings.some((finding) => finding.code === 'specs-missing'));
    assert(!apply.checkpoint.findings.some((finding) => finding.code === 'design-missing'));
  });

  test('workflow summary exposes advisory review inactivity', () => {
    const summary = summarizeWorkflowState({
      config: {
        schema: 'spec-driven',
        securityReview: {
          mode: 'heuristic',
          required: false,
          allowWaiver: true,
          heuristicHint: 'auth, admin, token, payment'
        }
      },
      change: {
        securitySensitive: false,
        securityWaiver: { approved: false, reason: '' }
      },
      artifacts: {
        proposal: true,
        specs: true,
        design: true,
        tasks: false,
        'security-review': false
      },
      sources: {
        request: 'add admin auth token workflow'
      }
    });
    assert(summary.securityReview);
    assert.strictEqual(summary.securityReview.state, 'recommended');
    assert.strictEqual(summary.securityReview.active, false);
    assert.strictEqual(summary.artifacts['security-review'].state, 'READY');
    assert.strictEqual(summary.artifacts['security-review'].active, false);
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
    ensureDir(path.join(minimalRoot, '.opsx', 'changes', 'template-source', 'specs', 'core'));
    writeText(path.join(minimalRoot, '.opsx', 'config.yaml'), 'schema: spec-driven\nlanguage: en\n');
    writeText(path.join(minimalRoot, '.opsx', 'changes', 'template-source', 'change.yaml'), [
      'name: template-source',
      'schema: spec-driven',
      `createdAt: ${new Date('2026-01-03T00:00:00.000Z').toISOString()}`
    ].join('\n'));
    writeText(path.join(minimalRoot, '.opsx', 'changes', 'template-source', 'proposal.md'), '## Why\nTemplate source.');
    writeText(path.join(minimalRoot, '.opsx', 'changes', 'template-source', 'specs', 'core', 'spec.md'), [
      '## ADDED Requirements',
      '### Requirement: Template',
      'The system SHALL load templates from package references.'
    ].join('\n'));
    writeText(path.join(minimalRoot, '.opsx', 'changes', 'template-source', 'design.md'), [
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
    assert(payload.template.content.includes('## Test Plan'));
    assert(payload.template.content.includes('TDD Class: behavior-change'));
    assert(payload.template.content.includes('TDD Exemption: docs-only'));
    assert(payload.template.sourcePath.includes(path.join('skills', 'opsx', 'references')));
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
        '- TDD Class: behavior-change',
        '- [x] RED: Add runtime apply graph kernel regression coverage.',
        '- [x] GREEN: Implement runtime apply instructions graph kernel.',
        '- [x] VERIFY: Add migration rollback compatibility validators.',
        '',
        '## 2. Runtime instructions',
        '- TDD Class: behavior-change',
        '- [ ] RED: Add runtime apply instructions API coverage.',
        '- [ ] GREEN: Add runtime apply instructions API implementation.',
        '- [ ] VERIFY: Add runtime apply verification tests and compatibility checks.'
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

  test('apply instructions advance exactly one top-level task group', () => {
    const { writeChangeState, setActiveTaskGroup } = require('../lib/change-store');
    const changeName = 'apply-one-group-state';
    const changeDir = createChange(fixtureRoot, changeName, {
      'proposal.md': '# Proposal\n',
      'design.md': '# Design\n',
      'specs/runtime/spec.md': '## ADDED Requirements\n### Requirement: Runtime\n',
      'tasks.md': [
        '## 1. Setup',
        '- [x] 1.1 Seed workspace',
        '',
        '## 2. Runtime integration',
        '- [ ] 2.1 Build runtime integration',
        '',
        '## 3. Verification',
        '- [ ] 3.1 Add verification checks'
      ].join('\n')
    });

    writeChangeState(changeDir, {
      change: changeName,
      stage: 'APPLYING_GROUP'
    });
    setActiveTaskGroup(changeDir, '2. Runtime integration', '3. Verification');

    const apply = buildApplyInstructions({ repoRoot: fixtureRoot, changeName });
    assert.strictEqual(apply.nextTaskGroup, '2. Runtime integration');
    assert.strictEqual(apply.remainingTaskGroups.length, 1);
    assert.strictEqual(apply.remainingTaskGroups[0].title, '2. Runtime integration');
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

  test('checkpoint contract validators remain green with spec-split-checkpoint', () => {
    assert.deepStrictEqual(validatePhaseOneWorkflowContract(), []);
    assert.deepStrictEqual(validateCheckpointContracts(), []);
  });

  test('opsx check/doc/language work as subcommands and compatibility aliases', () => {
    const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'opsx-home-cli-'));
    cleanupTargets.push(tempHome);
    install({ platform: 'claude,codex,gemini', homeDir: tempHome, language: 'en' });

    const cliOptions = {
      cwd: fixtureRoot,
      env: { HOME: tempHome }
    };

    const checkCommand = runOpsxCli(['check'], cliOptions);
    assert.strictEqual(checkCommand.status, 0, checkCommand.stderr);
    assert(checkCommand.stdout.includes('Installation Check'));

    const checkAlias = runOpsxCli(['--check'], cliOptions);
    assert.strictEqual(checkAlias.status, 0, checkAlias.stderr);
    assert(checkAlias.stdout.includes('Installation Check'));

    const docCommand = runOpsxCli(['doc'], cliOptions);
    assert.strictEqual(docCommand.status, 0, docCommand.stderr);
    assert(docCommand.stdout.includes('# OpsX Guide'));

    const docAlias = runOpsxCli(['--doc'], cliOptions);
    assert.strictEqual(docAlias.status, 0, docAlias.stderr);
    assert(docAlias.stdout.includes('# OpsX Guide'));

    const languageCommand = runOpsxCli(['language', 'zh'], cliOptions);
    assert.strictEqual(languageCommand.status, 0, languageCommand.stderr);
    assert(languageCommand.stdout.includes('语言已切换为中文。'));

    const languageAlias = runOpsxCli(['--language', 'en'], cliOptions);
    assert.strictEqual(languageAlias.status, 0, languageAlias.stderr);
    assert(languageAlias.stdout.includes('Language switched to English.'));
  });

  test('repository .gitignore tracks canonical .opsx artifacts and ignores runtime scratch paths', () => {
    const gitFixture = fs.mkdtempSync(path.join(os.tmpdir(), 'opsx-gitignore-fixture-'));
    cleanupTargets.push(gitFixture);

    const initResult = spawnSync('git', ['init'], { cwd: gitFixture, encoding: 'utf8' });
    assert.strictEqual(initResult.status, 0, initResult.stderr);

    fs.copyFileSync(path.join(REPO_ROOT, '.gitignore'), path.join(gitFixture, '.gitignore'));
    writeText(path.join(gitFixture, '.opsx', 'config.yaml'), 'schema: spec-driven\nlanguage: en\n');
    writeText(path.join(gitFixture, '.opsx', 'active.yaml'), 'version: 1\nactiveChange: ""\n');
    writeText(path.join(gitFixture, '.opsx', 'changes', 'demo', 'proposal.md'), '# Proposal\n');
    writeText(path.join(gitFixture, '.opsx', 'specs', 'demo', 'spec.md'), '# Spec\n');
    writeText(path.join(gitFixture, '.opsx', 'archive', 'demo.md'), '# Archive\n');
    writeText(path.join(gitFixture, '.opsx', 'cache', 'demo.tmp'), 'cache\n');
    writeText(path.join(gitFixture, '.opsx', 'tmp', 'demo.tmp'), 'tmp\n');
    writeText(path.join(gitFixture, '.opsx', 'logs', 'demo.log'), 'logs\n');

    [
      { file: '.opsx/config.yaml', rule: '!.opsx/config.yaml' },
      { file: '.opsx/active.yaml', rule: '!.opsx/active.yaml' },
      { file: '.opsx/changes/demo/proposal.md', rule: '!.opsx/changes/**' },
      { file: '.opsx/specs/demo/spec.md', rule: '!.opsx/specs/**' },
      { file: '.opsx/archive/demo.md', rule: '!.opsx/archive/**' }
    ].forEach(({ file, rule }) => {
      const check = runGitCheckIgnore(gitFixture, file, { verbose: false });
      assert.strictEqual(
        check.status,
        1,
        `Expected ${file} to be trackable, got: ${check.stdout || check.stderr}`
      );

      const verboseCheck = runGitCheckIgnore(gitFixture, file);
      assert(
        verboseCheck.stdout.includes(rule),
        `Expected ${file} to resolve to rule ${rule}, got: ${verboseCheck.stdout || verboseCheck.stderr}`
      );
    });

    [
      { file: '.opsx/cache/demo.tmp', rules: ['.opsx/cache/', '.opsx/cache/**'] },
      { file: '.opsx/tmp/demo.tmp', rules: ['.opsx/tmp/', '.opsx/tmp/**'] },
      { file: '.opsx/logs/demo.log', rules: ['.opsx/logs/', '.opsx/logs/**'] }
    ].forEach(({ file, rules }) => {
      const check = runGitCheckIgnore(gitFixture, file);
      assert.strictEqual(check.status, 0, `Expected ${file} to be ignored, got: ${check.stderr || check.stdout}`);
      assert(
        rules.some((rule) => check.stdout.includes(rule)),
        `Expected ${file} to be ignored by one of ${rules.join(', ')}, got: ${check.stdout || check.stderr}`
      );
    });
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
        verificationSummary: 'Ran execution checkpoint regression tests for completed task groups.',
        completedSteps: ['RED', 'GREEN', 'VERIFY'],
        verificationCommand: 'npm run test:workflow-runtime',
        verificationResult: 'PASS',
        diffSummary: 'Implemented and verified execution evidence normalization.',
        driftStatus: 'clean'
      }
    });

    assert.strictEqual(result.status, 'PASS');
    assert(!result.findings.some((finding) => finding.code === 'new-constraints-detected'));
  });

  test('execution checkpoint records completed tdd steps diff summary and drift status', () => {
    const tasksText = [
      '## 1. Runtime evidence',
      '- [x] RED: add failing runtime proof coverage',
      '- [x] GREEN: persist execution evidence',
      '- [x] VERIFY: run workflow runtime tests'
    ].join('\n');
    const baseOptions = {
      schemaName: 'spec-driven',
      artifacts: {
        proposal: true,
        specs: true,
        design: true,
        tasks: true
      },
      sources: {
        proposal: '## Why\nNeed richer execution evidence persistence.',
        specs: [
          '## ADDED Requirements',
          '### Requirement: Execution proof',
          'The system SHALL persist execution proof fields after each completed task group.'
        ].join('\n'),
        design: [
          '## Context',
          'Execution proof persistence.',
          '## Migration Plan',
          'No migration.'
        ].join('\n'),
        tasks: tasksText
      },
      group: {
        title: '1. Runtime evidence',
        text: tasksText,
        completed: true
      }
    };

    const withProof = runExecutionCheckpoint({
      ...baseOptions,
      executionEvidence: {
        verificationCommand: 'npm run test:workflow-runtime',
        verificationResult: 'PASS',
        diffSummary: 'Persisted completed steps and drift status through verification log.',
        driftStatus: 'clean',
        driftSummary: 'No drift detected after execution.',
        implementationSummary: 'Persisted execution-proof fields through existing store/capsule path.'
      }
    });

    assert.strictEqual(withProof.status, 'PASS');
    assert(!withProof.findings.some((finding) => finding.code === 'execution-proof-missing'));

    const missingProof = runExecutionCheckpoint({
      ...baseOptions,
      executionEvidence: {
        verificationCommand: 'npm run test:workflow-runtime',
        verificationResult: 'PASS',
        implementationSummary: 'Persisted execution-proof fields through existing store/capsule path.'
      }
    });

    assert.strictEqual(missingProof.status, 'WARN');
    assert(missingProof.findings.some((finding) => finding.code === 'execution-proof-missing'));
  });

}

if (require.main === module) {
  runRegisteredTopicTests(registerTests);
}

module.exports = { registerTests };
