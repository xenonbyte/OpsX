const fs = require('fs');
const path = require('path');
const { normalizeConfig, readYamlFile, loadGlobalConfig, deepMerge } = require('./config');
const { readTextIfFile } = require('./fs-utils');
const { MUTATION_EVENTS, applyMutationEvent } = require('./change-state');
const { loadChangeState, writeChangeState } = require('./change-store');
const { hashTrackedArtifacts, detectArtifactHashDrift } = require('./change-artifacts');
const { runTaskCheckpoint, runExecutionCheckpoint } = require('./workflow');
const { parseTopLevelTaskGroups } = require('./runtime-guidance');
const { matchPathScope } = require('./path-scope');
const {
  toNonEmptyString,
  normalizeStringArray,
  unique,
  normalizeHeadingKey
} = require('./string-utils');
const { createFindingAdder } = require('./finding-utils');
const { resolveRepoRoot } = require('./repo-root');
const { listSpecFiles } = require('./spec-files');
const {
  evaluateImplementationConsistency,
  acceptImplementationConsistency
} = require('./implementation-consistency');
const { collectChangedFiles: collectObservedChangedFiles } = require('./changed-files');

const DRIFT_SECTION_ALIASES = Object.freeze({
  userApprovalNeeded: ['user approval needed'],
  scopeChanges: ['scope changes', 'scope changes detected'],
  discoveredRequirements: ['discovered requirements', 'requirements discovered during apply'],
  outOfScopeFiles: ['out-of-bound file changes', 'files changed outside allowed paths']
});

function toText(value) {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.filter(Boolean).join('\n');
  return '';
}

function loadChangeSources(changeDir) {
  const proposalPath = path.join(changeDir, 'proposal.md');
  const designPath = path.join(changeDir, 'design.md');
  const tasksPath = path.join(changeDir, 'tasks.md');
  const specsDir = path.join(changeDir, 'specs');
  const specTexts = listSpecFiles(specsDir).map((filePath) => fs.readFileSync(filePath, 'utf8'));
  return {
    proposal: readTextIfFile(proposalPath),
    specs: specTexts.join('\n\n'),
    design: readTextIfFile(designPath),
    tasks: readTextIfFile(tasksPath)
  };
}

function loadEffectiveRuntimeConfig(changeDir, options = {}) {
  const repoRoot = resolveRepoRoot(changeDir);
  const projectConfigPath = path.join(repoRoot, '.opsx', 'config.yaml');
  const changeConfigPath = path.join(changeDir, 'change.yaml');
  const globalConfig = loadGlobalConfig(options.homeDir);
  const projectConfig = readYamlFile(projectConfigPath);
  const changeConfig = readYamlFile(changeConfigPath);
  return {
    config: normalizeConfig(deepMerge(deepMerge(globalConfig, projectConfig), changeConfig)),
    changeConfig
  };
}

const addVerifyFinding = createFindingAdder({ defaultCode: 'verify-gate-finding' });

function resolveDriftSection(heading) {
  const normalized = normalizeHeadingKey(heading);
  if (!normalized) return '';
  if (DRIFT_SECTION_ALIASES.userApprovalNeeded.includes(normalized)) return 'userApprovalNeeded';
  if (DRIFT_SECTION_ALIASES.scopeChanges.includes(normalized)) return 'scopeChanges';
  if (DRIFT_SECTION_ALIASES.discoveredRequirements.includes(normalized)) return 'discoveredRequirements';
  if (DRIFT_SECTION_ALIASES.outOfScopeFiles.includes(normalized)) return 'outOfScopeFiles';
  return '';
}

function parseDriftSections(changeDir) {
  const driftPath = path.join(changeDir, 'drift.md');
  const sections = {
    userApprovalNeeded: [],
    scopeChanges: [],
    discoveredRequirements: [],
    outOfScopeFiles: []
  };
  const driftText = readTextIfFile(driftPath);
  if (!driftText) return sections;

  const lines = driftText.split(/\r?\n/);
  let activeSection = '';
  lines.forEach((line) => {
    if (/^##\s+/.test(line)) {
      activeSection = resolveDriftSection(line);
      return;
    }
    if (!activeSection) return;
    const bulletMatch = line.match(/^\s*-\s+(.+)$/);
    if (!bulletMatch) return;
    const text = toNonEmptyString(bulletMatch[1]);
    if (/^\[resolved\](?:\s|$)/i.test(text)) return;
    if (text) sections[activeSection].push(text);
  });
  return sections;
}

