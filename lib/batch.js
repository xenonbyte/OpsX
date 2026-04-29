const fs = require('fs');
const path = require('path');
const { buildApplyInstructions, RuntimeGuidanceError } = require('./runtime-guidance');
const { archiveChange } = require('./archive');
const {
  toNonEmptyString,
  normalizeStringArray,
  unique
} = require('./string-utils');

const CHANGE_NAME_PATTERN = /^[a-z0-9][a-z0-9-_]*$/i;

function summarizeReasons(results) {
  return results.reduce((output, entry) => {
    const reason = toNonEmptyString(entry && entry.reason);
    if (!reason) return output;
    output[reason] = (output[reason] || 0) + 1;
    return output;
  }, {});
}

function buildGlobalFailure(code, message, summary = {}) {
  return {
    status: 'BLOCK',
    code,
    message,
    summary: Object.assign({
      archived: 0,
      ready: 0,
      skipped: 0,
      blocked: 0,
      reasons: {}
    }, summary),
    results: [],
    nextAction: 'Fix global batch preconditions before retrying.'
  };
}

function buildPerChangeBlockedResult(changeName, error) {
  const code = error instanceof RuntimeGuidanceError
    ? error.code
    : 'change-evaluation-error';
  const message = error && error.message ? error.message : String(error || 'Unknown per-change failure.');
  return {
    change: changeName,
    status: 'blocked',
    reason: `${code}: ${message}`,
    findings: [{
      severity: 'BLOCK',
      code,
      message,
      patchTargets: []
    }],
    nextTaskGroup: null
  };
}

function resolveBatchPaths(repoRoot) {
  const resolvedRepoRoot = path.resolve(repoRoot || process.cwd());
  const workspaceDir = path.join(resolvedRepoRoot, '.opsx');
  const changesDir = path.join(workspaceDir, 'changes');
  if (!fs.existsSync(workspaceDir) || !fs.statSync(workspaceDir).isDirectory()) {
    return {
      ok: false,
      error: buildGlobalFailure(
        'workspace-missing',
        'Workspace is missing `.opsx/` and batch operations cannot continue safely.'
      )
    };
  }
  const configPath = path.join(workspaceDir, 'config.yaml');
  if (!fs.existsSync(configPath) || !fs.statSync(configPath).isFile()) {
    return {
      ok: false,
      error: buildGlobalFailure(
        'workspace-config-missing',
        'Workspace config `.opsx/config.yaml` is missing and batch operations cannot continue safely.'
      )
    };
  }
  if (!fs.existsSync(changesDir) || !fs.statSync(changesDir).isDirectory()) {
    return {
      ok: false,
      error: buildGlobalFailure(
        'workspace-missing',
        'Workspace changes directory `.opsx/changes/` is missing.'
      )
    };
  }
  return {
    ok: true,
    repoRoot: resolvedRepoRoot,
    workspaceDir,
    changesDir
  };
}

function validateTargetArgs(options = {}) {
  const hasChangeName = toNonEmptyString(options.changeName).length > 0;
  const hasChangeNames = Array.isArray(options.changeNames);
  if (hasChangeName && hasChangeNames) {
    return buildGlobalFailure(
      'ambiguous-target-set',
      'Specify either `changeName` or `changeNames`, but not both.'
    );
  }
  return null;
}

function ensureSafeChangeNames(changeNames) {
  const invalid = changeNames.find((changeName) => {
    if (!CHANGE_NAME_PATTERN.test(changeName)) return true;
    if (changeName.includes('/') || changeName.includes('\\') || changeName.includes('..')) return true;
    return false;
  });
  if (!invalid) return null;
  return buildGlobalFailure(
    'unsafe-target-args',
    `Unsafe change target argument: ${invalid}`
  );
}

