#!/usr/bin/env node

const { execSync, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const SCRIPT_DIR = path.resolve(__dirname, '..');
const INSTALL_SH = path.join(SCRIPT_DIR, 'install.sh');
const UNINSTALL_SH = path.join(SCRIPT_DIR, 'uninstall.sh');

function showHelp() {
  console.log(`
OpenSpec v1.1.0 - AI-native spec-driven development system

Usage:
  openspec install --platform <claude|codex|gemini[,...]>
  openspec uninstall --platform <claude|codex|gemini[,...]>
  openspec --check
  openspec --doc
  openspec --language <en|zh>
  openspec --version
  openspec --help

Commands:
  install      Install OpenSpec for one or more platforms
  uninstall    Uninstall OpenSpec from one or more platforms
  --check      Validate the current installation and workspace config
  --doc        Show the practical guide (uses current language)
  --language   Switch the output language (en | zh)
  --version    Show version and config summary
  --help       Show this help message

Platforms:
  claude       Install for Claude CLI
  codex        Install for OpenAI Codex CLI
  gemini       Install for Google Gemini CLI

Examples:
  openspec install --platform claude
  openspec install --platform claude,gemini,codex
  openspec --check
  openspec --language zh

For more information, visit: https://github.com/xenonbyte/openspec
`);
}

function showVersion() {
  const pkg = require('../package.json');
  const configPath = path.join(process.env.HOME, '.openspec', '.opsx-config.yaml');
  
  console.log(`OpenSpec v${pkg.version}`);
  
  if (fs.existsSync(configPath)) {
    try {
      const content = fs.readFileSync(configPath, 'utf8');
      console.log('--- Configuration ---');
      console.log(content.trim());
    } catch (err) {
      console.error('Error reading configuration.');
    }
  }
}

function runCheck() {
  const home = process.env.HOME;
  const configPath = path.join(home, '.openspec', '.opsx-config.yaml');
  const sharedHome = path.join(home, '.openspec');
  
  console.log('## OpenSpec Installation Check\n');
  
  // 1. Check config
  if (fs.existsSync(configPath)) {
    const content = fs.readFileSync(configPath, 'utf8');
    const versionMatch = content.match(/version:\s*["']?([^"'\n]+)["']?/);
    const platformMatch = content.match(/platform:\s*["']?([^"'\n]+)["']?/);
    const langMatch = content.match(/language:\s*["']?([^"'\n]+)["']?/);
    
    console.log(`**Config**: ✓ Found (${configPath})`);
    if (versionMatch) console.log(`  - version: ${versionMatch[1]}`);
    if (platformMatch) console.log(`  - platform: ${platformMatch[1]}`);
    if (langMatch) console.log(`  - language: ${langMatch[1]}`);
    
    // 2. Check platform files
    if (platformMatch) {
      const platform = platformMatch[1];
      const platformHome = path.join(home, `.${platform}`);
      const platformManifest = path.join(sharedHome, 'manifests', `${platform}.manifest`);
      
      if (fs.existsSync(platformManifest)) {
        console.log(`\n**Platform Files**: (${platform})`);
        console.log(`  ✓ Manifest found: ${platformManifest}`);
        
        const manifest = fs.readFileSync(platformManifest, 'utf8').split('\n');
        let allFilesFound = true;
        for (const file of manifest) {
          if (file && !fs.existsSync(file)) {
            console.log(`  ✗ Missing: ${file}`);
            allFilesFound = false;
          }
        }
        if (allFilesFound) console.log(`  ✓ All files in manifest exist.`);
      } else {
        console.log(`\n**Platform Files**: ✗ Manifest not found for ${platform}`);
      }
    }
  } else {
    console.log(`**Config**: ✗ Not found (${configPath})`);
    console.log('  → Run: openspec install --platform <platform>');
  }
  
  // 3. Check current directory
  const currentDir = process.cwd();
  const ruleFiles = ['CLAUDE.md', 'GEMINI.md', 'AGENTS.md'];
  let ruleFileFound = null;
  for (const f of ruleFiles) {
    if (fs.existsSync(path.join(currentDir, f))) {
      ruleFileFound = f;
      break;
    }
  }
  
  console.log(`\n**Workspace**: ${currentDir}`);
  if (ruleFileFound) {
    console.log(`  ✓ ${ruleFileFound} (rule file) found`);
  } else {
    console.log(`  ✗ No rule file (CLAUDE.md, GEMINI.md, AGENTS.md) found`);
  }
  
  if (fs.existsSync(path.join(currentDir, 'openspec'))) {
    console.log(`  ✓ openspec/ directory found`);
  }
}

function showDoc() {
  const home = process.env.HOME;
  const configPath = path.join(home, '.openspec', '.opsx-config.yaml');
  let lang = 'en';
  
  if (fs.existsSync(configPath)) {
    const content = fs.readFileSync(configPath, 'utf8');
    const langMatch = content.match(/language:\s*["']?([^"'\n]+)["']?/);
    if (langMatch) lang = langMatch[1];
  }
  
  const docPath = path.join(home, '.openspec', 'skills', 'openspec', `GUIDE-${lang}.md`);
  
  if (fs.existsSync(docPath)) {
    console.log(fs.readFileSync(docPath, 'utf8'));
  } else {
    // Fallback to local file if not installed
    const localDocPath = path.join(__dirname, '..', 'skills', 'openspec', `GUIDE-${lang}.md`);
    if (fs.existsSync(localDocPath)) {
      console.log(fs.readFileSync(localDocPath, 'utf8'));
    } else {
      console.error(`Error: Guide not found for language '${lang}'`);
    }
  }
}

function setLanguage(lang) {
  if (lang !== 'en' && lang !== 'zh') {
    console.error('Error: Unsupported language. Use "en" or "zh".');
    process.exit(1);
  }
  
  const configPath = path.join(process.env.HOME, '.openspec', '.opsx-config.yaml');
  if (fs.existsSync(configPath)) {
    let content = fs.readFileSync(configPath, 'utf8');
    content = content.replace(/(language:\s*["']?)([^"'\n]+)(["']?)/, `$1${lang}$3`);
    fs.writeFileSync(configPath, content);
    console.log(`Language updated to: ${lang}`);
  } else {
    console.error('Error: OpenSpec is not installed. Run "openspec install" first.');
    process.exit(1);
  }
}

function runScript(scriptPath, args) {
  if (!fs.existsSync(scriptPath)) {
    console.error(`Error: Script not found: ${scriptPath}`);
    process.exit(1);
  }

  // Ensure script is executable
  try {
    fs.chmodSync(scriptPath, '755');
  } catch (e) {}

  const result = spawnSync('bash', [scriptPath, ...args], {
    stdio: 'inherit',
    env: process.env
  });

  process.exit(result.status || 0);
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'install':
      runScript(INSTALL_SH, args.slice(1));
      break;
    case 'uninstall':
      runScript(UNINSTALL_SH, args.slice(1));
      break;
    case '--check':
      runCheck();
      break;
    case '--doc':
      showDoc();
      break;
    case '--language':
      setLanguage(args[1]);
      break;
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
    case 'version':
    case '--version':
    case '-v':
      showVersion();
      break;
    default:
      if (!command) {
        showHelp();
      } else if (command.startsWith('--')) {
        // Handle flags like --help, --version, --check if they weren't caught
        switch(command) {
           case '--help': showHelp(); break;
           case '--version': showVersion(); break;
           case '--check': runCheck(); break;
           case '--doc': showDoc(); break;
           default:
             console.error(`Unknown flag: ${command}`);
             process.exit(1);
        }
      } else {
        console.error(`Unknown command: ${command}`);
        console.error('Run `openspec help` for usage information.');
        process.exit(1);
      }
  }
}

main();
