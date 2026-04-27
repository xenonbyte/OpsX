#!/usr/bin/env node

const assert = require('assert');
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { copyDir, ensureDir, removePath, writeText } = require('../lib/fs-utils');
const { REPO_ROOT, PACKAGE_VERSION } = require('../lib/constants');
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

const BANNED_PUBLIC_ROUTE_STRINGS = Object.freeze([
  '/openspec',
  '$openspec',
  '/prompts:openspec',
  '/opsx:*',
  '/prompts:opsx-*',
  'standalone $opsx',
  '$opsx <request>'
]);

const EXPECTED_CODEX_PUBLIC_ROUTES = Object.freeze([
  '$opsx-explore',
  '$opsx-new',
  '$opsx-propose',
  '$opsx-continue',
  '$opsx-ff',
  '$opsx-apply',
  '$opsx-verify',
  '$opsx-status',
  '$opsx-resume',
  '$opsx-sync',
  '$opsx-archive',
  '$opsx-batch-apply',
  '$opsx-bulk-archive',
  '$opsx-onboard'
]);

const EMPTY_STATE_FALLBACK_MATCHERS = Object.freeze({
  onboard: Object.freeze({
    emptyWorkspace: 'Workspace not initialized: `.opsx/config.yaml` is missing.',
    missingActiveChange: 'No active change is selected in `.opsx/active.yaml`.',
    noAutoCreateState: 'Do not auto-create `.opsx/active.yaml` or change state from `onboard`.'
  }),
  status: Object.freeze({
    emptyWorkspace: 'Workspace not initialized: `.opsx/config.yaml` is missing.',
    missingActiveChange: 'No active change is selected in `.opsx/active.yaml`.',
    noAutoCreateState: 'Do not auto-create `.opsx/active.yaml` or change state from `status`.'
  }),
  resume: Object.freeze({
    emptyWorkspace: 'Workspace not initialized: `.opsx/config.yaml` is missing.',
    missingActiveChange: 'No resumable change exists because `.opsx/active.yaml` has no active change.',
    noAutoCreateState: 'Do not auto-create `.opsx/active.yaml` or change state from `resume`.'
  })
});

const STRICT_PREFLIGHT_MATCHERS = Object.freeze([
  '.opsx/config.yaml',
  '.opsx/active.yaml',
  'state.yaml',
  'context.md'
]);

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

function toPosixPath(filePath) {
  return filePath.split(path.sep).join('/');
}

function listFilesRecursive(rootDir) {
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursive(absolutePath));
      continue;
    }
    if (entry.isFile()) {
      files.push(absolutePath);
    }
  }

  return files;
}

function collectBundleParity(platform, generatedBundle) {
  const platformTarget = PLATFORM_BUNDLE_TARGETS[platform];
  const generatedPaths = Object.keys(generatedBundle).sort((left, right) => left.localeCompare(right));
  const generatedPathSet = new Set(generatedPaths);
  const missing = [];
  const mismatched = [];

  generatedPaths.forEach((relativePath) => {
    const checkedInPath = path.join(platformTarget.checkedInRoot, relativePath);
    if (!fs.existsSync(checkedInPath)) {
      missing.push(relativePath);
      return;
    }
    const checkedInContent = fs.readFileSync(checkedInPath, 'utf8');
    if (checkedInContent !== generatedBundle[relativePath]) {
      mismatched.push(relativePath);
    }
  });

  const trackedCheckedInPaths = listFilesRecursive(platformTarget.checkedInRoot)
    .map((absolutePath) => toPosixPath(path.relative(platformTarget.checkedInRoot, absolutePath)))
    .filter((relativePath) => platformTarget.isTrackedBundlePath(relativePath))
    .sort((left, right) => left.localeCompare(right));

  const extra = trackedCheckedInPaths
    .filter((relativePath) => !generatedPathSet.has(relativePath))
    .sort((left, right) => left.localeCompare(right));

  return {
    totalGenerated: generatedPaths.length,
    totalCheckedIn: trackedCheckedInPaths.length,
    generatedEntries: generatedPaths,
    checkedInEntries: trackedCheckedInPaths,
    missing: missing.sort((left, right) => left.localeCompare(right)),
    mismatched: mismatched.sort((left, right) => left.localeCompare(right)),
    extra
  };
}

