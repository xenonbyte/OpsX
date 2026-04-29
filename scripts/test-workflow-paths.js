#!/usr/bin/env node

const { runRegisteredTopicTests } = require('./test-workflow-shared');

function registerTests(test, helpers) {
  const { assert, fs, path, fixtureRoot, createChange } = helpers;

  test('path-utils exports normalized path helpers', () => {
    const pathUtils = require('../lib/path-utils');
    const expectedExports = [
      'toPosixPath',
      'normalizeRelativePath',
      'normalizePathArray',
      'relativeToBase',
      'realpathIfExists',
      'ensureWithinRealBase',
      'isWithinBase',
      'ensureWithinBase'
    ];
    expectedExports.forEach((name) => {
      assert.strictEqual(typeof pathUtils[name], 'function', `${name} must be exported as function`);
    });
  });

  test('path-utils normalizes and guards relative paths deterministically', () => {
    const {
      toPosixPath,
      normalizeRelativePath,
      normalizePathArray,
      relativeToBase,
      realpathIfExists,
      ensureWithinRealBase,
      isWithinBase,
      ensureWithinBase
    } = require('../lib/path-utils');

    const repoRoot = path.join('/tmp', 'opsx-path-utils');
    const nestedPath = path.join(repoRoot, 'specs', 'demo', 'spec.md');
    const outsidePath = path.join(repoRoot, '..', 'escape.md');

    assert.strictEqual(toPosixPath('a\\b\\c.md'), 'a/b/c.md');
    assert.strictEqual(normalizeRelativePath('./specs//demo\\spec.md'), 'specs/demo/spec.md');
    assert.deepStrictEqual(normalizePathArray(['./specs//demo\\spec.md', '', '/absolute.md']), [
      'specs/demo/spec.md',
      'absolute.md'
    ]);
    assert.strictEqual(relativeToBase(repoRoot, nestedPath), 'specs/demo/spec.md');
    assert.strictEqual(realpathIfExists(nestedPath), path.resolve(nestedPath));
    assert.strictEqual(isWithinBase(repoRoot, nestedPath), true);
    assert.strictEqual(isWithinBase(repoRoot, outsidePath), false);
    assert.throws(
      () => ensureWithinRealBase(repoRoot, outsidePath, 'repo root'),
      /outside repo root/
    );
    assert.throws(
      () => ensureWithinBase(repoRoot, outsidePath, 'repo root'),
      /outside repo root/
    );
  });

  test('path-utils containment handles symlinks with missing descendants', () => {
    const { isWithinBase } = require('../lib/path-utils');
    const realRoot = path.join(fixtureRoot, 'path-real-root');
    const symlinkRoot = path.join(fixtureRoot, 'path-symlink-root');
    const outsideRoot = path.join(fixtureRoot, 'path-outside-root');
    const symlinkOutside = path.join(realRoot, 'linked-outside');
    fs.mkdirSync(realRoot, { recursive: true });
    fs.mkdirSync(outsideRoot, { recursive: true });
    fs.symlinkSync(realRoot, symlinkRoot, 'dir');
    fs.symlinkSync(outsideRoot, symlinkOutside, 'dir');

    assert.strictEqual(isWithinBase(realRoot, path.join(symlinkRoot, 'missing', 'file.txt')), true);
    assert.strictEqual(isWithinBase(realRoot, path.join(symlinkOutside, 'missing', 'file.txt')), false);
  });

  test('glob-utils exports shared picomatch wrappers', () => {
    const globUtils = require('../lib/glob-utils');
    const expectedExports = [
      'escapeGlobLiteral',
      'buildLiteralPattern',
      'createMatcher',
      'matchNormalizedPaths',
      'parseGlobArtifactOutput'
    ];
    expectedExports.forEach((name) => {
      assert.strictEqual(typeof globUtils[name], 'function', `${name} must be exported as function`);
    });
  });

  test('glob-utils escapes glob literals and matches normalized paths', () => {
    const {
      escapeGlobLiteral,
      buildLiteralPattern,
      createMatcher,
      matchNormalizedPaths,
      parseGlobArtifactOutput
    } = require('../lib/glob-utils');

    const literalPath = 'specs/demo[qa]?/spec.md';
    const escapedLiteral = escapeGlobLiteral(literalPath);
    assert.strictEqual(escapedLiteral.includes('\\['), true);
    assert.strictEqual(escapedLiteral.includes('\\?'), true);

    const literalPattern = buildLiteralPattern(literalPath);
    const matcher = createMatcher(literalPattern);
    assert.strictEqual(matcher('specs/demo[qa]?/spec.md'), true);
    assert.strictEqual(matcher('specs/demoa/spec.md'), false);

    const matches = matchNormalizedPaths(
      ['specs\\demo[qa]?\\spec.md', 'specs/demoa/spec.md'],
      literalPattern
    );
    assert.deepStrictEqual(matches, ['specs/demo[qa]?/spec.md']);

    const parsed = parseGlobArtifactOutput([
      ' specs\\demo[qa]?\\spec.md ',
      '',
      'specs/demoa/spec.md'
    ]);
    assert.deepStrictEqual(parsed, ['specs/demo[qa]?/spec.md', 'specs/demoa/spec.md']);
  });

  test('read-only path surfaces import shared path and glob utility modules', () => {
    const runtimeGuidance = fs.readFileSync(path.join(__dirname, '../lib/runtime-guidance.js'), 'utf8');
    const changeArtifacts = fs.readFileSync(path.join(__dirname, '../lib/change-artifacts.js'), 'utf8');
    const pathScope = fs.readFileSync(path.join(__dirname, '../lib/path-scope.js'), 'utf8');

    assert(runtimeGuidance.includes("require('./path-utils')"));
    assert(runtimeGuidance.includes("require('./glob-utils')"));
    assert(changeArtifacts.includes("require('./path-utils')"));
    assert(pathScope.includes("require('./path-utils')"));
    assert(pathScope.includes("require('./glob-utils')"));
  });

  test('write-sensitive migrate and sync guards import shared path-utils helpers', () => {
    const migrateSource = fs.readFileSync(path.join(__dirname, '../lib/migrate.js'), 'utf8');
    const syncSource = fs.readFileSync(path.join(__dirname, '../lib/sync.js'), 'utf8');

    assert(migrateSource.includes("require('./path-utils')"));
    assert(syncSource.includes("require('./path-utils')"));
    assert.strictEqual(/function ensureWithinBase\(/.test(migrateSource), false);
    assert.strictEqual(/function ensureWithinBase\(/.test(syncSource), false);
    assert(syncSource.includes('Sync plan canonicalSpecsDir must match repoRoot/.opsx/specs.'));
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

  test('matchPathScope treats only active workflow state artifacts as workflow extras', () => {
    const { matchPathScope } = require('../lib/path-scope');
    const result = matchPathScope(
      [
        '.opsx/changes/demo/state.yaml',
        '.opsx/changes/demo/specs/runtime/spec.md',
        '.opsx/specs/runtime/spec.md'
      ],
      {
        allowedPaths: ['lib/**'],
        activeChange: 'demo'
      }
    );

    assert.deepStrictEqual(result.workflowArtifactMatches, ['.opsx/changes/demo/state.yaml']);
    assert.deepStrictEqual(result.explainableExtraMatches, []);
    assert.deepStrictEqual(result.outOfScopeMatches, [
      '.opsx/changes/demo/specs/runtime/spec.md',
      '.opsx/specs/runtime/spec.md'
    ]);
  });

  test('change-artifacts hashes tracked Phase 4 artifacts deterministically', () => {
    const { createHash } = require('crypto');
    const { hashFileSha256, hashTrackedArtifacts, detectArtifactHashDrift } = require('../lib/change-artifacts');
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
    const expectedProposalHash = createHash('sha256')
      .update(fs.readFileSync(path.join(changeDir, 'proposal.md')))
      .digest('hex');
    assert.deepStrictEqual(first, second);
    assert.strictEqual(hashFileSha256(path.join(changeDir, 'proposal.md')), expectedProposalHash);
    assert.strictEqual(first['proposal.md'], expectedProposalHash);
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

  test('glob-special artifact names are matched as literals after escaping', () => {
    const { buildLiteralPattern, matchNormalizedPaths } = require('../lib/glob-utils');
    const literalSpecPath = 'specs/special[qa]?/spec.md';
    const literalPattern = buildLiteralPattern(literalSpecPath);
    const matches = matchNormalizedPaths([
      'specs/special[qa]?/spec.md',
      'specs/specialx/spec.md',
      'specs/specialq/spec.md'
    ], literalPattern);
    assert.deepStrictEqual(matches, ['specs/special[qa]?/spec.md']);
  });

  test('parseGlobArtifactOutput keeps glob-special fixture names as literals', () => {
    const { parseGlobArtifactOutput } = require('../lib/glob-utils');
    const parsed = parseGlobArtifactOutput([
      ' specs\\a[bracket]\\spec.md ',
      'specs/question?/spec.md',
      'specs/star*/spec.md',
      '',
      'specs//a[bracket]//spec.md'
    ]);
    assert.deepStrictEqual(parsed, [
      'specs/a[bracket]/spec.md',
      'specs/question?/spec.md',
      'specs/star*/spec.md'
    ]);
  });

  test('migration guards still enforce repo/home base containment labels', () => {
    const { ensureWithinBase } = require('../lib/path-utils');
    const migrateSource = fs.readFileSync(path.join(__dirname, '../lib/migrate.js'), 'utf8');
    assert(migrateSource.includes('ensureWithinMigrationBase('));
    assert(migrateSource.includes("ensureWithinMigrationBase(plan.homeDir, candidatePath, 'home');"));
    assert(migrateSource.includes("ensureWithinMigrationBase(plan.cwd, move.from, 'repo');"));

    const repoBase = path.join(fixtureRoot, '.opsx');
    const homeBase = path.join(fixtureRoot, 'home');
    assert.throws(
      () => ensureWithinBase(repoBase, path.join(repoBase, '..', 'escape.md'), 'repo base'),
      /outside repo base/
    );
    assert.throws(
      () => ensureWithinBase(homeBase, path.join(homeBase, '..', 'escape.md'), 'home base'),
      /outside home base/
    );
  });

  test('applySyncPlan rejects targets outside canonical specs without writing files', () => {
    const { applySyncPlan } = require('../lib/sync');
    const outsidePath = path.join(fixtureRoot, 'outside-sync-write.md');
    const canonicalSpecsDir = path.join(fixtureRoot, '.opsx', 'specs');

    assert.throws(() => applySyncPlan({
      status: 'PASS',
      repoRoot: fixtureRoot,
      canonicalSpecsDir,
      writes: [{
        targetPath: outsidePath,
        content: 'outside write'
      }]
    }), /outside \.opsx\/specs/);
    assert.strictEqual(fs.existsSync(outsidePath), false);
  });

  test('applySyncPlan rejects caller supplied canonical spec roots outside repo .opsx specs', () => {
    const { applySyncPlan } = require('../lib/sync');
    const outsidePath = path.join(fixtureRoot, 'outside-forged-root.md');

    assert.throws(() => applySyncPlan({
      status: 'PASS',
      repoRoot: fixtureRoot,
      canonicalSpecsDir: fixtureRoot,
      writes: [{
        targetPath: outsidePath,
        content: 'forged root write'
      }]
    }), /canonicalSpecsDir must match/);
    assert.strictEqual(fs.existsSync(outsidePath), false);
  });

  test('applySyncPlan leaves canonical specs untouched when staging a later write fails', () => {
    const { applySyncPlan } = require('../lib/sync');
    const canonicalSpecsDir = path.join(fixtureRoot, '.opsx', 'specs');
    const firstTarget = path.join(canonicalSpecsDir, 'runtime', 'spec.md');
    const firstBefore = 'canonical content before staged failure\n';
    fs.mkdirSync(path.dirname(firstTarget), { recursive: true });
    fs.writeFileSync(firstTarget, firstBefore, 'utf8');
    const invalidParent = path.join(canonicalSpecsDir, 'not-a-directory');
    fs.mkdirSync(path.dirname(invalidParent), { recursive: true });
    fs.writeFileSync(invalidParent, 'this file blocks child staging\n', 'utf8');

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

  test('runtime aggregate delegates sync path-guard assertions to path topic script', () => {
    const runtimeSource = fs.readFileSync(path.join(__dirname, './test-workflow-runtime.js'), 'utf8');
    assert.strictEqual(
      runtimeSource.includes('applySyncPlan rejects targets outside canonical specs without writing files'),
      false
    );
    assert.strictEqual(
      runtimeSource.includes('applySyncPlan rejects caller supplied canonical spec roots outside repo .opsx specs'),
      false
    );
  });
}

if (require.main === module) {
  runRegisteredTopicTests(registerTests);
}

module.exports = { registerTests };
