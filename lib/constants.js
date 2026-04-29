const path = require('path');
const pkg = require('../package.json');

const REPO_ROOT = path.resolve(__dirname, '..');
const PRODUCT_NAME = 'OpsX';
const PRODUCT_SHORT_NAME = 'opsx';
const PRODUCT_LONG_NAME = 'Operational Spec eXecution';
const SHARED_HOME_NAME = '.opsx';
const GLOBAL_CONFIG_NAME = 'config.yaml';
const DEFAULT_SCHEMA = 'spec-driven';
const DEFAULT_LANGUAGE = 'en';

const SUPPORTED_PLATFORMS = ['claude', 'codex', 'gemini'];

module.exports = {
  PACKAGE_NAME: pkg.name,
  PACKAGE_VERSION: pkg.version,
  REPO_ROOT,
  PRODUCT_NAME,
  PRODUCT_SHORT_NAME,
  PRODUCT_LONG_NAME,
  SHARED_HOME_NAME,
  GLOBAL_CONFIG_NAME,
  DEFAULT_SCHEMA,
  DEFAULT_LANGUAGE,
  SUPPORTED_PLATFORMS
};
