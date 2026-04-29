#!/usr/bin/env node

const assert = require('assert');
const { PACKAGE_VERSION, REPO_ROOT } = require('../lib/constants');
const { getAllActions, getActionSyntax } = require('../lib/workflow');
const { install } = require('../lib/install');
const { buildPlatformBundle } = require('../lib/generator');
const { runRegisteredTopicTests } = require('./test-workflow-shared');

const RELEASE_GATE_POST_CHECKS = Object.freeze([
  'gsd-sdk query verify.schema-drift 08',
  '$gsd-code-review 8',
  '$gsd-verify-work 8'
]);

const RELEASE_GATE_WORKFLOW_STEPS = Object.freeze([
  '$gsd-code-review 8',
  '$gsd-verify-work 8'
]);

const PUBLIC_ROUTE_SCAN_TARGETS = Object.freeze([
  'README.md',
  'README-zh.md',
  'docs',
  'templates',
  'commands',
  'skills',
  'scripts/postinstall.js',
  'lib/cli.js',
  'AGENTS.md'
]);

const PUBLIC_ROUTE_SCAN_EXTENSIONS = Object.freeze([
  '.js',
  '.json',
  '.md',
  '.md.tmpl',
  '.tmpl',
  '.toml',
  '.txt',
  '.yaml',
  '.yml'
]);

const BANNED_PUBLIC_ROUTE_PATTERNS = Object.freeze([
  {
    label: '$opsx <request> dispatcher request style',
    pattern: /\$opsx\s+<request>/g
  },
  {
    label: 'standalone dispatcher route ($opsx)',
    pattern: /\$opsx(?![-\w]|\s+<request>)/g
  },
  {
    label: '/opsx:* wildcard route',
    pattern: /\/opsx:\*/g
  },
  {
    label: '/prompts:opsx-* wildcard route',
    pattern: /\/prompts:opsx-\*/g
  }
]);

function hasPublicRouteScanExtension(relativePath) {
  return PUBLIC_ROUTE_SCAN_EXTENSIONS.some((extension) => relativePath.endsWith(extension));
}

function collectPublicRouteScanFiles({ fs, path, listFilesRecursive, toPosixPath }) {
  const files = new Set();

  PUBLIC_ROUTE_SCAN_TARGETS.forEach((target) => {
    const absoluteTarget = path.join(REPO_ROOT, target);
    assert(fs.existsSync(absoluteTarget), `Missing public route scan target: ${target}`);
    const stat = fs.statSync(absoluteTarget);

    if (stat.isDirectory()) {
      listFilesRecursive(absoluteTarget).forEach((absolutePath) => {
        const relativePath = toPosixPath(path.relative(REPO_ROOT, absolutePath));
        if (hasPublicRouteScanExtension(relativePath)) {
          files.add(relativePath);
        }
      });
      return;
    }

    const relativePath = toPosixPath(path.relative(REPO_ROOT, absoluteTarget));
    assert(hasPublicRouteScanExtension(relativePath), `Unsupported public route scan file type: ${relativePath}`);
    files.add(relativePath);
  });

  return Array.from(files).sort((left, right) => left.localeCompare(right));
}

