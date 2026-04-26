#!/usr/bin/env node

const { runCli } = require('../lib/cli');

runCli(process.argv.slice(2)).catch((error) => {
  const message = error && error.message ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
