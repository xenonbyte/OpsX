#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const SCRIPT_RELATIVE_PATH = 'scripts/check-phase1-legacy-allowlist.js';
const LEGACY_TOKEN_PATTERN = /OpenSpec|openspec|\.openspec|\$openspec|\/openspec|\/prompts:openspec|@xenonbyte\/openspec|~\/\.openspec/g;
const README_LINEAGE_SENTENCES = new Set([
  'OpsX was originally adapted from Fission-AI/OpenSpec.',
  'OpsX is a downstream adaptation of [Fission-AI/OpenSpec](https://github.com/Fission-AI/OpenSpec).',
  'OpsX 是 [Fission-AI/OpenSpec](https://github.com/Fission-AI/OpenSpec) 的下游改造版本。'
]);

const SCAN_TARGETS = [
  'README.md',
  'README-zh.md',
  'docs',
  'skills/opsx',
  'templates',
  'commands',
  'scripts/postinstall.js',
  'lib/cli.js',
  'AGENTS.md'
];

const AGENTS_AUTHORING_ALLOWLIST_LINES = new Set();

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
    README_LINEAGE_SENTENCES.has(lineText.trim())
  );
}

function isAgentsAuthoringLine(filePath, lineText) {
  return filePath === 'AGENTS.md' && AGENTS_AUTHORING_ALLOWLIST_LINES.has(lineText.trim());
}

function isAllowedMatch(filePath, lineText) {
  if (isAgentsAuthoringLine(filePath, lineText)) return true;
  return isLineageSentence(filePath, lineText);
}

function classifySurface(filePath) {
  if (filePath === 'README.md' || filePath === 'README-zh.md') return 'forbidden public docs surface';
  if (filePath === 'AGENTS.md') return 'forbidden project hand-off route surface';
  if (filePath === 'scripts/postinstall.js' || filePath === 'lib/cli.js') return 'forbidden help surface';
  if (filePath.startsWith('commands/')) return 'forbidden generated command surface';
  if (filePath.startsWith('skills/opsx/')) return 'forbidden skill surface';
  if (filePath.startsWith('docs/')) return 'forbidden docs surface';
  if (filePath.startsWith('templates/')) return 'forbidden template surface';
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
    console.error('Phase 3 public-surface legacy token check FAILED.');
    console.error(`Scanned ${files.length} files and found ${unexpected.length} unexpected legacy-token hit(s):`);
    for (const hit of unexpected) {
      console.error(`- [${hit.surface}] ${hit.filePath}:${hit.lineNumber} token="${hit.token}"`);
      console.error(`  ${hit.lineText}`);
    }
    process.exit(1);
  }

  console.log('Phase 3 public-surface legacy token check passed.');
  console.log(`Scanned files: ${files.length}`);
  console.log(`Allowlisted legacy-token hits: ${allowedHitCount}`);
}

try {
  main();
} catch (error) {
  console.error(`Failed to run phase1 legacy allowlist check: ${error.message}`);
  process.exit(1);
}