function listWorkspaceChanges(changesDir) {
  return fs.readdirSync(changesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
}

function resolveTargetChanges(changesDir, options = {}) {
  const argFailure = validateTargetArgs(options);
  if (argFailure) {
    return {
      ok: false,
      error: argFailure
    };
  }

  const singleTarget = toNonEmptyString(options.changeName);
  const manyTargets = normalizeStringArray(options.changeNames);
  let targets = [];

  if (singleTarget) {
    targets = [singleTarget];
  } else if (manyTargets.length > 0) {
    targets = manyTargets;
  } else {
    targets = listWorkspaceChanges(changesDir);
  }

  targets = unique(targets);
  if (targets.length === 0) {
    return {
      ok: false,
      error: buildGlobalFailure(
        'ambiguous-target-set',
        'No batch targets were resolved from arguments or workspace state.'
      )
    };
  }

  const unsafeFailure = ensureSafeChangeNames(targets);
  if (unsafeFailure) {
    return {
      ok: false,
      error: unsafeFailure
    };
  }

  return {
    ok: true,
    targets
  };
}

function runBatchApply(options = {}) {
  try {
    const paths = resolveBatchPaths(options.repoRoot);
    if (!paths.ok) return paths.error;

    const resolvedTargets = resolveTargetChanges(paths.changesDir, options);
    if (!resolvedTargets.ok) return resolvedTargets.error;

    const results = [];
    resolvedTargets.targets.forEach((changeName) => {
      try {
        const applyView = buildApplyInstructions({
          repoRoot: paths.repoRoot,
          changeName
        });
        if (applyView.ready === true) {
          results.push({
            change: changeName,
            status: 'ready',
            reason: 'ready-for-apply',
            findings: applyView.checkpoint && Array.isArray(applyView.checkpoint.findings)
              ? applyView.checkpoint.findings
              : [],
            nextTaskGroup: toNonEmptyString(applyView.nextTaskGroup) || null
          });
          return;
        }

        const skipReason = normalizeStringArray(applyView.prerequisites)[0] || 'change-not-ready';
        results.push({
          change: changeName,
          status: 'skipped',
          reason: skipReason,
          findings: applyView.checkpoint && Array.isArray(applyView.checkpoint.findings)
            ? applyView.checkpoint.findings
            : [],
          nextTaskGroup: toNonEmptyString(applyView.nextTaskGroup) || null
        });
      } catch (error) {
        results.push(buildPerChangeBlockedResult(changeName, error));
      }
    });

    const summary = {
      ready: results.filter((entry) => entry.status === 'ready').length,
      skipped: results.filter((entry) => entry.status === 'skipped').length,
      blocked: results.filter((entry) => entry.status === 'blocked').length,
      reasons: summarizeReasons(results)
    };

    return {
      status: 'PASS',
      code: null,
      message: 'Batch apply readiness evaluated per change without executing task groups.',
      repoRoot: paths.repoRoot,
      targets: resolvedTargets.targets,
      summary,
      results
    };
  } catch (error) {
    return buildGlobalFailure(
      'runtime-environment-invalid',
      error && error.message ? error.message : 'Unexpected runtime environment failure.'
    );
  }
}

function toBlockedReasonFromArchive(result) {
  const findings = Array.isArray(result && result.findings) ? result.findings : [];
  const firstBlock = findings.find((finding) => String(finding && finding.severity).toUpperCase() === 'BLOCK');
  if (firstBlock) {
    return `${firstBlock.code}: ${firstBlock.message}`;
  }
  const nextAction = toNonEmptyString(result && result.nextAction);
  if (nextAction) return nextAction;
  return 'archive-blocked';
}

function runBulkArchive(options = {}) {
  try {
    const paths = resolveBatchPaths(options.repoRoot);
    if (!paths.ok) return paths.error;

    const resolvedTargets = resolveTargetChanges(paths.changesDir, options);
    if (!resolvedTargets.ok) return resolvedTargets.error;

    const results = [];
    for (const changeName of resolvedTargets.targets) {
      try {
        const changeDir = path.join(paths.changesDir, changeName);
        if (!fs.existsSync(changeDir) || !fs.statSync(changeDir).isDirectory()) {
          results.push({
            change: changeName,
            status: 'skipped',
            reason: 'change-not-found',
            findings: [],
            nextTaskGroup: null
          });
          continue;
        }

        const archiveResult = archiveChange({
          repoRoot: paths.repoRoot,
          changeDir
        });
        if (archiveResult.status === 'PASS') {
          results.push({
            change: changeName,
            status: 'archived',
            reason: 'archived',
            findings: Array.isArray(archiveResult.findings) ? archiveResult.findings : [],
            nextTaskGroup: null
          });
          continue;
        }

        results.push({
          change: changeName,
          status: 'blocked',
          reason: toBlockedReasonFromArchive(archiveResult),
          findings: Array.isArray(archiveResult.findings) ? archiveResult.findings : [],
          nextTaskGroup: null
        });
      } catch (error) {
        results.push(buildPerChangeBlockedResult(changeName, error));
      }
    }

    const summary = {
      archived: results.filter((entry) => entry.status === 'archived').length,
      skipped: results.filter((entry) => entry.status === 'skipped').length,
      blocked: results.filter((entry) => entry.status === 'blocked').length,
      reasons: summarizeReasons(results)
    };

    return {
      status: 'PASS',
      code: null,
      message: 'Bulk archive completed with isolated per-change evaluation.',
      repoRoot: paths.repoRoot,
      targets: resolvedTargets.targets,
      summary,
      results
    };
  } catch (error) {
    return buildGlobalFailure(
      'runtime-environment-invalid',
      error && error.message ? error.message : 'Unexpected runtime environment failure.'
    );
  }
}

module.exports = {
  runBatchApply,
  runBulkArchive
};
