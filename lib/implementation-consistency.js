const fs = require('fs');
const path = require('path');
const { parseSpecFile } = require('./spec-validator');
const { readTextIfFile } = require('./fs-utils');
const { parseTopLevelTaskGroups } = require('./runtime-guidance');
const { loadChangeState, recordCheckpointResult } = require('./change-store');
const { hashTrackedArtifacts, detectArtifactHashDrift } = require('./change-artifacts');
const { matchPathScope } = require('./path-scope');
const { collectChangedFiles: collectObservedChangedFiles } = require('./changed-files');
const { toPosixPath } = require('./path-utils');
const {
  toNonEmptyString,
  normalizeStringArray,
  unique,
  normalizeHeadingKey
} = require('./string-utils');
const { createFindingAdder, sortFindings } = require('./finding-utils');
const { resolveRepoRoot } = require('./repo-root');
const { listSpecFiles } = require('./spec-files');

const CHECKPOINT_ID = 'implementation-consistency-checkpoint';
const ACCEPTED_CHECKPOINT_STATUSES = new Set(['PASS', 'WARN']);
const EXPLICIT_EVIDENCE_FIELDS = Object.freeze([
  'requirement coverage',
  'implementation evidence',
  'verification'
]);
const REQUIRED_TASK_GROUP_EVIDENCE_FIELDS = Object.freeze([
  { key: 'requirement coverage', label: 'Requirement Coverage' },
  { key: 'implementation evidence', label: 'Implementation Evidence' }
]);

const addConsistencyFinding = createFindingAdder({ defaultCode: 'implementation-consistency-finding' });

