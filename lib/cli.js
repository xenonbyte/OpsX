const {
  PACKAGE_VERSION,
  PRODUCT_NAME,
  PRODUCT_SHORT_NAME,
  PRODUCT_LONG_NAME
} = require('./constants');
const { install, uninstall, runCheck, showDoc, setLanguage } = require('./install');

function parseArgs(argv) {
  const options = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      options._.push(token);
      continue;
    }
    const key = token.slice(2);
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
    `  ${PRODUCT_SHORT_NAME} migrate`,
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
    `  - Prefer \`$${PRODUCT_SHORT_NAME} <request>\` for natural-language workflow requests`
  ].join('\n');
}

function showVersion() {
  return `${PRODUCT_NAME} v${PACKAGE_VERSION}`;
}

function showLanguageMessage(language) {
  return language === 'zh' ? '语言已切换为中文。' : 'Language switched to English.';
}

function showMigratePlaceholder() {
  return [
    'Phase 1 placeholder: migration command routing is available.',
    'Workspace migration to .opsx/ and ~/.opsx/ lands in Phase 2.'
  ].join('\n');
}

function showStatusPlaceholder() {
  return [
    showVersion(),
    'Phase 1 status placeholder.',
    'Durable change-state reporting lands in Phase 4.',
    'Current phase: Phase 1 (OpsX naming and CLI surface).'
  ].join('\n');
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
        throw new Error(`Language command requires <en|zh>. Run \`${PRODUCT_SHORT_NAME} --help\` for usage.`);
      }
      const language = setLanguage(languageInput);
      console.log(showLanguageMessage(language));
      return;
    }
    case 'migrate':
      console.log(showMigratePlaceholder());
      return;
    case 'status':
      console.log(showStatusPlaceholder());
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
    throw new Error(`Unknown command: ${command}. Run \`${PRODUCT_SHORT_NAME} --help\` for usage.`);
  }

  console.log(showHelp());
}

module.exports = {
  runCli
};
