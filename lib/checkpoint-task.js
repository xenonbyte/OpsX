const { SECURITY_KEYWORDS } = require('./workflow-constants');
const { resolveSchema, resolveSecurityReviewState } = require('./security-review');
const { buildCheckpointResult, addWorkflowFinding } = require('./checkpoint-result');
const { resolvePlanningEvidence } = require('./planning-evidence');
const { appendRolloutFindings } = require('./rollout-detector');
const {
  appendTaskCoverageFindings,
  appendPlanningLegacyFindings
} = require('./checkpoint-planning');
const { appendTddTaskCheckpointFindings } = require('./checkpoint-tdd');
const { hasAnyKeyword } = require('./workflow-utils');

function runTaskCheckpoint(options = {}) {
  const schema = resolveSchema(options);
  const findings = [];
  const review = options.review || resolveSecurityReviewState(options);
  const evidence = resolvePlanningEvidence(options);
  const tasksText = evidence.tasks ? evidence.tasks.text : '';
  const groups = evidence.tasks && Array.isArray(evidence.tasks.groups) ? evidence.tasks.groups : [];
  const checklistItems = evidence.tasks && Array.isArray(evidence.tasks.checklistItems) ? evidence.tasks.checklistItems : [];

  if (!evidence.tasks || !evidence.tasks.present) {
    findings.push({ severity: 'BLOCK', code: 'tasks-missing', message: 'Tasks content is required before apply.', patchTargets: ['tasks'] });
  }
  if (!evidence.specs || !evidence.specs.present) {
    findings.push({ severity: 'BLOCK', code: 'specs-missing', message: 'Specs must still be present for task validation.', patchTargets: ['specs'] });
  }
  if (!evidence.design || !evidence.design.present) {
    findings.push({ severity: 'BLOCK', code: 'design-missing', message: 'Design must still be present for task validation.', patchTargets: ['design'] });
  }
  if (evidence.tasks && evidence.tasks.present && groups.length === 0) {
    findings.push({ severity: 'BLOCK', code: 'task-groups-missing', message: 'Tasks must be organized into top-level task groups.', patchTargets: ['tasks'] });
  }
  if (evidence.tasks && evidence.tasks.present && checklistItems.length === 0) {
    findings.push({ severity: 'BLOCK', code: 'checklist-items-missing', message: 'Tasks must include checklist items before apply.', patchTargets: ['tasks'] });
  }
  groups.forEach((group) => {
    if (group.items.length === 0) {
      findings.push({ severity: 'BLOCK', code: 'group-empty', message: `Task group "${group.heading}" must contain at least one checklist item.`, patchTargets: ['tasks'] });
    }
  });
  if (tasksText && !hasAnyKeyword(tasksText, ['test', 'verify'])) {
    findings.push({ severity: 'WARN', code: 'test-coverage-missing', message: 'Tasks should include testing or verification coverage.', patchTargets: ['tasks'] });
  }
  if (tasksText && !hasAnyKeyword(tasksText, ['rollback', 'compatib', 'migration'])) {
    findings.push({ severity: 'WARN', code: 'operational-coverage-missing', message: 'Tasks should call out migration, rollback, or compatibility work when relevant.', patchTargets: ['tasks'] });
  }
  appendRolloutFindings(findings, evidence, { includeTasks: true });
  appendTaskCoverageFindings(findings, evidence);

  if (evidence.tasks && evidence.tasks.outOfScopeTaskItems && evidence.tasks.outOfScopeTaskItems.length) {
    addWorkflowFinding(findings, {
      severity: 'BLOCK',
      code: 'out-of-scope-tasks-auto',
      message: 'Task plan contains out-of-scope work not supported by planning artifacts.',
      patchTargets: ['tasks', 'proposal', 'specs', 'design']
    });
  }

  if (review.required && !(options.artifacts || {})['security-review']) {
    addWorkflowFinding(findings, {
      severity: 'BLOCK',
      code: 'security-review-required-task-checkpoint',
      message: 'Security review is required before apply can begin.',
      patchTargets: ['security-review']
    });
  } else if (review.recommended && !review.waived && !review.completed) {
    addWorkflowFinding(findings, {
      severity: 'WARN',
      code: 'security-review-recommended-task-checkpoint',
      message: 'Security review is recommended before apply begins.',
      patchTargets: ['security-review']
    });
  }

  if ((review.required || review.recommended || review.completed) && tasksText && !hasAnyKeyword(tasksText, SECURITY_KEYWORDS)) {
    addWorkflowFinding(findings, {
      severity: 'WARN',
      code: 'security-task-coverage-missing',
      message: 'Tasks should capture security control work for security-sensitive changes.',
      patchTargets: ['tasks']
    });
  }

  appendPlanningLegacyFindings(findings, evidence.legacy || {}, { includeTaskFlags: true });

  const tddSummary = appendTddTaskCheckpointFindings(findings, groups, evidence, options.config || {});
  const result = buildCheckpointResult(schema, 'task-checkpoint', findings, { phase: 'planning' });
  result.tdd = {
    mode: tddSummary.mode,
    testPlanPresent: tddSummary.testPlanPresent,
    groups: tddSummary.groups.map((group) => ({
      heading: group.heading,
      class: group.class,
      classSource: group.classSource,
      required: group.required,
      exempt: group.exempt,
      exemptionClass: group.exemptionClass,
      exemptionClassInvalid: group.exemptionClassInvalid,
      exemptionReason: group.exemptionReason,
      exemptionReasonMissing: group.exemptionReasonMissing,
      hasRedStep: group.hasRedStep,
      hasGreenStep: group.hasGreenStep,
      hasVerifyStep: group.hasVerifyStep,
      hasRefactorStep: group.hasRefactorStep,
      manualVerifyRationaleMissing: group.manualVerifyRationaleMissing
    }))
  };
  return result;
}

module.exports = {
  runTaskCheckpoint
};
