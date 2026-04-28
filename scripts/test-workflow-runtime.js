#!/usr/bin/env node

const { createHash } = require('crypto');
const { runRegisteredTopicTests } = require('./test-workflow-shared');
const { registerTests: registerPackageTests } = require('./test-workflow-package');
const { registerTests: registerGenerationTests } = require('./test-workflow-generation');
const { registerTests: registerStateTests } = require('./test-workflow-state');
const { registerTests: registerPathTests } = require('./test-workflow-paths');
const { registerTests: registerGateTests } = require('./test-workflow-gates');
void createHash;

const TOPIC_REGISTRARS = Object.freeze([
  registerPackageTests,
  registerGenerationTests,
  registerStateTests,
  registerPathTests,
  registerGateTests
]);

function registerTests(test, helpers) {
  TOPIC_REGISTRARS.forEach((registerTopicTests) => {
    registerTopicTests(test, helpers);
  });
}

if (require.main === module) {
  runRegisteredTopicTests(registerTests);
}

module.exports = { registerTests };
