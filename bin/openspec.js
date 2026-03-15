#!/usr/bin/env node

const { execSync, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const SCRIPT_DIR = path.resolve(__dirname, '..');
const INSTALL_SH = path.join(SCRIPT_DIR, 'install.sh');
const UNINSTALL_SH = path.join(SCRIPT_DIR, 'uninstall.sh');

function showHelp() {
  console.log(`
OpenSpec v1.0.0 - AI-native spec-driven development system

Usage:
  openspec install --platform <claude|codex|gemini> [--workspace <path>]
  openspec uninstall --platform <claude|codex|gemini>
  openspec help
  openspec version

Commands:
  install     Install OpenSpec for a specific platform
  uninstall   Uninstall OpenSpec from a specific platform
  help        Show this help message
  version     Show version number

Platforms:
  claude      Install for Claude CLI
  codex       Install for OpenAI Codex CLI
  gemini      Install for Google Gemini CLI

Examples:
  openspec install --platform claude
  openspec install --platform codex --workspace ~/my-project
  openspec uninstall --platform gemini

For more information, visit: https://github.com/xenonbyte/openspec
`);
}

function showVersion() {
  const pkg = require('../package.json');
  console.log(`OpenSpec v${pkg.version}`);
}

function runScript(scriptPath, args) {
  if (!fs.existsSync(scriptPath)) {
    console.error(`Error: Script not found: ${scriptPath}`);
    process.exit(1);
  }

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
      } else {
        console.error(`Unknown command: ${command}`);
        console.error('Run `openspec help` for usage information.');
        process.exit(1);
      }
  }
}

main();
