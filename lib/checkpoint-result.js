const { createFindingAdder } = require('./finding-utils');
const { unique } = require('./string-utils');
const { CHECKPOINT_STATES } = require('./workflow-constants');
const { toList } = require('./workflow-utils');

function normalizePatchTargets(value) {
  return unique(toList(value));
}

function normalizeFinding(finding = {}) {
  return {
    severity: finding.severity === 'BLOCK' ? 'BLOCK' : 'WARN',
    code: finding.code || 'workflow-check',
    message: finding.message || '',
    patchTargets: normalizePatchTargets(finding.patchTargets || finding.artifacts),
    artifacts: normalizePatchTargets(finding.artifacts || finding.patchTargets)
  };
}

const addWorkflowFinding = createFindingAdder({
  defaultCode: 'workflow-check',
  includeArtifacts: true
});

function resolveCheckpointStatus(findings = []) {
  const normalized = findings.map(normalizeFinding);
  if (normalized.some((finding) => finding.severity === 'BLOCK')) return 'BLOCK';
  if (normalized.length) return 'WARN';
  return 'PASS';
}

function buildCheckpointNextStep(checkpointId, status, patchTargets) {
  if (status === 'PASS') {
    if (checkpointId === 'spec-split-checkpoint') return 'Proceed to design.';
    if (checkpointId === 'spec-checkpoint') return 'Proceed to tasks.';
    if (checkpointId === 'task-checkpoint') return 'Proceed to apply.';
    if (checkpointId === 'implementation-consistency-checkpoint') return 'Proceed to verify acceptance.';
    return 'Proceed to the next top-level task group.';
  }
  if (status === 'WARN') {
    if (patchTargets.length) return `Continue, but patch existing artifacts first or immediately after: ${patchTargets.join(', ')}.`;
    return 'Continue with recorded findings.';
  }
  if (patchTargets.length) return `Stop and update existing artifacts before continuing: ${patchTargets.join(', ')}.`;
  return 'Stop and update existing artifacts before continuing.';
}

function getCheckpointDefinition(schema, checkpointId) {
  return (schema.checkpoints || []).find((checkpoint) => checkpoint.id === checkpointId) || {
    id: checkpointId,
    states: CHECKPOINT_STATES
  };
}

function buildCheckpointResult(schema, checkpointId, findings = [], extra = {}) {
  const checkpoint = getCheckpointDefinition(schema, checkpointId);
  const normalizedFindings = findings.map(normalizeFinding);
  const patchTargets = unique(normalizedFindings.flatMap((finding) => finding.patchTargets));
  const status = resolveCheckpointStatus(normalizedFindings);
  return {
    checkpoint: checkpoint.id,
    phase: checkpoint.phase || extra.phase || 'planning',
    status,
    findings: normalizedFindings,
    nextStep: extra.nextStep || buildCheckpointNextStep(checkpoint.id, status, patchTargets),
    patchTargets,
    updatesExistingArtifactsOnly: true,
    createsArtifacts: [],
    trigger: checkpoint.trigger || null,
    insertion: checkpoint.insertion || null
  };
}

module.exports = {
  addWorkflowFinding,
  normalizeFinding,
  resolveCheckpointStatus,
  buildCheckpointNextStep,
  getCheckpointDefinition,
  buildCheckpointResult
};
