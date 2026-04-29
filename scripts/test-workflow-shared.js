#!/usr/bin/env node

const assert = require('assert');
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createHash } = require('crypto');
const { copyDir, ensureDir, writeText } = require('../lib/fs-utils');
const { REPO_ROOT } = require('../lib/constants');
const { RuntimeGuidanceError } = require('../lib/runtime-guidance');

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
    entryPath: null,
    actionPath: (actionId) => `opsx-${actionId}.md`,
    isTrackedBundlePath: (relativePath) => /^opsx-[^/]+\.md$/.test(relativePath)
  }),
  codex: Object.freeze({
    checkedInRoot: path.join(REPO_ROOT, 'commands', 'codex'),
    entryPath: null,
    actionPath: (actionId) => `skills/opsx-${actionId}/SKILL.md`,
    isTrackedBundlePath: (relativePath) => /^skills\/opsx-[^/]+\/SKILL\.md$/.test(relativePath)
  }),
  gemini: Object.freeze({
    checkedInRoot: path.join(REPO_ROOT, 'commands', 'gemini'),
    entryPath: null,
    actionPath: (actionId) => `opsx-${actionId}.toml`,
    isTrackedBundlePath: (relativePath) => /^opsx-[^/]+\.toml$/.test(relativePath)
  })
});

const PHASE5_PLANNING_PROMPT_ASSERTION_TARGETS = Object.freeze({
  claude: Object.freeze([
    'opsx-continue.md',
    'opsx-ff.md',
    'opsx-propose.md'
  ]),
  codex: Object.freeze([
    'skills/opsx-continue/SKILL.md',
    'skills/opsx-ff/SKILL.md',
    'skills/opsx-propose/SKILL.md'
  ]),
  gemini: Object.freeze([
    'opsx-continue.toml',
    'opsx-ff.toml',
    'opsx-propose.toml'
  ])
});

const PHASE6_TDD_PROMPT_PATHS = Object.freeze([
  'commands/claude/opsx-apply.md',
  'commands/claude/opsx-propose.md',
  'commands/claude/opsx-continue.md',
  'commands/claude/opsx-ff.md',
  'commands/codex/skills/opsx-apply/SKILL.md',
  'commands/codex/skills/opsx-propose/SKILL.md',
  'commands/codex/skills/opsx-continue/SKILL.md',
  'commands/codex/skills/opsx-ff/SKILL.md',
  'commands/gemini/opsx-apply.toml',
  'commands/gemini/opsx-propose.toml',
  'commands/gemini/opsx-continue.toml',
  'commands/gemini/opsx-ff.toml'
]);

const PHASE7_GATE_PROMPT_PATHS = Object.freeze([
  'commands/claude/opsx-verify.md',
  'commands/claude/opsx-sync.md',
  'commands/claude/opsx-archive.md',
  'commands/claude/opsx-batch-apply.md',
  'commands/claude/opsx-bulk-archive.md',
  'commands/codex/skills/opsx-verify/SKILL.md',
  'commands/codex/skills/opsx-sync/SKILL.md',
  'commands/codex/skills/opsx-archive/SKILL.md',
  'commands/codex/skills/opsx-batch-apply/SKILL.md',
  'commands/codex/skills/opsx-bulk-archive/SKILL.md',
  'commands/gemini/opsx-verify.toml',
  'commands/gemini/opsx-sync.toml',
  'commands/gemini/opsx-archive.toml',
  'commands/gemini/opsx-batch-apply.toml',
  'commands/gemini/opsx-bulk-archive.toml'
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

function runRegisteredTopicTests(registerTests) {
  const { removePath } = require('../lib/fs-utils');
  const tests = [];
  const fixtureRoot = createFixtureRepo();
  const cleanupTargets = [fixtureRoot];

  function test(name, fn) {
    tests.push({ name, fn });
  }

  const helpers = {
    assert,
    fs,
    os,
    path,
    spawnSync,
    fixtureRoot,
    cleanupTargets,
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
    listFilesRecursive,
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
    hashFileSha256,
    resolveArtifactPath,
    inspectReadOnlyStateForDrift
  };

  registerTests(test, helpers);

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

module.exports = {
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
  listFilesRecursive,
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
  hashFileSha256,
  resolveArtifactPath,
  inspectReadOnlyStateForDrift,
  runRegisteredTopicTests
};