function hasManualVerification(entry = {}) {
  const command = toNonEmptyString(entry.verificationCommand).toLowerCase();
  const result = toNonEmptyString(entry.verificationResult).toLowerCase();
  return command.includes('manual') || result.includes('manual');
}

function hasManualVerificationRationale(entry = {}) {
  return Boolean(
    toNonEmptyString(entry.manualVerificationRationale)
    || toNonEmptyString(entry.manualRationale)
    || toNonEmptyString(entry.rationale)
  );
}

function evaluateVerifyGate(options = {}) {
  const changeDir = path.resolve(options.changeDir || process.cwd());
  const repoRoot = path.resolve(options.repoRoot || resolveRepoRoot(changeDir));
  const state = loadChangeState(changeDir);
  const sources = loadChangeSources(changeDir);
  const { config, changeConfig } = loadEffectiveRuntimeConfig(changeDir, options);
  const findings = [];

  const currentHashes = hashTrackedArtifacts(changeDir);
  const hashDrift = detectArtifactHashDrift(state.hashes, currentHashes);
  if (hashDrift.driftedPaths.length > 0) {
    addVerifyFinding(findings, {
      severity: 'BLOCK',
      code: 'artifact-hash-drift',
      message: 'Tracked artifact hashes are stale. Reconcile artifacts before verify acceptance.',
      patchTargets: hashDrift.driftedPaths
    });
  }

  const taskGroups = parseTopLevelTaskGroups(sources.tasks);
  if (taskGroups.some((group) => group.completed !== true)) {
    addVerifyFinding(findings, {
      severity: 'BLOCK',
      code: 'task-group-incomplete',
      message: 'All top-level task groups must be completed before verify acceptance.',
      patchTargets: ['tasks.md']
    });
  }

  const artifacts = {
    proposal: Boolean(toText(sources.proposal).trim()),
    specs: Boolean(toText(sources.specs).trim()),
    design: Boolean(toText(sources.design).trim()),
    tasks: Boolean(toText(sources.tasks).trim())
  };
  const taskCheckpoint = runTaskCheckpoint({
    schemaName: 'spec-driven',
    artifacts,
    sources,
    config,
    change: changeConfig
  });
  const strictTddBlocked = taskCheckpoint.findings.some(
    (finding) => finding.severity === 'BLOCK' && String(finding.code || '').startsWith('tdd-')
  );
  if (strictTddBlocked) {
    addVerifyFinding(findings, {
      severity: 'BLOCK',
      code: 'strict-tdd-record-missing',
      message: 'Strict TDD gate is not satisfied for at least one required task group.',
      patchTargets: ['tasks.md']
    });
  }
  const securityReviewBlocked = taskCheckpoint.findings.some(
    (finding) => finding.severity === 'BLOCK' && finding.code === 'security-review-required-task-checkpoint'
  );
  if (securityReviewBlocked) {
    addVerifyFinding(findings, {
      severity: 'BLOCK',
      code: 'security-review-required',
      message: 'Security review is required before verify acceptance.',
      patchTargets: ['security-review.md', 'tasks.md']
    });
  }

  const completedGroups = taskGroups.filter((group) => group.completed === true);
  const verificationLog = Array.isArray(state.verificationLog) ? state.verificationLog : [];
  const executionStatus = toNonEmptyString(
    state.checkpoints && state.checkpoints.execution ? state.checkpoints.execution.status : ''
  ).toUpperCase();
  if (taskGroups.length > 0 && executionStatus !== 'PASS' && executionStatus !== 'WARN') {
    addVerifyFinding(findings, {
      severity: 'BLOCK',
      code: 'execution-checkpoint-missing',
      message: 'Execution checkpoint must be accepted for completed task groups.',
      patchTargets: ['state.yaml', 'tasks.md']
    });
  }

  completedGroups.forEach((group) => {
    const entry = verificationLog.find((item) => toNonEmptyString(item && item.taskGroup) === group.title);
    if (!entry) {
      addVerifyFinding(findings, {
        severity: 'BLOCK',
        code: 'execution-checkpoint-missing',
        message: `Execution proof is missing for completed task group "${group.title}".`,
        patchTargets: ['state.yaml', 'tasks.md']
      });
      return;
    }

    const executionCheckpoint = runExecutionCheckpoint({
      schemaName: 'spec-driven',
      artifacts,
      sources,
      group: {
        title: group.title,
        text: group.text,
        completed: true
      },
      executionEvidence: {
        verificationCommand: entry.verificationCommand,
        verificationResult: entry.verificationResult,
        changedFiles: entry.changedFiles,
        completedSteps: entry.completedSteps,
        diffSummary: entry.diffSummary,
        driftStatus: entry.driftStatus,
        driftSummary: entry.driftSummary,
        implementationSummary: entry.diffSummary || ''
      }
    });
    if (executionCheckpoint.findings.some((finding) => finding.code === 'execution-proof-missing')) {
      addVerifyFinding(findings, {
        severity: 'BLOCK',
        code: 'execution-checkpoint-missing',
        message: `Execution proof fields are incomplete for "${group.title}".`,
        patchTargets: ['state.yaml', 'tasks.md']
      });
    }
  });

  const drift = parseDriftSections(changeDir);
  if (drift.userApprovalNeeded.length > 0) {
    addVerifyFinding(findings, {
      severity: 'BLOCK',
      code: 'drift-approval-pending',
      message: 'Drift ledger still has unresolved user approval items.',
      patchTargets: ['drift.md']
    });
  }
  if (drift.scopeChanges.length > 0) {
    addVerifyFinding(findings, {
      severity: 'BLOCK',
      code: 'scope-change-unresolved',
      message: 'Drift ledger reports unresolved scope changes.',
      patchTargets: ['drift.md', 'proposal.md', 'design.md', 'tasks.md']
    });
  }
  if (drift.discoveredRequirements.length > 0) {
    addVerifyFinding(findings, {
      severity: 'BLOCK',
      code: 'discovered-requirement-unresolved',
      message: 'Drift ledger reports discovered requirements that are not reconciled.',
      patchTargets: ['drift.md', 'proposal.md', 'specs']
    });
  }

  const changed = collectObservedChangedFiles(options, state, repoRoot);
  const changedFiles = changed.files;
  changed.findings.forEach((finding) => addVerifyFinding(findings, finding));
  changed.warnings.forEach((warning) => {
    addVerifyFinding(findings, {
      severity: 'WARN',
      code: 'git-diff-unavailable',
      message: warning,
      patchTargets: ['state.yaml']
    });
  });
  const pathScope = matchPathScope(changedFiles, {
    allowedPaths: state.allowedPaths,
    forbiddenPaths: state.forbiddenPaths,
    activeChange: state.change || path.basename(changeDir)
  });
  if (pathScope.forbiddenMatches.length > 0) {
    addVerifyFinding(findings, {
      severity: 'BLOCK',
      code: 'forbidden-path-change',
      message: 'Changed files match forbidden path scope.',
      patchTargets: pathScope.forbiddenMatches
    });
  }
  if (pathScope.outOfScopeMatches.length > 0 || drift.outOfScopeFiles.length > 0) {
    addVerifyFinding(findings, {
      severity: 'BLOCK',
      code: 'out-of-scope-change',
      message: 'Changed files exceed approved allowed path scope.',
      patchTargets: [...pathScope.outOfScopeMatches, 'drift.md']
    });
  } else if (pathScope.explainableExtraMatches.length > 0) {
    addVerifyFinding(findings, {
      severity: 'WARN',
      code: 'out-of-scope-change',
      message: 'Only explainable docs/config extra files changed outside allowed path scope.',
      patchTargets: pathScope.explainableExtraMatches
    });
  }

  const manualEntry = verificationLog.find((entry) => hasManualVerification(entry));
  if (manualEntry && !hasManualVerificationRationale(manualEntry)) {
    addVerifyFinding(findings, {
      severity: 'WARN',
      code: 'manual-verification-rationale-missing',
      message: 'Manual verification is recorded without a rationale in execution evidence.',
      patchTargets: ['tasks.md', 'state.yaml']
    });
  }

  let implementationConsistency = null;
  if (state.stage === 'IMPLEMENTED') {
    implementationConsistency = evaluateImplementationConsistency({
      changeDir,
      repoRoot,
      changedFiles
    });
    implementationConsistency.findings.forEach((finding) => addVerifyFinding(findings, finding));
  }

  const status = findings.some((finding) => finding.severity === 'BLOCK')
    ? 'BLOCK'
    : (findings.length > 0 ? 'WARN' : 'PASS');
  const patchTargets = unique(findings.flatMap((finding) => finding.patchTargets));

  return {
    status,
    findings,
    patchTargets,
    nextAction: status === 'BLOCK'
      ? 'Resolve blocking findings before verify acceptance.'
      : (status === 'WARN' ? 'Review warnings before accepting verify gate.' : 'Ready to accept verify gate.'),
    pathScope,
    hashDrift,
    implementationConsistency
  };
}

