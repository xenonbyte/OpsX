#!/usr/bin/env node

const { install, uninstall, runCheck, showDoc, setLanguage } = require('../lib/install');
const { REPO_ROOT } = require('../lib/constants');
const { ensureDir, writeText } = require('../lib/fs-utils');
const { runRegisteredTopicTests } = require('./test-workflow-shared');

function registerTests(test, helpers) {
  const {
    assert,
    fs,
    os,
    path,
    fixtureRoot,
    cleanupTargets
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
