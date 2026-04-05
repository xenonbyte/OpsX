const path = require('path');
const pkg = require('../package.json');

const REPO_ROOT = path.resolve(__dirname, '..');
const SHARED_HOME_NAME = '.openspec';
const GLOBAL_CONFIG_NAME = '.opsx-config.yaml';
const DEFAULT_SCHEMA = 'spec-driven';
const DEFAULT_LANGUAGE = 'en';

const PLATFORM_RULE_FILES = {
  claude: 'CLAUDE.md',
  codex: 'AGENTS.md',
  gemini: 'GEMINI.md'
};

module.exports = {
  PACKAGE_NAME: pkg.name,
  PACKAGE_VERSION: pkg.version,
  REPO_ROOT,
  SHARED_HOME_NAME,
  GLOBAL_CONFIG_NAME,
  DEFAULT_SCHEMA,
  DEFAULT_LANGUAGE,
  PLATFORM_RULE_FILES
};
