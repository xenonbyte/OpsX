const { unique } = require('./string-utils');
const {
  COMMITMENT_CATEGORIES
} = require('./workflow-constants');
const { addWorkflowFinding } = require('./checkpoint-result');
const { setIntersectionSize } = require('./workflow-utils');

function appendPlanningScopeFindings(findings = [], evidence = {}) {
  const proposalTerms = new Set(evidence.proposal ? evidence.proposal.terms || [] : []);
  const specsTerms = new Set(evidence.specs ? evidence.specs.terms || [] : []);
  const designTerms = new Set(evidence.design ? evidence.design.terms || [] : []);
  const specOverlap = setIntersectionSize(proposalTerms, specsTerms);
  const designOverlap = setIntersectionSize(proposalTerms, designTerms);

  if (
    evidence.proposal && evidence.proposal.present
    && evidence.specs && evidence.specs.present
    && evidence.design && evidence.design.present
    && proposalTerms.size >= 4
    && specsTerms.size >= 4
    && designTerms.size >= 4
    && specOverlap === 0
    && designOverlap === 0
  ) {
    addWorkflowFinding(findings, {
      severity: 'BLOCK',
      code: 'scope-drift-auto',
      message: 'Planning artifacts drift from the approved proposal scope.',
      patchTargets: ['proposal', 'specs', 'design']
    });
  }
}

function appendTaskCoverageFindings(findings = [], evidence = {}) {
  const commitmentSources = evidence.commitmentSources || {};
  const taskCoverage = evidence.tasks && evidence.tasks.taskCoverage ? evidence.tasks.taskCoverage : {};

  COMMITMENT_CATEGORIES.forEach((category) => {
    const sources = commitmentSources[category] || [];
    if (!sources.length) return;
    if (taskCoverage[category] === true) return;
    addWorkflowFinding(findings, {
      severity: 'BLOCK',
      code: `task-${category}-coverage-missing`,
      message: `Tasks are missing required ${category} work committed in planning artifacts.`,
      patchTargets: unique(['tasks', ...sources])
    });
  });

  const securitySources = commitmentSources.security || [];
  if (securitySources.length && taskCoverage.security !== true) {
    addWorkflowFinding(findings, {
      severity: 'WARN',
      code: 'security-task-coverage-missing',
      message: 'Tasks should capture security control work referenced by specs or design.',
      patchTargets: unique(['tasks', ...securitySources])
    });
  }
}

function appendPlanningLegacyFindings(findings = [], legacy = {}, options = {}) {
  if (legacy.scopeDrift === true) {
    addWorkflowFinding(findings, {
      severity: 'BLOCK',
      code: 'scope-drift',
      message: 'Planning artifacts drift from the approved proposal scope.',
      patchTargets: ['proposal', 'specs', 'design']
    });
  }
  if (legacy.crossSpecConflict === true) {
    addWorkflowFinding(findings, {
      severity: 'BLOCK',
      code: 'cross-spec-conflict',
      message: 'Specs conflict with each other and must be reconciled.',
      patchTargets: ['specs']
    });
  }
  if (legacy.outOfScopeTasks === true && options.includeTaskFlags === true) {
    addWorkflowFinding(findings, {
      severity: 'BLOCK',
      code: 'out-of-scope-tasks',
      message: 'Task plan contains out-of-scope work not supported by planning artifacts.',
      patchTargets: ['tasks', 'specs', 'design']
    });
  }
  if (legacy.orderingConflict === true && options.includeTaskFlags === true) {
    addWorkflowFinding(findings, {
      severity: 'WARN',
      code: 'task-ordering-conflict',
      message: 'Task ordering should be revised to better match dependency order.',
      patchTargets: ['tasks']
    });
  }
}

module.exports = {
  appendPlanningScopeFindings,
  appendTaskCoverageFindings,
  appendPlanningLegacyFindings
};
