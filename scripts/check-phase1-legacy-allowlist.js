#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const SCRIPT_RELATIVE_PATH = 'scripts/check-phase1-legacy-allowlist.js';
const LEGACY_TOKEN_PATTERN = /OpenSpec|openspec|\.openspec|\$openspec|\/openspec|\/prompts:openspec|@xenonbyte\/openspec|~\/\.openspec/g;
const README_LINEAGE_SENTENCE = 'OpsX was originally adapted from Fission-AI/OpenSpec.';

const SCAN_TARGETS = [
  'README.md',
  'README-zh.md',
  'CHANGELOG.md',
  'package.json',
  'bin',
  'lib',
  'scripts',
  'commands',
  'skills/opsx',
  'templates',
  'docs',
  'openspec/config.yaml',
  'schemas/spec-driven/schema.json',
  'AGENTS.md'
];

const DEFERRED_ALLOWLIST_FILES = new Set([
  'lib/config.js',
  'lib/constants.js',
  'lib/install.js',
  'lib/runtime-guidance.js',
  'scripts/test-workflow-runtime.js',
  'openspec/config.yaml',
  'schemas/spec-driven/schema.json',
  'AGENTS.md'
]);

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

function resolveScanFiles() {
  const files = new Set();

  for (const target of SCAN_TARGETS) {
    const absoluteTarget = path.join(REPO_ROOT, target);

    if (!fs.existsSync(absoluteTarget)) {
      throw new Error(`Scan target is missing: ${target}`);
    }

    const stat = fs.statSync(absoluteTarget);
    if (stat.isDirectory()) {
      for (const file of listFilesRecursive(absoluteTarget)) {
        const relative = toPosixPath(path.relative(REPO_ROOT, file));
        if (relative === SCRIPT_RELATIVE_PATH) continue;
        files.add(relative);
      }
      continue;
    }

    const relative = toPosixPath(path.relative(REPO_ROOT, absoluteTarget));
    if (relative === SCRIPT_RELATIVE_PATH) continue;
    files.add(relative);
  }

  return Array.from(files).sort((a, b) => a.localeCompare(b));
}

function isLineageSentence(filePath, lineText) {
  return (
    (filePath === 'README.md' || filePath === 'README-zh.md') &&
    lineText.trim() === README_LINEAGE_SENTENCE
  );
}

function isAllowedMatch(filePath, lineText) {
  if (filePath === 'CHANGELOG.md') return true;
  if (DEFERRED_ALLOWLIST_FILES.has(filePath)) return true;
  return isLineageSentence(filePath, lineText);
}

function classifySurface(filePath) {
  if (filePath === 'package.json' || filePath.startsWith('bin/')) return 'forbidden public surface';
  if (filePath === 'lib/cli.js') return 'forbidden public surface';
  if (filePath.startsWith('commands/')) return 'forbidden public surface';
  if (filePath.startsWith('skills/opsx/')) return 'forbidden public surface';
  if (filePath.startsWith('docs/')) return 'forbidden public surface';
  if (filePath.startsWith('templates/')) return 'forbidden public surface';
  return 'unexpected legacy reference';
}

function findLegacyTokens(lineText) {
  return Array.from(lineText.matchAll(LEGACY_TOKEN_PATTERN)).map((match) => match[0]);
}

function main() {
  const files = resolveScanFiles();
  const unexpected = [];
  let allowedHitCount = 0;

  for (const relativePath of files) {
    const absolutePath = path.join(REPO_ROOT, relativePath);
    const content = fs.readFileSync(absolutePath, 'utf8');
    const lines = content.split(/\r?\n/);

    for (let index = 0; index < lines.length; index += 1) {
      const lineNumber = index + 1;
      const lineText = lines[index];
      const tokens = findLegacyTokens(lineText);

      if (!tokens.length) continue;
      if (isAllowedMatch(relativePath, lineText)) {
        allowedHitCount += tokens.length;
        continue;
      }

      for (const token of tokens) {
        unexpected.push({
          filePath: relativePath,
          lineNumber,
          token,
          lineText,
          surface: classifySurface(relativePath)
        });
      }
    }
  }

  if (unexpected.length) {
    console.error('Phase 1 legacy allowlist check FAILED.');
    console.error(`Scanned ${files.length} files and found ${unexpected.length} unexpected legacy-token hit(s):`);
    for (const hit of unexpected) {
      console.error(`- [${hit.surface}] ${hit.filePath}:${hit.lineNumber} token="${hit.token}"`);
      console.error(`  ${hit.lineText}`);
    }
    process.exit(1);
  }

  console.log('Phase 1 legacy allowlist check passed.');
  console.log(`Scanned files: ${files.length}`);
  console.log(`Allowlisted legacy-token hits: ${allowedHitCount}`);
}

try {
  main();
} catch (error) {
  console.error(`Failed to run phase1 legacy allowlist check: ${error.message}`);
  process.exit(1);
}
