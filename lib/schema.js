const fs = require('fs');
const path = require('path');
const { REPO_ROOT, DEFAULT_SCHEMA } = require('./constants');

function getSchemaPath(schemaName = DEFAULT_SCHEMA) {
  return path.join(REPO_ROOT, 'schemas', schemaName, 'schema.json');
}

function loadSchema(schemaName = DEFAULT_SCHEMA) {
  const schemaPath = getSchemaPath(schemaName);
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Schema not found: ${schemaName}`);
  }
  return JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
}

module.exports = {
  getSchemaPath,
  loadSchema
};
