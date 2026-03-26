#!/usr/bin/env node

console.log(`
OpenSpec v1.3.1 installed successfully.

Next steps:
1. Initialize your project:
   openspec init --platform codex --profile core

2. Install assets for one or more tools:
   openspec install --platform claude,codex,gemini --profile core

3. For Codex, prefer:
   $openspec help me start an OpenSpec workflow

Documentation:
- README.md
- docs/commands.md
- docs/codex.md
- docs/customization.md
`);
