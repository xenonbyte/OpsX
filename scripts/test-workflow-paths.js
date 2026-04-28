#!/usr/bin/env node

const { runRegisteredTopicTests } = require('./test-workflow-shared');

function registerTests(test, helpers) {
  const { assert, fs, path, fixtureRoot, createChange } = helpers;

  test('path-utils exports normalized path helpers', () => {
    const pathUtils = require('../lib/path-utils');
    const expectedExports = [
      'toPosixPath',
      'normalizeRelativePath',
      'relativeToBase',
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
      relativeToBase,
      isWithinBase,
      ensureWithinBase
    } = require('../lib/path-utils');

    const repoRoot = path.join('/tmp', 'opsx-path-utils');
    const nestedPath = path.join(repoRoot, 'specs', 'demo', 'spec.md');
    const outsidePath = path.join(repoRoot, '..', 'escape.md');

    assert.strictEqual(toPosixPath('a\\b\\c.md'), 'a/b/c.md');
    assert.strictEqual(normalizeRelativePath('./specs//demo\\spec.md'), 'specs/demo/spec.md');
    assert.strictEqual(relativeToBase(repoRoot, nestedPath), 'specs/demo/spec.md');
    assert.strictEqual(isWithinBase(repoRoot, nestedPath), true);
    assert.strictEqual(isWithinBase(repoRoot, outsidePath), false);
    assert.throws(
      () => ensureWithinBase(repoRoot, outsidePath, 'repo root'),
      /outside repo root/
    );
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
}

if (require.main === module) {
  runRegisteredTopicTests(registerTests);
}

module.exports = { registerTests };
