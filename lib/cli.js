const fs = require('fs');
const path = require('path');
const {
  PACKAGE_VERSION,
  PRODUCT_NAME,
  PRODUCT_SHORT_NAME,
  PRODUCT_LONG_NAME
} = require('./constants');
const { install, uninstall, runCheck, showDoc, setLanguage } = require('./install');
const { runMigration, getMigrationStatus } = require('./migrate');
const { loadActiveChangePointer } = require('./change-store');
const { buildStatus, buildStatusText } = require('./runtime-guidance');
const { formatMessage } = require('./messages');

const BOOLEAN_FLAGS = new Set(['check', 'debug', 'doc', 'dry-run', 'help', 'json', 'verbose', 'version']);
const LEGACY_PROJECT_DIR = ['open', 'spec'].join('');

function parseArgs(argv) {
  const options = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      options._.push(token);
      continue;
    }
    const key = token.slice(2);
    if (BOOLEAN_FLAGS.has(key)) {
      options[key] = true;
      continue;
    }
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      options[key] = true;
      continue;
    }
    options[key] = next;
    index += 1;
  }
  return options;
}

function showHelp() {
  return [
    `${PRODUCT_NAME} v${PACKAGE_VERSION}`,
    PRODUCT_LONG_NAME,
    '',
    'Usage:',
    `  ${PRODUCT_SHORT_NAME} install --platform <claude|codex|gemini[,...]>`,
    `  ${PRODUCT_SHORT_NAME} uninstall --platform <claude|codex|gemini[,...]>`,
    `  ${PRODUCT_SHORT_NAME} check`,
    `  ${PRODUCT_SHORT_NAME} doc`,
    `  ${PRODUCT_SHORT_NAME} language <en|zh>`,
    `  ${PRODUCT_SHORT_NAME} migrate --dry-run`,
    `  ${PRODUCT_SHORT_NAME} migrate [--verbose]`,
    `  ${PRODUCT_SHORT_NAME} status`,
    `  ${PRODUCT_SHORT_NAME} --help`,
    `  ${PRODUCT_SHORT_NAME} --version`,
    '',
    'Compatibility aliases:',
    `  ${PRODUCT_SHORT_NAME} --check`,
    `  ${PRODUCT_SHORT_NAME} --doc`,
    `  ${PRODUCT_SHORT_NAME} --language <en|zh>`,
    '',
    'Codex usage:',
    `  - Use explicit \`$${PRODUCT_SHORT_NAME}-*\` routes:`,
    `    \`$${PRODUCT_SHORT_NAME}-onboard\`, \`$${PRODUCT_SHORT_NAME}-propose\`, \`$${PRODUCT_SHORT_NAME}-status\`, \`$${PRODUCT_SHORT_NAME}-apply\``
  ].join('\n');
}

function showVersion() {
  return `${PRODUCT_NAME} v${PACKAGE_VERSION}`;
}

function showLanguageMessage(language) {
  return formatMessage('language.switched', language);
}