function hasBlockingFindings(result) {
  const normalizedResult = result && typeof result === 'object' ? result : {};
  const findings = Array.isArray(normalizedResult.findings) ? normalizedResult.findings : [];
  return normalizedResult.status === 'BLOCK'
    || findings.some((finding) => String(finding && finding.severity).toUpperCase() === 'BLOCK');
}

function collectWarningMessages(results) {
  return results
    .flatMap((result) => {
      const findings = result && Array.isArray(result.findings) ? result.findings : [];
      return findings;
    })
    .filter((finding) => String(finding && finding.severity).toUpperCase() === 'WARN')
    .map((finding) => toNonEmptyString(finding.message))
    .filter(Boolean);
}

function acceptVerifyGate(changeDir, gateResult = {}) {
  const normalizedResult = gateResult && typeof gateResult === 'object' ? gateResult : {};
  const findings = Array.isArray(normalizedResult.findings) ? normalizedResult.findings : [];
  const hasBlock = normalizedResult.status === 'BLOCK'
    || findings.some((finding) => String(finding && finding.severity).toUpperCase() === 'BLOCK');
  if (hasBlock) {
    throw new Error('Cannot accept verify gate while blocking findings remain.');
  }

  const resolvedChangeDir = path.resolve(changeDir);
  let state = loadChangeState(resolvedChangeDir);
  let implementationConsistency = null;
  if (state.stage === 'IMPLEMENTED') {
    implementationConsistency = evaluateImplementationConsistency({
      changeDir: resolvedChangeDir
    });
    if (hasBlockingFindings(implementationConsistency)) {
      throw new Error('Cannot accept implementation consistency checkpoint while blocking findings remain.');
    }
    acceptImplementationConsistency(resolvedChangeDir, implementationConsistency);
    state = loadChangeState(resolvedChangeDir);
  }
  const transition = applyMutationEvent(state, {
    type: MUTATION_EVENTS.VERIFY_ACCEPTED,
    patchTargets: normalizedResult.patchTargets
  });
  if (transition.status !== 'OK') {
    throw new Error(transition.message || 'Verify acceptance transition failed.');
  }

  const refreshedHashes = hashTrackedArtifacts(resolvedChangeDir);
  const warningMessages = collectWarningMessages([normalizedResult, implementationConsistency]);

  return writeChangeState(resolvedChangeDir, Object.assign({}, transition.state, {
    nextAction: transition.nextAction,
    hashes: refreshedHashes,
    blockers: [],
    warnings: unique([
      ...normalizeStringArray(state.warnings),
      ...warningMessages
    ])
  }));
}

module.exports = {
  evaluateVerifyGate,
  acceptVerifyGate
};
