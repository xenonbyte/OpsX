const fs = require('fs');
const path = require('path');
const {
  REPO_ROOT,
  SHARED_HOME_NAME,
  GLOBAL_CONFIG_NAME,
  DEFAULT_SCHEMA,
  DEFAULT_PROFILE,
  DEFAULT_LANGUAGE,
  PACKAGE_VERSION,
  PLATFORM_RULE_FILES
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

function getProjectConfigPath(cwd = process.cwd()) {
  return path.join(cwd, 'openspec', 'config.yaml');
}

function getRuleFileName(platform) {
  return PLATFORM_RULE_FILES[platform] || 'AGENTS.md';
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

function normalizeChangeConfig(config) {
  const normalized = deepMerge({
    name: '',
    schema: DEFAULT_SCHEMA,
    createdAt: '',
    securitySensitive: false,
    securityWaiver: {
      approved: false,
      reason: ''
    }
  }, config || {});

  normalized.securitySensitive = normalized.securitySensitive === true;
  if (!normalized.securityWaiver || typeof normalized.securityWaiver !== 'object') {
    normalized.securityWaiver = { approved: false, reason: '' };
  }
  normalized.securityWaiver.approved = normalized.securityWaiver.approved === true;
  normalized.securityWaiver.reason = typeof normalized.securityWaiver.reason === 'string'
    ? normalized.securityWaiver.reason.trim()
    : '';
  if (!normalized.schema) normalized.schema = DEFAULT_SCHEMA;
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

function loadProjectConfig(cwd = process.cwd()) {
  return normalizeConfig(readYamlFile(getProjectConfigPath(cwd)));
}

function loadChangeConfig(changeDir) {
  if (!changeDir) return {};
  return normalizeChangeConfig(readYamlFile(path.join(changeDir, '.openspec.yaml')));
}

function loadResolvedConfig(options = {}) {
  const cwd = options.cwd || process.cwd();
  const homeDir = options.homeDir || process.env.HOME;
  const globalConfig = loadGlobalConfig(homeDir);
  const projectConfig = loadProjectConfig(cwd);
  const changeConfig = loadChangeConfig(options.changeDir);
  return normalizeConfig(deepMerge(deepMerge(globalConfig, projectConfig), changeConfig));
}

function writeGlobalConfig(config, homeDir = process.env.HOME) {
  const targetPath = getGlobalConfigPath(homeDir);
  ensureDir(path.dirname(targetPath));
  const content = [
    '# OpenSpec Local Skill Configuration',
    '# Managed by openspec install/update',
    '',
    stringifyYaml(normalizeConfig(config))
  ].join('\n');
  writeText(targetPath, `${content}\n`);
  return targetPath;
}

function writeProjectConfig(config, cwd = process.cwd(), force = false) {
  const targetPath = getProjectConfigPath(cwd);
  if (!force && fs.existsSync(targetPath)) return { filePath: targetPath, created: false };
  ensureDir(path.dirname(targetPath));
  const content = stringifyYaml(normalizeConfig(config));
  writeText(targetPath, `${content}\n`);
  return { filePath: targetPath, created: true };
}

function ensureProjectStructure(cwd = process.cwd()) {
  const baseDir = path.join(cwd, 'openspec');
  ensureDir(path.join(baseDir, 'changes'));
  ensureDir(path.join(baseDir, 'specs'));
  return baseDir;
}

function getRepoSkillDir() {
  return path.join(REPO_ROOT, 'skills', 'openspec');
}

module.exports = {
  deepMerge,
  readYamlFile,
  getSharedHome,
  getGlobalConfigPath,
  getProjectConfigPath,
  getRuleFileName,
  normalizeConfig,
  normalizeChangeConfig,
  loadGlobalConfig,
  loadProjectConfig,
  loadChangeConfig,
  loadResolvedConfig,
  writeGlobalConfig,
  writeProjectConfig,
  ensureProjectStructure,
  getRepoSkillDir
};
