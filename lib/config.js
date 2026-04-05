const fs = require('fs');
const path = require('path');
const {
  REPO_ROOT,
  SHARED_HOME_NAME,
  GLOBAL_CONFIG_NAME,
  DEFAULT_SCHEMA,
  DEFAULT_PROFILE,
  DEFAULT_LANGUAGE,
  PACKAGE_VERSION
} = require('./constants');
const { parseYaml, stringifyYaml } = require('./yaml');
const { ensureDir, writeText } = require('./fs-utils');

const DEFAULT_SECURITY_REVIEW_HINT = 'auth, permission, token, session, cookie, upload, payment, admin, pii, secret, tenant, webhook, callback, encryption, signature';
const DEFAULT_SECURITY_REVIEW_CONFIG = {
  mode: 'heuristic',
  required: false,
  allowWaiver: true,
  heuristicHint: DEFAULT_SECURITY_REVIEW_HINT
};

function deepMerge(base, override) {
  const output = Object.assign({}, base || {});
  Object.keys(override || {}).forEach((key) => {
    const nextValue = override[key];
    const currentValue = output[key];
    if (nextValue && typeof nextValue === 'object' && !Array.isArray(nextValue)) {
      output[key] = deepMerge(currentValue && typeof currentValue === 'object' ? currentValue : {}, nextValue);
    } else if (nextValue !== undefined) {
      output[key] = nextValue;
    }
  });
  return output;
}

function readYamlFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return parseYaml(fs.readFileSync(filePath, 'utf8'));
}

function getSharedHome(homeDir = process.env.HOME) {
  return path.join(homeDir, SHARED_HOME_NAME);
}

function getGlobalConfigPath(homeDir = process.env.HOME) {
  return path.join(getSharedHome(homeDir), GLOBAL_CONFIG_NAME);
}

function normalizeSecurityReviewConfig(config) {
  const normalized = deepMerge(DEFAULT_SECURITY_REVIEW_CONFIG, config && typeof config === 'object' ? config : {});
  if (normalized.mode === 'required') {
    normalized.required = true;
    normalized.mode = 'heuristic';
  }
  if (!['heuristic', 'off'].includes(normalized.mode)) normalized.mode = 'heuristic';
  normalized.required = normalized.required === true;
  normalized.allowWaiver = normalized.allowWaiver !== false;
  if (typeof normalized.heuristicHint !== 'string' || !normalized.heuristicHint.trim()) {
    normalized.heuristicHint = DEFAULT_SECURITY_REVIEW_HINT;
  }
  return normalized;
}

function normalizeConfig(config) {
  const normalized = deepMerge({
    version: PACKAGE_VERSION,
    schema: DEFAULT_SCHEMA,
    language: DEFAULT_LANGUAGE,
    profile: DEFAULT_PROFILE,
    context: '',
    rules: {},
    securityReview: DEFAULT_SECURITY_REVIEW_CONFIG
  }, config || {});

  if (!['en', 'zh'].includes(normalized.language)) normalized.language = DEFAULT_LANGUAGE;
  if (!['core', 'expanded'].includes(normalized.profile)) normalized.profile = DEFAULT_PROFILE;
  if (!normalized.schema) normalized.schema = DEFAULT_SCHEMA;
  if (!normalized.rules || typeof normalized.rules !== 'object') normalized.rules = {};
  normalized.securityReview = normalizeSecurityReviewConfig(normalized.securityReview);
  return normalized;
}

function loadGlobalConfig(homeDir = process.env.HOME) {
  return normalizeConfig(readYamlFile(getGlobalConfigPath(homeDir)));
}

function writeGlobalConfig(config, homeDir = process.env.HOME) {
  const targetPath = getGlobalConfigPath(homeDir);
  ensureDir(path.dirname(targetPath));
  const content = [
    '# OpenSpec Local Skill Configuration',
    '# Managed by openspec install',
    '',
    stringifyYaml(normalizeConfig(config))
  ].join('\n');
  writeText(targetPath, `${content}\n`);
  return targetPath;
}

function getRepoSkillDir() {
  return path.join(REPO_ROOT, 'skills', 'openspec');
}

module.exports = {
  deepMerge,
  readYamlFile,
  getSharedHome,
  getGlobalConfigPath,
  normalizeConfig,
  loadGlobalConfig,
  writeGlobalConfig,
  getRepoSkillDir
};
