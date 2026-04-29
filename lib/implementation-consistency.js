const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { parseSpecFile } = require('./spec-validator');
const { parseTopLevelTaskGroups } = require('./runtime-guidance');
const { loadChangeState, recordCheckpointResult } = require('./change-store');
const { hashTrackedArtifacts, detectArtifactHashDrift } = require('./change-artifacts');
const { matchPathScope } = require('./path-scope');

const CHECKPOINT_ID = 'implementation-consistency-checkpoint';
const ACCEPTED_CHECKPOINT_STATUSES = new Set(['PASS', 'WARN']);

function toNonEmptyString(value) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function normalizeStringArray(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => toNonEmptyString(String(entry || ''))).filter(Boolean);
  }
  const single = toNonEmptyString(String(value || ''));
  return single ? [single] : [];
}

function unique(values = []) {
  return Array.from(new Set(values.filter(Boolean)));
}

function toPosixPath(value) {
  return String(value || '').replace(/\\/g, '/');
}

function severityRank(level) {
  return level === 'BLOCK' ? 2 : 1;
}

function addFinding(findings, finding) {
  const normalized = {
    severity: finding && finding.severity === 'BLOCK' ? 'BLOCK' : 'WARN',
    code: toNonEmptyString(finding && finding.code) || 'implementation-consistency-finding',
    message: toNonEmptyString(finding && finding.message),
    patchTargets: unique(normalizeStringArray(finding && finding.patchTargets))
  };
  const existingIndex = findings.findIndex((entry) => entry.code === normalized.code && entry.message === normalized.message);
  if (existingIndex === -1) {
    findings.push(normalized);
    return;
  }
  const existing = findings[existingIndex];
  findings[existingIndex] = {
    severity: severityRank(normalized.severity) > severityRank(existing.severity) ? normalized.severity : existing.severity,
    code: existing.code,
    message: existing.message,
    patchTargets: unique([...existing.patchTargets, ...normalized.patchTargets])
  };
}

function resolveRepoRoot(changeDir) {
  const resolved = path.resolve(changeDir);
  const changesDir = path.dirname(resolved);
  const opsxDir = path.dirname(changesDir);
  if (path.basename(changesDir) === 'changes' && path.basename(opsxDir) === '.opsx') {
    return path.dirname(opsxDir);
  }
  return path.dirname(path.dirname(path.dirname(resolved)));
}

function readOptionalText(filePath) {
  return fs.existsSync(filePath) && fs.statSync(filePath).isFile()
    ? fs.readFileSync(filePath, 'utf8')
    : '';
}

function listSpecFiles(specsDir) {
  if (!fs.existsSync(specsDir) || !fs.statSync(specsDir).isDirectory()) return [];
  const files = [];
  const stack = [specsDir];
  while (stack.length) {
    const current = stack.pop();
    fs.readdirSync(current, { withFileTypes: true }).forEach((entry) => {
      const absolutePath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(absolutePath);
        return;
      }
      if (entry.isFile() && entry.name === 'spec.md') files.push(absolutePath);
    });
  }
  return files.sort((left, right) => left.localeCompare(right));
}

