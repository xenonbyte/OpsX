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
  loadGlobalConfig,
  writeGlobalConfig,
  getRepoSkillDir
} = require('./config');
const { buildPlatformBundle } = require('./generator');

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

  const bundle = normalizeInstallBundle(platform, buildPlatformBundle(platform));
  writeBundle(platformCommandsDir, bundle, records);

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
    manifestPath,
    backupRoot,
    platformCommandsDir,
    platformSkillDir,
    globalConfigPath
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
  lines.push(
    fs.existsSync(projectConfigPath)
      ? `- optional project config: found (${projectConfigPath})`
      : `- optional project config: not found (${projectConfigPath})`
  );
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

module.exports = {
  install,
  uninstall,
  runCheck,
  showDoc,
  setLanguage
};
