const fs = require('fs');
const path = require('path');
const { realpathIfExists } = require('./path-utils');
const { unique } = require('./string-utils');

function hasOpsxProjectRoot(repoRoot) {
  const opsxRoot = path.join(repoRoot, '.opsx');
  return fs.existsSync(path.join(opsxRoot, 'config.yaml'))
    || fs.existsSync(path.join(opsxRoot, 'changes'))
    || fs.existsSync(path.join(opsxRoot, 'specs'));
}

function resolveStandardChangeRepoRoot(candidate) {
  const changesDir = path.dirname(candidate);
  const opsxDir = path.dirname(changesDir);
  if (path.basename(changesDir) !== 'changes' || path.basename(opsxDir) !== '.opsx') {
    return '';
  }
  return path.dirname(opsxDir);
}

function findAncestorRepoRoot(startPath) {
  let current = path.resolve(startPath);
  while (true) {
    if (hasOpsxProjectRoot(current)) return current;
    const parent = path.dirname(current);
    if (parent === current) return '';
    current = parent;
  }
}

function resolveRepoRoot(changeDir) {
  const resolved = path.resolve(changeDir || process.cwd());
  const candidates = unique([resolved, realpathIfExists(resolved)]);

  for (const candidate of candidates) {
    const standardRoot = resolveStandardChangeRepoRoot(candidate);
    if (standardRoot) return standardRoot;
  }

  for (const candidate of candidates) {
    const ancestorRoot = findAncestorRepoRoot(candidate);
    if (ancestorRoot) return ancestorRoot;
  }

  throw new Error(
    `Unable to resolve OpsX repo root for change directory: ${resolved}. `
    + 'Expected .opsx/changes/<change> or an ancestor containing .opsx/config.yaml.'
  );
}

module.exports = {
  resolveRepoRoot
};
