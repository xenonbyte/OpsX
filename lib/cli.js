const { PACKAGE_VERSION } = require('./constants');
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
    `OpenSpec v${PACKAGE_VERSION}`,
    '',
    'Usage:',
    '  openspec install --platform <claude|codex|gemini[,...]>',
    '  openspec uninstall --platform <claude|codex|gemini[,...]>',
    '  openspec --check',
    '  openspec --doc',
    '  openspec --language <en|zh>',
    '  openspec --version',
    '',
    'Codex usage:',
    '  - Prefer `$openspec <request>` for natural-language workflow requests',
    '  - Use `/prompts:openspec` or `/prompts:opsx-*` for explicit routing',
    '',
    'Project config:',
    '  - openspec/config.yaml controls schema, context, and rules',
    '  - precedence: change metadata > project config > global config > package defaults'
  ].join('\n');
}

async function runCli(argv) {
  const options = parseArgs(argv);
  const command = options._[0] || '';

  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(showHelp());
    return;
  }
  if (argv.includes('--version') || argv.includes('-v')) {
    console.log(`OpenSpec v${PACKAGE_VERSION}`);
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
    case 'help':
    case '--help':
    case '-h':
      console.log(showHelp());
      return;
    case 'version':
      console.log(`OpenSpec v${PACKAGE_VERSION}`);
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
    console.log(language === 'zh' ? '语言已切换为中文。' : 'Language switched to English.');
    return;
  }

  if (command) {
    throw new Error(`Unknown command: ${command}. Run \`openspec --help\` for usage.`);
  }

  console.log(showHelp());
}

module.exports = {
  runCli
};
