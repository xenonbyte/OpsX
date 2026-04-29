const { collectSpecSplitEvidence, reviewSpecSplitEvidence } = require('./spec-validator');
const { resolveSchema, resolveSecurityReviewState } = require('./security-review');
const { buildCheckpointResult, addWorkflowFinding } = require('./checkpoint-result');
const {
  resolvePlanningEvidence,
  normalizeSpecSplitSpecFiles,
  countUniqueCapabilityDirectories
} = require('./planning-evidence');
const { appendRolloutFindings } = require('./rollout-detector');
const {
  appendPlanningScopeFindings,
  appendPlanningLegacyFindings
} = require('./checkpoint-planning');
const {
  getSourceBlock,
  hasSection
} = require('./workflow-utils');

function runSpecCheckpoint(options = {}) {
  const schema = resolveSchema(options);
  const findings = [];
  const review = options.review || resolveSecurityReviewState(options);
  const evidence = resolvePlanningEvidence(options);
  const requirementCount = evidence.specs ? evidence.specs.requirementCount : 0;
  const scenarioCount = evidence.specs ? evidence.specs.scenarioCount : 0;
  const specsText = evidence.specs ? evidence.specs.text : '';
  const designText = evidence.design ? evidence.design.text : '';

  if (!evidence.proposal || !evidence.proposal.present) {
    findings.push({ severity: 'BLOCK', code: 'proposal-missing', message: 'Proposal content is required before tasks.', patchTargets: ['proposal'] });
  }
  if (!evidence.specs || !evidence.specs.present) {
    findings.push({ severity: 'BLOCK', code: 'specs-missing', message: 'Specs content is required before tasks.', patchTargets: ['specs'] });
  }
  if (!evidence.design || !evidence.design.present) {
    findings.push({ severity: 'BLOCK', code: 'design-missing', message: 'Design content is required before tasks.', patchTargets: ['design'] });
  }
  if (evidence.specs && evidence.specs.present && requirementCount === 0) {
    findings.push({ severity: 'BLOCK', code: 'requirements-missing', message: 'Specs must contain at least one requirement before tasks.', patchTargets: ['specs'] });
  }
  if (evidence.specs && evidence.specs.present && scenarioCount < requirementCount) {
    findings.push({ severity: 'BLOCK', code: 'scenarios-incomplete', message: 'Each requirement should have at least one scenario before tasks.', patchTargets: ['specs'] });
  }
  if (evidence.specs && evidence.specs.present && requirementCount > 0 && !/\b(SHALL|MUST)\b/.test(specsText)) {
    findings.push({ severity: 'WARN', code: 'normative-language-missing', message: 'Specs should use SHALL or MUST in requirement language.', patchTargets: ['specs'] });
  }
  if (evidence.design && evidence.design.present && !hasSection(designText, 'Migration Plan')) {
    findings.push({ severity: 'WARN', code: 'migration-plan-missing', message: 'Design should call out migration planning before tasks.', patchTargets: ['design'] });
  }
  appendRolloutFindings(findings, evidence);
  appendPlanningScopeFindings(findings, evidence);
  appendPlanningLegacyFindings(findings, evidence.legacy || {});
  if (review.required && !(options.artifacts || {})['security-review']) {
    findings.push({ severity: 'BLOCK', code: 'security-review-required', message: 'Security review is required before tasks can begin.', patchTargets: ['security-review'] });
  } else if (review.recommended && !review.waived && !review.completed) {
    findings.push({ severity: 'WARN', code: 'security-review-recommended', message: 'Security review is recommended before tasks proceed.', patchTargets: ['security-review'] });
  }

  return buildCheckpointResult(schema, 'spec-checkpoint', findings, { phase: 'planning' });
}

function runSpecSplitCheckpoint(options = {}) {
  const schema = resolveSchema(options);
  const specFiles = normalizeSpecSplitSpecFiles(options);
  const evidence = collectSpecSplitEvidence({
    proposalText: getSourceBlock(options.sources || {}, 'proposal'),
    specFiles
  });
  const findings = [];
  if (!specFiles.length || !(evidence.counts && evidence.counts.specFileCount)) {
    addWorkflowFinding(findings, {
      severity: 'BLOCK',
      code: 'specs-missing',
      message: 'Specs are required before spec-split-checkpoint can pass.',
      patchTargets: ['specs']
    });
  } else {
    findings.push(...reviewSpecSplitEvidence(evidence, options));
  }
  const review = options.review || resolveSecurityReviewState(options);
  const requirementCount = Number(evidence && evidence.counts ? evidence.counts.requirementCount : 0) || 0;
  const uniqueCapabilityDirectories = countUniqueCapabilityDirectories(evidence.specFiles || specFiles);
  const escalated = (
    specFiles.length > 1
    || uniqueCapabilityDirectories > 1
    || review.required
    || review.recommended
    || requirementCount >= 7
  );

  if (escalated) {
    addWorkflowFinding(findings, {
      severity: 'WARN',
      code: 'read-only-reviewer-recommended',
      message: 'Read-only reviewer escalation is recommended before design for this split-spec set.',
      patchTargets: []
    });
  }

  const resultOptions = { phase: 'planning' };
  if (escalated) {
    resultOptions.nextStep = 'Before design, a read-only reviewer should inspect the existing `proposal`/`specs`, must not write files directly, and must not create `spec-review.md`.';
  } else if (findings.length === 0) {
    resultOptions.nextStep = 'Proceed to design.';
  }

  return buildCheckpointResult(schema, 'spec-split-checkpoint', findings, resultOptions);
}

module.exports = {
  runSpecCheckpoint,
  runSpecSplitCheckpoint
};