function showStatus(options = {}) {
  const cwd = options.cwd || process.cwd();
  const homeDir = options.homeDir || process.env.HOME;
  const status = getMigrationStatus({ cwd, homeDir });
  const canonicalProjectConfigPath = path.join(cwd, '.opsx', 'config.yaml');
  const legacyProjectConfigPath = path.join(cwd, LEGACY_PROJECT_DIR, 'config.yaml');
  const migrationLines = [
    'Migration status:',
    `- canonical project root: ${status.canonical.projectExists ? 'present' : 'missing'} (${status.canonical.projectRoot})`,
    `- canonical shared home: ${status.canonical.sharedExists ? 'present' : 'missing'} (${status.canonical.sharedHome})`,
    `- legacy project root: ${status.legacy.projectExists ? 'present' : 'missing'} (${status.legacy.projectRoot})`,
    `- legacy shared home: ${status.legacy.sharedExists ? 'present' : 'missing'} (${status.legacy.sharedHome})`,
    `- pending moves: ${status.migration.pendingMoves}`,
    `- pending creates: ${status.migration.pendingCreates}`,
    `- migration journal: ${status.migration.journalExists ? 'present' : 'missing'} (${status.migration.journalPath})`,
    ...(status.legacy.candidates || []).map((entry) => `- legacy candidate: ${entry.display} (${entry.reason})`),
    ...(status.migration.abortReason ? [`- abort: ${status.migration.abortReason}`] : []),
    ...(!fs.existsSync(canonicalProjectConfigPath) && fs.existsSync(legacyProjectConfigPath)
      ? ['Run `opsx migrate --dry-run` to preview migration.']
      : [])
  ];

  if (!fs.existsSync(canonicalProjectConfigPath)) {
    return [
      showVersion(),
      'Workspace not initialized: `.opsx/config.yaml` is missing.',
      'Use onboarding routes to initialize and select a change (`$opsx-onboard` / `/opsx-onboard`).',
      '',
      ...migrationLines
    ].join('\n');
  }

  const activePointer = loadActiveChangePointer(cwd);
  if (!activePointer.activeChange) {
    return [
      showVersion(),
      'Workspace initialized: `.opsx/config.yaml` found.',
      'No active change is selected in `.opsx/active.yaml`.',
      'Next: use `$opsx-new` / `/opsx-new` or `$opsx-propose` / `/opsx-propose`.',
      '',
      ...migrationLines
    ].join('\n');
  }

  try {
    const stateAwareText = buildStatusText({
      repoRoot: cwd,
      homeDir,
      changeName: activePointer.activeChange
    });
    return [
      showVersion(),
      stateAwareText
    ].join('\n');
  } catch (error) {
    const detail = error && error.message ? error.message : String(error);
    return [
      showVersion(),
      `Unable to build state-aware status for change "${activePointer.activeChange}".`,
      `- error: ${detail}`,
      '',
      ...migrationLines
    ].join('\n');
  }
}

function pushUnique(items, value) {
  if (!value || typeof value !== 'string') return;
  if (!items.includes(value)) items.push(value);
}

function buildStatusJsonEnvelope(options = {}) {
  const cwd = options.cwd || process.cwd();
  const homeDir = options.homeDir || process.env.HOME;
  const migrationStatus = getMigrationStatus({ cwd, homeDir });
  const canonicalProjectConfigPath = path.join(cwd, '.opsx', 'config.yaml');
  const legacyProjectConfigPath = path.join(cwd, LEGACY_PROJECT_DIR, 'config.yaml');
  const workspaceInitialized = fs.existsSync(canonicalProjectConfigPath);
  const errors = [];
  const warnings = [];

  const envelope = {
    ok: true,
    version: PACKAGE_VERSION,
    command: 'status',
    workspace: {
      root: cwd,
      configPath: canonicalProjectConfigPath,
      legacyConfigPath: legacyProjectConfigPath,
      initialized: workspaceInitialized
    },
    migration: {
      canonical: {
        projectRoot: migrationStatus.canonical.projectRoot,
        projectExists: migrationStatus.canonical.projectExists,
        sharedHome: migrationStatus.canonical.sharedHome,
        sharedExists: migrationStatus.canonical.sharedExists
      },
      legacy: {
        projectRoot: migrationStatus.legacy.projectRoot,
        projectExists: migrationStatus.legacy.projectExists,
        sharedHome: migrationStatus.legacy.sharedHome,
        sharedExists: migrationStatus.legacy.sharedExists
      },
      pendingMoves: migrationStatus.migration.pendingMoves,
      pendingCreates: migrationStatus.migration.pendingCreates,
      abortReason: migrationStatus.migration.abortReason || '',
      journalPath: migrationStatus.migration.journalPath,
      journalExists: migrationStatus.migration.journalExists === true,
      legacyCandidates: (migrationStatus.legacy.candidates || []).map((entry) => ({
        path: entry.path,
        display: entry.display,
        reason: entry.reason
      }))
    },
    activeChange: null,
    changeStatus: null,
    warnings,
    errors
  };

  (migrationStatus.migration.warnings || []).forEach((warning) => pushUnique(warnings, warning));
  if (envelope.migration.abortReason) {
    pushUnique(warnings, `migration-abort:${envelope.migration.abortReason}`);
  }
  if (envelope.migration.journalExists) {
    pushUnique(warnings, 'migration-journal-present');
  }
  if (envelope.migration.legacyCandidates.length) {
    pushUnique(warnings, 'legacy-candidates-detected');
  }

  if (!workspaceInitialized) {
    pushUnique(warnings, 'workspace-not-initialized');
    if (fs.existsSync(legacyProjectConfigPath)) {
      pushUnique(warnings, 'legacy-workspace-detected');
    }
    return envelope;
  }

  const activePointer = loadActiveChangePointer(cwd);
  envelope.activeChange = activePointer.activeChange || null;
  if (!envelope.activeChange) {
    pushUnique(warnings, 'no-active-change');
    return envelope;
  }

  envelope.changeStatus = buildStatus({
    repoRoot: cwd,
    homeDir,
    changeName: envelope.activeChange
  });
  (envelope.changeStatus.warnings || []).forEach((warning) => pushUnique(warnings, warning));
  (envelope.changeStatus.blockers || []).forEach((blocker) => pushUnique(warnings, blocker));

  return envelope;
}