function readOptionalText(filePath) {
  return readTextIfFile(filePath);
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
  readTextIfFile(driftPath).split(/\r?\n/).forEach((line) => {
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

function isMigratedChangeState(state) {
  if (!state || typeof state !== 'object') return false;
  if (state.migrated === true) return true;
  const migration = state.migration && typeof state.migration === 'object' && !Array.isArray(state.migration)
    ? state.migration
    : {};
  return migration.migrated === true;
}

function checkpointFindingForSlot(slot, status, migrated) {
  if (migrated && slot === 'specSplit' && (!status || status === 'PENDING')) {
    return {
      severity: 'WARN',
      code: 'migrated-change-needs-checkpoint-refresh',
      message: 'Migrated change is missing spec-split checkpoint history; refresh planning checkpoints before final release.',
      patchTargets: ['state.yaml']
    };
  }
  return {
    severity: 'BLOCK',
    code: 'checkpoint-not-accepted',
    message: `${slot} checkpoint must be PASS or WARN before verify acceptance.`,
    patchTargets: ['state.yaml']
  };
}

function normalizeEvidenceFieldKey(value) {
  return toNonEmptyString(value).toLowerCase().replace(/\s+/g, ' ');
}

function extractTaskGroupEvidenceFields(groupText) {
  const fields = {};
  let activeField = '';

  String(groupText || '').split(/\r?\n/).forEach((line) => {
    const fieldMatch = line.match(/^\s*-?\s*(Requirement Coverage|Implementation Evidence|Verification)\s*:\s*(.*)$/i);
    if (fieldMatch) {
      activeField = normalizeEvidenceFieldKey(fieldMatch[1]);
      if (!fields[activeField]) fields[activeField] = [];
      const value = toNonEmptyString(fieldMatch[2]);
      if (value) fields[activeField].push(value);
      return;
    }

    if (!activeField) return;
    if (/^\s*[-*]\s+/.test(line)) {
      const value = toNonEmptyString(line.replace(/^\s*[-*]\s+/, ''));
      if (value && !/^\[[ xX]\]\s+/.test(value)) {
        fields[activeField].push(value);
      }
      return;
    }

    if (toNonEmptyString(line)) activeField = '';
  });

  return fields;
}

function collectTaskGroupEvidence(taskGroups) {
  const collected = [];
  const groups = (taskGroups || []).map((group) => {
    const fields = extractTaskGroupEvidenceFields(group.text);
    EXPLICIT_EVIDENCE_FIELDS.forEach((field) => {
      (fields[field] || []).forEach((value) => {
        collected.push(`${field}: ${value}`);
      });
    });
    const missingFields = REQUIRED_TASK_GROUP_EVIDENCE_FIELDS
      .filter((field) => !(fields[field.key] || []).length)
      .map((field) => field.label);
    return {
      title: group.title,
      fields,
      missingFields
    };
  });

  return {
    text: collected.slice(0, 200).join('\n'),
    groups
  };
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
    addConsistencyFinding(findings, {
      severity: 'BLOCK',
      code: 'artifact-missing',
      message: `${artifact} artifact is required before verify acceptance.`,
      patchTargets: [artifact === 'specs' ? 'specs' : `${artifact}.md`]
    });
  });

  const currentHashes = hashTrackedArtifacts(changeDir);
  const hashDrift = detectArtifactHashDrift(state.hashes, currentHashes);
  if (hashDrift.driftedPaths.length) {
    addConsistencyFinding(findings, {
      severity: 'BLOCK',
      code: 'artifact-hash-drift',
      message: 'Tracked artifact hashes are stale before implementation consistency verification.',
      patchTargets: hashDrift.driftedPaths
    });
  }

  const migrated = isMigratedChangeState(state);
  ['specSplit', 'spec', 'task', 'execution'].forEach((slot) => {
    const checkpoint = state.checkpoints && state.checkpoints[slot] ? state.checkpoints[slot] : {};
    const status = toNonEmptyString(checkpoint.status).toUpperCase();
    if (ACCEPTED_CHECKPOINT_STATUSES.has(status)) return;
    addConsistencyFinding(findings, checkpointFindingForSlot(slot, status, migrated));
  });

  const requirements = sources.specFiles.flatMap((specFile) => specFile.requirements || []);
  requirements.forEach((requirement) => {
    if (requirement.scenarioCount > 0) return;
    addConsistencyFinding(findings, {
      severity: 'BLOCK',
      code: 'requirement-scenario-missing',
      message: `Requirement "${requirement.title}" has no scenario.`,
      patchTargets: [requirement.path]
    });
  });

  const taskGroups = parseTopLevelTaskGroups(sources.tasks);
  taskGroups.forEach((group) => {
    if (group.completed === true) return;
    addConsistencyFinding(findings, {
      severity: 'BLOCK',
      code: 'task-group-incomplete',
      message: `Task group "${group.title}" is not complete.`,
      patchTargets: ['tasks.md']
    });
  });
  const taskGroupEvidence = collectTaskGroupEvidence(taskGroups);
  const groupsMissingEvidence = taskGroupEvidence.groups.filter((group) => group.missingFields.length);
  if (groupsMissingEvidence.length) {
    const missingEvidenceSummary = groupsMissingEvidence
      .map((group) => `${group.title} (${group.missingFields.join(', ')})`)
      .join('; ');
    addConsistencyFinding(findings, {
      severity: 'BLOCK',
      code: 'task-group-evidence-fields-missing',
      message: `Task groups must declare non-empty Requirement Coverage and Implementation Evidence: ${missingEvidenceSummary}.`,
      patchTargets: ['tasks.md']
    });
  }

  const verificationLog = Array.isArray(state.verificationLog) ? state.verificationLog : [];
  const evidenceText = [
    taskGroupEvidence.text,
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
    addConsistencyFinding(findings, {
      severity: 'BLOCK',
      code: 'requirement-without-evidence',
      message: `Requirement "${requirement.title}" has no task, changed file, or verification evidence.`,
      patchTargets: ['tasks.md', requirement.path]
    });
  });

  const changed = collectObservedChangedFiles(options, state, repoRoot);
  changed.findings.forEach((finding) => addConsistencyFinding(findings, finding));
  changed.warnings.forEach((warning) => {
    addConsistencyFinding(findings, {
      severity: 'WARN',
      code: 'git-diff-unavailable',
      message: warning,
      patchTargets: ['state.yaml']
    });
  });
  if (!changed.files.length) {
    addConsistencyFinding(findings, {
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
    addConsistencyFinding(findings, {
      severity: 'BLOCK',
      code: 'forbidden-path-change',
      message: 'Changed files match forbidden path scope.',
      patchTargets: pathScope.forbiddenMatches
    });
  }
  if (pathScope.outOfScopeMatches.length) {
    addConsistencyFinding(findings, {
      severity: 'BLOCK',
      code: 'out-of-scope-change',
      message: 'Changed files exceed approved allowed path scope.',
      patchTargets: [...pathScope.outOfScopeMatches, 'drift.md']
    });
  }

  const drift = parseUnresolvedDrift(changeDir);
  if (drift.userApprovalNeeded.length || drift.scopeChanges.length || drift.discoveredRequirements.length || drift.outOfScopeFiles.length) {
    addConsistencyFinding(findings, {
      severity: 'BLOCK',
      code: 'unresolved-drift',
      message: 'Drift ledger still has unresolved open or unmarked items.',
      patchTargets: ['drift.md']
    });
  }

  const sortedFindings = sortFindings(findings);
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
      taskGroupEvidence: {
        total: taskGroupEvidence.groups.length,
        missing: groupsMissingEvidence.length
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
