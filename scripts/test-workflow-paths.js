#!/usr/bin/env node

const { runRegisteredTopicTests } = require('./test-workflow-shared');

function registerTests(test, helpers) {
  void test;
  void helpers;
}

if (require.main === module) {
  runRegisteredTopicTests(registerTests);
}

module.exports = { registerTests };
