#!/usr/bin/env node

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

const PHASE5_PLANNING_PROMPT_ASSERTION_TARGETS = Object.freeze({
  claude: Object.freeze([
    'opsx/continue.md',
    'opsx/ff.md',
    'opsx/propose.md'
  ]),
  codex: Object.freeze([
    'prompts/opsx-continue.md',
    'prompts/opsx-ff.md',
    'prompts/opsx-propose.md'
  ]),
  gemini: Object.freeze([
    'opsx/continue.toml',
    'opsx/ff.toml',
    'opsx/propose.toml'
  ])
});

const PHASE6_TDD_PROMPT_PATHS = Object.freeze([
  'commands/claude/opsx/apply.md',
  'commands/claude/opsx/propose.md',
  'commands/claude/opsx/continue.md',
  'commands/claude/opsx/ff.md',
  'commands/codex/prompts/opsx-apply.md',
  'commands/codex/prompts/opsx-propose.md',
  'commands/codex/prompts/opsx-continue.md',
  'commands/codex/prompts/opsx-ff.md',
  'commands/gemini/opsx/apply.toml',
  'commands/gemini/opsx/propose.toml',
  'commands/gemini/opsx/continue.toml',
  'commands/gemini/opsx/ff.toml'
]);

const PHASE7_GATE_PROMPT_PATHS = Object.freeze([
  'commands/claude/opsx/verify.md',
  'commands/claude/opsx/sync.md',
  'commands/claude/opsx/archive.md',
  'commands/claude/opsx/batch-apply.md',
  'commands/claude/opsx/bulk-archive.md',
  'commands/codex/prompts/opsx-verify.md',
  'commands/codex/prompts/opsx-sync.md',
  'commands/codex/prompts/opsx-archive.md',
  'commands/codex/prompts/opsx-batch-apply.md',
  'commands/codex/prompts/opsx-bulk-archive.md',
  'commands/gemini/opsx/verify.toml',
  'commands/gemini/opsx/sync.toml',
  'commands/gemini/opsx/archive.toml',
  'commands/gemini/opsx/batch-apply.toml',
  'commands/gemini/opsx/bulk-archive.toml'
]);

