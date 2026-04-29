const { normalizeRelativePath } = require('./path-utils');
const { createMatcher } = require('./glob-utils');

const EXPLAINABLE_DOC_PREFIXES = Object.freeze([
  'docs/'
]);

const EXPLAINABLE_CONFIG_PREFIXES = Object.freeze([
  'config/',
  'schemas/',
  'templates/'
]);

const DEFAULT_WORKFLOW_ARTIFACT_FILES = Object.freeze([
  'state.yaml',
  'context.md',
  'drift.md',
  'tasks.md'
]);

const EXPLAINABLE_BASENAMES = new Set([
  'readme.md',
  'readme-zh.md',
  'changelog.md',
  'license',
  'agents.md',
  '.gitignore',
  'package.json',
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'tsconfig.json'
]);

function normalizePathScopeEntry(value) {
  return normalizeRelativePath(value);
}

function normalizeStringArray(value) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => normalizePathScopeEntry(entry))
      .filter(Boolean);
  }
  const single = normalizePathScopeEntry(value);
  return single ? [single] : [];
}

function unique(values) {
  return Array.from(new Set(values));
}

function buildMatchers(patterns) {
  return patterns.map((pattern) => ({
    pattern,
    isMatch: createMatcher(pattern)
  }));
}

function matchesAny(filePath, matchers) {
  return matchers.some((matcher) => matcher.isMatch(filePath));
}

function isExplainableDocsOrConfigPath(filePath) {
  const normalized = normalizePathScopeEntry(filePath).toLowerCase();
  if (!normalized) return false;

  if (EXPLAINABLE_DOC_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return true;
  if (EXPLAINABLE_CONFIG_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return true;

  const baseName = normalized.split('/').pop() || normalized;
  if (EXPLAINABLE_BASENAMES.has(baseName)) return true;

  return false;
}

function resolveWorkflowArtifactBase(options = {}) {
  const base = normalizePathScopeEntry(options.workflowArtifactBase || '');
  if (base) return base.endsWith('/') ? base : `${base}/`;
  const activeChange = normalizePathScopeEntry(options.activeChange || options.changeName || '');
  return activeChange ? `.opsx/changes/${activeChange}/` : '';
}

function isAllowedWorkflowArtifactPath(filePath, options = {}) {
  const base = resolveWorkflowArtifactBase(options);
  if (!base) return false;
  const normalized = normalizePathScopeEntry(filePath);
  if (!normalized.startsWith(base)) return false;
  const relative = normalized.slice(base.length);
  const allowed = normalizeStringArray(options.workflowArtifactFiles || DEFAULT_WORKFLOW_ARTIFACT_FILES);
  return allowed.includes(relative);
}

function matchPathScope(changedFiles, options = {}) {
  const files = unique(normalizeStringArray(changedFiles));
  const allowedPaths = unique(normalizeStringArray(options.allowedPaths));
  const forbiddenPaths = unique(normalizeStringArray(options.forbiddenPaths));
  const hasAllowedScope = allowedPaths.length > 0;
  const allowedMatchers = buildMatchers(allowedPaths);
  const forbiddenMatchers = buildMatchers(forbiddenPaths);

  const result = {
    changedFiles: files,
    allowedPaths,
    forbiddenPaths,
    hasAllowedScope,
    allowedMatches: [],
    forbiddenMatches: [],
    outOfScopeMatches: [],
    explainableExtraMatches: [],
    workflowArtifactMatches: []
  };

  files.forEach((filePath) => {
    if (matchesAny(filePath, forbiddenMatchers)) {
      result.forbiddenMatches.push(filePath);
      return;
    }

    if (!hasAllowedScope || matchesAny(filePath, allowedMatchers)) {
      result.allowedMatches.push(filePath);
      return;
    }

    if (isAllowedWorkflowArtifactPath(filePath, options)) {
      result.workflowArtifactMatches.push(filePath);
      return;
    }

    if (isExplainableDocsOrConfigPath(filePath)) {
      result.explainableExtraMatches.push(filePath);
      return;
    }

    result.outOfScopeMatches.push(filePath);
  });

  result.hasForbiddenMatches = result.forbiddenMatches.length > 0;
  result.hasOutOfScopeMatches = result.outOfScopeMatches.length > 0;
  result.hasExplainableExtraMatches = result.explainableExtraMatches.length > 0;
  result.hasWorkflowArtifactMatches = result.workflowArtifactMatches.length > 0;

  return result;
}

module.exports = {
  matchPathScope
};
