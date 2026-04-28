const fs = require('fs');
const path = require('path');
const { createHash } = require('crypto');
const { listFiles } = require('./fs-utils');
const { normalizeRelativePath, toPosixPath } = require('./path-utils');
const { buildLiteralPattern, createMatcher, parseGlobArtifactOutput } = require('./glob-utils');

const TRACKED_FILES = Object.freeze([
  'proposal.md',
  'design.md',
  'security-review.md',
  'tasks.md'
]);

const TRACKED_FILE_MATCHERS = TRACKED_FILES.map((entry) => createMatcher(buildLiteralPattern(entry)));
const TRACKED_SPEC_MATCHER = createMatcher('specs/**/spec.md');

function isTrackedArtifactPath(relativePath) {
  const normalized = normalizeRelativePath(relativePath);
  if (!normalized) return false;
  if (TRACKED_FILE_MATCHERS.some((matcher) => matcher(normalized))) return true;
  return TRACKED_SPEC_MATCHER(normalized);
}

function hashFileSha256(filePath) {
  const hash = createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

function hashTrackedArtifacts(changeDir) {
  const resolvedChangeDir = path.resolve(changeDir);
  if (!fs.existsSync(resolvedChangeDir)) {
    return {};
  }

  const trackedPaths = listFiles(resolvedChangeDir)
    .map((entry) => toPosixPath(entry));
  const normalizedPaths = parseGlobArtifactOutput(trackedPaths);
  const matchedPaths = normalizedPaths
    .filter((entry) => isTrackedArtifactPath(entry))
    .sort((left, right) => left.localeCompare(right));

  const hashes = {};
  matchedPaths.forEach((relativePath) => {
    const absolutePath = path.join(resolvedChangeDir, relativePath);
    if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
      return;
    }
    hashes[relativePath] = hashFileSha256(absolutePath);
  });
  return hashes;
}

function normalizeHashes(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  return Object.entries(input).reduce((output, [key, value]) => {
    const normalizedPath = normalizeRelativePath(key);
    const normalizedHash = typeof value === 'string' ? value.trim() : '';
    if (!normalizedPath) return output;
    output[normalizedPath] = normalizedHash;
    return output;
  }, {});
}

function detectArtifactHashDrift(storedHashes, currentHashes) {
  const normalizedStored = normalizeHashes(storedHashes);
  const normalizedCurrent = normalizeHashes(currentHashes);
  const comparedPaths = Array.from(
    new Set([
      ...Object.keys(normalizedStored),
      ...Object.keys(normalizedCurrent)
    ])
  ).sort((left, right) => left.localeCompare(right));

  const driftedPaths = comparedPaths.filter((relativePath) => {
    return normalizedStored[relativePath] !== normalizedCurrent[relativePath];
  });

  return {
    driftedPaths,
    warnings: driftedPaths.map((relativePath) => `Hash drift detected for ${relativePath}`)
  };
}

module.exports = {
  hashTrackedArtifacts,
  detectArtifactHashDrift
};
