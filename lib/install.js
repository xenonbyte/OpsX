const fs = require('fs');
const path = require('path');
const {
  PACKAGE_VERSION,
  REPO_ROOT,
  PLATFORM_RULE_FILES
} = require('./constants');
const {
  ensureDir,
  writeText,
  copyDir,
  removePath,
  listFiles
} = require('./fs-utils');
const {
  getSharedHome,
  getGlobalConfigPath,
  getRuleFileName,
  loadGlobalConfig,
  loadResolvedConfig,
  writeGlobalConfig,
  writeProjectConfig,
  ensureProjectStructure,
  getRepoSkillDir
} = require('./config');
const { buildPlatformBundle, validateRepositoryAssets } = require('./generator');
const { validatePhaseOneWorkflowContract, validateCheckpointContracts } = require('./workflow');
const pkg = require('../package.json');

function parsePlatforms(input) {
  return String(input || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function backupPath(sourcePath, backupRoot) {
  if (!fs.existsSync(sourcePath)) return;
  const destinationPath = path.join(backupRoot, path.basename(sourcePath));
  copyDir(sourcePath, destinationPath);
}

function getPlatformHome(platform, homeDir) {
  return path.join(homeDir, `.${platform}`);
}

function getManifestPath(homeDir, platform) {
  return path.join(getSharedHome(homeDir), 'manifests', `${platform}.manifest`);
}

function cleanupFromManifest(manifestPath) {
  if (!fs.existsSync(manifestPath)) return;
  const entries = fs.readFileSync(manifestPath, 'utf8').split('\n').filter(Boolean);
  entries.forEach((entry) => removePath(entry));
}

function collectRecordedFiles(baseDir) {
  return listFiles(baseDir).map((relativePath) => path.join(baseDir, relativePath));
}

function writeBundle(targetBaseDir, bundle, records) {
  Object.keys(bundle).sort().forEach((relativePath) => {
    const filePath = path.join(targetBaseDir, relativePath);
    writeText(filePath, `${bundle[relativePath]}\n`);
    records.push(filePath);
  });
}

function normalizeInstallBundle(platform, bundle) {
  if (platform !== 'codex') return bundle;
  return Object.keys(bundle).reduce((output, relativePath) => {
    const normalizedPath = relativePath.startsWith('prompts/') ? relativePath.slice('prompts/'.length) : relativePath;
    output[normalizedPath] = bundle[relativePath];
    return output;
  }, {});
}

function installPlatform(platform, options) {
  const homeDir = options.homeDir || process.env.HOME;
  const sharedHome = getSharedHome(homeDir);
  const platformHome = getPlatformHome(platform, homeDir);
  const manifestPath = getManifestPath(homeDir, platform);
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '-');
  const backupRoot = path.join(sharedHome, 'backups', `install-${platform}-${timestamp}`);
  const records = [];

  ensureDir(path.join(sharedHome, 'manifests'));
  ensureDir(backupRoot);

  const platformCommandsDir = platform === 'codex'
    ? path.join(platformHome, 'prompts')
    : path.join(platformHome, 'commands');
  const platformSkillDir = path.join(platformHome, 'skills', 'openspec');
  const sharedSkillDir = path.join(sharedHome, 'skills', 'openspec');
  const sharedCommandsDir = path.join(sharedHome, 'commands');

  backupPath(platformCommandsDir, backupRoot);
  backupPath(platformSkillDir, backupRoot);

  cleanupFromManifest(manifestPath);

  removePath(sharedSkillDir);
  removePath(platformSkillDir);
  ensureDir(sharedCommandsDir);

  copyDir(getRepoSkillDir(), sharedSkillDir);
  collectRecordedFiles(sharedSkillDir).forEach((filePath) => records.push(filePath));

  copyDir(getRepoSkillDir(), platformSkillDir);
  collectRecordedFiles(platformSkillDir).forEach((filePath) => records.push(filePath));

  const sharedOpenSpecPath = path.join(sharedCommandsDir, 'openspec.md');
  const sharedOpenSpecContent = fs.readFileSync(path.join(REPO_ROOT, 'commands', 'openspec.md'), 'utf8');
  writeText(sharedOpenSpecPath, sharedOpenSpecContent);
  records.push(sharedOpenSpecPath);

  const bundle = normalizeInstallBundle(platform, buildPlatformBundle(platform, options.profile));
  writeBundle(platformCommandsDir, bundle, records);

  fs.writeFileSync(manifestPath, `${records.join('\n')}\n`, 'utf8');

  const currentGlobalConfig = loadGlobalConfig(homeDir);
  const globalConfigPath = writeGlobalConfig({
    version: PACKAGE_VERSION,
    platform,
    language: options.language || currentGlobalConfig.language,
    profile: options.profile || currentGlobalConfig.profile,
    schema: options.schema || currentGlobalConfig.schema,
    ruleFile: PLATFORM_RULE_FILES[platform]
  }, homeDir);

  return {
    manifestPath,
    backupRoot,
    platformCommandsDir,
    platformSkillDir,
    globalConfigPath,
    profile: options.profile
  };
}

function install(options) {
  const platforms = parsePlatforms(options.platform || options.platforms).filter((platform) => PLATFORM_RULE_FILES[platform]);
  if (!platforms.length) {
    throw new Error('Install requires --platform <claude|codex|gemini[,...]>');
  }
  return platforms.map((platform) => installPlatform(platform, options));
}

function uninstall(options) {
  const homeDir = options.homeDir || process.env.HOME;
  const platforms = parsePlatforms(options.platform || options.platforms).filter((platform) => PLATFORM_RULE_FILES[platform]);
  if (!platforms.length) {
    throw new Error('Uninstall requires --platform <claude|codex|gemini[,...]>');
  }
  const removed = [];
  platforms.forEach((platform) => {
    const manifestPath = getManifestPath(homeDir, platform);
    if (fs.existsSync(manifestPath)) {
      cleanupFromManifest(manifestPath);
      fs.rmSync(manifestPath, { force: true });
      removed.push(platform);
    }
  });
  return removed;
}

function update(options) {
  return install(options);
}

function initProject(options) {
  const cwd = options.cwd || process.cwd();
  const config = loadResolvedConfig({ cwd, homeDir: options.homeDir || process.env.HOME });
  ensureProjectStructure(cwd);
  const result = writeProjectConfig({
    schema: options.schema || config.schema,
    language: options.language || config.language,
    profile: options.profile || config.profile,
    context: options.context || 'Project context goes here.',
    rules: {
      proposal: 'Include scope, impact, and platform compatibility.',
      design: 'Call out runtime boundaries and migration strategy.',
      tasks: 'Keep tasks implementation-first, dependency-ordered, and grouped into top-level milestones.'
    }
  }, cwd, Boolean(options.force));

  const platform = options.platform || config.platform || 'codex';
  const ruleFilePath = path.join(cwd, getRuleFileName(platform));
  if (!fs.existsSync(ruleFilePath) || options.force) {
    writeText(ruleFilePath, [
      '# OpenSpec project hand-off',
      '',
      'This repository uses OpenSpec as the workflow source of truth.',
      '- Read `openspec/config.yaml` for project context and workflow defaults.',
      '- Keep change artifacts under `openspec/changes/`.',
      '- For Codex, prefer `$openspec <request>`; for Claude/Gemini use `/openspec` or `/opsx:*`.',
      '- Keep `security-review.md` between `design.md` and `tasks.md` when required or recommended.',
      '- Run `spec checkpoint` before `tasks`, `task checkpoint` before `apply`, and `execution checkpoint` after each top-level task group.',
      '- When implementing a change, keep `proposal.md`, `specs/`, `design.md`, and `tasks.md` aligned.'
    ].join('\n') + '\n');
  }

  return {
    configFile: result.filePath,
    ruleFile: ruleFilePath,
    createdConfig: result.created
  };
}

function runCheck(options = {}) {
  const cwd = options.cwd || process.cwd();
  const homeDir = options.homeDir || process.env.HOME;
  const globalConfigPath = getGlobalConfigPath(homeDir);
  const globalConfig = fs.existsSync(globalConfigPath) ? loadGlobalConfig(homeDir) : null;
  const lines = ['## OpenSpec Installation Check', ''];

  if (globalConfig) {
    lines.push(`**Config**: ✓ Found (${globalConfigPath})`);
    lines.push(`- version: ${globalConfig.version || PACKAGE_VERSION}`);
    lines.push(`- platform: ${globalConfig.platform || 'unknown'}`);
    lines.push(`- language: ${globalConfig.language}`);
    lines.push(`- profile: ${globalConfig.profile}`);
  } else {
    lines.push(`**Config**: ✗ Not found (${globalConfigPath})`);
  }

  if (globalConfig && globalConfig.platform) {
    const manifestPath = getManifestPath(homeDir, globalConfig.platform);
    if (fs.existsSync(manifestPath)) {
      lines.push('');
      lines.push(`**Platform Files**: ✓ Manifest found (${manifestPath})`);
    } else {
      lines.push('');
      lines.push(`**Platform Files**: ✗ Manifest missing for ${globalConfig.platform}`);
    }
  }

  const projectConfigPath = path.join(cwd, 'openspec', 'config.yaml');
  lines.push('');
  lines.push(`**Workspace**: ${cwd}`);
  lines.push(fs.existsSync(projectConfigPath) ? `- ✓ ${projectConfigPath}` : `- ✗ ${projectConfigPath}`);
  ['AGENTS.md', 'CLAUDE.md', 'GEMINI.md'].forEach((fileName) => {
    if (fs.existsSync(path.join(cwd, fileName))) {
      lines.push(`- ✓ ${fileName}`);
    }
  });

  return lines.join('\n');
}

function showDoc(options = {}) {
  const homeDir = options.homeDir || process.env.HOME;
  const config = loadGlobalConfig(homeDir);
  const guideName = config.language === 'zh' ? 'GUIDE-zh.md' : 'GUIDE-en.md';
  const installedGuidePath = path.join(getSharedHome(homeDir), 'skills', 'openspec', guideName);
  const localGuidePath = path.join(getRepoSkillDir(), guideName);
  const sourcePath = fs.existsSync(installedGuidePath) ? installedGuidePath : localGuidePath;
  return fs.readFileSync(sourcePath, 'utf8');
}

function setLanguage(language, options = {}) {
  if (!['en', 'zh'].includes(language)) {
    throw new Error('Language must be en or zh.');
  }
  const homeDir = options.homeDir || process.env.HOME;
  const current = loadGlobalConfig(homeDir);
  writeGlobalConfig(Object.assign({}, current, { language }), homeDir);
  return language;
}

function validateAssets() {
  const requiredPackageFiles = [
    'bin/',
    'lib/',
    'scripts/',
    'commands/',
    'skills/',
    'schemas/',
    'templates/',
    'docs/',
    'README.md',
    'install.sh',
    'uninstall.sh'
  ];
  const packagingIssues = [];
  requiredPackageFiles.forEach((entry) => {
    if (!pkg.files.includes(entry)) packagingIssues.push(`Packaging validation: package.json files[] is missing ${entry}`);
  });
  if (!pkg.bin || pkg.bin.openspec !== 'bin/openspec.js') {
    packagingIssues.push('Packaging validation: package.json bin.openspec must point to bin/openspec.js');
  }
  ['bin/openspec.js', 'commands/openspec.md', 'schemas/spec-driven/schema.json', 'skills/openspec/SKILL.md'].forEach((relativePath) => {
    if (!fs.existsSync(path.join(REPO_ROOT, relativePath))) {
      packagingIssues.push(`Packaging validation: missing required release file ${relativePath}`);
    }
  });
  const issues = [
    ...validateRepositoryAssets('expanded'),
    ...validatePhaseOneWorkflowContract(),
    ...validateCheckpointContracts(),
    ...packagingIssues
  ];
  return issues;
}

module.exports = {
  install,
  uninstall,
  update,
  initProject,
  runCheck,
  showDoc,
  setLanguage,
  validateAssets
};
