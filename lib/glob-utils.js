const picomatch = require('picomatch');
const { normalizeRelativePath } = require('./path-utils');

const GLOB_SPECIAL_PATTERN = /([*?[\]{}()!+@\\])/g;

function normalizeStringArray(value) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => normalizeRelativePath(entry))
      .filter(Boolean);
  }
  const single = normalizeRelativePath(value);
  return single ? [single] : [];
}

function uniqueSorted(values) {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right));
}

function escapeGlobLiteral(value) {
  const normalized = normalizeRelativePath(value);
  if (!normalized) return '';
  return normalized.replace(GLOB_SPECIAL_PATTERN, '\\$1');
}

function buildLiteralPattern(value) {
  return escapeGlobLiteral(value);
}

function createMatcher(pattern, options = {}) {
  const sourcePattern = String(pattern || '').trim();
  if (!sourcePattern) {
    return () => false;
  }

  const matcher = picomatch(sourcePattern, {
    basename: !sourcePattern.includes('/'),
    dot: true,
    ...options
  });

  return (value) => matcher(normalizeRelativePath(value));
}

function matchNormalizedPaths(inputPaths, patternOrMatcher, options = {}) {
  const paths = uniqueSorted(normalizeStringArray(inputPaths));
  const matcher = typeof patternOrMatcher === 'function'
    ? patternOrMatcher
    : createMatcher(String(patternOrMatcher || ''), options);
  return paths.filter((entry) => matcher(entry));
}

function parseGlobArtifactOutput(value) {
  const rows = Array.isArray(value)
    ? value
    : String(value || '').split(/\r?\n/);
  return uniqueSorted(
    rows
      .map((entry) => normalizeRelativePath(entry))
      .filter(Boolean)
  );
}

module.exports = {
  escapeGlobLiteral,
  buildLiteralPattern,
  createMatcher,
  matchNormalizedPaths,
  parseGlobArtifactOutput
};
