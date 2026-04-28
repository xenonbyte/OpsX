#!/usr/bin/env node

const { runRegisteredTopicTests } = require('./test-workflow-shared');

function registerTests(test, helpers) {
  const { assert, path } = helpers;

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
}

if (require.main === module) {
  runRegisteredTopicTests(registerTests);
}

module.exports = { registerTests };
