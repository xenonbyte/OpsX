#!/usr/bin/env node

const { install, uninstall, runCheck, showDoc, setLanguage } = require('../lib/install');
const { REPO_ROOT } = require('../lib/constants');
const { ensureDir, writeText } = require('../lib/fs-utils');
const { runRegisteredTopicTests } = require('./test-workflow-shared');

const PACK_DRY_RUN_JSON_COMMAND = 'npm_config_cache=.npm-cache npm pack --dry-run --json';
const REQUIRED_TARBALL_PREFIXES = Object.freeze([
  'bin/',
  'lib/',
  'scripts/',
  'commands/',
  'skills/',
  'schemas/',
  'templates/',
  'config/',
  'docs/'
]);
const REQUIRED_TARBALL_FILES = Object.freeze([
  'README.md'
]);

function registerTests(test, helpers) {
  const {
    assert,
    fs,
    os,
    path,
    fixtureRoot,
    spawnSync,
    cleanupTargets,
    createLegacyMigrationRepoFixture,
    createLegacySharedHomeFixture,
    runOpsxCli
  } = helpers;

  test('package metadata keeps opsx name, bin mapping, and aggregate test entrypoint', () => {
    const packageJson = require('../package.json');
    assert.strictEqual(packageJson.name, '@xenonbyte/opsx');
    assert.deepStrictEqual(packageJson.bin, { opsx: 'bin/opsx.js' });
    assert.strictEqual(packageJson.scripts.test, 'node scripts/test-workflow-runtime.js');
    assert.strictEqual(packageJson.scripts['test:workflow-runtime'], 'node scripts/test-workflow-runtime.js');
    assert(packageJson.files.includes('bin/'));
    assert(packageJson.files.includes('lib/'));
    assert(packageJson.files.includes('scripts/'));
    assert(packageJson.files.includes('commands/'));
    assert(packageJson.files.includes('skills/'));
    assert(packageJson.files.includes('schemas/'));
    assert(packageJson.files.includes('templates/'));
    assert(packageJson.files.includes('config/'));
    assert(packageJson.files.includes('docs/'));
    assert(packageJson.files.includes('README.md'));
  });

  test('release package gate validates npm_config_cache=.npm-cache npm pack --dry-run --json tarball metadata and surface', () => {
    const packageJson = require('../package.json');
    const packResult = spawnSync(PACK_DRY_RUN_JSON_COMMAND, {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      shell: true
    });

    assert.strictEqual(packResult.status, 0, packResult.stderr || packResult.stdout);
    assert(packResult.stdout.trim(), 'npm pack --dry-run --json must produce JSON output on stdout.');

    let packEntries = null;
    assert.doesNotThrow(
      () => {
        packEntries = JSON.parse(packResult.stdout);
      },
      `Failed to parse npm pack JSON output:\n${packResult.stdout}`
    );

    assert(Array.isArray(packEntries), 'npm pack --dry-run --json output must be a JSON array.');
    assert(packEntries.length > 0, 'npm pack --dry-run --json output must include at least one pack result.');

    const packEntry = packEntries[0];
    assert.strictEqual(packEntry.name, '@xenonbyte/opsx');
    assert.strictEqual(packEntry.version, packageJson.version);
    assert(Array.isArray(packEntry.files), 'Pack JSON payload must include files array.');

    const packedPaths = packEntry.files
      .map((entry) => String(entry.path || ''))
      .filter((entry) => Boolean(entry))
      .sort((left, right) => left.localeCompare(right));

    assert(packedPaths.includes('bin/opsx.js'), 'Packed files must include bin/opsx.js.');
    REQUIRED_TARBALL_PREFIXES.forEach((prefix) => {
      assert(
        packedPaths.some((filePath) => filePath.startsWith(prefix)),
        `Packed files must include at least one path under ${prefix}`
      );
    });
    REQUIRED_TARBALL_FILES.forEach((filePath) => {
      assert(packedPaths.includes(filePath), `Packed files must include ${filePath}`);
    });
    assert(fs.existsSync(path.join(REPO_ROOT, 'CHANGELOG.md')), 'Release docs surface must retain CHANGELOG.md at repository root.');
  });

  test('packaged CLI smoke covers --help, --version, opsx check, opsx doc, and opsx status', () => {
    const cliHome = fs.mkdtempSync(path.join(os.tmpdir(), 'opsx-cli-smoke-home-'));
    cleanupTargets.push(cliHome);

    const helpOutput = runOpsxCli(['--help'], {
      cwd: REPO_ROOT,
      env: { HOME: cliHome }
    });
    assert.strictEqual(helpOutput.status, 0, helpOutput.stderr);
    assert(helpOutput.stdout.includes('opsx check'));
    assert(helpOutput.stdout.includes('opsx doc'));

    const versionOutput = runOpsxCli(['--version'], {
      cwd: REPO_ROOT,
      env: { HOME: cliHome }
    });
    assert.strictEqual(versionOutput.status, 0, versionOutput.stderr);
    assert(versionOutput.stdout.includes('OpsX v'));

    const checkOutput = runOpsxCli(['check'], {
      cwd: REPO_ROOT,
      env: { HOME: cliHome }
    });
    assert.strictEqual(checkOutput.status, 0, checkOutput.stderr);
    assert(checkOutput.stdout.includes('OpsX Installation Check'));

    const docOutput = runOpsxCli(['doc'], {
      cwd: REPO_ROOT,
      env: { HOME: cliHome }
    });
    assert.strictEqual(docOutput.status, 0, docOutput.stderr);
    assert(docOutput.stdout.includes('# OpsX Guide'));

    const { fixtureRoot: statusFixture } = createLegacyMigrationRepoFixture({ changeName: 'cli-smoke-status' });
    cleanupTargets.push(statusFixture);
    createLegacySharedHomeFixture(cliHome, { platform: 'codex' });
    const statusOutput = runOpsxCli(['status'], {
      cwd: statusFixture,
      env: { HOME: cliHome }
    });
    assert.strictEqual(statusOutput.status, 0, statusOutput.stderr);
    assert(statusOutput.stdout.includes('Workspace not initialized: `.opsx/config.yaml` is missing.'));
  });

  test('status --json smoke parses JSON and treats ok=true as transport success, not workspace readiness', () => {
    const { fixtureRoot: statusFixture } = createLegacyMigrationRepoFixture({ changeName: 'status-json-smoke' });
    const statusHome = fs.mkdtempSync(path.join(os.tmpdir(), 'opsx-status-json-home-'));
    cleanupTargets.push(statusFixture, statusHome);
    createLegacySharedHomeFixture(statusHome, { platform: 'codex' });

    const statusOutput = runOpsxCli(['status', '--json'], {
      cwd: statusFixture,
      env: { HOME: statusHome }
    });

    assert.strictEqual(statusOutput.status, 0, statusOutput.stderr);
    assert.strictEqual(statusOutput.stderr.trim(), '', 'status --json should not write expected-state diagnostics to stderr.');

    let envelope = null;
    assert.doesNotThrow(
      () => {
        envelope = JSON.parse(statusOutput.stdout);
      },
      `status --json must emit parseable JSON stdout:\n${statusOutput.stdout}`
    );

    assert.strictEqual(envelope.ok, true, 'ok=true indicates transport success for status --json.');
    assert.strictEqual(envelope.command, 'status');
    assert(envelope.workspace, 'status --json payload must include workspace diagnostics.');
    assert.strictEqual(envelope.workspace.initialized, false, 'Workspace readiness must be represented separately from ok=true.');
    assert.strictEqual(envelope.activeChange, null);
    assert.strictEqual(envelope.changeStatus, null);
    assert(envelope.migration, 'status --json payload must include migration diagnostics.');
    assert.strictEqual(typeof envelope.migration.pendingMoves, 'number');
    assert.strictEqual(typeof envelope.migration.pendingCreates, 'number');
    assert.strictEqual(typeof envelope.migration.journalPath, 'string');
    assert.strictEqual(envelope.migration.journalExists, false);
    assert(Array.isArray(envelope.migration.legacyCandidates), 'status --json payload must include legacyCandidates array.');
    assert(Array.isArray(envelope.warnings), 'status --json payload must include warnings array.');
    assert(envelope.warnings.includes('workspace-not-initialized'));
    assert(Array.isArray(envelope.errors), 'status --json payload must include errors array.');
  });

  test('declared Node 14 engine floor uses compatible CommonJS builtin imports', () => {
    const packageJson = require('../package.json');
    const nodeCryptoSpecifier = ['node', 'crypto'].join(':');
    assert.strictEqual(packageJson.engines.node, '>=14.14.0');
    [
      'scripts/test-workflow-runtime.js',
      'lib/change-artifacts.js'
    ].forEach((relativePath) => {
      const content = fs.readFileSync(path.join(REPO_ROOT, relativePath), 'utf8');
      assert(!content.includes(`require('${nodeCryptoSpecifier}')`), `${relativePath} must avoid node-prefixed crypto require.`);
      assert(!content.includes(`require(\"${nodeCryptoSpecifier}\")`), `${relativePath} must avoid node-prefixed crypto require.`);
      assert(content.includes("require('crypto')"), `${relativePath} must use Node 14.14 compatible crypto require.`);
    });
  });

  test('manifest cleanup refuses paths outside OpsX install roots', () => {
    const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'opsx-home-manifest-'));
    cleanupTargets.push(tempHome);

    install({ platform: 'claude', homeDir: tempHome, language: 'en' });

    const manifestPath = path.join(tempHome, '.opsx', 'manifests', 'claude.manifest');
    const installedFile = fs.readFileSync(manifestPath, 'utf8').split('\n').find((entry) => entry && fs.existsSync(entry));
    const victimPath = path.join(tempHome, 'victim.txt');
    writeText(victimPath, 'do not remove');
    writeText(manifestPath, [installedFile, victimPath].join('\n'));

    assert.throws(
      () => uninstall({ platform: 'claude', homeDir: tempHome }),
      /Refusing to remove path outside OpsX install roots/
    );
    assert(fs.existsSync(installedFile), 'Safe manifest entries should not be removed after a rejected cleanup.');
    assert(fs.existsSync(victimPath), 'Manifest cleanup must not remove paths outside OpsX install roots.');

    assert.throws(
      () => install({ platform: 'claude', homeDir: tempHome, language: 'en' }),
      /Refusing to remove path outside OpsX install roots/
    );
    assert(fs.existsSync(victimPath), 'Reinstall cleanup must not remove paths outside OpsX install roots.');
  });

  test('manifest cleanup allows install root directory entries', () => {
    const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'opsx-home-manifest-root-'));
    cleanupTargets.push(tempHome);

    install({ platform: 'claude', homeDir: tempHome, language: 'en' });

    const manifestPath = path.join(tempHome, '.opsx', 'manifests', 'claude.manifest');
    const commandsRoot = path.join(tempHome, '.claude', 'commands');
    assert(fs.existsSync(commandsRoot), 'Expected install command root to exist before uninstall.');
    writeText(manifestPath, commandsRoot);

    assert.deepStrictEqual(uninstall({ platform: 'claude', homeDir: tempHome }), ['claude']);
    assert.strictEqual(fs.existsSync(commandsRoot), false);
  });

  test('install and uninstall reject mixed invalid platform values', () => {
    const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'opsx-home-invalid-platform-'));
    cleanupTargets.push(tempHome);

    const manifestPath = path.join(tempHome, '.opsx', 'manifests', 'claude.manifest');
    assert.throws(
      () => install({ platform: 'claude,bogus', homeDir: tempHome, language: 'en' }),
      /Install supports only --platform <claude\|codex\|gemini\[,...\]>; invalid: bogus/
    );
    assert(!fs.existsSync(manifestPath), 'Invalid mixed install should not partially install valid platforms.');

    install({ platform: 'claude', homeDir: tempHome, language: 'en' });
    assert(fs.existsSync(manifestPath));

    assert.throws(
      () => uninstall({ platform: 'claude,bogus', homeDir: tempHome }),
      /Uninstall supports only --platform <claude\|codex\|gemini\[,...\]>; invalid: bogus/
    );
    assert(fs.existsSync(manifestPath), 'Invalid mixed uninstall should not remove valid platform installs.');
  });

  test('public install/check/doc/language command surface remains compatible', () => {
    const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'opsx-home-'));
    cleanupTargets.push(tempHome);

    const results = install({ platform: 'claude,codex,gemini', homeDir: tempHome, language: 'en' });
    assert.strictEqual(results.length, 3);

    const checkOutput = runCheck({ homeDir: tempHome, cwd: fixtureRoot });
    assert(checkOutput.includes('OpsX Installation Check'));
    assert(checkOutput.includes('Config'));
    assert(checkOutput.includes('Found 3 manifest(s)'));
    assert(checkOutput.includes('claude'));
    assert(checkOutput.includes('codex'));
    assert(checkOutput.includes('gemini'));

    const englishDoc = showDoc({ homeDir: tempHome });
    assert(englishDoc.includes('# OpsX Guide'));

    const language = setLanguage('zh', { homeDir: tempHome });
    assert.strictEqual(language, 'zh');
    const chineseDoc = showDoc({ homeDir: tempHome });
    assert(chineseDoc.includes('OpsX'));

    const removed = uninstall({ platform: 'claude,codex,gemini', homeDir: tempHome });
    assert.deepStrictEqual(removed.sort(), ['claude', 'codex', 'gemini']);
  });

  test('message catalog and verbose logger provide localized structured diagnostics', () => {
    const { formatMessage } = require('../lib/messages');
    const { createLogger } = require('../lib/logger');
    const lines = [];

    assert.strictEqual(formatMessage('language.switched', 'zh'), '语言已切换为中文。');
    assert(formatMessage('command.unknown', 'zh', { command: 'bogus', product: 'opsx' }).includes('未知命令'));

    createLogger({ verbose: false, sink: (line) => lines.push(line) }).info('hidden');
    assert.deepStrictEqual(lines, []);

    createLogger({ verbose: true, sink: (line) => lines.push(line) }).info('visible', { count: 1 });
    assert.strictEqual(lines.length, 1);
    const payload = JSON.parse(lines[0]);
    assert.strictEqual(payload.level, 'info');
    assert.strictEqual(payload.event, 'visible');
    assert.strictEqual(payload.count, 1);
  });

  test('check output remains accurate after partial uninstall across platforms', () => {
    const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'opsx-home-check-'));
    cleanupTargets.push(tempHome);

    install({ platform: 'claude,codex,gemini', homeDir: tempHome, language: 'en' });
    uninstall({ platform: 'gemini', homeDir: tempHome });

    assert(fs.existsSync(path.join(tempHome, '.opsx', 'skills', 'opsx', 'SKILL.md')));
    assert(fs.existsSync(path.join(tempHome, '.opsx', 'commands', 'opsx.md')));

    const checkOutput = runCheck({ homeDir: tempHome, cwd: fixtureRoot });
    assert(checkOutput.includes('Found 2 manifest(s)'));
    assert(checkOutput.includes('claude'));
    assert(checkOutput.includes('codex'));
    assert(!checkOutput.includes('Manifest missing for gemini'));
    assert(checkOutput.includes('configured platform `gemini` is not currently installed'));
  });

  test('doc output prefers package guide over stale installed guide copy', () => {
    const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'opsx-home-doc-'));
    cleanupTargets.push(tempHome);

    const staleGuideDir = path.join(tempHome, '.opsx', 'skills', 'opsx');
    ensureDir(staleGuideDir);
    writeText(path.join(staleGuideDir, 'GUIDE-en.md'), [
      '# Stale OpsX Guide',
      '',
      '1. `opsx init --platform codex --profile core`',
      '2. `opsx install --platform codex --profile core`'
    ].join('\n'));
    writeText(path.join(tempHome, '.opsx', 'config.yaml'), [
      'version: "2.0.0"',
      'schema: "spec-driven"',
      'language: "en"',
      'platform: "codex"'
    ].join('\n'));

    const doc = showDoc({ homeDir: tempHome });
    assert(doc.includes('opsx install --platform codex'));
    assert(!doc.includes('opsx init --platform codex --profile core'));
    assert(!doc.includes('--profile core'));
  });
}

if (require.main === module) {
  runRegisteredTopicTests(registerTests);
}

module.exports = { registerTests };