function collectFallbackCopyCoverage(generatedBundles) {
  const coverage = {};
  const actions = Object.keys(EMPTY_STATE_FALLBACK_MATCHERS);

  actions.forEach((actionId) => {
    const matchers = EMPTY_STATE_FALLBACK_MATCHERS[actionId];
    coverage[actionId] = {};

    Object.entries(PLATFORM_BUNDLE_TARGETS).forEach(([platform, platformTarget]) => {
      const promptPath = platformTarget.actionPath(actionId);
      const promptContent = generatedBundles[platform][promptPath] || '';
      coverage[actionId][platform] = {
        promptPath,
        emptyWorkspace: promptContent.includes(matchers.emptyWorkspace),
        missingActiveChange: promptContent.includes(matchers.missingActiveChange),
        noAutoCreateState: promptContent.includes(matchers.noAutoCreateState)
      };
    });
  });

  return coverage;
}

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

function createLegacyMigrationRepoFixture(options = {}) {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'opsx-migrate-repo-'));
  const changeName = options.changeName || 'demo';
  ensureDir(path.join(fixtureRoot, 'openspec', 'changes', changeName));
  writeText(path.join(fixtureRoot, 'openspec', 'config.yaml'), [
    'schema: spec-driven',
    'language: en'
  ].join('\n'));
  writeText(path.join(fixtureRoot, 'openspec', 'changes', changeName, '.openspec.yaml'), [
    `name: ${changeName}`,
    'schema: spec-driven',
    'createdAt: 2026-01-01T00:00:00.000Z'
  ].join('\n'));
  writeText(path.join(fixtureRoot, 'openspec', 'changes', changeName, 'proposal.md'), [
    '## Why',
    'Legacy migration fixture proposal.'
  ].join('\n'));
  writeText(path.join(fixtureRoot, 'openspec', 'specs', 'demo', 'spec.md'), [
    '## ADDED Requirements',
    '### Requirement: Demo migration',
    'The system SHALL migrate demo fixtures.'
  ].join('\n'));
  writeText(path.join(fixtureRoot, 'openspec', 'archive', 'demo.md'), [
    '# Archive demo',
    'Legacy archive fixture.'
  ].join('\n'));
  return {
    fixtureRoot,
    changeName
  };
}

function createLegacySharedHomeFixture(homeDir, options = {}) {
  const platform = options.platform || 'codex';
  const legacySharedHome = path.join(homeDir, '.openspec');
  writeText(path.join(legacySharedHome, '.opsx-config.yaml'), [
    'version: "2.0.0"',
    'schema: "spec-driven"',
    'language: "en"',
    `platform: "${platform}"`
  ].join('\n'));
  writeText(path.join(legacySharedHome, 'manifests', `${platform}.manifest`), '/tmp/legacy-manifest-entry\n');
  writeText(path.join(legacySharedHome, 'skills', 'openspec', 'SKILL.md'), '# Legacy shared skill\n');
  writeText(path.join(legacySharedHome, 'commands', 'openspec.md'), '# Legacy command entry\n');
  return {
    legacySharedHome,
    platform
  };
}

function runOpsxCli(args, options = {}) {
  const env = Object.assign({}, process.env, options.env || {});
  const result = spawnSync(process.execPath, [path.join(REPO_ROOT, 'bin', 'opsx.js'), ...args], {
    cwd: options.cwd || REPO_ROOT,
    env,
    encoding: 'utf8'
  });
  return {
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || ''
  };
}

