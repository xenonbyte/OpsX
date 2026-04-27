#!/usr/bin/env node
const { PACKAGE_VERSION } = require('../lib/constants');

console.log(`
OpsX v${PACKAGE_VERSION} installed successfully.

Next steps:
1. Install assets for one or more tools:
   opsx install --platform claude,codex,gemini

2. For Codex, use explicit routes:
   $opsx-onboard
   $opsx-propose
   $opsx-status
   $opsx-apply

3. Check command help:
   opsx --help

Documentation:
- README.md
- docs/commands.md
- docs/codex.md
- docs/customization.md
`);
