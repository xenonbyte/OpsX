const fs = require('fs');
const path = require('path');
const { createHash } = require('node:crypto');
const { listFiles } = require('./fs-utils');

const TRACKED_FILES = Object.freeze([
  'proposal.md',
  'design.md',
  'security-review.md',
  'tasks.md'
]);

function toUnixPath(value) {
  return String(value || '').replace(/\\/g, '/');
}

function isTrackedArtifactPath(relativePath) {
  const normalized = toUnixPath(relativePath);
  if (TRACKED_FILES.includes(normalized)) return true;
  return /^specs\/.+\/spec\.md$/.test(normalized);
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
    .map((entry) => toUnixPath(entry))
    .filter((entry) => isTrackedArtifactPath(entry))
    .sort((left, right) => left.localeCompare(right));

  const hashes = {};
  trackedPaths.forEach((relativePath) => {
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
    const normalizedPath = toUnixPath(key).trim();
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
