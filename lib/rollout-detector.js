const { unique } = require('./string-utils');
const { PLANNING_ROLLOUT_ARTIFACTS } = require('./workflow-constants');
const { addWorkflowFinding } = require('./checkpoint-result');
const { getTextBlock } = require('./workflow-utils');

const ROLLOUT_KEYWORDS = ['rollout', 'migration', 'rollback', 'compatib'];
const ROLLOUT_REQUIRED_PATTERNS = [
  /\b(rollout|migration|rollback|compatib[a-z]*)\b[^.\n]{0,40}\b(requires|must|shall|needed|mandatory)\b/i,
  /\b(requires|must|shall|needed|mandatory)\b[^.\n]{0,40}\b(rollout|migration|rollback|compatib[a-z]*)\b/i,
  /必须[^。\n]{0,30}(迁移|回滚|兼容|发布)/,
  /(迁移|回滚|兼容|发布)[^。\n]{0,30}必须/
];
const ROLLOUT_NOT_REQUIRED_PATTERNS = [
  /\b(no|without)\s+(rollout|migration|rollback|compatib[a-z]*)\b/i,
  /\b(rollout|migration|rollback|compatib[a-z]*)\b[^.\n]{0,40}\b(not required|not needed|none|n\/a)\b/i,
  /无需(迁移|回滚|兼容|发布)/,
  /不需要(迁移|回滚|兼容|发布)/
];

function extractStatements(text = '') {
  return getTextBlock(text)
    .split(/[\n.;!?。；！？]+/g)
    .map((statement) => statement.trim())
    .filter(Boolean);
}

function removeMarkdownHeadings(text = '') {
  return getTextBlock(text)
    .split('\n')
    .filter((line) => !/^#{1,6}\s+/.test(line.trim()))
    .join('\n');
}

function statementHasRolloutKeyword(statement = '') {
  return ROLLOUT_KEYWORDS.some((keyword) => statement.includes(keyword));
}

function statementHasNotRequiredSignal(statement = '') {
  return ROLLOUT_NOT_REQUIRED_PATTERNS.some((pattern) => pattern.test(statement));
}

function detectRolloutProfile(text) {
  const content = removeMarkdownHeadings(text);
  const statements = extractStatements(content.toLowerCase());
  const mentioned = statements.some((statement) => statementHasRolloutKeyword(statement));
  const statementRequiredPattern = /\b(required|requires|must|shall|needed|mandatory)\b|必须|需要/i;
  const notRequiredByStatement = statements.some((statement) => (
    statementHasRolloutKeyword(statement)
    && statementHasNotRequiredSignal(statement)
  ));
  const requiredByStatement = statements.some((statement) => (
    statementHasRolloutKeyword(statement)
    && statementRequiredPattern.test(statement)
    && !statementHasNotRequiredSignal(statement)
  ));
  const required = requiredByStatement || ROLLOUT_REQUIRED_PATTERNS.some((pattern) => pattern.test(content));
  const notRequired = notRequiredByStatement || ROLLOUT_NOT_REQUIRED_PATTERNS.some((pattern) => pattern.test(content));
  return {
    mentioned,
    required,
    notRequired,
    contradictory: required && notRequired
  };
}

function appendRolloutFindings(findings = [], evidence = {}, options = {}) {
  const includeTasks = options.includeTasks === true;
  const artifactIds = includeTasks ? [...PLANNING_ROLLOUT_ARTIFACTS, 'tasks'] : PLANNING_ROLLOUT_ARTIFACTS;
  const profiles = artifactIds.reduce((output, artifactId) => {
    const profile = evidence.rollout && evidence.rollout[artifactId] ? evidence.rollout[artifactId] : {
      mentioned: false,
      required: false,
      notRequired: false,
      contradictory: false
    };
    const present = artifactId === 'tasks'
      ? evidence.tasks && evidence.tasks.present
      : evidence[artifactId] && evidence[artifactId].present;
    output[artifactId] = Object.assign({}, profile, { present });
    return output;
  }, {});

  const contradictory = artifactIds.filter((artifactId) => profiles[artifactId].present && profiles[artifactId].contradictory);
  const required = artifactIds.filter((artifactId) => profiles[artifactId].present && profiles[artifactId].required);
  const notRequired = artifactIds.filter((artifactId) => profiles[artifactId].present && profiles[artifactId].notRequired);
  const informed = artifactIds.filter((artifactId) => (
    profiles[artifactId].present
    && (profiles[artifactId].mentioned || profiles[artifactId].required || profiles[artifactId].notRequired)
  ));

  if (contradictory.length || (required.length && notRequired.length)) {
    const patchTargets = unique([...contradictory, ...required, ...notRequired]);
    addWorkflowFinding(findings, {
      severity: 'BLOCK',
      code: includeTasks ? 'rollout-contradiction-task' : 'rollout-contradiction',
      message: includeTasks
        ? 'Planning artifacts and task plan directly disagree on rollout, migration, rollback, or compatibility requirements.'
        : 'Planning artifacts directly disagree on rollout, migration, rollback, or compatibility requirements.',
      patchTargets
    });
    return;
  }

  if (informed.length === 0) return;

  const missingDetail = artifactIds.filter((artifactId) => profiles[artifactId].present && profiles[artifactId].mentioned !== true);
  if (missingDetail.length) {
    addWorkflowFinding(findings, {
      severity: 'WARN',
      code: includeTasks ? 'rollout-detail-missing-task' : 'rollout-detail-missing',
      message: includeTasks
        ? 'At least one planning artifact or task plan is missing rollout, migration, rollback, or compatibility detail.'
        : 'At least one planning artifact is missing rollout, migration, rollback, or compatibility detail.',
      patchTargets: missingDetail
    });
  }
}

module.exports = {
  ROLLOUT_NOT_REQUIRED_PATTERNS,
  detectRolloutProfile,
  appendRolloutFindings,
  removeMarkdownHeadings,
  extractStatements
};
