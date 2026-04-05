#!/usr/bin/env node

console.log(`
OpenSpec v1.3.2 installed successfully.

Next steps:
1. Install assets for one or more tools:
   openspec install --platform claude,codex,gemini

2. For Codex, prefer:
   $openspec help me start an OpenSpec workflow

3. Optional: create \`openspec/config.yaml\` if you want project-local overrides.

Documentation:
- README.md
- docs/commands.md
- docs/codex.md
- docs/customization.md
`);