function runGitCheckIgnore(repoRoot, relativePath, options = {}) {
  const args = ['-c', 'core.excludesFile=/dev/null', 'check-ignore'];
  if (options.verbose !== false) {
    args.push('-v');
  }
  args.push(relativePath);
  const result = spawnSync(
    'git',
    args,
    {
      cwd: repoRoot,
      encoding: 'utf8'
    }
  );
  return {
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || ''
  };
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
        '- [x] 1.1 Add runtime status output implementation',
        '- [x] 1.2 Add verification, security, and compatibility checks',
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
        '- [x] 1.1 Add runtime preview implementation',
        '- [x] 1.2 Add verification and compatibility checks',
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
        '- [x] 1.1 Add preview flow implementation',
        '- [x] 1.2 Add verification and compatibility checks',
        '',
        '## 2. Preview follow-up',
        '- [ ] 2.1 Add preview follow-up API',
        '- [ ] 2.2 Add preview follow-up verification'
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
    assert(payload.template.content.includes('- [ ] 1.1 Example task'));
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

  test('opsx help and version output expose renamed Phase 1 command surface', () => {
    const versionOutput = runOpsxCli(['--version']);
    assert.strictEqual(versionOutput.status, 0, versionOutput.stderr);
    assert.strictEqual(versionOutput.stdout.trim(), `OpsX v${PACKAGE_VERSION}`);

    const helpOutput = runOpsxCli(['--help']);
    assert.strictEqual(helpOutput.status, 0, helpOutput.stderr);
    assert(helpOutput.stdout.includes(`OpsX v${PACKAGE_VERSION}`));
    assert(helpOutput.stdout.includes('opsx install --platform <claude|codex|gemini[,...]>'));
    assert(helpOutput.stdout.includes('opsx uninstall --platform <claude|codex|gemini[,...]>'));
    assert(helpOutput.stdout.includes('opsx check'));
    assert(helpOutput.stdout.includes('opsx doc'));
    assert(helpOutput.stdout.includes('opsx language <en|zh>'));
    assert(helpOutput.stdout.includes('opsx migrate --dry-run'));
    assert(helpOutput.stdout.includes('opsx migrate'));
    assert(helpOutput.stdout.includes('opsx status'));
    assert(helpOutput.stdout.includes('opsx --help'));
    assert(helpOutput.stdout.includes('opsx --version'));
    assert(helpOutput.stdout.includes('opsx --check'));
    assert(helpOutput.stdout.includes('opsx --doc'));
    assert(helpOutput.stdout.includes('opsx --language <en|zh>'));
    [
      '$opsx-onboard',
      '$opsx-propose',
      '$opsx-status',
      '$opsx-apply'
    ].forEach((route) => {
      assert(
        helpOutput.stdout.includes(route),
        `Help output must include explicit Codex route example ${route}`
      );
    });
    assert(!helpOutput.stdout.includes('$opsx <request>'));
    assert(!helpOutput.stdout.includes('/opsx:*'));
    assert(!helpOutput.stdout.includes('/prompts:opsx-*'));
    assert(!helpOutput.stdout.includes('openspec'));
    assert(!helpOutput.stdout.includes('$openspec'));
    assert(!helpOutput.stdout.includes('/prompts:openspec'));
  });

  test('postinstall/template/hand-off guidance stays on explicit route contract', () => {
    const postinstallResult = spawnSync(process.execPath, [path.join(REPO_ROOT, 'scripts', 'postinstall.js')], {
      cwd: REPO_ROOT,
      encoding: 'utf8'
    });
    assert.strictEqual(postinstallResult.status, 0, postinstallResult.stderr);

    const postinstallOutput = postinstallResult.stdout;
    [
      '$opsx-onboard',
      '$opsx-propose',
      '$opsx-status',
      '$opsx-apply'
    ].forEach((route) => {
      assert(postinstallOutput.includes(route), `Postinstall output must include ${route}`);
    });
    BANNED_PUBLIC_ROUTE_STRINGS.forEach((token) => {
      assert(!postinstallOutput.includes(token), `Postinstall output must not include banned token ${token}`);
    });

    const handoffTemplate = fs.readFileSync(path.join(REPO_ROOT, 'templates', 'project', 'rule-file.md.tmpl'), 'utf8');
    assert(handoffTemplate.includes('For Codex, use explicit `$opsx-*` routes; for Claude/Gemini, use `/opsx-*` routes.'));
    BANNED_PUBLIC_ROUTE_STRINGS.forEach((token) => {
      assert(!handoffTemplate.includes(token), `Project hand-off template must not include banned token ${token}`);
    });

    const agentsHandOff = fs.readFileSync(path.join(REPO_ROOT, 'AGENTS.md'), 'utf8');
    assert(agentsHandOff.includes('- Read `openspec/config.yaml` for project context and workflow defaults.'));
    assert(agentsHandOff.includes('- Keep change artifacts under `openspec/changes/`.'));
    assert(agentsHandOff.includes('- For Codex, use explicit $opsx-* routes; for Claude/Gemini, use /opsx-* routes.'));
    [
      '$openspec',
      '/openspec',
      '/opsx:*',
      '/prompts:openspec',
      '/prompts:opsx-*',
      '$opsx <request>'
    ].forEach((token) => {
      assert(!agentsHandOff.includes(token), `AGENTS hand-off must not include stale token ${token}`);
    });
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

  test('opsx status reports truthful Phase 2 migration guidance', () => {
    const { fixtureRoot: statusFixture } = createLegacyMigrationRepoFixture({ changeName: 'status-only' });
    const statusHome = fs.mkdtempSync(path.join(os.tmpdir(), 'opsx-status-home-guidance-'));
    cleanupTargets.push(statusFixture, statusHome);

    const statusOutput = runOpsxCli(['status'], {
      cwd: statusFixture,
      env: { HOME: statusHome }
    });
    assert.strictEqual(statusOutput.status, 0, statusOutput.stderr);
    assert(statusOutput.stdout.includes(`OpsX v${PACKAGE_VERSION}`));
    assert(statusOutput.stdout.includes('Current phase: Phase 2 (.opsx/ Workspace and Migration)'));
    assert(statusOutput.stdout.includes('Durable change-state lifecycle remains scheduled for Phase 4.'));
    assert(statusOutput.stdout.includes('Run `opsx migrate --dry-run` to preview migration.'));
    assert(!statusOutput.stdout.includes('Phase 1 status placeholder.'));
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

  test('runtime suite locks renamed skill targets, generated bundles, and checked-in command entries', () => {
    const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'opsx-home-surface-'));
    cleanupTargets.push(tempHome);

    const installResults = install({ platform: 'claude,codex,gemini', homeDir: tempHome, language: 'en' });
    assert.strictEqual(installResults.length, 3);
    installResults.forEach((result) => {
      assert(result.platformSkillDir.includes(path.join('skills', 'opsx')));
      assert(!result.platformSkillDir.includes(path.join('skills', 'openspec')));
      assert(fs.existsSync(result.platformSkillDir));
    });

    const sharedSkillDir = path.join(tempHome, '.opsx', 'skills', 'opsx');
    assert(fs.existsSync(sharedSkillDir));
    assert(fs.existsSync(path.join(sharedSkillDir, 'SKILL.md')));
    assert(!fs.existsSync(path.join(tempHome, '.opsx', 'skills', 'openspec', 'SKILL.md')));

    const sharedCommandPath = path.join(tempHome, '.opsx', 'commands', 'opsx.md');
    assert(fs.existsSync(sharedCommandPath));
    const sharedCommandContent = fs.readFileSync(sharedCommandPath, 'utf8');
    assert(sharedCommandContent.includes('OpsX'));

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
    [
      '/openspec',
      '$openspec',
      '/prompts:openspec',
      '/opsx:*',
      '/prompts:opsx-*',
      'standalone $opsx',
      '$opsx <request>'
    ].forEach((token) => {
      assert(BANNED_PUBLIC_ROUTE_STRINGS.includes(token));
    });

    assert(generatedBundles.claude['opsx.md'].includes('OpsX'));
    assert(generatedBundles.claude['opsx.md'].includes('Primary workflow entry: `/opsx-<action>`'));
    assert(!generatedBundles.claude['opsx.md'].includes('Primary workflow entry: `$opsx <request>`'));
    assert(generatedBundles.codex['prompts/opsx.md'].includes('OpsX'));
    expectedCodexRoutes.forEach((route) => {
      assert(
        generatedBundles.codex['prompts/opsx.md'].includes(`\`${route}\``),
        `Codex route catalog must include ${route}`
      );
    });
    assert(!generatedBundles.codex['prompts/opsx.md'].includes('Preferred:'), 'Codex route catalog must not advertise a preferred standalone entry.');
    assert(!generatedBundles.codex['prompts/opsx.md'].includes('$opsx <request>'), 'Codex route catalog must not advertise `$opsx <request>`.');
    assert(!generatedBundles.codex['prompts/opsx.md'].includes('Primary workflow entry:'), 'Codex route catalog must stay internal and avoid primary-entry wording.');
    assert(generatedBundles.gemini['opsx.toml'].includes('OpsX Workflow'));
    assert(generatedBundles.gemini['opsx.toml'].includes('Primary workflow entry: `/opsx-<action>`'));
    assert(!generatedBundles.gemini['opsx.toml'].includes('Primary workflow entry: `$opsx <request>`'));
    Object.entries(generatedBundles).forEach(([platform, bundle]) => {
      Object.entries(bundle)
        .filter(([relativePath]) => relativePath.includes('onboard') || relativePath.includes('resume') || relativePath.includes('status'))
        .forEach(([relativePath, content]) => {
          STRICT_PREFLIGHT_MATCHERS.forEach((matcher) => {
            assert(content.includes(matcher), `${platform}:${relativePath} must mention ${matcher} preflight`);
          });
        });
    });
    Object.entries(generatedBundles).forEach(([platform, bundle]) => {
      Object.keys(bundle).forEach((relativePath) => {
        assert(!relativePath.includes('openspec'), `${platform} bundle contains legacy path: ${relativePath}`);
      });
    });

    const bundleParity = Object.fromEntries(
      Object.entries(generatedBundles).map(([platform, bundle]) => [platform, collectBundleParity(platform, bundle)])
    );
    Object.entries(bundleParity).forEach(([platform, parity]) => {
      assert(parity.totalGenerated > 0, `${platform} generated bundle must not be empty`);
      assert(Array.isArray(parity.missing), `${platform} parity record must expose missing array`);
      assert(Array.isArray(parity.mismatched), `${platform} parity record must expose mismatched array`);
      assert(Array.isArray(parity.extra), `${platform} parity record must expose extra array`);
      assert(Array.isArray(parity.generatedEntries), `${platform} parity record must expose generated entries`);
      assert(Array.isArray(parity.checkedInEntries), `${platform} parity record must expose checked-in entries`);
      assert.deepStrictEqual(parity.missing, [], `${platform} checked-in bundle is missing generated files`);
      assert.deepStrictEqual(parity.mismatched, [], `${platform} checked-in bundle content drifts from generated output`);
      assert.deepStrictEqual(parity.extra, [], `${platform} checked-in bundle has extra tracked files outside generated output`);
      assert.strictEqual(parity.totalGenerated, parity.totalCheckedIn, `${platform} tracked checked-in count must match generated count`);
      assert.deepStrictEqual(parity.checkedInEntries, parity.generatedEntries, `${platform} checked-in entries must exactly match generated entries`);
    });

    const fallbackCoverage = collectFallbackCopyCoverage(generatedBundles);
    Object.keys(EMPTY_STATE_FALLBACK_MATCHERS).forEach((actionId) => {
      Object.keys(PLATFORM_BUNDLE_TARGETS).forEach((platform) => {
        const coverage = fallbackCoverage[actionId][platform];
        assert(generatedBundles[platform][coverage.promptPath], `Missing generated ${platform} prompt for ${actionId}`);
        assert.strictEqual(coverage.emptyWorkspace, true, `${platform}:${actionId} must include empty-workspace fallback`);
        assert.strictEqual(coverage.missingActiveChange, true, `${platform}:${actionId} must include missing-active-change fallback`);
        assert.strictEqual(coverage.noAutoCreateState, true, `${platform}:${actionId} must include no-auto-create fallback`);
      });
    });

    Object.values(PLATFORM_BUNDLE_TARGETS).forEach((target) => {
      const entryPath = path.join(target.checkedInRoot, target.entryPath);
      assert(fs.existsSync(entryPath), `Missing checked-in command entry: ${entryPath}`);
      const entryContent = fs.readFileSync(entryPath, 'utf8');
      assert(entryContent.includes('OpsX'), `Expected OpsX branding in ${entryPath}`);
    });

    const removedLegacyEntries = [
      path.join(REPO_ROOT, 'commands', 'openspec.md'),
      path.join(REPO_ROOT, 'commands', 'claude', 'openspec.md'),
      path.join(REPO_ROOT, 'commands', 'codex', 'prompts', 'openspec.md'),
      path.join(REPO_ROOT, 'commands', 'gemini', 'openspec.toml')
    ];
    removedLegacyEntries.forEach((legacyPath) => {
      assert(!fs.existsSync(legacyPath), `Legacy command entry should be removed: ${legacyPath}`);
    });
  });

  test('manifest cleanup refuses paths outside OpsX install roots', () => {
    const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'opsx-home-manifest-'));
    cleanupTargets.push(tempHome);

    install({ platform: 'claude', homeDir: tempHome, language: 'en' });

    const manifestPath = path.join(tempHome, '.opsx', 'manifests', 'claude.manifest');
    const installedFile = fs.readFileSync(manifestPath, 'utf8').split('\n').find((entry) => entry && fs.existsSync(entry));
    const victimPath = path.join(tempHome, 'victim.txt');
    writeText(victimPath, 'do not remove');
    writeText(manifestPath, [installedFile, victimPath].join('\n'));

    assert.throws(
      () => uninstall({ platform: 'claude', homeDir: tempHome }),
      /Refusing to remove path outside OpsX install roots/
    );
    assert(fs.existsSync(installedFile), 'Safe manifest entries should not be removed after a rejected cleanup.');
    assert(fs.existsSync(victimPath), 'Manifest cleanup must not remove paths outside OpsX install roots.');

    assert.throws(
      () => install({ platform: 'claude', homeDir: tempHome, language: 'en' }),
      /Refusing to remove path outside OpsX install roots/
    );
    assert(fs.existsSync(victimPath), 'Reinstall cleanup must not remove paths outside OpsX install roots.');
  });

  test('install and uninstall reject mixed invalid platform values', () => {
    const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'opsx-home-invalid-platform-'));
    cleanupTargets.push(tempHome);

    const manifestPath = path.join(tempHome, '.opsx', 'manifests', 'claude.manifest');
    assert.throws(
      () => install({ platform: 'claude,bogus', homeDir: tempHome, language: 'en' }),
      /Install supports only --platform <claude\|codex\|gemini\[,...\]>; invalid: bogus/
    );
    assert(!fs.existsSync(manifestPath), 'Invalid mixed install should not partially install valid platforms.');

    install({ platform: 'claude', homeDir: tempHome, language: 'en' });
    assert(fs.existsSync(manifestPath));

    assert.throws(
      () => uninstall({ platform: 'claude,bogus', homeDir: tempHome }),
      /Uninstall supports only --platform <claude\|codex\|gemini\[,...\]>; invalid: bogus/
    );
    assert(fs.existsSync(manifestPath), 'Invalid mixed uninstall should not remove valid platform installs.');
  });

  test('public install/check/doc/language command surface remains compatible', () => {
    const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'opsx-home-'));
    cleanupTargets.push(tempHome);

    const results = install({ platform: 'claude,codex,gemini', homeDir: tempHome, language: 'en' });
    assert.strictEqual(results.length, 3);

    const checkOutput = runCheck({ homeDir: tempHome, cwd: fixtureRoot });
    assert(checkOutput.includes('OpsX Installation Check'));
    assert(checkOutput.includes('Config'));
    assert(checkOutput.includes('Found 3 manifest(s)'));
    assert(checkOutput.includes('claude'));
    assert(checkOutput.includes('codex'));
    assert(checkOutput.includes('gemini'));

    const englishDoc = showDoc({ homeDir: tempHome });
    assert(englishDoc.includes('# OpsX Guide'));

    const language = setLanguage('zh', { homeDir: tempHome });
    assert.strictEqual(language, 'zh');
    const chineseDoc = showDoc({ homeDir: tempHome });
    assert(chineseDoc.includes('OpsX'));

    const removed = uninstall({ platform: 'claude,codex,gemini', homeDir: tempHome });
    assert.deepStrictEqual(removed.sort(), ['claude', 'codex', 'gemini']);
  });

  test('check output remains accurate after partial uninstall across platforms', () => {
    const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'opsx-home-check-'));
    cleanupTargets.push(tempHome);

    install({ platform: 'claude,codex,gemini', homeDir: tempHome, language: 'en' });
    uninstall({ platform: 'gemini', homeDir: tempHome });

    assert(fs.existsSync(path.join(tempHome, '.opsx', 'skills', 'opsx', 'SKILL.md')));
    assert(fs.existsSync(path.join(tempHome, '.opsx', 'commands', 'opsx.md')));

    const checkOutput = runCheck({ homeDir: tempHome, cwd: fixtureRoot });
    assert(checkOutput.includes('Found 2 manifest(s)'));
    assert(checkOutput.includes('claude'));
    assert(checkOutput.includes('codex'));
    assert(!checkOutput.includes('Manifest missing for gemini'));
    assert(checkOutput.includes('configured platform `gemini` is not currently installed'));
  });

  test('doc output prefers package guide over stale installed guide copy', () => {
    const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'opsx-home-doc-'));
    cleanupTargets.push(tempHome);

    const staleGuideDir = path.join(tempHome, '.opsx', 'skills', 'opsx');
    ensureDir(staleGuideDir);
    writeText(path.join(staleGuideDir, 'GUIDE-en.md'), [
      '# Stale OpsX Guide',
      '',
      '1. `opsx init --platform codex --profile core`',
      '2. `opsx install --platform codex --profile core`'
    ].join('\n'));
    writeText(path.join(tempHome, '.opsx', 'config.yaml'), [
      'version: "2.0.0"',
      'schema: "spec-driven"',
      'language: "en"',
      'platform: "codex"'
    ].join('\n'));

    const doc = showDoc({ homeDir: tempHome });
    assert(doc.includes('opsx install --platform codex'));
    assert(!doc.includes('opsx init --platform codex --profile core'));
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