function loadChangeSources(changeDir) {
  const specsDir = path.join(changeDir, 'specs');
  const specFiles = listSpecFiles(specsDir).map((filePath) => {
    const relativePath = toPosixPath(path.relative(changeDir, filePath));
    const text = fs.readFileSync(filePath, 'utf8');
    return parseSpecFile(relativePath, text);
  });
  return {
    proposal: readOptionalText(path.join(changeDir, 'proposal.md')),
    design: readOptionalText(path.join(changeDir, 'design.md')),
    tasks: readOptionalText(path.join(changeDir, 'tasks.md')),
    specFiles,
    specsText: specFiles.map((specFile) => specFile.text).join('\n\n')
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

function isResolvedDriftBullet(text) {
  return /^\[resolved\](?:\s|$)/i.test(toNonEmptyString(text));
}

function parseUnresolvedDrift(changeDir) {
  const driftPath = path.join(changeDir, 'drift.md');
  const unresolved = {
    userApprovalNeeded: [],
    scopeChanges: [],
    discoveredRequirements: [],
    outOfScopeFiles: []
  };
  if (!fs.existsSync(driftPath)) return unresolved;
  const sectionByHeading = {
    'user approval needed': 'userApprovalNeeded',
    'scope changes': 'scopeChanges',
    'scope changes detected': 'scopeChanges',
    'discovered requirements': 'discoveredRequirements',
    'requirements discovered during apply': 'discoveredRequirements',
    'out-of-bound file changes': 'outOfScopeFiles',
    'files changed outside allowed paths': 'outOfScopeFiles'
  };
  let active = '';
  fs.readFileSync(driftPath, 'utf8').split(/\r?\n/).forEach((line) => {
    if (/^##\s+/.test(line)) {
      active = sectionByHeading[normalizeHeadingKey(line)] || '';
      return;
    }
    if (!active) return;
    const bullet = line.match(/^\s*-\s+(.+)$/);
    if (!bullet) return;
    const text = toNonEmptyString(bullet[1]);
    if (!text || isResolvedDriftBullet(text)) return;
    unresolved[active].push(text);
  });
  return unresolved;
}

function runGitNameOnly(repoRoot, args) {
  const result = spawnSync('git', args, { cwd: repoRoot, encoding: 'utf8' });
  if (result.status !== 0) {
    return {
      ok: false,
      files: [],
      error: toNonEmptyString(result.stderr) || toNonEmptyString(result.stdout) || `git ${args.join(' ')} failed`
    };
  }
  return {
    ok: true,
    files: result.stdout.split(/\r?\n/).map((line) => toNonEmptyString(line)).filter(Boolean),
    error: ''
  };
}

function collectGitChangedFiles(repoRoot) {
  const commands = [
    ['diff', '--name-only'],
    ['diff', '--cached', '--name-only'],
    ['ls-files', '--others', '--exclude-standard']
  ];
  const files = [];
  const errors = [];
  commands.forEach((args) => {
    const result = runGitNameOnly(repoRoot, args);
    if (result.ok) {
      files.push(...result.files);
      return;
    }
    errors.push(result.error);
  });
  return {
    ok: errors.length === 0,
    files: unique(files.map(toPosixPath)).sort((left, right) => left.localeCompare(right)),
    warnings: errors.length ? [`Unable to collect git changed files: ${errors[0]}`] : []
  };
}

function collectChangedFiles(options, state, repoRoot) {
  const explicitChangedFiles = normalizeStringArray(options.changedFiles);
  if (explicitChangedFiles.length) {
    return { files: unique(explicitChangedFiles.map(toPosixPath)), warnings: [], source: 'options' };
  }
  const verificationLog = Array.isArray(state.verificationLog) ? state.verificationLog : [];
  const loggedChangedFiles = verificationLog.flatMap((entry) => normalizeStringArray(entry && entry.changedFiles));
  if (loggedChangedFiles.length) {
    return { files: unique(loggedChangedFiles.map(toPosixPath)), warnings: [], source: 'verificationLog' };
  }
  const git = collectGitChangedFiles(repoRoot);
  return { files: git.files, warnings: git.warnings, source: 'git' };
}

function textHasRequirementEvidence(requirement, evidenceText) {
  const title = toNonEmptyString(requirement.title).toLowerCase();
  if (!title) return false;
  const haystack = String(evidenceText || '').toLowerCase();
  if (haystack.includes(title)) return true;
  const tokens = (requirement.tokens || []).filter((token) => String(token || '').length >= 4);
  if (!tokens.length) return false;
  const hits = tokens.filter((token) => haystack.includes(String(token).toLowerCase())).length;
  return hits >= Math.min(2, tokens.length);
}

function summarizeStatus(findings) {
  if (findings.some((finding) => finding.severity === 'BLOCK')) return 'BLOCK';
  if (findings.length) return 'WARN';
  return 'PASS';
}

function evaluateImplementationConsistency(options = {}) {
  const changeDir = path.resolve(options.changeDir || process.cwd());
  const repoRoot = path.resolve(options.repoRoot || resolveRepoRoot(changeDir));
  const state = loadChangeState(changeDir);
  const sources = loadChangeSources(changeDir);
  const findings = [];

  const artifactPresence = {
    proposal: Boolean(sources.proposal.trim()),
    specs: sources.specFiles.length > 0,
    design: Boolean(sources.design.trim()),
    tasks: Boolean(sources.tasks.trim())
  };
  Object.entries(artifactPresence).forEach(([artifact, present]) => {
    if (present) return;
    addFinding(findings, {
      severity: 'BLOCK',
      code: 'artifact-missing',
      message: `${artifact} artifact is required before verify acceptance.`,
      patchTargets: [artifact === 'specs' ? 'specs' : `${artifact}.md`]
    });
  });

  const currentHashes = hashTrackedArtifacts(changeDir);
  const hashDrift = detectArtifactHashDrift(state.hashes, currentHashes);
  if (hashDrift.driftedPaths.length) {
    addFinding(findings, {
      severity: 'BLOCK',
      code: 'artifact-hash-drift',
      message: 'Tracked artifact hashes are stale before implementation consistency verification.',
      patchTargets: hashDrift.driftedPaths
    });
  }

  ['specSplit', 'spec', 'task', 'execution'].forEach((slot) => {
    const checkpoint = state.checkpoints && state.checkpoints[slot] ? state.checkpoints[slot] : {};
    const status = toNonEmptyString(checkpoint.status).toUpperCase();
    if (ACCEPTED_CHECKPOINT_STATUSES.has(status)) return;
    addFinding(findings, {
      severity: 'BLOCK',
      code: 'checkpoint-not-accepted',
      message: `${slot} checkpoint must be PASS or WARN before verify acceptance.`,
      patchTargets: ['state.yaml']
    });
  });

  const requirements = sources.specFiles.flatMap((specFile) => specFile.requirements || []);
  requirements.forEach((requirement) => {
    if (requirement.scenarioCount > 0) return;
    addFinding(findings, {
      severity: 'BLOCK',
      code: 'requirement-scenario-missing',
      message: `Requirement "${requirement.title}" has no scenario.`,
      patchTargets: [requirement.path]
    });
  });

  const taskGroups = parseTopLevelTaskGroups(sources.tasks);
  taskGroups.forEach((group) => {
    if (group.completed === true) return;
    addFinding(findings, {
      severity: 'BLOCK',
      code: 'task-group-incomplete',
      message: `Task group "${group.title}" is not complete.`,
      patchTargets: ['tasks.md']
    });
  });

  const verificationLog = Array.isArray(state.verificationLog) ? state.verificationLog : [];
  const evidenceText = [
    sources.tasks,
    verificationLog.map((entry) => [
      entry && entry.taskGroup,
      entry && entry.diffSummary,
      entry && entry.verificationCommand,
      entry && entry.verificationResult,
      normalizeStringArray(entry && entry.changedFiles).join(' ')
    ].filter(Boolean).join('\n')).join('\n\n')
  ].join('\n\n');
  requirements.forEach((requirement) => {
    if (textHasRequirementEvidence(requirement, evidenceText)) return;
    addFinding(findings, {
      severity: 'BLOCK',
      code: 'requirement-without-evidence',
      message: `Requirement "${requirement.title}" has no task, changed file, or verification evidence.`,
      patchTargets: ['tasks.md', requirement.path]
    });
  });

  const changed = collectChangedFiles(options, state, repoRoot);
  changed.warnings.forEach((warning) => {
    addFinding(findings, {
      severity: 'WARN',
      code: 'git-diff-unavailable',
      message: warning,
      patchTargets: ['state.yaml']
    });
  });
  if (!changed.files.length) {
    addFinding(findings, {
      severity: 'WARN',
      code: 'changed-files-empty',
      message: 'No changed files were found from caller input, verification log, or git diff.',
      patchTargets: ['state.yaml']
    });
  }

  const pathScope = matchPathScope(changed.files, {
    allowedPaths: state.allowedPaths,
    forbiddenPaths: state.forbiddenPaths,
    activeChange: state.change || path.basename(changeDir)
  });
  if (pathScope.forbiddenMatches.length) {
    addFinding(findings, {
      severity: 'BLOCK',
      code: 'forbidden-path-change',
      message: 'Changed files match forbidden path scope.',
      patchTargets: pathScope.forbiddenMatches
    });
  }
  if (pathScope.outOfScopeMatches.length) {
    addFinding(findings, {
      severity: 'BLOCK',
      code: 'out-of-scope-change',
      message: 'Changed files exceed approved allowed path scope.',
      patchTargets: [...pathScope.outOfScopeMatches, 'drift.md']
    });
  }

  const drift = parseUnresolvedDrift(changeDir);
  if (drift.userApprovalNeeded.length || drift.scopeChanges.length || drift.discoveredRequirements.length || drift.outOfScopeFiles.length) {
    addFinding(findings, {
      severity: 'BLOCK',
      code: 'unresolved-drift',
      message: 'Drift ledger still has unresolved open or unmarked items.',
      patchTargets: ['drift.md']
    });
  }

  const sortedFindings = findings.sort((left, right) => {
    if (left.code !== right.code) return left.code.localeCompare(right.code);
    const leftTarget = left.patchTargets[0] || '';
    const rightTarget = right.patchTargets[0] || '';
    if (leftTarget !== rightTarget) return leftTarget.localeCompare(rightTarget);
    return left.message.localeCompare(right.message);
  });
  const status = summarizeStatus(sortedFindings);
  const patchTargets = unique(sortedFindings.flatMap((finding) => finding.patchTargets));
  return {
    checkpoint: CHECKPOINT_ID,
    phase: 'verification',
    trigger: 'after-implemented-before-verify',
    status,
    findings: sortedFindings,
    patchTargets,
    nextStep: status === 'BLOCK'
      ? 'Add implementation evidence or update specs/tasks before accepting verify.'
      : (status === 'WARN' ? 'Review warnings before accepting verify.' : 'Proceed to verify acceptance.'),
    result: {
      requirementCoverage: {
        total: requirements.length,
        covered: requirements.filter((requirement) => textHasRequirementEvidence(requirement, evidenceText)).length
      },
      changedFiles: {
        total: changed.files.length,
        outOfScope: pathScope.outOfScopeMatches.length
      },
      drift: {
        unresolved: Object.values(drift).reduce((sum, entries) => sum + entries.length, 0)
      },
      changedFilesSource: changed.source
    }
  };
}

function acceptImplementationConsistency(changeDir, result) {
  const normalized = result && typeof result === 'object'
    ? result
    : evaluateImplementationConsistency({ changeDir });
  if (normalized.status === 'BLOCK') {
    throw new Error('Cannot accept implementation consistency checkpoint while blocking findings remain.');
  }
  return recordCheckpointResult(changeDir, CHECKPOINT_ID, {
    status: normalized.status || 'PASS',
    accepted: true,
    result: normalized.result || {},
    findings: normalized.findings || [],
    patchTargets: normalized.patchTargets || []
  }, hashTrackedArtifacts(changeDir));
}

module.exports = {
  evaluateImplementationConsistency,
  acceptImplementationConsistency
};
