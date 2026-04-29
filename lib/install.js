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
  getLegacySharedHome,
  getLegacyGlobalConfigPath,
  loadGlobalConfig,
  writeGlobalConfig,
  getRepoSkillDir
} = require('./config');
const {
  buildActionSkillMarkdown,
  buildPlatformBundle,
  buildSharedCommandIndex
} = require('./generator');
const { getAllActions } = require('./workflow');
const { formatMessage } = require('./messages');

function parsePlatforms(input) {
  if (typeof input !== 'string') return [];
  return String(input || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function resolvePlatforms(input, action) {
  const requested = parsePlatforms(input);
  const invalid = requested.filter((platform) => !PLATFORM_RULE_FILES[platform]);
  if (!requested.length || invalid.length) {
    const invalidSuffix = invalid.length ? `; invalid: ${invalid.join(', ')}` : '';
    throw new Error(`${action} supports only --platform <claude|codex|gemini[,...]>${invalidSuffix}`);
  }
  return requested;
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

function getPlatformInstallRoots(platform, homeDir) {
  const platformHome = getPlatformHome(platform, homeDir);
  const skillRootDir = path.join(platformHome, 'skills');
  const actionSkillDirs = getAllActions().map((action) => path.join(skillRootDir, `opsx-${action.id}`));
  return {
    commandsDir: platform === 'codex'
      ? path.join(platformHome, 'prompts')
      : path.join(platformHome, 'commands'),
    skillRootDir,
    legacySkillDir: path.join(skillRootDir, 'opsx'),
    actionSkillDirs
  };
}

function getAllowedInstallRoots(installRoots) {
  return [
    installRoots.commandsDir,
    installRoots.legacySkillDir,
    ...installRoots.actionSkillDirs
  ];
}

function isWithinRoot(rootPath, targetPath) {
  const relativePath = path.relative(path.resolve(rootPath), path.resolve(targetPath));
  return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}

function assertManifestEntryIsAllowed(entry, allowedRoots) {
  if (!path.isAbsolute(entry) || !allowedRoots.some((rootPath) => isWithinRoot(rootPath, entry))) {
    throw new Error(`Refusing to remove path outside OpsX install roots: ${entry}`);
  }
}

function listInstalledManifestPlatforms(homeDir) {
  const manifestDir = path.join(getSharedHome(homeDir), 'manifests');
  if (!fs.existsSync(manifestDir)) return [];
  return fs.readdirSync(manifestDir)
    .filter((entry) => entry.endsWith('.manifest'))
    .map((entry) => entry.replace(/\.manifest$/, ''))
    .filter((platform) => PLATFORM_RULE_FILES[platform])
    .sort();
}

function cleanupFromManifest(manifestPath, allowedRoots) {
  if (!fs.existsSync(manifestPath)) return;
  if (!Array.isArray(allowedRoots) || !allowedRoots.length) {
    throw new Error('Manifest cleanup requires OpsX install roots.');
  }
  const entries = fs.readFileSync(manifestPath, 'utf8').split('\n').filter((entry) => entry.trim());
  entries.forEach((entry) => assertManifestEntryIsAllowed(entry, allowedRoots));
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

function removeMatchingFiles(directoryPath, matcher) {
  if (!fs.existsSync(directoryPath)) return;
  fs.readdirSync(directoryPath, { withFileTypes: true }).forEach((entry) => {
    if (!entry.isFile() || !matcher(entry.name)) return;
    removePath(path.join(directoryPath, entry.name));
  });
}

function cleanupLegacyRouteFiles(platform, commandsDir) {
  if (platform === 'claude') {
    removePath(path.join(commandsDir, 'opsx'));
    removePath(path.join(commandsDir, 'opsx.md'));
    return;
  }
  if (platform === 'gemini') {
    removePath(path.join(commandsDir, 'opsx'));
    removePath(path.join(commandsDir, 'opsx.toml'));
    return;
  }
  if (platform === 'codex') {
    removeMatchingFiles(commandsDir, (fileName) => /^opsx(?:-|\.md$)/.test(fileName));
  }
}

function writeActionSkill(targetSkillDir, action, platform, records) {
  copyDir(getRepoSkillDir(), targetSkillDir);
  writeText(path.join(targetSkillDir, 'SKILL.md'), `${buildActionSkillMarkdown(platform, action)}\n`);
  collectRecordedFiles(targetSkillDir).forEach((filePath) => records.push(filePath));
}

function writeActionSkills(skillRootDir, platform, records) {
  getAllActions().forEach((action) => {
    writeActionSkill(path.join(skillRootDir, `opsx-${action.id}`), action, platform, records);
  });
}

function installPlatform(platform, options) {
  const homeDir = options.homeDir || process.env.HOME;
  const sharedHome = getSharedHome(homeDir);
  const manifestPath = getManifestPath(homeDir, platform);
  const installRoots = getPlatformInstallRoots(platform, homeDir);
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '-');
  const backupRoot = path.join(sharedHome, 'backups', `install-${platform}-${timestamp}`);
  const records = [];

  ensureDir(path.join(sharedHome, 'manifests'));
  ensureDir(backupRoot);

  const platformCommandsDir = installRoots.commandsDir;
  const platformSkillRootDir = installRoots.skillRootDir;
  const legacyPlatformSkillDir = installRoots.legacySkillDir;
  const sharedSkillDir = path.join(sharedHome, 'skills', 'opsx');
  const sharedCommandsDir = path.join(sharedHome, 'commands');

  backupPath(platformCommandsDir, backupRoot);
  backupPath(legacyPlatformSkillDir, backupRoot);
  installRoots.actionSkillDirs.forEach((skillDir) => backupPath(skillDir, backupRoot));

  cleanupFromManifest(manifestPath, getAllowedInstallRoots(installRoots));

  removePath(sharedSkillDir);
  removePath(legacyPlatformSkillDir);
  installRoots.actionSkillDirs.forEach((skillDir) => removePath(skillDir));
  cleanupLegacyRouteFiles(platform, platformCommandsDir);
  ensureDir(sharedCommandsDir);

  copyDir(getRepoSkillDir(), sharedSkillDir);

  const sharedOpsxPath = path.join(sharedCommandsDir, 'opsx.md');
  writeText(sharedOpsxPath, `${buildSharedCommandIndex()}\n`);

  if (platform === 'codex') {
    ensureDir(platformSkillRootDir);
    writeActionSkills(platformSkillRootDir, 'codex', records);
  } else {
    const bundle = buildPlatformBundle(platform);
    writeBundle(platformCommandsDir, bundle, records);
  }

  fs.writeFileSync(manifestPath, `${records.join('\n')}\n`, 'utf8');

  const currentGlobalConfig = loadGlobalConfig(homeDir);
  const globalConfigPath = writeGlobalConfig({
    version: PACKAGE_VERSION,
    platform,
    language: options.language || currentGlobalConfig.language,
    schema: options.schema || currentGlobalConfig.schema,
    ruleFile: PLATFORM_RULE_FILES[platform]
  }, homeDir);

  return {
    platform,
    manifestPath,
    backupRoot,
    platformCommandsDir,
    platformSkillRootDir,
    platformActionSkillDirs: installRoots.actionSkillDirs,
    legacyPlatformSkillDir,
    globalConfigPath
  };
}

function install(options) {
  const platforms = resolvePlatforms(options.platform || options.platforms, 'Install');
  return platforms.map((platform) => installPlatform(platform, options));
}

function uninstall(options) {
  const homeDir = options.homeDir || process.env.HOME;
  const platforms = resolvePlatforms(options.platform || options.platforms, 'Uninstall');
  const removed = [];
  platforms.forEach((platform) => {
    const manifestPath = getManifestPath(homeDir, platform);
    if (fs.existsSync(manifestPath)) {
      cleanupFromManifest(manifestPath, getAllowedInstallRoots(getPlatformInstallRoots(platform, homeDir)));
      fs.rmSync(manifestPath, { force: true });
      removed.push(platform);
    }
  });
  if (removed.length && listInstalledManifestPlatforms(homeDir).length === 0) {
    removePath(path.join(getSharedHome(homeDir), 'skills', 'opsx'));
    removePath(path.join(getSharedHome(homeDir), 'commands', 'opsx.md'));
  }
  return removed;
}

function runCheck(options = {}) {
  const cwd = options.cwd || process.cwd();
  const homeDir = options.homeDir || process.env.HOME;
  const globalConfigPath = getGlobalConfigPath(homeDir);
  const legacySharedHome = getLegacySharedHome(homeDir);
  const legacyGlobalConfigPath = getLegacyGlobalConfigPath(homeDir);
  const globalConfig = fs.existsSync(globalConfigPath) ? loadGlobalConfig(homeDir) : null;
  const projectConfigPath = path.join(cwd, '.opsx', 'config.yaml');
  const legacyProjectConfigPath = path.join(cwd, 'openspec', 'config.yaml');
  const hasLegacySharedHome = fs.existsSync(legacySharedHome) || fs.existsSync(legacyGlobalConfigPath);
  const hasLegacyProjectConfig = fs.existsSync(legacyProjectConfigPath);
  const hasLegacyCandidate = hasLegacySharedHome || hasLegacyProjectConfig;
  const lines = ['## OpsX Installation Check', ''];

  if (globalConfig) {
    lines.push(`**Config**: ✓ Found (${globalConfigPath})`);
    lines.push(`- version: ${globalConfig.version || PACKAGE_VERSION}`);
    lines.push(`- platform: ${globalConfig.platform || 'unknown'} (last selected)`);
    lines.push(`- language: ${globalConfig.language}`);
  } else {
    lines.push(`**Config**: ✗ Not found (${globalConfigPath})`);
  }

  const installedPlatforms = listInstalledManifestPlatforms(homeDir);
  lines.push('');
  if (installedPlatforms.length) {
    lines.push(`**Platform Files**: ✓ Found ${installedPlatforms.length} manifest(s)`);
    installedPlatforms.forEach((platform) => {
      lines.push(`- ✓ ${platform}: ${getManifestPath(homeDir, platform)}`);
    });
  } else {
    lines.push('**Platform Files**: ✗ No platform manifests found');
  }
  if (globalConfig && globalConfig.platform && !installedPlatforms.includes(globalConfig.platform)) {
    lines.push(`- ℹ configured platform \`${globalConfig.platform}\` is not currently installed`);
  }

  lines.push('');
  lines.push(`**Workspace**: ${cwd}`);
  lines.push(
    fs.existsSync(projectConfigPath)
      ? `- canonical project config: found (${projectConfigPath})`
      : `- canonical project config: not found (${projectConfigPath})`
  );
  if (hasLegacySharedHome) {
    lines.push(`- legacy shared-home candidate: found (${legacySharedHome})`);
    if (fs.existsSync(legacyGlobalConfigPath)) {
      lines.push(`- legacy shared-home config candidate: found (${legacyGlobalConfigPath})`);
    }
  }
  if (hasLegacyProjectConfig) {
    lines.push(`- legacy project config candidate: found (${legacyProjectConfigPath})`);
  }
  if (hasLegacyCandidate) {
    lines.push('- Run `opsx migrate --dry-run` to preview migration.');
  }
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
  const guideName = formatMessage('doc.guideName', config.language);
  const localGuidePath = path.join(getRepoSkillDir(), guideName);
  const installedGuidePath = path.join(getSharedHome(homeDir), 'skills', 'opsx', guideName);
  const sourcePath = fs.existsSync(localGuidePath) ? localGuidePath : installedGuidePath;
  return fs.readFileSync(sourcePath, 'utf8');
}

function setLanguage(language, options = {}) {
  if (!['en', 'zh'].includes(language)) {
    throw new Error(formatMessage('language.invalid', options.language));
  }
  const homeDir = options.homeDir || process.env.HOME;
  const current = loadGlobalConfig(homeDir);
  writeGlobalConfig(Object.assign({}, current, { language }), homeDir);
  return language;
}

module.exports = {
  install,
  uninstall,
  runCheck,
  showDoc,
  setLanguage
};
