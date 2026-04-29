const fs = require('fs');
const path = require('path');

function toPosixPath(value) {
  return String(value || '').replace(/\\/g, '/');
}

function normalizeRelativePath(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  const normalized = path.posix.normalize(toPosixPath(trimmed));
  if (normalized === '.' || normalized === './') return '';
  return normalized
    .replace(/^\.\/+/, '')
    .replace(/^\/+/, '')
    .replace(/\/{2,}/g, '/');
}

function relativeToBase(basePath, targetPath) {
  const resolvedBase = canonicalPathForContainment(basePath);
  const resolvedTarget = canonicalPathForContainment(targetPath);
  return normalizeRelativePath(path.relative(resolvedBase, resolvedTarget));
}

function realpathIfExists(filePath) {
  const resolved = path.resolve(filePath);
  try {
    return fs.realpathSync.native(resolved);
  } catch (error) {
    return resolved;
  }
}

function canonicalPathForContainment(filePath) {
  const resolved = path.resolve(filePath);
  if (fs.existsSync(resolved)) {
    return realpathIfExists(resolved);
  }

  const missingSegments = [];
  let current = resolved;
  while (!fs.existsSync(current)) {
    const parent = path.dirname(current);
    if (parent === current) {
      return resolved;
    }
    missingSegments.unshift(path.basename(current));
    current = parent;
  }

  return path.join(realpathIfExists(current), ...missingSegments);
}

function isWithinBase(basePath, targetPath) {
  const relativePath = path.relative(
    canonicalPathForContainment(basePath),
    canonicalPathForContainment(targetPath)
  );
  if (!relativePath) return true;
  return !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
}

function ensureWithinRealBase(basePath, targetPath, label) {
  if (isWithinBase(basePath, targetPath)) return;
  const scopeLabel = String(label || 'base path').trim() || 'base path';
  throw new Error(`Refusing path outside ${scopeLabel}: ${targetPath}`);
}

function ensureWithinBase(basePath, targetPath, label) {
  ensureWithinRealBase(basePath, targetPath, label);
}

module.exports = {
  toPosixPath,
  normalizeRelativePath,
  relativeToBase,
  realpathIfExists,
  ensureWithinRealBase,
  isWithinBase,
  ensureWithinBase
};
