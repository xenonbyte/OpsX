const YAML = require('yaml');

function assertNoUndefined(value, path = 'value') {
  if (value === undefined) {
    throw new Error(`Cannot stringify undefined YAML ${path}.`);
  }
  if (!value || typeof value !== 'object') return;

  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoUndefined(entry, `${path}[${index}]`));
    return;
  }

  Object.keys(value).forEach((key) => {
    assertNoUndefined(value[key], `${path}.${key}`);
  });
}

function parseYaml(text) {
  const parsed = YAML.parse(String(text || ''));
  return parsed === null || parsed === undefined ? {} : parsed;
}

function stringifyYaml(value) {
  assertNoUndefined(value);
  return YAML.stringify(value).trimEnd();
}

module.exports = {
  parseYaml,
  stringifyYaml
};
