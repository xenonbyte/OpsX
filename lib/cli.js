const { PACKAGE_VERSION } = require('./constants');
const { install, uninstall, update, initProject, runCheck, showDoc, setLanguage, validateAssets } = require('./install');
const { writeRepositoryAssets } = require('./generator');

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
    '  openspec init [--platform codex] [--profile core|expanded] [--language en|zh]',
    '  openspec install --platform <claude|codex|gemini[,...]> [--profile core|expanded]',
    '  openspec update --platform <claude|codex|gemini[,...]> [--profile core|expanded]',
    '  openspec uninstall --platform <claude|codex|gemini[,...]>',
    '  openspec generate-assets',
    '  openspec validate-assets',
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
    '  - openspec/config.yaml controls schema, context, rules, language, and profile',
    '  - precedence: change metadata > project config > global config > package defaults',
    '',
    'Validation:',
    '  - `openspec validate-assets` checks generated assets, workflow gating/checkpoints, and packaging readiness'
  ].join('\n');
}

async function runCli(argv) {
  const options = parseArgs(argv);
  const command = options._[0] || '';

  switch (command) {
    case 'init': {
      const result = initProject({
        cwd: process.cwd(),
        platform: options.platform,
        profile: options.profile,
        language: options.language,
        force: Boolean(options.force)
      });
      console.log(`Initialized OpenSpec project files:\n- ${result.configFile}\n- ${result.ruleFile}`);
      return;
    }
    case 'install': {
      const results = install({ platform: options.platform, profile: options.profile || 'core', language: options.language });
      results.forEach((result) => {
        console.log(`Installed ${result.profile} profile for ${result.platformCommandsDir}`);
      });
      return;
    }
    case 'update': {
      const results = update({ platform: options.platform, profile: options.profile || 'core', language: options.language });
      results.forEach((result) => {
        console.log(`Updated ${result.profile} profile for ${result.platformCommandsDir}`);
      });
      return;
    }
    case 'uninstall': {
      const removed = uninstall({ platform: options.platform });
      console.log(removed.length ? `Uninstalled: ${removed.join(', ')}` : 'Nothing to uninstall.');
      return;
    }
    case 'generate-assets': {
      const written = writeRepositoryAssets('expanded');
      console.log(`Generated ${written.length} repository assets.`);
      return;
    }
    case 'validate-assets': {
      const issues = validateAssets();
      if (issues.length) {
        issues.forEach((issue) => console.error(issue));
        process.exitCode = 1;
      } else {
        console.log('Generated assets, workflow contracts, and packaging metadata are in sync.');
      }
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

  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(showHelp());
    return;
  }
  if (argv.includes('--version') || argv.includes('-v')) {
    console.log(`OpenSpec v${PACKAGE_VERSION}`);
    return;
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

  console.log(showHelp());
}

module.exports = {
  runCli
};
