const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { listSpecFiles } = require('./spec-files');
const {
  normalizeRelativePath,
  realpathIfExists,
  toPosixPath
} = require('./path-utils');
const {
  toNonEmptyString,
  normalizeStringArray,
  unique
} = require('./string-utils');

function normalizeChangedFilePath(value) {
  return normalizeRelativePath(value);
}

function normalizePathArray(value) {
  return normalizeStringArray(value)
    .map((entry) => normalizeChangedFilePath(entry))
    .filter(Boolean);
}

function runGit(repoRoot, args) {
  const result = spawnSync('git', args, {
    cwd: path.resolve(repoRoot || process.cwd()),
    encoding: 'utf8'
  });
  if (result.error && result.error.code === 'ENOENT') {
    return {
      ok: false,
      stdout: '',
      error: 'Git executable was not found on PATH; changed-file detection cannot inspect the working tree.'
    };
  }
  if (result.status !== 0) {
    const executionError = result.error && result.error.message ? result.error.message : '';
    return {
      ok: false,
      stdout: '',
      error: toNonEmptyString(result.stderr)
        || toNonEmptyString(result.stdout)
        || toNonEmptyString(executionError)
        || `git ${args.join(' ')} failed`
    };
  }
  return {
    ok: true,
    stdout: result.stdout || '',
    error: ''
  };
}

function splitGitOutput(stdout) {
  return String(stdout || '')
    .split(/\r?\n/)
    .map((line) => toNonEmptyString(line))
    .filter(Boolean);
}

function isNotGitRepositoryError(errorText) {
  return /\bnot a git repository\b/i.test(String(errorText || ''));
}

function resolveGitWorkspace(repoRoot) {
  const resolvedRepoRoot = realpathIfExists(repoRoot || process.cwd());
  const probe = runGit(resolvedRepoRoot, ['rev-parse', '--is-inside-work-tree']);
  if (!probe.ok) {
    if (isNotGitRepositoryError(probe.error)) {
      return {
        ok: false,
        isGitRepo: false,
        repoRoot: resolvedRepoRoot,
        gitRoot: '',
        pathspec: '',
        error: ''
      };
    }
    return {
      ok: false,
      isGitRepo: true,
      repoRoot: resolvedRepoRoot,
      gitRoot: '',
      pathspec: '',
      error: probe.error || 'Unable to probe git workspace.'
    };
  }

  const insideWorkTree = toNonEmptyString(probe.stdout);
  if (insideWorkTree !== 'true') {
    return {
      ok: false,
      isGitRepo: true,
      repoRoot: resolvedRepoRoot,
      gitRoot: '',
      pathspec: '',
      error: `git rev-parse --is-inside-work-tree returned "${insideWorkTree || 'empty'}".`
    };
  }

  const topLevel = runGit(resolvedRepoRoot, ['rev-parse', '--show-toplevel']);
  if (!topLevel.ok) {
    return {
      ok: false,
      isGitRepo: true,
      repoRoot: resolvedRepoRoot,
      gitRoot: '',
      pathspec: '',
      error: topLevel.error
    };
  }

  const gitRoot = realpathIfExists(toNonEmptyString(topLevel.stdout));
  const relativeRoot = normalizeChangedFilePath(path.relative(gitRoot, resolvedRepoRoot));
  if (relativeRoot.startsWith('..') || path.isAbsolute(relativeRoot)) {
    return {
      ok: false,
      isGitRepo: true,
      repoRoot: resolvedRepoRoot,
      gitRoot,
      pathspec: '',
      error: `Workspace root is outside git root: ${resolvedRepoRoot}`
    };
  }

  return {
    ok: true,
    isGitRepo: true,
    repoRoot: resolvedRepoRoot,
    gitRoot,
    pathspec: relativeRoot || '.',
    relativeRoot
  };
}

function toWorkspaceRelativePath(filePath, workspace) {
  const normalized = normalizeChangedFilePath(filePath);
  const relativeRoot = normalizeChangedFilePath(workspace && workspace.relativeRoot ? workspace.relativeRoot : '');
  if (!relativeRoot) return normalized;
  const prefix = relativeRoot.endsWith('/') ? relativeRoot : `${relativeRoot}/`;
  if (!normalized.startsWith(prefix)) return '';
  return normalizeChangedFilePath(normalized.slice(prefix.length));
}