function findBannedPublicRouteHits(relativePath, content) {
  const hits = [];
  const lines = content.split(/\r?\n/);

  lines.forEach((lineText, index) => {
    const normalizedLine = lineText.replace(/`+/g, '');

    BANNED_PUBLIC_ROUTE_PATTERNS.forEach(({ label, pattern }) => {
      pattern.lastIndex = 0;
      Array.from(normalizedLine.matchAll(pattern)).forEach((match) => {
        hits.push({
          filePath: relativePath,
          lineNumber: index + 1,
          token: match[0],
          label,
          lineText
        });
      });
    });
  });

  return hits;
}

function formatBannedPublicRouteHits(hits) {
  return hits
    .map((hit) => `${hit.filePath}:${hit.lineNumber} ${hit.label} token="${hit.token}"\n  ${hit.lineText}`)
    .join('\n');
}

function assertNoBannedPublicRouteForms(relativePath, content) {
  const hits = findBannedPublicRouteHits(relativePath, content);
  assert.strictEqual(hits.length, 0, formatBannedPublicRouteHits(hits));
}

function collectMarkdownCodeBlocks(content, language) {
  const blocks = [];
  const fencePattern = new RegExp(`\`\`\`${language}\\n([\\s\\S]*?)\\n\`\`\``, 'g');

  Array.from(content.matchAll(fencePattern)).forEach((match) => {
    blocks.push(match[1]);
  });

  return blocks;
}

function registerTests(test, helpers) {
  const {
    assert,
    fs,
    os,
    path,
    spawnSync,
    cleanupTargets,
    BANNED_PUBLIC_ROUTE_STRINGS,
    EXPECTED_CODEX_PUBLIC_ROUTES,
    EMPTY_STATE_FALLBACK_MATCHERS,
    STRICT_PREFLIGHT_MATCHERS,
    PLATFORM_BUNDLE_TARGETS,
    PHASE5_PLANNING_PROMPT_ASSERTION_TARGETS,
    PHASE6_TDD_PROMPT_PATHS,
    PHASE7_GATE_PROMPT_PATHS,
    WRONG_PLATFORM_ROUTE_PATTERNS,
    toPosixPath,
    listFilesRecursive,
    collectBundleParity,
    collectFallbackCopyCoverage,
    assertPlatformLabeledCodexRouteLines,
    runOpsxCli
  } = helpers;

  test('opsx help and version output expose renamed Phase 1 command surface', () => {
    const versionOutput = runOpsxCli(['--version']);
    assert.strictEqual(versionOutput.status, 0, versionOutput.stderr);
    assert.strictEqual(versionOutput.stdout.trim(), `OpsX v${PACKAGE_VERSION}`);

    const helpOutput = runOpsxCli(['--help']);
    assert.strictEqual(helpOutput.status, 0, helpOutput.stderr);
    assert(helpOutput.stdout.includes(`OpsX v${PACKAGE_VERSION}`));
    assert(helpOutput.stdout.includes('opsx install --platform <claude|codex|gemini[,...]>'));
    assert(helpOutput.stdout.includes('opsx uninstall --platform <claude|codex|gemini[,...]>'));
    assert(helpOutput.stdout.includes('opsx check'));
    assert(helpOutput.stdout.includes('opsx doc'));
    assert(helpOutput.stdout.includes('opsx language <en|zh>'));
    assert(helpOutput.stdout.includes('opsx migrate --dry-run'));
    assert(helpOutput.stdout.includes('opsx migrate'));
    assert(helpOutput.stdout.includes('opsx status'));
    assert(helpOutput.stdout.includes('opsx --help'));
    assert(helpOutput.stdout.includes('opsx --version'));
    assert(helpOutput.stdout.includes('opsx --check'));
    assert(helpOutput.stdout.includes('opsx --doc'));
    assert(helpOutput.stdout.includes('opsx --language <en|zh>'));
    [
      '$opsx-onboard',
      '$opsx-propose',
      '$opsx-status',
      '$opsx-apply'
    ].forEach((route) => {
      assert(
        helpOutput.stdout.includes(route),
        `Help output must include explicit Codex route example ${route}`
      );
    });
    assert(!helpOutput.stdout.includes('$opsx <request>'));
    assert(!helpOutput.stdout.includes('/opsx:*'));
    assert(!helpOutput.stdout.includes('/prompts:opsx-*'));
    assert(!helpOutput.stdout.includes('openspec'));
    assert(!helpOutput.stdout.includes('$openspec'));
    assert(!helpOutput.stdout.includes('/prompts:openspec'));
    assertNoBannedPublicRouteForms('opsx --help output', helpOutput.stdout);
  });

  test('public route scan catches markdown-wrapped dispatcher and wildcard forms', () => {
    const syntheticContent = [
      'Avoid standalone `$opsx` route text.',
      'Avoid `$opsx` `<request>` route text.',
      'Avoid `/opsx:*` route text.',
      'Avoid `/prompts:opsx-*` route text.'
    ].join('\n');
    const hits = findBannedPublicRouteHits('synthetic-public-surface.md', syntheticContent);
    assert.strictEqual(hits.length, 4, formatBannedPublicRouteHits(hits));
    assert.deepStrictEqual(
      hits.map((hit) => hit.label),
      [
        'standalone dispatcher route ($opsx)',
        '$opsx <request> dispatcher request style',
        '/opsx:* wildcard route',
        '/prompts:opsx-* wildcard route'
      ]
    );
  });

  test('postinstall/template/hand-off guidance stays on explicit route contract', () => {
    const postinstallResult = spawnSync(process.execPath, [path.join(REPO_ROOT, 'scripts', 'postinstall.js')], {
      cwd: REPO_ROOT,
      encoding: 'utf8'
    });
    assert.strictEqual(postinstallResult.status, 0, postinstallResult.stderr);

    const postinstallOutput = postinstallResult.stdout;
    [
      '$opsx-onboard',
      '$opsx-propose',
      '$opsx-status',
      '$opsx-apply'
    ].forEach((route) => {
      assert(postinstallOutput.includes(route), `Postinstall output must include ${route}`);
    });
    BANNED_PUBLIC_ROUTE_STRINGS.forEach((token) => {
      assert(!postinstallOutput.includes(token), `Postinstall output must not include banned token ${token}`);
    });
    assertNoBannedPublicRouteForms('postinstall output', postinstallOutput);

    const handoffTemplate = fs.readFileSync(path.join(REPO_ROOT, 'templates', 'project', 'rule-file.md.tmpl'), 'utf8');
    assert(handoffTemplate.includes('For Codex, use explicit `$opsx-*` routes; for Claude/Gemini, use `/opsx-*` routes.'));
    BANNED_PUBLIC_ROUTE_STRINGS.forEach((token) => {
      assert(!handoffTemplate.includes(token), `Project hand-off template must not include banned token ${token}`);
    });

    const agentsHandOff = fs.readFileSync(path.join(REPO_ROOT, 'AGENTS.md'), 'utf8');
    assert(agentsHandOff.includes('Read `.opsx/config.yaml`'));
    assert(agentsHandOff.includes('under `.opsx/changes/`'));
    assert(!agentsHandOff.includes('openspec/config.yaml'));
    assert(!agentsHandOff.includes('openspec/changes/'));
    assert(agentsHandOff.includes('- For Codex, use explicit $opsx-* routes; for Claude/Gemini, use /opsx-* routes.'));
    [
      '$openspec',
      '/openspec',
      '/opsx:*',
      '/prompts:openspec',
      '/prompts:opsx-*',
      '$opsx <request>'
    ].forEach((token) => {
      assert(!agentsHandOff.includes(token), `AGENTS hand-off must not include stale token ${token}`);
    });

    [
      'skills/opsx/references/action-playbooks.md',
      'skills/opsx/references/action-playbooks-zh.md'
    ].forEach((relativePath) => {
      assertPlatformLabeledCodexRouteLines(relativePath);
      const playbookContent = fs.readFileSync(path.join(REPO_ROOT, relativePath), 'utf8');
      [
        'completed TDD steps',
        'verification command/result',
        'changed files',
        'diff summary',
        'drift status'
      ].forEach((token) => {
        assert(playbookContent.includes(token), `${relativePath} apply guidance must include ${token}`);
      });
    });

    const stalePhase7Phrases = [
      'deferred to Phase 7',
      'explicitly user-approved incomplete changes',
      'Do not archive incomplete changes unless the user explicitly accepts the risk.',
      '硬门禁延后到 Phase 7'
    ];
    [
      'skills/opsx/SKILL.md',
      'skills/opsx/references/action-playbooks.md',
      'skills/opsx/references/action-playbooks-zh.md'
    ].forEach((relativePath) => {
      const content = fs.readFileSync(path.join(REPO_ROOT, relativePath), 'utf8');
      stalePhase7Phrases.forEach((phrase) => {
        assert(!content.includes(phrase), `${relativePath} must not include stale phrase: ${phrase}`);
      });
    });
  });

  test('public docs and shipped guidance reject dispatcher and wildcard route forms', () => {
    const scanFiles = collectPublicRouteScanFiles({ fs, path, listFilesRecursive, toPosixPath });
    [
      'README.md',
      'README-zh.md',
      'scripts/postinstall.js',
      'lib/cli.js',
      'AGENTS.md'
    ].forEach((expectedFile) => {
      assert(scanFiles.includes(expectedFile), `Public route scan must include ${expectedFile}`);
    });
    ['docs/', 'templates/', 'commands/', 'skills/'].forEach((expectedPrefix) => {
      assert(
        scanFiles.some((relativePath) => relativePath.startsWith(expectedPrefix)),
        `Public route scan must include ${expectedPrefix} files`
      );
    });

    scanFiles.forEach((relativePath) => {
      const content = fs.readFileSync(path.join(REPO_ROOT, relativePath), 'utf8');
      assertNoBannedPublicRouteForms(relativePath, content);
    });

    const helpOutput = runOpsxCli(['--help']);
    assert.strictEqual(helpOutput.status, 0, helpOutput.stderr);
    assertNoBannedPublicRouteForms('opsx --help output', helpOutput.stdout);

    const postinstallResult = spawnSync(process.execPath, [path.join(REPO_ROOT, 'scripts', 'postinstall.js')], {
      cwd: REPO_ROOT,
      encoding: 'utf8'
    });
    assert.strictEqual(postinstallResult.status, 0, postinstallResult.stderr);
    assertNoBannedPublicRouteForms('postinstall output', postinstallResult.stdout);
  });

  test('release legacy allowlist gate keeps public surface free of stale openspec routes', () => {
    const legacyGateResult = spawnSync(process.execPath, [path.join(REPO_ROOT, 'scripts', 'check-phase1-legacy-allowlist.js')], {
      cwd: REPO_ROOT,
      encoding: 'utf8'
    });
    assert.strictEqual(legacyGateResult.status, 0, legacyGateResult.stderr || legacyGateResult.stdout);
    assert(legacyGateResult.stdout.includes('Phase 3 public-surface legacy token check passed.'));
  });

  test('runtime suite locks renamed skill targets, generated bundles, and checked-in command entries', () => {
    const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'opsx-home-surface-'));
    cleanupTargets.push(tempHome);

    const installResults = install({ platform: 'claude,codex,gemini', homeDir: tempHome, language: 'en' });
    assert.strictEqual(installResults.length, 3);
    installResults.forEach((result) => {
      assert(result.platformSkillDir.includes(path.join('skills', 'opsx')));
      assert(!result.platformSkillDir.includes(path.join('skills', 'openspec')));
      assert(fs.existsSync(result.platformSkillDir));
    });

    const sharedSkillDir = path.join(tempHome, '.opsx', 'skills', 'opsx');
    assert(fs.existsSync(sharedSkillDir));
    assert(fs.existsSync(path.join(sharedSkillDir, 'SKILL.md')));
    assert(!fs.existsSync(path.join(tempHome, '.opsx', 'skills', 'openspec', 'SKILL.md')));

    const sharedCommandPath = path.join(tempHome, '.opsx', 'commands', 'opsx.md');
    assert(fs.existsSync(sharedCommandPath));
    const sharedCommandContent = fs.readFileSync(sharedCommandPath, 'utf8');
    assert(sharedCommandContent.includes('OpsX'));

    const generatedBundles = {
      claude: buildPlatformBundle('claude'),
      codex: buildPlatformBundle('codex'),
      gemini: buildPlatformBundle('gemini')
    };

    const codexRoutesFromWorkflow = getAllActions()
      .map((action) => getActionSyntax('codex', action.id))
      .sort((left, right) => left.localeCompare(right));
    const expectedCodexRoutes = [...EXPECTED_CODEX_PUBLIC_ROUTES].sort((left, right) => left.localeCompare(right));
    assert.deepStrictEqual(codexRoutesFromWorkflow, expectedCodexRoutes);
    [
      '/openspec',
      '$openspec',
      '/prompts:openspec',
      '/opsx:*',
      '/prompts:opsx-*',
      'standalone $opsx',
      '$opsx <request>'
    ].forEach((token) => {
      assert(BANNED_PUBLIC_ROUTE_STRINGS.includes(token));
    });

    assert(generatedBundles.claude['opsx.md'].includes('OpsX'));
    assert(generatedBundles.claude['opsx.md'].includes('Primary workflow entry: `/opsx-<action>`'));
    assert(!generatedBundles.claude['opsx.md'].includes('Primary workflow entry: `$opsx <request>`'));
    assert(generatedBundles.codex['prompts/opsx.md'].includes('OpsX'));
    expectedCodexRoutes.forEach((route) => {
      assert(
        generatedBundles.codex['prompts/opsx.md'].includes(`\`${route}\``),
        `Codex route catalog must include ${route}`
      );
    });
    assert(!generatedBundles.codex['prompts/opsx.md'].includes('Preferred:'), 'Codex route catalog must not advertise a preferred standalone entry.');
    assert(!generatedBundles.codex['prompts/opsx.md'].includes('$opsx <request>'), 'Codex route catalog must not advertise `$opsx <request>`.');
    assert(!generatedBundles.codex['prompts/opsx.md'].includes('Primary workflow entry:'), 'Codex route catalog must stay internal and avoid primary-entry wording.');
    assert(generatedBundles.gemini['opsx.toml'].includes('OpsX Workflow'));
    assert(generatedBundles.gemini['opsx.toml'].includes('Primary workflow entry: `/opsx-<action>`'));
    assert(!generatedBundles.gemini['opsx.toml'].includes('Primary workflow entry: `$opsx <request>`'));
    Object.entries(PHASE5_PLANNING_PROMPT_ASSERTION_TARGETS).forEach(([platform, promptPaths]) => {
      promptPaths.forEach((promptPath) => {
        const generatedPrompt = generatedBundles[platform][promptPath] || '';
        assert(
          generatedPrompt.includes('`spec-split-checkpoint`'),
          `${platform}:${promptPath} source output must mention spec-split-checkpoint`
        );
        assert(
          !generatedPrompt.includes('spec-review.md'),
          `${platform}:${promptPath} source output must not mention spec-review.md`
        );
      });
    });
    Object.entries(PHASE5_PLANNING_PROMPT_ASSERTION_TARGETS).forEach(([platform, promptPaths]) => {
      const { checkedInRoot } = PLATFORM_BUNDLE_TARGETS[platform];
      promptPaths.forEach((promptPath) => {
        const checkedInPath = path.join(checkedInRoot, promptPath);
        assert(fs.existsSync(checkedInPath), `Missing checked-in planning prompt: ${checkedInPath}`);
        const checkedInPrompt = fs.readFileSync(checkedInPath, 'utf8');
        assert(
          checkedInPrompt.includes('`spec-split-checkpoint`'),
          `${platform}:${promptPath} checked-in prompt must mention spec-split-checkpoint`
        );
        assert(
          !checkedInPrompt.includes('spec-review.md'),
          `${platform}:${promptPath} checked-in prompt must not mention spec-review.md`
        );
      });
    });
    assert.strictEqual(PHASE6_TDD_PROMPT_PATHS.length, 12, 'Phase 6 prompt assertions must stay scoped to exactly 12 checked-in files');
    PHASE6_TDD_PROMPT_PATHS.forEach((promptPath) => {
      const normalizedPath = toPosixPath(promptPath);
      let platform = null;
      let relativePath = null;
      if (normalizedPath.startsWith('commands/claude/')) {
        platform = 'claude';
        relativePath = normalizedPath.slice('commands/claude/'.length);
      } else if (normalizedPath.startsWith('commands/codex/')) {
        platform = 'codex';
        relativePath = normalizedPath.slice('commands/codex/'.length);
      } else if (normalizedPath.startsWith('commands/gemini/')) {
        platform = 'gemini';
        relativePath = normalizedPath.slice('commands/gemini/'.length);
      }
      assert(platform, `Unsupported Phase 6 prompt path target: ${promptPath}`);
      const generatedPrompt = generatedBundles[platform][relativePath] || '';
      const checkedInPath = path.join(REPO_ROOT, normalizedPath);
      assert(fs.existsSync(checkedInPath), `Missing checked-in Phase 6 prompt: ${checkedInPath}`);
      const checkedInPrompt = fs.readFileSync(checkedInPath, 'utf8');
      assert(
        generatedPrompt.includes('rules.tdd.mode'),
        `${platform}:${relativePath} source output must mention rules.tdd.mode`
      );
      assert(
        generatedPrompt.includes('RED'),
        `${platform}:${relativePath} source output must mention RED`
      );
      assert(
        generatedPrompt.includes('VERIFY'),
        `${platform}:${relativePath} source output must mention VERIFY`
      );
      assert(
        generatedPrompt.includes('TDD Exemption:'),
        `${platform}:${relativePath} source output must mention TDD Exemption:`
      );
      assert(
        checkedInPrompt.includes('rules.tdd.mode'),
        `${platform}:${relativePath} checked-in prompt must mention rules.tdd.mode`
      );
      assert(
        checkedInPrompt.includes('TDD Exemption:'),
        `${platform}:${relativePath} checked-in prompt must mention TDD Exemption:`
      );
      if (relativePath.includes('apply')) {
        assert(
          generatedPrompt.includes('completed TDD steps'),
          `${platform}:${relativePath} source output must mention completed TDD steps`
        );
        assert(
          generatedPrompt.includes('diff summary'),
          `${platform}:${relativePath} source output must mention diff summary`
        );
        assert(
          checkedInPrompt.includes('completed TDD steps'),
          `${platform}:${relativePath} checked-in prompt must mention completed TDD steps`
        );
        assert(
          checkedInPrompt.includes('diff summary'),
          `${platform}:${relativePath} checked-in prompt must mention diff summary`
        );
      }
    });
    assert.strictEqual(PHASE7_GATE_PROMPT_PATHS.length, 15, 'Phase 7 prompt assertions must stay scoped to exactly 15 checked-in files');
    PHASE7_GATE_PROMPT_PATHS.forEach((promptPath) => {
      const normalizedPath = toPosixPath(promptPath);
      let platform = null;
      let relativePath = null;
      if (normalizedPath.startsWith('commands/claude/')) {
        platform = 'claude';
        relativePath = normalizedPath.slice('commands/claude/'.length);
      } else if (normalizedPath.startsWith('commands/codex/')) {
        platform = 'codex';
        relativePath = normalizedPath.slice('commands/codex/'.length);
      } else if (normalizedPath.startsWith('commands/gemini/')) {
        platform = 'gemini';
        relativePath = normalizedPath.slice('commands/gemini/'.length);
      }
      assert(platform, `Unsupported Phase 7 prompt path target: ${promptPath}`);
      const generatedPrompt = generatedBundles[platform][relativePath] || '';
      const checkedInPath = path.join(REPO_ROOT, normalizedPath);
      assert(fs.existsSync(checkedInPath), `Missing checked-in Phase 7 prompt: ${checkedInPath}`);
      const checkedInPrompt = fs.readFileSync(checkedInPath, 'utf8');

      assert(
        generatedPrompt.includes('PASS') && generatedPrompt.includes('WARN') && generatedPrompt.includes('BLOCK'),
        `${platform}:${relativePath} source output must mention PASS/WARN/BLOCK`
      );
      assert(
        checkedInPrompt.includes('PASS') && checkedInPrompt.includes('WARN') && checkedInPrompt.includes('BLOCK'),
        `${platform}:${relativePath} checked-in prompt must mention PASS/WARN/BLOCK`
      );
      if (relativePath.includes('sync')) {
        assert(
          generatedPrompt.includes('do not write partial sync'),
          `${platform}:${relativePath} source output must mention no partial sync writes`
        );
        assert(
          checkedInPrompt.includes('do not write partial sync'),
          `${platform}:${relativePath} checked-in prompt must mention no partial sync writes`
        );
      }
      if (relativePath.includes('/archive.') || relativePath.includes('opsx-archive.')) {
        assert(
          generatedPrompt.includes('.opsx/archive/<change-name>'),
          `${platform}:${relativePath} source output must mention .opsx/archive/<change-name>`
        );
        assert(
          generatedPrompt.includes('VERIFIED'),
          `${platform}:${relativePath} source output must mention VERIFIED safe-sync path`
        );
        assert(
          checkedInPrompt.includes('.opsx/archive/<change-name>'),
          `${platform}:${relativePath} checked-in prompt must mention .opsx/archive/<change-name>`
        );
        assert(
          checkedInPrompt.includes('VERIFIED'),
          `${platform}:${relativePath} checked-in prompt must mention VERIFIED safe-sync path`
        );
      }
      if (relativePath.includes('batch-apply') || relativePath.includes('bulk-archive')) {
        assert(
          generatedPrompt.includes('per-change isolation'),
          `${platform}:${relativePath} source output must mention per-change isolation`
        );
        assert(
          generatedPrompt.includes('skip') && generatedPrompt.includes('blocked'),
          `${platform}:${relativePath} source output must mention skip and blocked reporting`
        );
        assert(
          checkedInPrompt.includes('per-change isolation'),
          `${platform}:${relativePath} checked-in prompt must mention per-change isolation`
        );
        assert(
          checkedInPrompt.includes('skip') && checkedInPrompt.includes('blocked'),
          `${platform}:${relativePath} checked-in prompt must mention skip and blocked reporting`
        );
      }
    });
    Object.entries(generatedBundles).forEach(([platform, bundle]) => {
      Object.entries(bundle)
        .filter(([relativePath]) => relativePath.includes('onboard') || relativePath.includes('resume') || relativePath.includes('status'))
        .forEach(([relativePath, content]) => {
          STRICT_PREFLIGHT_MATCHERS.forEach((matcher) => {
            assert(content.includes(matcher), `${platform}:${relativePath} must mention ${matcher} preflight`);
          });
        });
    });
    Object.entries(generatedBundles).forEach(([platform, bundle]) => {
      Object.keys(bundle).forEach((relativePath) => {
        assert(!relativePath.includes('openspec'), `${platform} bundle contains legacy path: ${relativePath}`);
      });
    });

    Object.entries(generatedBundles).forEach(([platform, bundle]) => {
      const platformTarget = PLATFORM_BUNDLE_TARGETS[platform];
      const statusPrompt = bundle[platformTarget.actionPath('status')] || '';
      const resumePrompt = bundle[platformTarget.actionPath('resume')] || '';
      const applyPrompt = bundle[platformTarget.actionPath('apply')] || '';
      assert(
        statusPrompt.includes('do not refresh stored hashes from read-only routes'),
        `${platform}:status source output must include read-only hash refresh guard wording`
      );
      assert(
        resumePrompt.includes('do not refresh stored hashes from read-only routes'),
        `${platform}:resume source output must include read-only hash refresh guard wording`
      );
      assert(
        applyPrompt.includes('Execute exactly one top-level task group by default'),
        `${platform}:apply source output must include one-group apply wording`
      );
    });

    Object.entries(generatedBundles).forEach(([platform, bundle]) => {
      const wrongRoutePattern = WRONG_PLATFORM_ROUTE_PATTERNS[platform];
      Object.entries(bundle).forEach(([relativePath, content]) => {
        assert(
          !wrongRoutePattern.test(content),
          `${platform}:${relativePath} contains route guidance for another platform`
        );
      });
    });

    const bundleParity = Object.fromEntries(
      Object.entries(generatedBundles).map(([platform, bundle]) => [
        platform,
        collectBundleParity(platform, bundle)
      ])
    );
    Object.entries(bundleParity).forEach(([platform, parity]) => {
      assert(parity.totalGenerated > 0, `${platform} generated bundle must not be empty`);
      assert(Array.isArray(parity.missing), `${platform} parity record must expose missing array`);
      assert(Array.isArray(parity.mismatched), `${platform} parity record must expose mismatched array`);
      assert(Array.isArray(parity.extra), `${platform} parity record must expose extra array`);
      assert(Array.isArray(parity.generatedEntries), `${platform} parity record must expose generated entries`);
      assert(Array.isArray(parity.checkedInEntries), `${platform} parity record must expose checked-in entries`);
      assert.deepStrictEqual(parity.missing, [], `${platform} checked-in bundle is missing generated files`);
      assert.deepStrictEqual(parity.mismatched, [], `${platform} checked-in bundle has generated mismatches`);
      assert.deepStrictEqual(parity.extra, [], `${platform} checked-in bundle has extra tracked files outside generated output`);
      assert.strictEqual(parity.totalGenerated, parity.totalCheckedIn, `${platform} tracked checked-in count must match generated count`);
      assert.deepStrictEqual(parity.checkedInEntries, parity.generatedEntries, `${platform} checked-in entries must exactly match generated entries`);
    });

    const fallbackCoverage = collectFallbackCopyCoverage(generatedBundles);
    Object.keys(EMPTY_STATE_FALLBACK_MATCHERS).forEach((actionId) => {
      Object.keys(PLATFORM_BUNDLE_TARGETS).forEach((platform) => {
        const coverage = fallbackCoverage[actionId][platform];
        assert(generatedBundles[platform][coverage.promptPath], `Missing generated ${platform} prompt for ${actionId}`);
        assert.strictEqual(coverage.emptyWorkspace, true, `${platform}:${actionId} must include empty-workspace fallback`);
        assert.strictEqual(coverage.missingActiveChange, true, `${platform}:${actionId} must include missing-active-change fallback`);
        assert.strictEqual(coverage.noAutoCreateState, true, `${platform}:${actionId} must include no-auto-create fallback`);
      });
    });

    Object.values(PLATFORM_BUNDLE_TARGETS).forEach((target) => {
      const entryPath = path.join(target.checkedInRoot, target.entryPath);
      assert(fs.existsSync(entryPath), `Missing checked-in command entry: ${entryPath}`);
      const entryContent = fs.readFileSync(entryPath, 'utf8');
      assert(entryContent.includes('OpsX'), `Expected OpsX branding in ${entryPath}`);
    });

    const removedLegacyEntries = [
      path.join(REPO_ROOT, 'commands', 'openspec.md'),
      path.join(REPO_ROOT, 'commands', 'claude', 'openspec.md'),
      path.join(REPO_ROOT, 'commands', 'codex', 'prompts', 'openspec.md'),
      path.join(REPO_ROOT, 'commands', 'gemini', 'openspec.toml')
    ];
    removedLegacyEntries.forEach((legacyPath) => {
      assert(!fs.existsSync(legacyPath), `Legacy command entry should be removed: ${legacyPath}`);
    });
  });

  test('release checklist keeps schema drift shell command separate from workflow-agent steps', () => {
    const checklistPath = path.join(REPO_ROOT, 'docs', 'release-checklist.md');
    assert(fs.existsSync(checklistPath), `Expected release checklist to exist: ${checklistPath}`);
    const checklistContent = fs.readFileSync(checklistPath, 'utf8');
    const bashBlocks = collectMarkdownCodeBlocks(checklistContent, 'bash');
    const textBlocks = collectMarkdownCodeBlocks(checklistContent, 'text');

    RELEASE_GATE_POST_CHECKS.forEach((command) => {
      assert(
        checklistContent.includes(command),
        `Release checklist must preserve post-split verification step: ${command}`
      );
    });

    assert(
      bashBlocks.some((block) => block.includes('gsd-sdk query verify.schema-drift 08')),
      'Release checklist must keep schema drift as an executable shell command'
    );
    RELEASE_GATE_WORKFLOW_STEPS.forEach((route) => {
      assert(
        textBlocks.some((block) => block.includes(route)),
        `Release checklist must keep workflow step in a text block: ${route}`
      );
      bashBlocks.forEach((block) => {
        assert(
          !block.includes(route),
          `Release checklist must not put workflow step in a bash block: ${route}`
        );
      });
    });
  });
}

if (require.main === module) {
  runRegisteredTopicTests(registerTests);
}

module.exports = { registerTests };