const WRONG_PLATFORM_ROUTE_PATTERNS = Object.freeze({
  claude: /\$opsx-/,
  codex: /\/opsx-/,
  gemini: /\$opsx-/
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

function assertPlatformLabeledCodexRouteLines(relativePath) {
  const content = fs.readFileSync(path.join(REPO_ROOT, relativePath), 'utf8');
  content.split(/\r?\n/).forEach((line, index) => {
    if (!/\$opsx-/.test(line)) return;
    assert(
      /Codex/.test(line) && /Claude\/Gemini/.test(line) && /\/opsx-/.test(line),
      `${relativePath}:${index + 1} has unqualified Codex route guidance`
    );
  });
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

function hashFileSha256(filePath) {
  const hash = createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

function resolveArtifactPath(state, artifactId, fallbackPath) {
  const artifactValue = state && state.artifacts ? state.artifacts[artifactId] : null;
  if (typeof artifactValue === 'string' && artifactValue.trim()) {
    return artifactValue.trim();
  }
  if (artifactValue && typeof artifactValue === 'object' && typeof artifactValue.path === 'string') {
    const resolved = artifactValue.path.trim();
    if (resolved) return resolved;
  }
  return fallbackPath;
}

function inspectReadOnlyStateForDrift(changeDir) {
  const { loadChangeState } = require('../lib/change-store');
  const state = loadChangeState(changeDir);
  const warnings = Array.isArray(state.warnings) ? [...state.warnings] : [];
  const proposalRelativePath = resolveArtifactPath(state, 'proposal', 'proposal.md');
  const proposalPath = path.join(changeDir, proposalRelativePath);
  const storedHash = state && state.hashes && typeof state.hashes.proposal === 'string'
    ? state.hashes.proposal.trim()
    : '';

  if (!storedHash || !fs.existsSync(proposalPath)) {
    return { state, warnings };
  }

  const currentHash = hashFileSha256(proposalPath);
  if (storedHash !== currentHash) {
    warnings.push(`Hash drift detected for ${proposalRelativePath}`);
    return {
      state: loadChangeState(changeDir),
      warnings
    };
  }

  return { state, warnings };
}

function runTests() {
  const tests = [];
  const fixtureRoot = createFixtureRepo();
  const cleanupTargets = [fixtureRoot];

  function test(name, fn) {
    tests.push({ name, fn });
  }

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
      'buildLifecycleBlockResult'
    ].forEach((symbol) => {
      assert.strictEqual(typeof changeState[symbol], 'function', `Expected ${symbol} export.`);
    });
  });

  test('change-state blocks invalid transitions and routes continue by persisted stage', () => {
    const { applyMutationEvent, resolveContinueAction } = require('../lib/change-state');
    const blocked = applyMutationEvent({ stage: 'INIT' }, 'COMPLETE_TASK_GROUP');
    assert.strictEqual(blocked.status, 'BLOCK');
    assert.strictEqual(blocked.code, 'invalid-transition');
    assert(Array.isArray(blocked.patchTargets));
    assert.strictEqual(resolveContinueAction({ stage: 'INIT' }), 'proposal');
    assert.strictEqual(resolveContinueAction({ stage: 'PROPOSAL_READY' }), 'specs');
    assert.strictEqual(resolveContinueAction({ stage: 'SPECS_READY' }), 'design');
    assert.strictEqual(resolveContinueAction({ stage: 'SPEC_SPLIT_REVIEWED' }), 'design');
    assert.strictEqual(resolveContinueAction({ stage: 'DESIGN_READY' }), 'tasks');
    assert.strictEqual(resolveContinueAction({ stage: 'SECURITY_REVIEW_REQUIRED' }), 'security-review');
    assert.strictEqual(resolveContinueAction({ stage: 'SECURITY_REVIEWED' }), 'tasks');
    assert.strictEqual(resolveContinueAction({ stage: 'SPEC_REVIEWED' }), 'tasks');
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
  });

  test('matchPathScope uses picomatch globs for allowed and forbidden paths', () => {
    const { matchPathScope } = require('../lib/path-scope');
    const result = matchPathScope(
      [
        'lib/verify.js',
        'lib\\windows\\gate.js',
        'secrets/private.pem',
        'src/index.js'
      ],
      {
        allowedPaths: ['lib/**'],
        forbiddenPaths: ['*.pem']
      }
    );

    assert.strictEqual(result.hasAllowedScope, true);
    assert.deepStrictEqual(result.allowedMatches.sort((left, right) => left.localeCompare(right)), [
      'lib/verify.js',
      'lib/windows/gate.js'
    ]);
    assert.deepStrictEqual(result.forbiddenMatches, ['secrets/private.pem']);
    assert.deepStrictEqual(result.outOfScopeMatches, ['src/index.js']);
    assert.deepStrictEqual(result.explainableExtraMatches, []);
  });

  test('matchPathScope distinguishes forbidden files from explainable docs or config extras', () => {
    const { matchPathScope } = require('../lib/path-scope');
    const result = matchPathScope(
      [
        'README.md',
        'docs/opsx.md',
        'config/runtime.yaml',
        'secrets/blocked.pem'
      ],
      {
        allowedPaths: ['lib/**'],
        forbiddenPaths: ['*.pem']
      }
    );

    assert.deepStrictEqual(result.forbiddenMatches, ['secrets/blocked.pem']);
    assert.deepStrictEqual(result.explainableExtraMatches.sort((left, right) => left.localeCompare(right)), [
      'config/runtime.yaml',
      'docs/opsx.md',
      'README.md'
    ]);
    assert.deepStrictEqual(result.outOfScopeMatches, []);
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
        '- [x] RED: add failing gate test',
        '- [x] GREEN: implement gate check',
        '- [x] VERIFY: run workflow runtime tests'
      ].join('\n'),
      'specs/runtime/spec.md': [
        '## ADDED Requirements',
        '### Requirement: Verify gate warning visibility',
        'The system SHALL surface manual verification risk as warnings when rationale is missing.'
      ].join('\n')
    });
    const now = new Date().toISOString();
    writeChangeState(changeDir, {
      change: changeName,
      stage: 'IMPLEMENTED',
      hashes: hashTrackedArtifacts(changeDir),
      checkpoints: {
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
      '',
      '## Out-of-Bound File Changes',
      '',
      '## Discovered Requirements',
      '',
      '## User Approval Needed',
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
        '- TDD Class: behavior-change',
        '- [x] RED: add failing gate test',
        '- [x] GREEN: implement gate check',
        '- [x] VERIFY: run workflow runtime tests'
      ].join('\n'),
      'specs/runtime/spec.md': [
        '## ADDED Requirements',
        '### Requirement: Verify gate execution diff fallback',
        'The system SHALL check recorded execution changed files when direct diff input is absent.'
      ].join('\n')
    });
    const now = new Date().toISOString();
    writeChangeState(changeDir, {
      change: changeName,
      stage: 'IMPLEMENTED',
      hashes: hashTrackedArtifacts(changeDir),
      checkpoints: {
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

  test('acceptVerifyGate advances implemented changes to VERIFIED with refreshed hashes', () => {
    const { acceptVerifyGate } = require('../lib/verify');
    const { hashTrackedArtifacts } = require('../lib/change-artifacts');
    const { writeChangeState } = require('../lib/change-store');
    const changeName = 'accept-verify-gate-transition';
    const changeDir = createChange(fixtureRoot, changeName, {
      'proposal.md': '# Proposal\n',
      'design.md': '# Design\n',
      'tasks.md': [
        '## 1. Behavior change verification',
        '- [x] RED: add failing gate test',
        '- [x] GREEN: implement gate check',
        '- [x] VERIFY: run workflow runtime tests'
      ].join('\n'),
      'specs/runtime/spec.md': [
        '## ADDED Requirements',
        '### Requirement: Verify acceptance transition',
        'The system SHALL transition IMPLEMENTED changes to VERIFIED when gate acceptance succeeds.'
      ].join('\n')
    });
    writeChangeState(changeDir, {
      change: changeName,
      stage: 'IMPLEMENTED',
      hashes: {
        'proposal.md': 'stale-hash'
      }
    });

    const accepted = acceptVerifyGate(changeDir, {
      status: 'PASS',
      findings: []
    });
    assert.strictEqual(accepted.stage, 'VERIFIED');
    assert.strictEqual(accepted.nextAction, 'sync');
    assert.deepStrictEqual(accepted.hashes, hashTrackedArtifacts(changeDir));
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

  test('applySyncPlan rejects targets outside canonical specs without writing files', () => {
    const { applySyncPlan } = require('../lib/sync');
    const outsidePath = path.join(fixtureRoot, 'outside-sync-write.md');
    const canonicalSpecsDir = path.join(fixtureRoot, '.opsx', 'specs');

    assert.throws(() => applySyncPlan({
      status: 'PASS',
      canonicalSpecsDir,
      writes: [{
        targetPath: outsidePath,
        content: 'outside write'
      }]
    }), /outside \.opsx\/specs/);
    assert.strictEqual(fs.existsSync(outsidePath), false);
  });

  test('applySyncPlan leaves canonical specs untouched when staging a later write fails', () => {
    const { applySyncPlan } = require('../lib/sync');
    const canonicalSpecsDir = path.join(fixtureRoot, '.opsx', 'specs');
    const firstTarget = path.join(canonicalSpecsDir, 'runtime', 'spec.md');
    const firstBefore = 'canonical content before staged failure\n';
    writeText(firstTarget, firstBefore);
    const invalidParent = path.join(canonicalSpecsDir, 'not-a-directory');
    writeText(invalidParent, 'this file blocks child staging\n');

    assert.throws(() => applySyncPlan({
      status: 'PASS',
      canonicalSpecsDir,
      writes: [
        {
          targetPath: firstTarget,
          content: 'new canonical content\n'
        },
        {
          targetPath: path.join(invalidParent, 'spec.md'),
          content: 'cannot be staged\n'
        }
      ]
    }));
    assert.strictEqual(fs.readFileSync(firstTarget, 'utf8'), firstBefore);
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
    assert.deepStrictEqual(accepted.hashes, hashTrackedArtifacts(changeDir));
    assert.strictEqual(loadChangeState(changeDir).stage, 'SYNCED');
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
    assert.strictEqual(normalized.nextAction, 'Create proposal.md for this change.');
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
    const { writeTextAtomic } = require('../lib/fs-utils');
    const atomicPath = path.join(fixtureRoot, '.opsx', 'changes', 'atomic-write.txt');
    writeTextAtomic(atomicPath, 'phase4-atomic-write\n');
    assert.strictEqual(fs.readFileSync(atomicPath, 'utf8'), 'phase4-atomic-write\n');
  });

  test('createChangeSkeleton writes full new-change artifacts and keeps INIT lifecycle state', () => {
    const { createChangeSkeleton } = require('../lib/workspace');
    const { loadActiveChangePointer, loadChangeState } = require('../lib/change-store');
    const changeName = 'skeleton-init-state';
    const createdAt = '2026-04-27T00:00:00.000Z';
    const changeDir = path.join(fixtureRoot, '.opsx', 'changes', changeName);
    const filesToAssert = [
      'change.yaml',
      'proposal.md',
      'design.md',
      'tasks.md',
      'specs/README.md',
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

    const tasksText = fs.readFileSync(path.join(changeDir, 'tasks.md'), 'utf8');
    assert(tasksText.includes('- [ ] 1.1 Replace placeholders with real task groups after planning checkpoints.'));

    const activePointer = loadActiveChangePointer(fixtureRoot);
    assert.strictEqual(activePointer.activeChange, changeName);

    const state = loadChangeState(changeDir);
    assert.strictEqual(state.stage, 'INIT');
    assert.strictEqual(state.nextAction, 'Create proposal.md for this change.');
    assert(Object.prototype.hasOwnProperty.call(state.hashes, 'proposal.md'));
    assert(Object.prototype.hasOwnProperty.call(state.hashes, 'design.md'));
    assert(Object.prototype.hasOwnProperty.call(state.hashes, 'tasks.md'));
    assert.deepStrictEqual(buildStatus({ repoRoot: fixtureRoot, changeName }).hashDriftWarnings, []);
  });

  test('opsx-new skeleton creates placeholder files, active pointer, and INIT stage', () => {
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
      'proposal.md',
      'design.md',
      'tasks.md',
      'specs/README.md',
      'state.yaml',
      'context.md',
      'drift.md'
    ].forEach((relativePath) => {
      assert(fs.existsSync(path.join(changeDir, relativePath)), `Expected ${relativePath} to exist.`);
    });

    assert(fs.statSync(path.join(changeDir, 'specs')).isDirectory());
    assert(!fs.existsSync(path.join(changeDir, 'specs', 'spec.md')));

    const state = loadChangeState(changeDir);
    const activePointer = loadActiveChangePointer(fixtureRoot);

    assert.strictEqual(activePointer.activeChange, changeName);
    assert.strictEqual(state.stage, 'INIT');
    assert.strictEqual(state.nextAction, 'Create proposal.md for this change.');
    assert(Object.prototype.hasOwnProperty.call(state.hashes, 'proposal.md'));
    assert(Object.prototype.hasOwnProperty.call(state.hashes, 'design.md'));
    assert(Object.prototype.hasOwnProperty.call(state.hashes, 'tasks.md'));

    const designText = fs.readFileSync(path.join(changeDir, 'design.md'), 'utf8');
    const tasksText = fs.readFileSync(path.join(changeDir, 'tasks.md'), 'utf8');

    assert(designText.includes('## Context'));
    assert(tasksText.includes('- [ ] 1.1 Replace placeholders with real task groups after planning checkpoints.'));
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
    const duplicateIdFinding = findings.find((finding) => finding.code === 'duplicate-requirement-id');
    const duplicateBehaviorFinding = findings.find((finding) => finding.code === 'duplicate-behavior-likely');

    assert(duplicateIdFinding, 'Expected duplicate requirement id finding.');
    assert.deepStrictEqual(duplicateIdFinding.patchTargets, ['specs/auth/spec.md', 'specs/billing/spec.md']);

    assert(duplicateBehaviorFinding, 'Expected likely duplicate behavior finding.');
    assert.deepStrictEqual(duplicateBehaviorFinding.patchTargets, ['specs/auth/spec.md', 'specs/billing/spec.md']);
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

  test('change-artifacts hashes tracked Phase 4 artifacts deterministically', () => {
    const { hashTrackedArtifacts, detectArtifactHashDrift } = require('../lib/change-artifacts');
    const changeName = 'tracked-artifact-hash';
    const changeDir = createChange(fixtureRoot, changeName, {
      'proposal.md': '# Proposal\n',
      'design.md': '# Design\n',
      'security-review.md': '# Security review\n',
      'tasks.md': '## 1. Group\n- [ ] 1.1 Work\n',
      'specs/core/spec.md': '## ADDED Requirements\n### Requirement: Core\n',
      'specs/edge/spec.md': '## ADDED Requirements\n### Requirement: Edge\n',
      'specs/README.md': 'Ignored non-spec artifact\n'
    });

    const first = hashTrackedArtifacts(changeDir);
    const second = hashTrackedArtifacts(changeDir);
    assert.deepStrictEqual(first, second);
    assert.deepStrictEqual(Object.keys(first), [
      'design.md',
      'proposal.md',
      'security-review.md',
      'specs/core/spec.md',
      'specs/edge/spec.md',
      'tasks.md'
    ]);

    const drift = detectArtifactHashDrift(
      Object.assign({}, first, {
        'design.md': 'stale-design-hash'
      }),
      first
    );
    assert.deepStrictEqual(drift.driftedPaths, ['design.md']);
    assert.strictEqual(drift.warnings.length, 1);
    assert(drift.warnings[0].includes('design.md'));
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

    assert.strictEqual(persisted.active.taskGroup, '2. Runtime integration');
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
    assert(contextText.includes('APPLYING_GROUP'));
    assert(contextText.includes('## Last Verification'));
    assert(contextText.includes('npm run test:workflow-runtime'));
    assert(contextText.includes('1. Runtime setup'));
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
    assert.strictEqual(status.nextAction, 'design');
    assert.strictEqual(status.active.taskGroup, null);
    assert(status.warnings.includes('legacy warning from sparse state'));
    assert(status.warnings.some((warning) => warning.includes('Hash drift detected for proposal.md')));
    assert.deepStrictEqual(status.blockers, ['waiting for review']);

    const statusText = buildStatusText({ repoRoot: fixtureRoot, changeName });
    assert(statusText.includes('Stage: SPECS_READY'));
    assert(statusText.includes('Next action: design'));

    const resume = buildResumeInstructions({ repoRoot: fixtureRoot, changeName });
    assert.strictEqual(resume.stage, 'SPECS_READY');
    assert.strictEqual(resume.nextAction, 'design');
    assert.strictEqual(resume.route, 'opsx-design');

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

    [
      'skills/opsx/references/action-playbooks.md',
      'skills/opsx/references/action-playbooks-zh.md'
    ].forEach((relativePath) => {
      assertPlatformLabeledCodexRouteLines(relativePath);
      const playbookContent = fs.readFileSync(path.join(REPO_ROOT, relativePath), 'utf8');
      [
        'completed TDD steps',
        'verification command/result',
        'changed files',
        'diff summary',
        'drift status'
      ].forEach((token) => {
        assert(playbookContent.includes(token), `${relativePath} apply guidance must include ${token}`);
      });
    });

    const stalePhase7Phrases = [
      'deferred to Phase 7',
      'explicitly user-approved incomplete changes',
      'Do not archive incomplete changes unless the user explicitly accepts the risk.',
      '硬门禁延后到 Phase 7'
    ];
    [
      'skills/opsx/SKILL.md',
      'skills/opsx/references/action-playbooks.md',
      'skills/opsx/references/action-playbooks-zh.md'
    ].forEach((relativePath) => {
      const content = fs.readFileSync(path.join(REPO_ROOT, relativePath), 'utf8');
      stalePhase7Phrases.forEach((phrase) => {
        assert(!content.includes(phrase), `${relativePath} must not include stale phrase: ${phrase}`);
      });
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

    const { loadChangeState } = require('../lib/change-store');
    const migratedState = loadChangeState(path.join(executeFixture, '.opsx', 'changes', changeName));
    assert.strictEqual(migratedState.stage, 'PROPOSAL_READY');
    assert(Object.prototype.hasOwnProperty.call(migratedState.hashes, 'proposal.md'));
    const migratedStatus = buildStatus({ repoRoot: executeFixture, changeName });
    assert.strictEqual(migratedStatus.nextAction, 'specs');
    assert.deepStrictEqual(migratedStatus.hashDriftWarnings, []);
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

  test('opsx status reports truthful migration and onboard guidance when workspace is missing', () => {
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
    assert(statusOutput.stdout.includes('Use onboarding routes to initialize and select a change (`$opsx-onboard` / `/opsx-onboard`).'));
    assert(statusOutput.stdout.includes('Run `opsx migrate --dry-run` to preview migration.'));
    assert(!statusOutput.stdout.includes('Current phase: Phase 2 (.opsx/ Workspace and Migration)'));
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
    Object.entries(PHASE5_PLANNING_PROMPT_ASSERTION_TARGETS).forEach(([platform, promptPaths]) => {
      promptPaths.forEach((promptPath) => {
        const generatedPrompt = generatedBundles[platform][promptPath] || '';
        assert(
          generatedPrompt.includes('`spec-split-checkpoint`'),
          `${platform}:${promptPath} source output must mention spec-split-checkpoint`
        );
        assert(
          !generatedPrompt.includes('spec-review.md'),
          `${platform}:${promptPath} source output must not mention spec-review.md`
        );
      });
    });
    Object.entries(PHASE5_PLANNING_PROMPT_ASSERTION_TARGETS).forEach(([platform, promptPaths]) => {
      const { checkedInRoot } = PLATFORM_BUNDLE_TARGETS[platform];
      promptPaths.forEach((promptPath) => {
        const checkedInPath = path.join(checkedInRoot, promptPath);
        assert(fs.existsSync(checkedInPath), `Missing checked-in planning prompt: ${checkedInPath}`);
        const checkedInPrompt = fs.readFileSync(checkedInPath, 'utf8');
        assert(
          checkedInPrompt.includes('`spec-split-checkpoint`'),
          `${platform}:${promptPath} checked-in prompt must mention spec-split-checkpoint`
        );
        assert(
          !checkedInPrompt.includes('spec-review.md'),
          `${platform}:${promptPath} checked-in prompt must not mention spec-review.md`
        );
      });
    });
    assert.strictEqual(PHASE6_TDD_PROMPT_PATHS.length, 12, 'Phase 6 prompt assertions must stay scoped to exactly 12 checked-in files');
    PHASE6_TDD_PROMPT_PATHS.forEach((promptPath) => {
      const normalizedPath = toPosixPath(promptPath);
      let platform = null;
      let relativePath = null;
      if (normalizedPath.startsWith('commands/claude/')) {
        platform = 'claude';
        relativePath = normalizedPath.slice('commands/claude/'.length);
      } else if (normalizedPath.startsWith('commands/codex/')) {
        platform = 'codex';
        relativePath = normalizedPath.slice('commands/codex/'.length);
      } else if (normalizedPath.startsWith('commands/gemini/')) {
        platform = 'gemini';
        relativePath = normalizedPath.slice('commands/gemini/'.length);
      }
      assert(platform, `Unsupported Phase 6 prompt path target: ${promptPath}`);
      const generatedPrompt = generatedBundles[platform][relativePath] || '';
      const checkedInPath = path.join(REPO_ROOT, normalizedPath);
      assert(fs.existsSync(checkedInPath), `Missing checked-in Phase 6 prompt: ${checkedInPath}`);
      const checkedInPrompt = fs.readFileSync(checkedInPath, 'utf8');
      assert(
        generatedPrompt.includes('rules.tdd.mode'),
        `${platform}:${relativePath} source output must mention rules.tdd.mode`
      );
      assert(
        generatedPrompt.includes('RED'),
        `${platform}:${relativePath} source output must mention RED`
      );
      assert(
        generatedPrompt.includes('VERIFY'),
        `${platform}:${relativePath} source output must mention VERIFY`
      );
      assert(
        generatedPrompt.includes('TDD Exemption:'),
        `${platform}:${relativePath} source output must mention TDD Exemption:`
      );
      assert(
        checkedInPrompt.includes('rules.tdd.mode'),
        `${platform}:${relativePath} checked-in prompt must mention rules.tdd.mode`
      );
      assert(
        checkedInPrompt.includes('TDD Exemption:'),
        `${platform}:${relativePath} checked-in prompt must mention TDD Exemption:`
      );
      if (relativePath.includes('apply')) {
        assert(
          generatedPrompt.includes('completed TDD steps'),
          `${platform}:${relativePath} source output must mention completed TDD steps`
        );
        assert(
          generatedPrompt.includes('diff summary'),
          `${platform}:${relativePath} source output must mention diff summary`
        );
        assert(
          checkedInPrompt.includes('completed TDD steps'),
          `${platform}:${relativePath} checked-in prompt must mention completed TDD steps`
        );
        assert(
          checkedInPrompt.includes('diff summary'),
          `${platform}:${relativePath} checked-in prompt must mention diff summary`
        );
      }
    });
    assert.strictEqual(PHASE7_GATE_PROMPT_PATHS.length, 15, 'Phase 7 prompt assertions must stay scoped to exactly 15 checked-in files');
    PHASE7_GATE_PROMPT_PATHS.forEach((promptPath) => {
      const normalizedPath = toPosixPath(promptPath);
      let platform = null;
      let relativePath = null;
      if (normalizedPath.startsWith('commands/claude/')) {
        platform = 'claude';
        relativePath = normalizedPath.slice('commands/claude/'.length);
      } else if (normalizedPath.startsWith('commands/codex/')) {
        platform = 'codex';
        relativePath = normalizedPath.slice('commands/codex/'.length);
      } else if (normalizedPath.startsWith('commands/gemini/')) {
        platform = 'gemini';
        relativePath = normalizedPath.slice('commands/gemini/'.length);
      }
      assert(platform, `Unsupported Phase 7 prompt path target: ${promptPath}`);
      const generatedPrompt = generatedBundles[platform][relativePath] || '';
      const checkedInPath = path.join(REPO_ROOT, normalizedPath);
      assert(fs.existsSync(checkedInPath), `Missing checked-in Phase 7 prompt: ${checkedInPath}`);
      const checkedInPrompt = fs.readFileSync(checkedInPath, 'utf8');

      assert(
        generatedPrompt.includes('PASS') && generatedPrompt.includes('WARN') && generatedPrompt.includes('BLOCK'),
        `${platform}:${relativePath} source output must mention PASS/WARN/BLOCK`
      );
      assert(
        checkedInPrompt.includes('PASS') && checkedInPrompt.includes('WARN') && checkedInPrompt.includes('BLOCK'),
        `${platform}:${relativePath} checked-in prompt must mention PASS/WARN/BLOCK`
      );
      if (relativePath.includes('sync')) {
        assert(
          generatedPrompt.includes('do not write partial sync'),
          `${platform}:${relativePath} source output must mention no partial sync writes`
        );
        assert(
          checkedInPrompt.includes('do not write partial sync'),
          `${platform}:${relativePath} checked-in prompt must mention no partial sync writes`
        );
      }
      if (relativePath.includes('/archive.') || relativePath.includes('opsx-archive.')) {
        assert(
          generatedPrompt.includes('.opsx/archive/<change-name>'),
          `${platform}:${relativePath} source output must mention .opsx/archive/<change-name>`
        );
        assert(
          generatedPrompt.includes('VERIFIED'),
          `${platform}:${relativePath} source output must mention VERIFIED safe-sync path`
        );
        assert(
          checkedInPrompt.includes('.opsx/archive/<change-name>'),
          `${platform}:${relativePath} checked-in prompt must mention .opsx/archive/<change-name>`
        );
        assert(
          checkedInPrompt.includes('VERIFIED'),
          `${platform}:${relativePath} checked-in prompt must mention VERIFIED safe-sync path`
        );
      }
      if (relativePath.includes('batch-apply') || relativePath.includes('bulk-archive')) {
        assert(
          generatedPrompt.includes('per-change isolation'),
          `${platform}:${relativePath} source output must mention per-change isolation`
        );
        assert(
          generatedPrompt.includes('skip') && generatedPrompt.includes('blocked'),
          `${platform}:${relativePath} source output must mention skip and blocked reporting`
        );
        assert(
          checkedInPrompt.includes('per-change isolation'),
          `${platform}:${relativePath} checked-in prompt must mention per-change isolation`
        );
        assert(
          checkedInPrompt.includes('skip') && checkedInPrompt.includes('blocked'),
          `${platform}:${relativePath} checked-in prompt must mention skip and blocked reporting`
        );
      }
    });
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

    Object.entries(generatedBundles).forEach(([platform, bundle]) => {
      const platformTarget = PLATFORM_BUNDLE_TARGETS[platform];
      const statusPrompt = bundle[platformTarget.actionPath('status')] || '';
      const resumePrompt = bundle[platformTarget.actionPath('resume')] || '';
      const applyPrompt = bundle[platformTarget.actionPath('apply')] || '';
      assert(
        statusPrompt.includes('do not refresh stored hashes from read-only routes'),
        `${platform}:status source output must include read-only hash refresh guard wording`
      );
      assert(
        resumePrompt.includes('do not refresh stored hashes from read-only routes'),
        `${platform}:resume source output must include read-only hash refresh guard wording`
      );
      assert(
        applyPrompt.includes('Execute exactly one top-level task group by default'),
        `${platform}:apply source output must include one-group apply wording`
      );
    });

    Object.entries(generatedBundles).forEach(([platform, bundle]) => {
      const wrongRoutePattern = WRONG_PLATFORM_ROUTE_PATTERNS[platform];
      Object.entries(bundle).forEach(([relativePath, content]) => {
        assert(
          !wrongRoutePattern.test(content),
          `${platform}:${relativePath} contains route guidance for another platform`
        );
      });
    });

    const bundleParity = Object.fromEntries(
      Object.entries(generatedBundles).map(([platform, bundle]) => [
        platform,
        collectBundleParity(platform, bundle)
      ])
    );
    Object.entries(bundleParity).forEach(([platform, parity]) => {
      assert(parity.totalGenerated > 0, `${platform} generated bundle must not be empty`);
      assert(Array.isArray(parity.missing), `${platform} parity record must expose missing array`);
      assert(Array.isArray(parity.mismatched), `${platform} parity record must expose mismatched array`);
      assert(Array.isArray(parity.extra), `${platform} parity record must expose extra array`);
      assert(Array.isArray(parity.generatedEntries), `${platform} parity record must expose generated entries`);
      assert(Array.isArray(parity.checkedInEntries), `${platform} parity record must expose checked-in entries`);
      assert.deepStrictEqual(parity.missing, [], `${platform} checked-in bundle is missing generated files`);
      assert.deepStrictEqual(parity.mismatched, [], `${platform} checked-in bundle has generated mismatches`);
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
