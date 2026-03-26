#!/usr/bin/env node

const { writeRepositoryAssets } = require('../lib/generator');

const written = writeRepositoryAssets('expanded');
console.log(`Generated ${written.length} assets.`);