async function runCli(argv) {
  const options = parseArgs(argv);
  const command = options._[0] || '';
  const commandValue = options._[1] || '';

  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(showHelp());
    return;
  }
  if (argv.includes('--version') || argv.includes('-v')) {
    console.log(showVersion());
    return;
  }

  switch (command) {
    case 'install': {
      const results = install({ platform: options.platform, language: options.language });
      results.forEach((result) => {
        console.log(`Installed workflow commands for ${result.platformCommandsDir}`);
      });
      return;
    }
    case 'uninstall': {
      const removed = uninstall({ platform: options.platform });
      console.log(removed.length ? `Uninstalled: ${removed.join(', ')}` : 'Nothing to uninstall.');
      return;
    }
    case 'check':
      console.log(runCheck());
      return;
    case 'doc':
      console.log(showDoc());
      return;
    case 'language': {
      const languageInput = commandValue || options.language;
      if (!languageInput) {
        throw new Error(formatMessage('language.required', options.language, { command: PRODUCT_SHORT_NAME }));
      }
      const language = setLanguage(languageInput);
      console.log(showLanguageMessage(language));
      return;
    }
    case 'migrate':
      console.log(runMigration({
        cwd: process.cwd(),
        homeDir: process.env.HOME,
        dryRun: options['dry-run'] === true,
        verbose: options.verbose === true || options.debug === true
      }));
      return;
    case 'status':
      if (options.json === true) {
        console.log(JSON.stringify(buildStatusJsonEnvelope({
          cwd: process.cwd(),
          homeDir: process.env.HOME
        })));
        return;
      }
      console.log(showStatus({
        cwd: process.cwd(),
        homeDir: process.env.HOME
      }));
      return;
    case 'help':
    case '--help':
    case '-h':
      console.log(showHelp());
      return;
    case 'version':
      console.log(showVersion());
      return;
    default:
      break;
  }

  if (argv.includes('--check')) {
    console.log(runCheck());
    return;
  }
  if (argv.includes('--doc')) {
    console.log(showDoc());
    return;
  }
  if (options.language && argv[0] === '--language') {
    const language = setLanguage(options.language);
    console.log(showLanguageMessage(language));
    return;
  }

  if (command) {
    throw new Error(formatMessage('command.unknown', options.language, {
      command,
      product: PRODUCT_SHORT_NAME
    }));
  }

  console.log(showHelp());
}

module.exports = {
  runCli
};