function collectGitChangedFiles(repoRoot) {
  const workspace = resolveGitWorkspace(repoRoot);
  if (!workspace.isGitRepo) {
    return {
      ok: false,
      isGitRepo: false,
      files: [],
      warnings: []
    };
  }
  if (!workspace.ok) {
    return {
      ok: false,
      isGitRepo: true,
      files: [],
      warnings: workspace.error ? [`Unable to collect git changed files: ${workspace.error}`] : []
    };
  }

  const commands = [
    ['diff', '--name-only', '--', workspace.pathspec],
    ['diff', '--cached', '--name-only', '--', workspace.pathspec],
    ['ls-files', '--others', '--exclude-standard', '--', workspace.pathspec]
  ];
  const files = [];
  const errors = [];

  commands.forEach((args) => {
    const result = runGit(workspace.gitRoot, args);
    if (result.ok) {
      files.push(...splitGitOutput(result.stdout)
        .map((filePath) => toWorkspaceRelativePath(filePath, workspace))
        .filter(Boolean));
      return;
    }
    errors.push(result.error);
  });

  return {
    ok: errors.length === 0,
    isGitRepo: true,
    files: unique(files.map(normalizeChangedFilePath)).sort((left, right) => left.localeCompare(right)),
    warnings: errors.length ? [`Unable to collect git changed files: ${errors[0]}`] : []
  };
}

function collectLoggedChangedFiles(state = {}) {
  const verificationLog = Array.isArray(state.verificationLog) ? state.verificationLog : [];
  return verificationLog.flatMap((entry) => normalizePathArray(entry && entry.changedFiles));
}

const DEFAULT_WORKFLOW_ARTIFACT_FILES = Object.freeze([
  'state.yaml',
  'context.md',
  'drift.md',
  'tasks.md'
]);

function normalizeWorkflowBase(options = {}, state = {}) {
  const explicitBase = normalizeChangedFilePath(options.workflowArtifactBase || '');
  if (explicitBase) return explicitBase.endsWith('/') ? explicitBase : `${explicitBase}/`;
  const activeChange = normalizeChangedFilePath(
    options.activeChange
    || options.changeName
    || state.change
    || ''
  );
  return activeChange ? `.opsx/changes/${activeChange}/` : '';
}

function isWorkflowArtifactPath(filePath, options = {}, state = {}) {
  const base = normalizeWorkflowBase(options, state);
  if (!base) return false;
  const normalized = normalizeChangedFilePath(filePath);
  if (!normalized.startsWith(base)) return false;
  const relative = normalizeChangedFilePath(normalized.slice(base.length));
  const workflowFiles = normalizePathArray(options.workflowArtifactFiles || DEFAULT_WORKFLOW_ARTIFACT_FILES);
  return workflowFiles.includes(relative);
}

function isAcceptedSyncStage(state = {}) {
  return toNonEmptyString(state.stage).toUpperCase() === 'SYNCED';
}

function collectChangeSpecCanonicalOutputs(options = {}) {
  const changeDir = path.resolve(options.changeDir || process.cwd());
  const specsDir = path.join(changeDir, 'specs');
  return listSpecFiles(specsDir).map((specPath) => {
    const relativePath = normalizeChangedFilePath(path.relative(specsDir, specPath));
    return relativePath ? `.opsx/specs/${relativePath}` : '';
  }).filter(Boolean);
}

function collectAcceptedSyncOutputFiles(options = {}, state = {}) {
  if (!isAcceptedSyncStage(state)) return [];
  const recordedOutputs = normalizePathArray(state.sync && state.sync.canonicalOutputs);
  return unique([
    ...recordedOutputs,
    ...collectChangeSpecCanonicalOutputs(options)
  ]);
}

function collectChangedFiles(options = {}, state = {}, repoRoot) {
  const explicitFiles = normalizePathArray(options.changedFiles);
  const verificationLog = Array.isArray(state.verificationLog) ? state.verificationLog : [];
  const loggedFiles = collectLoggedChangedFiles(state);
  const git = collectGitChangedFiles(repoRoot);
  const files = unique([...explicitFiles, ...loggedFiles, ...git.files])
    .sort((left, right) => left.localeCompare(right));
  const findings = [];

  if (git.ok && git.isGitRepo && verificationLog.length > 0) {
    const evidenceSet = new Set([...explicitFiles, ...loggedFiles]);
    const acceptedSyncOutputSet = new Set(collectAcceptedSyncOutputFiles(options, state));
    const unloggedGitFiles = git.files
      .filter((filePath) => !isWorkflowArtifactPath(filePath, options, state))
      .filter((filePath) => !acceptedSyncOutputSet.has(filePath))
      .filter((filePath) => !evidenceSet.has(filePath));
    if (unloggedGitFiles.length) {
      findings.push({
        severity: 'BLOCK',
        code: 'unlogged-git-changes',
        message: 'Git diff contains changed files not recorded in verificationLog.',
        patchTargets: unloggedGitFiles
      });
    }
  }

  const sources = [];
  if (explicitFiles.length) sources.push('options');
  if (loggedFiles.length) sources.push('verificationLog');
  if (git.ok && git.isGitRepo) sources.push('git');

  return {
    files,
    warnings: git.warnings.slice(),
    findings,
    source: sources.length ? sources.join('+') : 'none',
    explicitFiles: unique(explicitFiles),
    loggedFiles: unique(loggedFiles),
    git
  };
}

module.exports = {
  collectChangedFiles,
  collectGitChangedFiles,
  normalizeStringArray,
  toPosixPath,
  unique
};
