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
  const resolvedBase = path.resolve(basePath);
  const resolvedTarget = path.resolve(targetPath);
  return normalizeRelativePath(path.relative(resolvedBase, resolvedTarget));
}

function isWithinBase(basePath, targetPath) {
  const relativePath = path.relative(path.resolve(basePath), path.resolve(targetPath));
  if (!relativePath) return true;
  return !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
}

function ensureWithinBase(basePath, targetPath, label) {
  if (isWithinBase(basePath, targetPath)) return;
  const scopeLabel = String(label || 'base path').trim() || 'base path';
  throw new Error(`Refusing path outside ${scopeLabel}: ${targetPath}`);
}

module.exports = {
  toPosixPath,
  normalizeRelativePath,
  relativeToBase,
  isWithinBase,
  ensureWithinBase
};
