const { resolveSchema, resolveSecurityReviewState } = require('./security-review');
const { buildCheckpointResult, addWorkflowFinding } = require('./checkpoint-result');
const {
  normalizeExecutionEvidence,
  resolvePlanningEvidence
} = require('./planning-evidence');
const {
  toTokenSet,
  setIntersectionSize
} = require('./workflow-utils');

function runExecutionCheckpoint(options = {}) {
  const schema = resolveSchema(options);
  const review = options.review || resolveSecurityReviewState(options);
  const findings = [];
  const evidence = normalizeExecutionEvidence(options);
  const planningEvidence = resolvePlanningEvidence(options);
  const groupId = evidence.group.id || '';
  const groupText = evidence.group.text || '';
  const scopeTerms = new Set(evidence.group.scopeTerms || []);
  const implementationTerms = new Set(evidence.implementation.terms || []);
  const commitmentTerms = toTokenSet([planningEvidence.specs ? planningEvidence.specs.text : '', planningEvidence.design ? planningEvidence.design.text : ''].join('\n'));

  if (!groupId) {
    findings.push({ severity: 'BLOCK', code: 'task-group-missing', message: 'Execution checkpoint requires a top-level task-group title.', patchTargets: ['tasks'] });
  }
  if (!groupText) {
    findings.push({ severity: 'BLOCK', code: 'task-group-body-missing', message: 'Execution checkpoint requires the completed task-group body.', patchTargets: ['tasks'] });
  }
  if (evidence.group.completed !== true) {
    findings.push({ severity: 'BLOCK', code: 'task-group-incomplete', message: 'Execution checkpoint can run only after a top-level task group is completed.', patchTargets: ['tasks'] });
  }

  if (evidence.group.completed === true) {
    const missingProofFields = [];
    if (!Array.isArray(evidence.execution.completedSteps) || evidence.execution.completedSteps.length === 0) {
      missingProofFields.push('completedSteps');
    }
    if (!evidence.execution.verificationCommand) {
      missingProofFields.push('verificationCommand');
    }
    if (!evidence.execution.verificationResult) {
      missingProofFields.push('verificationResult');
    }
    if (!evidence.execution.diffSummary) {
      missingProofFields.push('diffSummary');
    }
    if (!evidence.execution.driftStatus) {
      missingProofFields.push('driftStatus');
    }
    if (missingProofFields.length) {
      addWorkflowFinding(findings, {
        severity: 'WARN',
        code: 'execution-proof-missing',
        message: `Completed task-group execution proof is missing: ${missingProofFields.join(', ')}.`,
        patchTargets: ['tasks']
      });
    }
  }

  if (
    evidence.behavior.changed
    && evidence.implementation.hasSemanticEvidence === true
    && scopeTerms.size >= 3
    && implementationTerms.size >= 3
    && setIntersectionSize(scopeTerms, implementationTerms) === 0
  ) {
    addWorkflowFinding(findings, {
      severity: 'BLOCK',
      code: 'task-group-implementation-drift',
      message: 'Implementation evidence diverges from the completed task-group scope.',
      patchTargets: ['tasks', 'design']
    });
  }

  if (
    evidence.behavior.changed
    && evidence.implementation.hasSemanticEvidence === true
    && implementationTerms.size >= 4
    && commitmentTerms.size >= 4
    && setIntersectionSize(implementationTerms, commitmentTerms) === 0
  ) {
    addWorkflowFinding(findings, {
      severity: 'BLOCK',
      code: 'implementation-commitment-drift',
      message: 'Implementation evidence diverges from accepted specs or design commitments.',
      patchTargets: ['specs', 'design', 'tasks']
    });
  }

  if (evidence.implementation.explicitMismatch === true || evidence.legacy.driftDetected === true) {
    addWorkflowFinding(findings, {
      severity: 'BLOCK',
      code: 'implementation-drift',
      message: 'Implementation drift requires existing artifacts to be updated before continuing.',
      patchTargets: ['specs', 'design', 'tasks']
    });
  }

  if (evidence.implementation.constraints.length || evidence.legacy.newConstraints === true) {
    addWorkflowFinding(findings, {
      severity: 'BLOCK',
      code: 'new-constraints-detected',
      message: 'New implementation constraints require artifact updates before the next task group.',
      patchTargets: ['specs', 'design', 'tasks']
    });
  }

  if (evidence.legacy.securityControlGap === true) {
    addWorkflowFinding(findings, {
      severity: review.required || review.completed ? 'BLOCK' : 'WARN',
      code: 'security-control-gap',
      message: 'Implementation is missing required or expected security controls for this task group.',
      patchTargets: review.required || review.completed ? ['security-review', 'tasks'] : ['tasks']
    });
  }

  if (
    evidence.legacy.qualityGap === true
    || (
      evidence.verification.requiresTesting
      && evidence.behavior.changed
      && evidence.behavior.docsOnly !== true
      && evidence.verification.present !== true
    )
  ) {
    addWorkflowFinding(findings, {
      severity: 'WARN',
      code: 'quality-gap',
      message: 'Task-group output should include testing or verification work before moving on.',
      patchTargets: ['tasks']
    });
  }

  if (evidence.legacy.nextGroupBlocked === true) {
    addWorkflowFinding(findings, {
      severity: 'BLOCK',
      code: 'next-group-not-ready',
      message: 'The next top-level task group is not ready to begin yet.',
      patchTargets: ['tasks', 'design']
    });
  }

  const result = buildCheckpointResult(schema, 'execution-checkpoint', findings, { phase: 'execution' });
  result.executionEvidence = {
    completedSteps: evidence.execution.completedSteps,
    verificationCommand: evidence.execution.verificationCommand,
    verificationResult: evidence.execution.verificationResult,
    diffSummary: evidence.execution.diffSummary,
    driftStatus: evidence.execution.driftStatus,
    driftSummary: evidence.execution.driftSummary
  };
  return result;
}

module.exports = {
  runExecutionCheckpoint
};
