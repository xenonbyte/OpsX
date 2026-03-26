#!/usr/bin/env node

const { validateAssets } = require('../lib/install');

const issues = validateAssets();
if (issues.length) {
  issues.forEach((issue) => console.error(issue));
  process.exit(1);
}
console.log('Generated assets, workflow contracts, and packaging metadata are in sync.');
