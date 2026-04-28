const fs = require('fs');
const path = require('path');
const { normalizeConfig, readYamlFile } = require('./config');
const { MUTATION_EVENTS, applyMutationEvent } = require('./change-state');
const { loadChangeState, writeChangeState } = require('./change-store');
const { hashTrackedArtifacts, detectArtifactHashDrift } = require('./change-artifacts');
const { runTaskCheckpoint, runExecutionCheckpoint } = require('./workflow');
const { parseTopLevelTaskGroups } = require('./runtime-guidance');
const { matchPathScope } = require('./path-scope');

const DRIFT_SECTION_ALIASES = Object.freeze({
  userApprovalNeeded: ['user approval needed', 'user approval needed'],
  scopeChanges: ['scope changes', 'scope changes detected'],
  discoveredRequirements: ['discovered requirements', 'requirements discovered during apply'],
  outOfScopeFiles: ['out-of-bound file changes', 'files changed outside allowed paths']
});

function toText(value) {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.filter(Boolean).join('\n');
  return '';
}

function toNonEmptyString(value) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function normalizeStringArray(value) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => toNonEmptyString(String(entry || '')))
      .filter(Boolean);
  }
  const single = toNonEmptyString(String(value || ''));
  return single ? [single] : [];
}

function unique(values) {
  return Array.from(new Set(values));
}

function toPosixPath(value) {
  return String(value || '').replace(/\\/g, '/');
}

function listSpecFiles(specsDir) {
  if (!fs.existsSync(specsDir) || !fs.statSync(specsDir).isDirectory()) return [];
  const files = [];
  const stack = [specsDir];
  while (stack.length > 0) {
    const currentDir = stack.pop();
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    entries.forEach((entry) => {
      const absolutePath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        stack.push(absolutePath);
        return;
      }
      if (!entry.isFile()) return;
      const relativePath = toPosixPath(path.relative(specsDir, absolutePath));
      if (/^.+\/spec\.md$/i.test(relativePath)) {
        files.push(absolutePath);
      }
    });
  }
  return files.sort((left, right) => left.localeCompare(right));
}

function loadChangeSources(changeDir) {
  const proposalPath = path.join(changeDir, 'proposal.md');
  const designPath = path.join(changeDir, 'design.md');
  const tasksPath = path.join(changeDir, 'tasks.md');
  const specsDir = path.join(changeDir, 'specs');
  const specTexts = listSpecFiles(specsDir).map((filePath) => fs.readFileSync(filePath, 'utf8'));
  return {
    proposal: fs.existsSync(proposalPath) ? fs.readFileSync(proposalPath, 'utf8') : '',
    specs: specTexts.join('\n\n'),
    design: fs.existsSync(designPath) ? fs.readFileSync(designPath, 'utf8') : '',
    tasks: fs.existsSync(tasksPath) ? fs.readFileSync(tasksPath, 'utf8') : ''
  };
}

function resolveRepoRoot(changeDir) {
  const resolved = path.resolve(changeDir);
  const changesDir = path.dirname(resolved);
  const opsxDir = path.dirname(changesDir);
  if (path.basename(changesDir) !== 'changes' || path.basename(opsxDir) !== '.opsx') {
    return path.dirname(path.dirname(path.dirname(resolved)));
  }
  return path.dirname(opsxDir);
}

function loadEffectiveRuntimeConfig(changeDir) {
  const repoRoot = resolveRepoRoot(changeDir);
  const projectConfigPath = path.join(repoRoot, '.opsx', 'config.yaml');
  const changeConfigPath = path.join(changeDir, 'change.yaml');
  const projectConfig = readYamlFile(projectConfigPath);
  const changeConfig = readYamlFile(changeConfigPath);
  return {
    config: normalizeConfig(Object.assign({}, projectConfig, changeConfig)),
    changeConfig
  };
}

function severityRank(level) {
  return level === 'BLOCK' ? 2 : 1;
}

function addFinding(findings, finding) {
  const normalized = {
    severity: finding.severity === 'BLOCK' ? 'BLOCK' : 'WARN',
    code: toNonEmptyString(finding.code) || 'verify-gate-finding',
    message: toNonEmptyString(finding.message),
    patchTargets: unique(normalizeStringArray(finding.patchTargets))
  };
  const existingIndex = findings.findIndex((entry) => entry.code === normalized.code);
  if (existingIndex === -1) {
    findings.push(normalized);
    return;
  }

  const existing = findings[existingIndex];
  const nextSeverity = severityRank(normalized.severity) > severityRank(existing.severity)
    ? normalized.severity
    : existing.severity;
  findings[existingIndex] = {
    severity: nextSeverity,
    code: existing.code,
    message: normalized.message || existing.message,
    patchTargets: unique([...existing.patchTargets, ...normalized.patchTargets])
  };
}

function normalizeHeadingKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^##\s+/, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

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
  if (!fs.existsSync(driftPath)) return sections;

  const lines = fs.readFileSync(driftPath, 'utf8').split(/\r?\n/);
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
  const state = loadChangeState(changeDir);
  const sources = loadChangeSources(changeDir);
  const { config, changeConfig } = loadEffectiveRuntimeConfig(changeDir);
  const findings = [];

  const currentHashes = hashTrackedArtifacts(changeDir);
  const hashDrift = detectArtifactHashDrift(state.hashes, currentHashes);
  if (hashDrift.driftedPaths.length > 0) {
    addFinding(findings, {
      severity: 'BLOCK',
      code: 'artifact-hash-drift',
      message: 'Tracked artifact hashes are stale. Reconcile artifacts before verify acceptance.',
      patchTargets: hashDrift.driftedPaths
    });
  }

  const taskGroups = parseTopLevelTaskGroups(sources.tasks);
  if (taskGroups.some((group) => group.completed !== true)) {
    addFinding(findings, {
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
    addFinding(findings, {
      severity: 'BLOCK',
      code: 'strict-tdd-record-missing',
      message: 'Strict TDD gate is not satisfied for at least one required task group.',
      patchTargets: ['tasks.md']
    });
  }

  const completedGroups = taskGroups.filter((group) => group.completed === true);
  const verificationLog = Array.isArray(state.verificationLog) ? state.verificationLog : [];
  const executionStatus = toNonEmptyString(
    state.checkpoints && state.checkpoints.execution ? state.checkpoints.execution.status : ''
  ).toUpperCase();
  if (taskGroups.length > 0 && executionStatus !== 'PASS' && executionStatus !== 'WARN') {
    addFinding(findings, {
      severity: 'BLOCK',
      code: 'execution-checkpoint-missing',
      message: 'Execution checkpoint must be accepted for completed task groups.',
      patchTargets: ['state.yaml', 'tasks.md']
    });
  }

  completedGroups.forEach((group) => {
    const entry = verificationLog.find((item) => toNonEmptyString(item && item.taskGroup) === group.title);
    if (!entry) {
      addFinding(findings, {
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
      addFinding(findings, {
        severity: 'BLOCK',
        code: 'execution-checkpoint-missing',
        message: `Execution proof fields are incomplete for "${group.title}".`,
        patchTargets: ['state.yaml', 'tasks.md']
      });
    }
  });

  const drift = parseDriftSections(changeDir);
  if (drift.userApprovalNeeded.length > 0) {
    addFinding(findings, {
      severity: 'BLOCK',
      code: 'drift-approval-pending',
      message: 'Drift ledger still has unresolved user approval items.',
      patchTargets: ['drift.md']
    });
  }
  if (drift.scopeChanges.length > 0) {
    addFinding(findings, {
      severity: 'BLOCK',
      code: 'scope-change-unresolved',
      message: 'Drift ledger reports unresolved scope changes.',
      patchTargets: ['drift.md', 'proposal.md', 'design.md', 'tasks.md']
    });
  }
  if (drift.discoveredRequirements.length > 0) {
    addFinding(findings, {
      severity: 'BLOCK',
      code: 'discovered-requirement-unresolved',
      message: 'Drift ledger reports discovered requirements that are not reconciled.',
      patchTargets: ['drift.md', 'proposal.md', 'specs']
    });
  }

  const changedFiles = normalizeStringArray(options.changedFiles);
  const pathScope = matchPathScope(changedFiles, {
    allowedPaths: state.allowedPaths,
    forbiddenPaths: state.forbiddenPaths
  });
  if (pathScope.forbiddenMatches.length > 0) {
    addFinding(findings, {
      severity: 'BLOCK',
      code: 'forbidden-path-change',
      message: 'Changed files match forbidden path scope.',
      patchTargets: pathScope.forbiddenMatches
    });
  }
  if (pathScope.outOfScopeMatches.length > 0 || drift.outOfScopeFiles.length > 0) {
    addFinding(findings, {
      severity: 'BLOCK',
      code: 'out-of-scope-change',
      message: 'Changed files exceed approved allowed path scope.',
      patchTargets: [...pathScope.outOfScopeMatches, 'drift.md']
    });
  } else if (pathScope.explainableExtraMatches.length > 0) {
    addFinding(findings, {
      severity: 'WARN',
      code: 'out-of-scope-change',
      message: 'Only explainable docs/config extra files changed outside allowed path scope.',
      patchTargets: pathScope.explainableExtraMatches
    });
  }

  const manualEntry = verificationLog.find((entry) => hasManualVerification(entry));
  if (manualEntry && !hasManualVerificationRationale(manualEntry)) {
    addFinding(findings, {
      severity: 'WARN',
      code: 'manual-verification-rationale-missing',
      message: 'Manual verification is recorded without a rationale in execution evidence.',
      patchTargets: ['tasks.md', 'state.yaml']
    });
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
    hashDrift
  };
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
  const state = loadChangeState(resolvedChangeDir);
  const transition = applyMutationEvent(state, {
    type: MUTATION_EVENTS.VERIFY_ACCEPTED,
    patchTargets: normalizedResult.patchTargets
  });
  if (transition.status !== 'OK') {
    throw new Error(transition.message || 'Verify acceptance transition failed.');
  }

  const refreshedHashes = hashTrackedArtifacts(resolvedChangeDir);
  const warningMessages = findings
    .filter((finding) => String(finding && finding.severity).toUpperCase() === 'WARN')
    .map((finding) => toNonEmptyString(finding.message))
    .filter(Boolean);

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
