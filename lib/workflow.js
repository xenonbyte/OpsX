const { DEFAULT_SCHEMA, PRODUCT_SHORT_NAME, SHARED_HOME_NAME } = require('./constants');
const { loadSchema } = require('./schema');
const { collectSpecSplitEvidence, reviewSpecSplitEvidence } = require('./spec-validator');

const OPSX_SKILL_DIR_PREFIX = `skills/${PRODUCT_SHORT_NAME}/`;
const LEGACY_WORKSPACE_SEGMENT = SHARED_HOME_NAME.replace(/^\./, '');
const LEGACY_SKILL_DIR_PREFIX = `skills/${LEGACY_WORKSPACE_SEGMENT}/`;
const LEGACY_CHANGE_DIR_PREFIX = `${LEGACY_WORKSPACE_SEGMENT}/changes/`;

const ACTIONS = [
  {
    id: 'propose',
    title: 'Propose',
    summary: 'Create a change and generate planning artifacts in one step.',
    scope: 'Keep planning-phase edits inside the active change workspace unless the user explicitly asks to move into implementation.'
  },
  {
    id: 'explore',
    title: 'Explore',
    summary: 'Investigate ideas, constraints, and tradeoffs before committing to a change.',
    scope: 'Stay exploratory unless the user clearly asks to create or update artifacts.'
  },
  {
    id: 'apply',
    title: 'Apply',
    summary: 'Implement tasks from a change and update task state.',
    scope: 'Read the relevant change artifacts before modifying product code.'
  },
  {
    id: 'archive',
    title: 'Archive',
    summary: 'Archive a completed change and sync specs if needed.',
    scope: 'Archive only completed or explicitly user-approved incomplete changes.'
  },
  {
    id: 'new',
    title: 'New',
    summary: 'Create an empty change container and metadata.',
    scope: 'Create only the initial change scaffold unless the user asks to continue.'
  },
  {
    id: 'continue',
    title: 'Continue',
    summary: 'Create the next ready artifact based on dependencies.',
    scope: 'Read the current change state first and create only the next valid artifact.'
  },
  {
    id: 'ff',
    title: 'Fast-forward',
    summary: 'Generate all planning artifacts in dependency order.',
    scope: 'Keep fast-forward output limited to planning artifacts.'
  },
  {
    id: 'verify',
    title: 'Verify',
    summary: 'Check completeness, correctness, and coherence against artifacts.',
    scope: 'Report findings with severity and cite the relevant artifact or file path.'
  },
  {
    id: 'sync',
    title: 'Sync',
    summary: 'Merge delta specs from a change into the main spec set.',
    scope: 'Merge only the requested delta specs and report conflicts explicitly.'
  },
  {
    id: 'bulk-archive',
    title: 'Bulk archive',
    summary: 'Archive multiple completed changes together.',
    scope: 'Ask the user to confirm the target set when it is not explicit.'
  },
  {
    id: 'batch-apply',
    title: 'Batch apply',
    summary: 'Apply multiple ready changes in a controlled sequence.',
    scope: 'Clarify execution order or target changes when that affects behavior.'
  },
  {
    id: 'resume',
    title: 'Resume',
    summary: 'Restore context around active changes and recommend the next move.',
    scope: 'If no change is specified, recommend the best active candidate and explain why.'
  },
  {
    id: 'status',
    title: 'Status',
    summary: 'Show change progress, readiness, and blockers.',
    scope: 'Inspect artifacts and task state without changing unrelated files.'
  },
  {
    id: 'onboard',
    title: 'Onboard',
    summary: 'Walk a user through the minimum OpsX workflow path.',
    scope: 'Keep onboarding instructional until the user chooses a real change to create.'
  }
];

const PHASE_THREE_PREFLIGHT_LINES = Object.freeze([
  'Read `.opsx/config.yaml` if present to confirm schema, language, and workspace rules.',
  'Read `.opsx/active.yaml` if present to locate the active change pointer.',
  'When an active change exists, read `.opsx/changes/<active-change>/state.yaml` before acting.',
  'When an active change exists, read `.opsx/changes/<active-change>/context.md` before acting.',
  'When an active change exists, read current artifacts (`proposal.md`, `specs/`, `design.md`, optional `security-review.md`, and `tasks.md`) before mutating files.'
]);

const ACTION_FALLBACK_LINES = Object.freeze({
  new: Object.freeze([
    'If `.opsx/config.yaml` is missing, stop and redirect to `{{onboardRoute}}`.',
    'Create `change.yaml`, placeholder planning files (`proposal.md`, `design.md`, `tasks.md`, `specs/README.md`), plus `state.yaml`, `context.md`, and `drift.md`.',
    'Set `.opsx/active.yaml` to the new change and leave `stage: INIT` after scaffold creation.'
  ]),
  propose: Object.freeze([
    'If `.opsx/config.yaml` is missing, stop and redirect to `{{onboardRoute}}`.',
    'Load current state and artifacts before planning mutations.',
    'Update stored artifact hashes only after accepted checkpoint/state writes.'
  ]),
  ff: Object.freeze([
    'If `.opsx/config.yaml` is missing, stop and redirect to `{{onboardRoute}}`.',
    'Fast-forward planning still follows checkpoint order and current persisted stage.',
    'Update stored artifact hashes only after accepted checkpoint/state writes.'
  ]),
  continue: Object.freeze([
    'If `.opsx/config.yaml` is missing, stop and redirect to `{{onboardRoute}}`.',
    'If `.opsx/active.yaml` is missing or points to a missing change, stop and ask the user to run `{{newRoute}}` or `{{proposeRoute}}`.',
    'Read persisted `stage` and route only to the next valid action without re-planning unrelated work.',
    'When `stage === APPLYING_GROUP`, continue the persisted `active.taskGroup` via apply guidance.'
  ]),
  apply: Object.freeze([
    'If `.opsx/config.yaml` is missing, stop and redirect to `{{onboardRoute}}`.',
    'If `.opsx/active.yaml` is missing or points to a missing change, stop and ask the user to run `{{newRoute}}` or `{{proposeRoute}}`.',
    'Execute exactly one top-level task group by default.',
    'After that group, record one execution checkpoint, refresh `context.md` / `drift.md`, and stop for the next run.',
    'Update stored artifact hashes only after accepted checkpoint/state writes.'
  ]),
  onboard: Object.freeze([
    'Workspace not initialized: `.opsx/config.yaml` is missing.',
    'No active change is selected in `.opsx/active.yaml`.',
    'Do not auto-create `.opsx/active.yaml` or change state from `onboard`.',
    'Guide the user to run `opsx install --platform <claude|codex|gemini[,...]>` and then use `{{newRoute}}` or `{{proposeRoute}}`.'
  ]),
  status: Object.freeze([
    'Workspace not initialized: `.opsx/config.yaml` is missing.',
    'No active change is selected in `.opsx/active.yaml`.',
    'Do not auto-create `.opsx/active.yaml` or change state from `status`.',
    'Warn on artifact hash drift, reload from disk, and do not refresh stored hashes from read-only routes.',
    'Report whether the workspace exists, include drift warnings, and recommend the next concrete command.'
  ]),
  resume: Object.freeze([
    'Workspace not initialized: `.opsx/config.yaml` is missing.',
    'No resumable change exists because `.opsx/active.yaml` has no active change.',
    'Do not auto-create `.opsx/active.yaml` or change state from `resume`.',
    'Warn on artifact hash drift, reload from disk, and do not refresh stored hashes from read-only routes.',
    'Recommend `{{newRoute}}` or `{{proposeRoute}}` when there is no active change to resume.'
  ])
});

const MUTATION_HEAVY_ACTION_IDS = new Set([
  'apply',
  'archive',
  'continue',
  'ff',
  'sync',
  'verify',
  'batch-apply',
  'bulk-archive'
]);

const DEFAULT_MUTATION_FALLBACK_LINES = Object.freeze([
  'If `.opsx/config.yaml` is missing, stop and redirect to `{{onboardRoute}}`.',
  'If `.opsx/active.yaml` is missing or points to a missing change, stop and ask the user to run `{{newRoute}}` or `{{proposeRoute}}`.',
  'Do not invent an active change, state file, or task state when required artifacts are absent.'
]);

const DEFAULT_NON_MUTATION_FALLBACK_LINES = Object.freeze([
  'If `.opsx/config.yaml` is missing, explain the workspace status and direct the user to `{{onboardRoute}}`.',
  'If `.opsx/active.yaml` is missing, report it honestly and recommend the next explicit route.'
]);

const REVIEW_STATES = ['required', 'recommended', 'waived', 'completed'];
const CHECKPOINT_STATES = ['PASS', 'WARN', 'BLOCK'];
const DEFAULT_HEURISTIC_INPUTS = ['request', 'proposal', 'specs', 'design'];
const DEFAULT_CHECKPOINT_IDS = ['spec-split-checkpoint', 'spec-checkpoint', 'task-checkpoint', 'execution-checkpoint'];
const PLANNING_ROLLOUT_ARTIFACTS = ['proposal', 'specs', 'design'];
const COMMITMENT_CATEGORIES = ['implementation', 'migration', 'rollback', 'compatibility', 'verification'];
const DEFAULT_TDD_REQUIRE_FOR = ['behavior-change', 'bugfix'];
const DEFAULT_TDD_EXEMPT = ['docs-only', 'copy-only', 'config-only'];
const VISIBLE_TDD_EXEMPT_CLASSES = ['docs-only', 'copy-only', 'config-only', 'migration-only', 'generated-refresh-only'];
const SUPPORTING_TASK_KEYWORDS = [
  'test',
  'verify',
  'rollback',
  'revert',
  'migration',
  'migrate',
  'compatib',
  'security',
  'auth',
  'permission',
  'audit',
  'rate limit'
];
const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'this', 'that', 'from', 'into', 'when', 'where', 'will', 'before', 'after', 'should',
  'must', 'shall', 'have', 'has', 'had', 'was', 'were', 'are', 'is', 'be', 'been', 'being', 'can', 'could', 'would',
  'may', 'might', 'not', 'only', 'also', 'more', 'most', 'least', 'over', 'under', 'about', 'than', 'then', 'else',
  'into', 'onto', 'between', 'across', 'through', 'per', 'via', 'without', 'within', 'using', 'used', 'use', 'need',
  'needs', 'needed', 'ensure', 'ensures', 'ensured', 'support', 'supports', 'supported', 'add', 'adds', 'added',
  'update', 'updates', 'updated', 'implement', 'implements', 'implemented', 'define', 'defines', 'defined',
  'create', 'creates', 'created', 'task', 'tasks', 'group', 'groups', 'item', 'items', 'work', 'works', 'workflow',
  'change', 'changes', 'before', 'after', 'during', 'all', 'any', 'each', 'every', 'both', 'either', 'neither',
  'todo', 'done', 'when', 'then', 'given', 'true', 'false'
]);

const CATEGORY_KEYWORDS = {
  implementation: ['implement', 'feature', 'runtime', 'behavior', 'api', 'logic', 'code', 'integration', 'engine'],
  migration: ['migration', 'migrate', 'backfill', 'upgrade', 'schema change', 'data move', 'rollout'],
  rollback: ['rollback', 'roll back', 'revert'],
  compatibility: ['compatib', 'backward', 'forward compatible', 'legacy'],
  verification: ['test', 'verify', 'validation', 'qa', 'assert', 'coverage']
};

const SECURITY_KEYWORDS = ['security', 'auth', 'permission', 'audit', 'rate limit', 'token', 'encryption', 'signature'];
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
const CONSTRAINT_KEYWORDS = ['constraint', 'limitation', 'blocked by', 'follow-up required', 'new dependency', 'new assumption', '新的约束', '限制'];
const EXECUTION_DOC_HINT_KEYWORDS = ['doc', 'docs', 'readme', 'changelog', 'comment', 'comments', 'metadata'];
const EXECUTION_BEHAVIOR_HINT_KEYWORDS = ['runtime', 'api', 'endpoint', 'handler', 'logic', 'database', 'query', 'schema', 'migration', 'feature', 'bugfix', 'behavior'];
const MANUAL_VERIFICATION_REASON_PATTERN = /\bmanual\b\s+[—-]\s+(.+)$/i;

function unique(items) {
  return Array.from(new Set((items || []).filter(Boolean)));
}

function toList(value) {
  if (Array.isArray(value)) return value.filter((item) => typeof item === 'string');
  if (typeof value === 'string') return [value];
  return [];
}

function parseHeuristicHints(value) {
  return unique(String(value || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean));
}

function getTextBlock(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join('\n');
  return typeof value === 'string' ? value : '';
}

function getSourceBlock(sources = {}, key) {
  return getTextBlock(sources[key]).trim();
}

function countMatches(text, regex) {
  const matches = getTextBlock(text).match(regex);
  return matches ? matches.length : 0;
}

function hasKeyword(text, keyword) {
  return getTextBlock(text).toLowerCase().includes(String(keyword || '').toLowerCase());
}

function hasAnyKeyword(text, keywords = []) {
  const haystack = getTextBlock(text).toLowerCase();
  return keywords.some((keyword) => haystack.includes(String(keyword).toLowerCase()));
}

function hasSection(text, sectionName) {
  return new RegExp(`^##\\s+${sectionName.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`, 'mi').test(getTextBlock(text));
}

function tokenizeText(text, options = {}) {
  const minLength = options.minLength || 3;
  return getTextBlock(text)
    .toLowerCase()
    .split(/[^a-z0-9\u4e00-\u9fff]+/g)
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => token.length >= minLength || /[\u4e00-\u9fff]/.test(token))
    .filter((token) => !STOPWORDS.has(token));
}

function toTokenSet(text, options = {}) {
  return new Set(tokenizeText(text, options));
}

function setIntersectionSize(left, right) {
  if (!left || !right || !left.size || !right.size) return 0;
  let count = 0;
  left.forEach((value) => {
    if (right.has(value)) count += 1;
  });
  return count;
}

function normalizeChecklistItem(item = '') {
  return getTextBlock(item)
    .replace(/^- \[[ xX]\]\s*/g, '')
    .replace(/^\d+(\.\d+)*\s*/g, '')
    .trim();
}

function extractChecklistItems(text) {
  return Array.from(getTextBlock(text).matchAll(/^- \[[ xX]\]\s+.+$/gm))
    .map((match) => match[0].trim());
}

function extractCompletedChecklistItems(text) {
  return Array.from(getTextBlock(text).matchAll(/^- \[[xX]\]\s+.+$/gm))
    .map((match) => match[0].trim());
}

function includesAnyKeyword(text, keywords = []) {
  return hasAnyKeyword(text, keywords);
}

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

function detectRolloutProfile(text) {
  const content = removeMarkdownHeadings(text);
  const statements = extractStatements(content.toLowerCase());
  const mentioned = statements.some((statement) => statementHasRolloutKeyword(statement));
  const statementRequiredPattern = /\b(required|requires|must|shall|needed|mandatory)\b|必须|需要/i;
  const statementNotRequiredPatterns = ROLLOUT_NOT_REQUIRED_PATTERNS;
  const statementHasNotRequiredSignal = (statement) => statementNotRequiredPatterns.some((pattern) => pattern.test(statement));
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

function detectCategoryInText(text, category) {
  const content = removeMarkdownHeadings(text);
  const keywords = CATEGORY_KEYWORDS[category] || [];
  if (!keywords.length) return false;
  const statements = extractStatements(content.toLowerCase());
  const statementHasNotRequiredSignal = (statement) => ROLLOUT_NOT_REQUIRED_PATTERNS.some((pattern) => pattern.test(statement));
  return statements.some((statement) => (
    keywords.some((keyword) => statement.includes(String(keyword).toLowerCase()))
    && !statementHasNotRequiredSignal(statement)
  ));
}

function detectSecurityInText(text) {
  return includesAnyKeyword(text, SECURITY_KEYWORDS);
}

function mergeCommitmentSource(map, category, sourceId) {
  if (!map[category]) map[category] = new Set();
  map[category].add(sourceId);
}

function buildCommitmentSources(specsText, designText) {
  const sources = {};
  const requirementCount = countMatches(specsText, /^### Requirement:/gm);

  if (requirementCount > 0) {
    mergeCommitmentSource(sources, 'implementation', 'specs');
  }

  COMMITMENT_CATEGORIES.forEach((category) => {
    if (detectCategoryInText(specsText, category)) mergeCommitmentSource(sources, category, 'specs');
    if (detectCategoryInText(designText, category)) mergeCommitmentSource(sources, category, 'design');
  });

  if (detectSecurityInText(specsText)) mergeCommitmentSource(sources, 'security', 'specs');
  if (detectSecurityInText(designText)) mergeCommitmentSource(sources, 'security', 'design');

  return sources;
}

function isSupportingTaskItem(text) {
  return includesAnyKeyword(text, SUPPORTING_TASK_KEYWORDS);
}

function detectTaskCoverage(tasksText, commitmentSources = {}) {
  const coverage = {};
  const tasks = getTextBlock(tasksText);
  const checklistItems = extractChecklistItems(tasks)
    .map((item) => normalizeChecklistItem(item))
    .filter(Boolean);
  const nonSupportingItems = checklistItems.filter((item) => !isSupportingTaskItem(item));

  COMMITMENT_CATEGORIES.forEach((category) => {
    if (category === 'implementation') {
      coverage[category] = nonSupportingItems.length > 0 || detectCategoryInText(tasks, category);
      return;
    }
    coverage[category] = detectCategoryInText(tasks, category);
  });

  coverage.security = detectSecurityInText(tasks);
  coverage.byItem = checklistItems.map((item) => ({
    text: item,
    supporting: isSupportingTaskItem(item),
    tokens: Array.from(toTokenSet(item))
  }));
  coverage.requiredCategories = Object.keys(commitmentSources);

  return coverage;
}

function collectScopeTerms(texts = []) {
  const scopeTerms = new Set();
  texts.forEach((text) => {
    tokenizeText(text).forEach((token) => scopeTerms.add(token));
  });
  return scopeTerms;
}

function detectOutOfScopeTaskItems(tasksText, scopeTerms) {
  if (!scopeTerms || scopeTerms.size === 0) return [];
  return extractChecklistItems(tasksText)
    .map((line) => normalizeChecklistItem(line))
    .filter(Boolean)
    .filter((item) => !isSupportingTaskItem(item))
    .filter((item) => {
      const itemTerms = toTokenSet(item);
      if (!itemTerms.size) return false;
      return setIntersectionSize(itemTerms, scopeTerms) === 0;
    });
}

function normalizeLegacyPlanningFlags(flags = {}) {
  return {
    scopeDrift: flags.scopeDrift === true,
    crossSpecConflict: flags.crossSpecConflict === true,
    outOfScopeTasks: flags.outOfScopeTasks === true,
    orderingConflict: flags.orderingConflict === true
  };
}

function mergeLegacyPlanningFlags(...sources) {
  return sources.reduce((output, source) => {
    const normalized = normalizeLegacyPlanningFlags(source || {});
    Object.keys(normalized).forEach((key) => {
      output[key] = output[key] || normalized[key];
    });
    return output;
  }, normalizeLegacyPlanningFlags({}));
}

function normalizeLegacyExecutionFlags(flags = {}) {
  return {
    driftDetected: flags.driftDetected === true,
    newConstraints: flags.newConstraints === true,
    securityControlGap: flags.securityControlGap === true,
    qualityGap: flags.qualityGap === true,
    requiresTesting: flags.requiresTesting === true,
    nextGroupBlocked: flags.nextGroupBlocked === true,
    behaviorChanged: typeof flags.behaviorChanged === 'boolean' ? flags.behaviorChanged : null,
    docsOnly: flags.docsOnly === true
  };
}

function resolvePlanningEvidence(options = {}) {
  const provided = options.planningEvidence && typeof options.planningEvidence === 'object'
    ? options.planningEvidence
    : null;
  if (!provided) return normalizePlanningEvidence(options);
  return Object.assign({}, provided, {
    legacy: mergeLegacyPlanningFlags(provided.legacy, options.flags)
  });
}

function normalizePlanningEvidence(options = {}) {
  const sources = options.sources || {};
  const proposalText = getSourceBlock(sources, 'proposal');
  const specsText = getSourceBlock(sources, 'specs');
  const designText = getSourceBlock(sources, 'design');
  const tasksText = getSourceBlock(sources, 'tasks');
  const taskGroups = extractTopLevelTaskGroups(tasksText);
  const checklistItems = extractChecklistItems(tasksText);
  const rollout = {};

  PLANNING_ROLLOUT_ARTIFACTS.forEach((artifactId) => {
    rollout[artifactId] = detectRolloutProfile(getSourceBlock(sources, artifactId));
  });
  rollout.tasks = detectRolloutProfile(tasksText);

  const commitmentSources = buildCommitmentSources(specsText, designText);
  const taskCoverage = detectTaskCoverage(tasksText, commitmentSources);
  const scopeTerms = collectScopeTerms([proposalText, specsText, designText]);
  const outOfScopeTaskItems = detectOutOfScopeTaskItems(tasksText, scopeTerms);

  return {
    proposal: {
      text: proposalText,
      present: Boolean(proposalText),
      terms: Array.from(toTokenSet(proposalText))
    },
    specs: {
      text: specsText,
      present: Boolean(specsText),
      requirementCount: countMatches(specsText, /^### Requirement:/gm),
      scenarioCount: countMatches(specsText, /^#### Scenario:/gm),
      terms: Array.from(toTokenSet(specsText))
    },
    design: {
      text: designText,
      present: Boolean(designText),
      terms: Array.from(toTokenSet(designText))
    },
    tasks: {
      text: tasksText,
      present: Boolean(tasksText),
      groups: taskGroups,
      checklistItems,
      outOfScopeTaskItems,
      scopeTerms: Array.from(scopeTerms),
      taskCoverage
    },
    rollout,
    commitmentSources: Object.keys(commitmentSources).reduce((output, category) => {
      output[category] = Array.from(commitmentSources[category]);
      return output;
    }, {}),
    legacy: normalizeLegacyPlanningFlags(options.flags || {})
  };
}

function normalizeSpecSplitSpecFiles(options = {}) {
  if (Array.isArray(options.specFiles) && options.specFiles.length > 0) {
    return options.specFiles.map((entry = {}) => ({
      path: String(entry.path || ''),
      text: getTextBlock(entry.text)
    }));
  }

  const inlineSpecsText = getSourceBlock(options.sources || {}, 'specs');
  if (!inlineSpecsText) return [];
  return [{
    path: 'specs/inline/spec.md',
    text: inlineSpecsText
  }];
}

function countUniqueCapabilityDirectories(specFiles = []) {
  const capabilityIds = specFiles
    .map((specFile) => String(specFile.path || '').replace(/\\/g, '/'))
    .map((normalizedPath) => {
      const match = normalizedPath.match(/^specs\/([^/]+)\/spec\.md$/i);
      if (match) return match[1].toLowerCase();
      const segments = normalizedPath.split('/').filter(Boolean);
      if (segments.length >= 2 && segments[0] === 'specs') return String(segments[1]).toLowerCase();
      return 'inline';
    })
    .filter(Boolean);
  return new Set(capabilityIds).size;
}

function normalizeChangedFiles(value) {
  if (Array.isArray(value)) return unique(value.filter((entry) => typeof entry === 'string' && entry.trim()).map((entry) => entry.trim()));
  if (typeof value === 'string') {
    return unique(value
      .split('\n')
      .map((entry) => entry.trim())
      .filter(Boolean));
  }
  return [];
}

function isDocsPath(filePath = '') {
  const normalized = String(filePath || '').replace(/\\/g, '/').toLowerCase();
  if (
    /^commands\//.test(normalized)
    || normalized.startsWith(OPSX_SKILL_DIR_PREFIX)
    || normalized.startsWith(LEGACY_SKILL_DIR_PREFIX)
  ) return false;
  return (
    /\.md$/i.test(normalized)
    || /^docs\//i.test(normalized)
    || normalized.startsWith(LEGACY_CHANGE_DIR_PREFIX)
    || /readme/i.test(normalized)
    || /changelog/i.test(normalized)
  );
}

function deriveDocsOnlyClassification(changedFiles = [], text = '') {
  if (changedFiles.length > 0) {
    return changedFiles.every((filePath) => isDocsPath(filePath));
  }
  if (includesAnyKeyword(text, EXECUTION_DOC_HINT_KEYWORDS) && !includesAnyKeyword(text, EXECUTION_BEHAVIOR_HINT_KEYWORDS)) {
    return true;
  }
  return false;
}

function parseExecutionConstraintSignals(text = '') {
  const content = getTextBlock(text);
  return CONSTRAINT_KEYWORDS.filter((keyword) => hasKeyword(content, keyword));
}

function normalizeExecutionEvidence(options = {}) {
  const group = options.group || {};
  const explicit = options.executionEvidence && typeof options.executionEvidence === 'object' ? options.executionEvidence : {};
  const legacy = normalizeLegacyExecutionFlags(options.flags || {});
  const groupTitle = explicit.groupId || explicit.groupTitle || group.id || group.title || '';
  const groupText = getTextBlock(explicit.groupText || group.text);
  const completedItems = Array.isArray(explicit.completedItems) && explicit.completedItems.length
    ? explicit.completedItems.map((item) => getTextBlock(item).trim()).filter(Boolean)
    : extractCompletedChecklistItems(groupText).map((item) => normalizeChecklistItem(item));
  const changedFiles = normalizeChangedFiles(explicit.changedFiles || group.changedFiles || options.changedFiles);
  const implementationSummary = getTextBlock(explicit.implementationSummary || options.implementationSummary || group.summary);
  const behaviorHintText = [groupTitle, groupText, implementationSummary, changedFiles.join('\n')].join('\n');
  const explicitBehaviorChanged = typeof explicit.behaviorChanged === 'boolean'
    ? explicit.behaviorChanged
    : (typeof legacy.behaviorChanged === 'boolean' ? legacy.behaviorChanged : null);
  const docsOnlyDerived = explicit.docsOnly === true || legacy.docsOnly === true || deriveDocsOnlyClassification(changedFiles, behaviorHintText);
  const behaviorChanged = typeof explicitBehaviorChanged === 'boolean' ? explicitBehaviorChanged : !docsOnlyDerived;
  const verificationSummary = getTextBlock(explicit.verificationSummary || explicit.verification || options.verification || group.verification);
  const verificationSignals = [verificationSummary, groupText, implementationSummary].join('\n');
  const verificationPresent = Boolean(verificationSummary)
    || includesAnyKeyword(verificationSignals, ['test', 'verify', 'validation', 'qa', 'assert', 'coverage']);
  const requiresTesting = explicit.requiresTesting === true || legacy.requiresTesting === true || behaviorChanged;
  const constraints = unique([
    ...toList(explicit.newConstraints),
    // Constraint auto-detection should come from implementation evidence,
    // not task template phrasing in the group body.
    ...parseExecutionConstraintSignals(implementationSummary)
  ]);
  const referencedCommitments = {
    specs: unique(toList(explicit.specRefs)),
    design: unique(toList(explicit.designRefs))
  };
  const implementationTerms = toTokenSet(implementationSummary);
  const scopeTerms = toTokenSet([groupTitle, completedItems.join('\n')].join('\n'));
  const hasSemanticImplementationEvidence = Boolean(implementationSummary.trim());

  return {
    group: {
      id: groupTitle,
      text: groupText,
      completed: explicit.completed === true || group.completed === true,
      completedItems,
      scopeTerms: Array.from(scopeTerms)
    },
    implementation: {
      summary: implementationSummary,
      changedFiles,
      terms: Array.from(implementationTerms),
      referencedCommitments,
      constraints,
      hasSemanticEvidence: hasSemanticImplementationEvidence,
      explicitMismatch: explicit.commitmentMismatch === true || explicit.contradictsDesign === true || explicit.scopeMismatch === true
    },
    behavior: {
      changed: behaviorChanged,
      docsOnly: docsOnlyDerived,
      source: typeof explicitBehaviorChanged === 'boolean' ? 'explicit' : (legacy.docsOnly ? 'legacy-docs-flag' : 'derived')
    },
    verification: {
      requiresTesting,
      present: verificationPresent,
      summary: verificationSummary
    },
    legacy
  };
}

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

function hasFinding(findings = [], code) {
  return findings.some((finding) => finding.code === code);
}

function addFinding(findings = [], finding = {}) {
  if (!finding || !finding.code) return;
  if (!hasFinding(findings, finding.code)) findings.push(finding);
}

function resolveCheckpointStatus(findings = []) {
  const normalized = findings.map(normalizeFinding);
  if (normalized.some((finding) => finding.severity === 'BLOCK')) return 'BLOCK';
  if (normalized.length) return 'WARN';
  return 'PASS';
}

function normalizeArtifactPresence(artifacts = {}) {
  return Object.keys(artifacts || {}).reduce((output, artifactId) => {
    output[artifactId] = artifacts[artifactId] === true;
    return output;
  }, {});
}

function resolveSchema(options = {}) {
  if (options.schema && typeof options.schema === 'object') return options.schema;
  const schemaName = options.schemaName || (options.config && options.config.schema) || DEFAULT_SCHEMA;
  return loadSchema(schemaName);
}

function getArtifactDefinition(schema, artifactId) {
  return (schema.artifacts || []).find((artifact) => artifact.id === artifactId) || null;
}

function getCheckpointDefinition(schema, checkpointId) {
  return (schema.checkpoints || []).find((checkpoint) => checkpoint.id === checkpointId) || {
    id: checkpointId,
    states: CHECKPOINT_STATES
  };
}

function getSecurityHeuristicConfig(schemaArtifact, config = {}) {
  const securityReview = config.securityReview || {};
  const activation = schemaArtifact && schemaArtifact.activation ? schemaArtifact.activation : {};
  const heuristic = activation.heuristic || {};
  const inputs = unique(toList(heuristic.inputs).length ? toList(heuristic.inputs) : DEFAULT_HEURISTIC_INPUTS);
  const keywords = unique([
    ...toList(heuristic.keywords).map((keyword) => keyword.toLowerCase()),
    ...parseHeuristicHints(securityReview.heuristicHint)
  ]);
  return { inputs, keywords };
}

function collectSourceText(sources = {}, inputs = DEFAULT_HEURISTIC_INPUTS) {
  return inputs
    .map((inputKey) => getTextBlock(sources[inputKey]))
    .join('\n')
    .toLowerCase();
}

function resolveSecurityReviewState(options = {}) {
  const schema = resolveSchema(options);
  const schemaArtifact = getArtifactDefinition(schema, 'security-review') || {};
  const config = options.config || {};
  const securityReviewConfig = config.securityReview || {};
  const change = options.change || {};
  const artifacts = normalizeArtifactPresence(options.artifacts);
  const completed = artifacts['security-review'] === true;
  const explicitRequired = change.securitySensitive === true || securityReviewConfig.required === true;
  const heuristicEnabled = securityReviewConfig.mode !== 'off';
  const { inputs, keywords } = getSecurityHeuristicConfig(schemaArtifact, config);
  const sourceText = collectSourceText(options.sources, inputs);
  const matchedSignals = heuristicEnabled
    ? keywords.filter((keyword) => sourceText.includes(keyword))
    : [];
  const heuristicTriggered = matchedSignals.length > 0;
  const allowWaiver = securityReviewConfig.allowWaiver !== false;
  const waiver = change.securityWaiver && typeof change.securityWaiver === 'object' ? change.securityWaiver : {};
  const waiverApproved = waiver.approved === true;
  const waiverReason = typeof waiver.reason === 'string' ? waiver.reason.trim() : '';
  const waived = !completed && !explicitRequired && heuristicTriggered && allowWaiver && waiverApproved && Boolean(waiverReason);

  let state = null;
  if (completed) state = 'completed';
  else if (explicitRequired) state = 'required';
  else if (waived) state = 'waived';
  else if (heuristicTriggered) state = 'recommended';

  return {
    active: completed || explicitRequired,
    state,
    completed,
    required: state === 'required',
    recommended: state === 'recommended',
    waived,
    allowWaiver,
    explicitRequired,
    heuristicTriggered,
    heuristicInputs: inputs,
    matchedSignals,
    waiverReason,
    blockerArtifacts: state === 'required' ? ['security-review'] : []
  };
}

function resolveWorkflowState(options = {}) {
  const schema = resolveSchema(options);
  const artifacts = normalizeArtifactPresence(options.artifacts);
  const review = resolveSecurityReviewState({
    schema,
    config: options.config,
    change: options.change,
    artifacts,
    sources: options.sources
  });
  const reviewArtifact = getArtifactDefinition(schema, 'security-review');
  const gatedArtifacts = new Set(reviewArtifact && Array.isArray(reviewArtifact.gates) ? reviewArtifact.gates : []);

  const artifactStates = (schema.artifacts || []).reduce((output, artifact) => {
    const exists = artifacts[artifact.id] === true;
    const blockers = [];

    (artifact.requires || []).forEach((requiredArtifactId) => {
      if (artifacts[requiredArtifactId] !== true) blockers.push(requiredArtifactId);
    });

    if (review.required && gatedArtifacts.has(artifact.id) && artifacts['security-review'] !== true) {
      blockers.push('security-review');
    }

    output[artifact.id] = {
      state: exists ? 'DONE' : blockers.length ? 'BLOCKED' : 'READY',
      blockers: unique(blockers),
      optional: artifact.optional === true,
      active: artifact.id === 'security-review' ? review.active : true
    };
    return output;
  }, {});

  return {
    schema: schema.id,
    review,
    artifacts: artifactStates
  };
}

function summarizeWorkflowState(options = {}) {
  const resolved = resolveWorkflowState(options);
  return {
    schema: resolved.schema,
    securityReview: resolved.review.state ? {
      state: resolved.review.state,
      active: resolved.review.active,
      matchedSignals: resolved.review.matchedSignals,
      waiverReason: resolved.review.waiverReason,
      blockers: resolved.review.blockerArtifacts
    } : null,
    artifacts: Object.keys(resolved.artifacts).reduce((output, artifactId) => {
      output[artifactId] = {
        state: resolved.artifacts[artifactId].state,
        active: resolved.artifacts[artifactId].active,
        blockers: resolved.artifacts[artifactId].blockers
      };
      return output;
    }, {}),
    checkpoints: (options.checkpoints || []).map((checkpoint) => ({
      checkpoint: checkpoint.checkpoint,
      status: checkpoint.status,
      nextStep: checkpoint.nextStep,
      patchTargets: checkpoint.patchTargets
    }))
  };
}

function buildCheckpointNextStep(checkpointId, status, patchTargets) {
  if (status === 'PASS') {
    if (checkpointId === 'spec-split-checkpoint') return 'Proceed to design.';
    if (checkpointId === 'spec-checkpoint') return 'Proceed to tasks.';
    if (checkpointId === 'task-checkpoint') return 'Proceed to apply.';
    return 'Proceed to the next top-level task group.';
  }
  if (status === 'WARN') {
    if (patchTargets.length) return `Continue, but patch existing artifacts first or immediately after: ${patchTargets.join(', ')}.`;
    return 'Continue with recorded findings.';
  }
  if (patchTargets.length) return `Stop and update existing artifacts before continuing: ${patchTargets.join(', ')}.`;
  return 'Stop and update existing artifacts before continuing.';
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

function extractTopLevelTaskGroups(tasksText) {
  const text = getTextBlock(tasksText);
  const matches = Array.from(text.matchAll(/^##\s+(\d+\.\s+.+)$/gm));
  return matches.map((match, index) => {
    const start = match.index;
    const end = index + 1 < matches.length ? matches[index + 1].index : text.length;
    const body = text.slice(start, end).trim();
    return {
      heading: match[1].trim(),
      text: body,
      items: Array.from(body.matchAll(/^- \[[ xX]\]\s+.+$/gm)).map((item) => item[0])
    };
  });
}

function normalizeTddClassToken(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
}

function normalizeTddClassList(values = [], defaults = []) {
  return unique([
    ...toList(defaults),
    ...toList(values)
  ].map((entry) => normalizeTddClassToken(entry)).filter(Boolean));
}

function resolveTddCheckpointConfig(config = {}) {
  const rules = config && typeof config === 'object' && config.rules && typeof config.rules === 'object'
    ? config.rules
    : {};
  const tdd = rules.tdd && typeof rules.tdd === 'object' && !Array.isArray(rules.tdd)
    ? rules.tdd
    : {};
  const mode = typeof tdd.mode === 'string' ? tdd.mode.trim().toLowerCase() : '';
  return {
    mode: ['off', 'light', 'strict'].includes(mode) ? mode : 'strict',
    requireFor: normalizeTddClassList(tdd.requireFor, DEFAULT_TDD_REQUIRE_FOR),
    exempt: normalizeTddClassList(tdd.exempt, DEFAULT_TDD_EXEMPT)
  };
}

function parseManualVerificationText(value = '') {
  const text = String(value || '').trim();
  if (!/\bmanual\b/i.test(text)) {
    return { manual: false, reason: '' };
  }
  const reasonMatch = text.match(MANUAL_VERIFICATION_REASON_PATTERN);
  return {
    manual: true,
    reason: reasonMatch && reasonMatch[1] ? reasonMatch[1].trim() : ''
  };
}

function extractTestPlanSection(tasksText) {
  const text = getTextBlock(tasksText);
  const headingMatch = text.match(/^##\s+Test Plan\s*$/im);
  if (!headingMatch || headingMatch.index === undefined) {
    return {
      present: false,
      text: '',
      lines: [],
      fields: {},
      verification: '',
      manualVerification: false,
      manualVerificationReason: '',
      manualVerificationReasonMissing: false
    };
  }

  const sectionStart = headingMatch.index + headingMatch[0].length;
  const remainder = text.slice(sectionStart);
  const nextHeading = remainder.match(/^\s*##\s+/m);
  const sectionBody = (nextHeading ? remainder.slice(0, nextHeading.index) : remainder).trim();
  const lines = sectionBody
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean);
  const fields = {};
  lines.forEach((line) => {
    const fieldMatch = line.match(/^-+\s*([^:]+):\s*(.+)$/);
    if (!fieldMatch) return;
    const key = String(fieldMatch[1] || '').trim().toLowerCase();
    const value = String(fieldMatch[2] || '').trim();
    if (!key || !value) return;
    fields[key] = value;
  });

  const verification = fields.verification || '';
  const manualVerification = parseManualVerificationText(verification);

  return {
    present: true,
    text: sectionBody,
    lines,
    fields,
    verification,
    manualVerification: manualVerification.manual,
    manualVerificationReason: manualVerification.reason,
    manualVerificationReasonMissing: manualVerification.manual && !manualVerification.reason
  };
}

function parseTddGroupMetadata(groupText) {
  const text = getTextBlock(groupText);
  const classMatch = text.match(/^\s*-\s*TDD Class:\s*([^\n\r]+)\s*$/im);
  const exemptionMatch = text.match(/^\s*-\s*TDD Exemption:\s*([^\n\r]+)\s*$/im);
  const explicitClass = classMatch ? normalizeTddClassToken(classMatch[1]) : '';

  let exemptionClass = '';
  let exemptionReason = '';
  if (exemptionMatch) {
    const rawExemption = String(exemptionMatch[1] || '').trim();
    const parsed = rawExemption.match(/^(.+?)(?:\s+[—-]\s+(.+))?$/);
    if (parsed) {
      exemptionClass = normalizeTddClassToken(parsed[1]);
      exemptionReason = parsed[2] ? String(parsed[2]).trim() : '';
    } else {
      exemptionClass = normalizeTddClassToken(rawExemption);
    }
  }

  const verifyEntries = Array.from(text.matchAll(/^- \[[ xX]\]\s+VERIFY:\s*(.+)$/gim))
    .map((entry) => String(entry[1] || '').trim())
    .filter(Boolean);
  const manualVerifyRationaleMissing = verifyEntries.some((entry) => {
    const manual = parseManualVerificationText(entry);
    return manual.manual && !manual.reason;
  });

  return {
    explicitClass,
    exemptionClass,
    exemptionReason,
    hasRedStep: /^- \[[ xX]\]\s+RED:\s*/im.test(text),
    hasGreenStep: /^- \[[ xX]\]\s+GREEN:\s*/im.test(text),
    hasVerifyStep: /^- \[[ xX]\]\s+VERIFY:\s*/im.test(text),
    hasRefactorStep: /^- \[[ xX]\]\s+REFACTOR:\s*/im.test(text),
    verifyEntries,
    manualVerifyRationaleMissing
  };
}

function inferTddGroupClass(group = {}, evidence = {}) {
  const groupHeading = String(group.heading || '').toLowerCase();
  const groupText = getTextBlock(group.text).toLowerCase();
  const proposalText = evidence.proposal && evidence.proposal.text ? evidence.proposal.text : '';
  const specsText = evidence.specs && evidence.specs.text ? evidence.specs.text : '';
  const designText = evidence.design && evidence.design.text ? evidence.design.text : '';
  const planningText = [proposalText, specsText, designText].join('\n').toLowerCase();
  const haystack = [groupHeading, groupText, planningText].join('\n');

  if (/\bbehavior[- ]?change\b/.test(haystack)) return 'behavior-change';
  if (/\bbug[- ]?fix\b/.test(haystack) || /\bbugfix\b/.test(haystack)) return 'bugfix';
  if (/\bdocs[- ]?only\b/.test(haystack)) return 'docs-only';
  if (/\bcopy[- ]?only\b/.test(haystack)) return 'copy-only';
  if (/\bconfig[- ]?only\b/.test(haystack)) return 'config-only';
  if (/\bmigration[- ]?only\b/.test(haystack)) return 'migration-only';
  if (/\bgenerated[- ]?refresh[- ]?only\b/.test(haystack)) return 'generated-refresh-only';

  return '';
}

function classifyTaskGroupTdd(group, evidence, config) {
  const normalizedGroup = group && typeof group === 'object' ? group : { heading: '', text: '', items: [] };
  const metadata = parseTddGroupMetadata(normalizedGroup.text);
  const resolvedConfig = config && typeof config === 'object' && Array.isArray(config.requireFor) && Array.isArray(config.exempt)
    ? config
    : resolveTddCheckpointConfig(config);
  const requireForSet = new Set(normalizeTddClassList(resolvedConfig.requireFor, DEFAULT_TDD_REQUIRE_FOR));
  const exemptSet = new Set(normalizeTddClassList(resolvedConfig.exempt, DEFAULT_TDD_EXEMPT));
  const visibleExemptSet = new Set(normalizeTddClassList(VISIBLE_TDD_EXEMPT_CLASSES, []));

  let tddClass = '';
  let classSource = 'heuristic';

  if (metadata.exemptionClass) {
    tddClass = metadata.exemptionClass;
    classSource = 'explicit-exemption';
  } else if (metadata.explicitClass) {
    tddClass = metadata.explicitClass;
    classSource = 'explicit-class';
  } else {
    tddClass = inferTddGroupClass(normalizedGroup, evidence);
    classSource = tddClass ? 'heuristic' : 'unclassified';
  }

  const explicitlyExempt = Boolean(metadata.exemptionClass)
    && (visibleExemptSet.has(metadata.exemptionClass) || exemptSet.has(metadata.exemptionClass));
  const exemptByClass = !explicitlyExempt && Boolean(tddClass) && exemptSet.has(tddClass);
  const exempt = explicitlyExempt || exemptByClass;
  const required = !exempt && Boolean(tddClass) && requireForSet.has(tddClass);

  return {
    heading: String(normalizedGroup.heading || '').trim(),
    class: tddClass || null,
    classSource,
    required,
    exempt,
    exemptionClass: metadata.exemptionClass || null,
    exemptionReason: metadata.exemptionReason || '',
    hasRedStep: metadata.hasRedStep,
    hasGreenStep: metadata.hasGreenStep,
    hasVerifyStep: metadata.hasVerifyStep,
    hasRefactorStep: metadata.hasRefactorStep,
    manualVerifyRationaleMissing: metadata.manualVerifyRationaleMissing
  };
}

function appendTddTaskCheckpointFindings(findings, groups, evidence, config) {
  const tddConfig = resolveTddCheckpointConfig(config);
  const testPlan = extractTestPlanSection(evidence.tasks ? evidence.tasks.text : '');
  const tddGroups = (groups || []).map((group) => classifyTaskGroupTdd(group, evidence, tddConfig));

  if (tddConfig.mode === 'off') {
    return {
      mode: tddConfig.mode,
      testPlanPresent: testPlan.present,
      groups: tddGroups
    };
  }

  const requiredGroups = tddGroups.filter((group) => group.required === true);
  if (requiredGroups.length > 0 && !testPlan.present) {
    addFinding(findings, {
      severity: 'WARN',
      code: 'tdd-test-plan-missing',
      message: 'Required TDD task groups must include a `## Test Plan` section.',
      patchTargets: ['tasks']
    });
  }

  const requiredSeverity = tddConfig.mode === 'strict' ? 'BLOCK' : 'WARN';
  const missingRedHeadings = requiredGroups
    .filter((group) => group.hasRedStep !== true)
    .map((group) => group.heading)
    .filter(Boolean);
  if (missingRedHeadings.length > 0) {
    addFinding(findings, {
      severity: requiredSeverity,
      code: 'tdd-red-missing',
      message: `TDD required task groups are missing RED checklist steps: ${missingRedHeadings.join(', ')}.`,
      patchTargets: ['tasks']
    });
  }

  const missingVerifyHeadings = requiredGroups
    .filter((group) => group.hasVerifyStep !== true)
    .map((group) => group.heading)
    .filter(Boolean);
  if (missingVerifyHeadings.length > 0) {
    addFinding(findings, {
      severity: requiredSeverity,
      code: 'tdd-verify-missing',
      message: `TDD required task groups are missing VERIFY checklist steps: ${missingVerifyHeadings.join(', ')}.`,
      patchTargets: ['tasks']
    });
  }

  const manualVerificationReasonMissing = testPlan.manualVerificationReasonMissing
    || tddGroups.some((group) => group.manualVerifyRationaleMissing === true);
  if (manualVerificationReasonMissing) {
    addFinding(findings, {
      severity: 'WARN',
      code: 'tdd-manual-verify-rationale-missing',
      message: 'Manual-only verification must include a reason after `manual —`.',
      patchTargets: ['tasks']
    });
  }

  return {
    mode: tddConfig.mode,
    testPlanPresent: testPlan.present,
    groups: tddGroups
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
    addFinding(findings, {
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
    addFinding(findings, {
      severity: 'WARN',
      code: includeTasks ? 'rollout-detail-missing-task' : 'rollout-detail-missing',
      message: includeTasks
        ? 'At least one planning artifact or task plan is missing rollout, migration, rollback, or compatibility detail.'
        : 'At least one planning artifact is missing rollout, migration, rollback, or compatibility detail.',
      patchTargets: missingDetail
    });
  }
}

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
    addFinding(findings, {
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
    addFinding(findings, {
      severity: 'BLOCK',
      code: `task-${category}-coverage-missing`,
      message: `Tasks are missing required ${category} work committed in planning artifacts.`,
      patchTargets: unique(['tasks', ...sources])
    });
  });

  const securitySources = commitmentSources.security || [];
  if (securitySources.length && taskCoverage.security !== true) {
    addFinding(findings, {
      severity: 'WARN',
      code: 'security-task-coverage-missing',
      message: 'Tasks should capture security control work referenced by specs or design.',
      patchTargets: unique(['tasks', ...securitySources])
    });
  }
}

function appendPlanningLegacyFindings(findings = [], legacy = {}, options = {}) {
  if (legacy.scopeDrift === true) {
    addFinding(findings, {
      severity: 'BLOCK',
      code: 'scope-drift',
      message: 'Planning artifacts drift from the approved proposal scope.',
      patchTargets: ['proposal', 'specs', 'design']
    });
  }
  if (legacy.crossSpecConflict === true) {
    addFinding(findings, {
      severity: 'BLOCK',
      code: 'cross-spec-conflict',
      message: 'Specs conflict with each other and must be reconciled.',
      patchTargets: ['specs']
    });
  }
  if (legacy.outOfScopeTasks === true && options.includeTaskFlags === true) {
    addFinding(findings, {
      severity: 'BLOCK',
      code: 'out-of-scope-tasks',
      message: 'Task plan contains out-of-scope work not supported by planning artifacts.',
      patchTargets: ['tasks', 'specs', 'design']
    });
  }
  if (legacy.orderingConflict === true && options.includeTaskFlags === true) {
    addFinding(findings, {
      severity: 'WARN',
      code: 'task-ordering-conflict',
      message: 'Task ordering should be revised to better match dependency order.',
      patchTargets: ['tasks']
    });
  }
}

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
    addFinding(findings, {
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
    addFinding(findings, {
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
    addFinding(findings, {
      severity: 'BLOCK',
      code: 'out-of-scope-tasks-auto',
      message: 'Task plan contains out-of-scope work not supported by planning artifacts.',
      patchTargets: ['tasks', 'proposal', 'specs', 'design']
    });
  }

  if (review.required && !(options.artifacts || {})['security-review']) {
    addFinding(findings, {
      severity: 'BLOCK',
      code: 'security-review-required-task-checkpoint',
      message: 'Security review is required before apply can begin.',
      patchTargets: ['security-review']
    });
  } else if (review.recommended && !review.waived && !review.completed) {
    addFinding(findings, {
      severity: 'WARN',
      code: 'security-review-recommended-task-checkpoint',
      message: 'Security review is recommended before apply begins.',
      patchTargets: ['security-review']
    });
  }

  if ((review.required || review.recommended || review.completed) && tasksText && !hasAnyKeyword(tasksText, SECURITY_KEYWORDS)) {
    addFinding(findings, {
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
      exemptionReason: group.exemptionReason,
      hasRedStep: group.hasRedStep,
      hasGreenStep: group.hasGreenStep,
      hasVerifyStep: group.hasVerifyStep,
      hasRefactorStep: group.hasRefactorStep,
      manualVerifyRationaleMissing: group.manualVerifyRationaleMissing
    }))
  };
  return result;
}

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

  if (
    evidence.behavior.changed
    && evidence.implementation.hasSemanticEvidence === true
    && scopeTerms.size >= 3
    && implementationTerms.size >= 3
    && setIntersectionSize(scopeTerms, implementationTerms) === 0
  ) {
    addFinding(findings, {
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
    addFinding(findings, {
      severity: 'BLOCK',
      code: 'implementation-commitment-drift',
      message: 'Implementation evidence diverges from accepted specs or design commitments.',
      patchTargets: ['specs', 'design', 'tasks']
    });
  }

  if (evidence.implementation.explicitMismatch === true || evidence.legacy.driftDetected === true) {
    addFinding(findings, {
      severity: 'BLOCK',
      code: 'implementation-drift',
      message: 'Implementation drift requires existing artifacts to be updated before continuing.',
      patchTargets: ['specs', 'design', 'tasks']
    });
  }

  if (evidence.implementation.constraints.length || evidence.legacy.newConstraints === true) {
    addFinding(findings, {
      severity: 'BLOCK',
      code: 'new-constraints-detected',
      message: 'New implementation constraints require artifact updates before the next task group.',
      patchTargets: ['specs', 'design', 'tasks']
    });
  }

  if (evidence.legacy.securityControlGap === true) {
    addFinding(findings, {
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
    addFinding(findings, {
      severity: 'WARN',
      code: 'quality-gap',
      message: 'Task-group output should include testing or verification work before moving on.',
      patchTargets: ['tasks']
    });
  }

  if (evidence.legacy.nextGroupBlocked === true) {
    addFinding(findings, {
      severity: 'BLOCK',
      code: 'next-group-not-ready',
      message: 'The next top-level task group is not ready to begin yet.',
      patchTargets: ['tasks', 'design']
    });
  }

  return buildCheckpointResult(schema, 'execution-checkpoint', findings, { phase: 'execution' });
}

function validatePhaseOneWorkflowContract(options = {}) {
  const issues = [];
  const schema = resolveSchema(options);
  const securityReviewArtifact = getArtifactDefinition(schema, 'security-review');

  if (!securityReviewArtifact) {
    issues.push('Workflow validation: missing `security-review` artifact in schema.');
    return issues;
  }

  if (!Array.isArray(securityReviewArtifact.states)) {
    issues.push('Workflow validation: `security-review` artifact must declare canonical review states.');
  } else {
    REVIEW_STATES.forEach((state) => {
      if (!securityReviewArtifact.states.includes(state)) {
        issues.push(`Workflow validation: schema is missing security-review state \`${state}\`.`);
      }
    });
  }

  const baseConfig = {
    schema: schema.id,
    securityReview: {
      mode: 'heuristic',
      required: false,
      allowWaiver: true,
      heuristicHint: 'auth, admin, token, payment'
    }
  };
  const baseArtifacts = {
    proposal: true,
    specs: true,
    design: true,
    tasks: false,
    'security-review': false
  };

  const hardGate = resolveWorkflowState({
    schema,
    config: baseConfig,
    change: {
      securitySensitive: true,
      securityWaiver: { approved: false, reason: '' }
    },
    artifacts: baseArtifacts,
    sources: {}
  });

  if (hardGate.review.state !== 'required') {
    issues.push('Workflow validation: explicit security-sensitive changes must resolve to `required` review state.');
  }
  if (hardGate.artifacts.tasks.state !== 'BLOCKED') {
    issues.push('Workflow validation: hard-gated changes must block `tasks` until `security-review.md` exists.');
  }
  if (!hardGate.artifacts.tasks.blockers.includes('security-review')) {
    issues.push('Workflow validation: hard-gated `tasks` must report `security-review` as a blocker.');
  }

  const recommended = resolveWorkflowState({
    schema,
    config: baseConfig,
    change: {
      securitySensitive: false,
      securityWaiver: { approved: false, reason: '' }
    },
    artifacts: baseArtifacts,
    sources: {
      request: 'add admin auth token workflow'
    }
  });

  if (recommended.review.state !== 'recommended') {
    issues.push('Workflow validation: heuristic security matches must resolve to `recommended` review state.');
  }
  if (recommended.artifacts['security-review'].active !== false) {
    issues.push('Workflow validation: heuristic recommendations must not leave `security-review` active.');
  }
  if (recommended.artifacts.tasks.state !== 'READY') {
    issues.push('Workflow validation: heuristic recommendations must not block `tasks` by default.');
  }

  const recommendedSummary = summarizeWorkflowState({
    schema,
    config: baseConfig,
    change: {
      securitySensitive: false,
      securityWaiver: { approved: false, reason: '' }
    },
    artifacts: baseArtifacts,
    sources: {
      request: 'add admin auth token workflow'
    }
  });
  if (!recommendedSummary.securityReview || recommendedSummary.securityReview.active !== false) {
    issues.push('Workflow validation: workflow summary must expose advisory review as inactive.');
  }
  if (!recommendedSummary.artifacts['security-review'] || recommendedSummary.artifacts['security-review'].active !== false) {
    issues.push('Workflow validation: workflow summary must expose advisory security-review artifact as inactive.');
  }

  const waived = resolveWorkflowState({
    schema,
    config: baseConfig,
    change: {
      securitySensitive: false,
      securityWaiver: {
        approved: true,
        reason: 'Reviewed manually outside workflow.'
      }
    },
    artifacts: baseArtifacts,
    sources: {
      request: 'add admin auth token workflow'
    }
  });

  if (waived.review.state !== 'waived') {
    issues.push('Workflow validation: approved heuristic waiver with a reason must resolve to `waived` state.');
  }
  if (waived.artifacts['security-review'].active !== false) {
    issues.push('Workflow validation: waived heuristic review must not leave `security-review` active.');
  }
  if (waived.artifacts.tasks.state !== 'READY') {
    issues.push('Workflow validation: waived heuristic review must allow `tasks` to proceed.');
  }

  const completed = resolveWorkflowState({
    schema,
    config: baseConfig,
    change: {
      securitySensitive: true,
      securityWaiver: { approved: false, reason: '' }
    },
    artifacts: Object.assign({}, baseArtifacts, { 'security-review': true }),
    sources: {}
  });

  if (completed.review.state !== 'completed') {
    issues.push('Workflow validation: completed `security-review.md` must resolve to `completed` state.');
  }
  if (completed.artifacts.tasks.state !== 'READY') {
    issues.push('Workflow validation: completed hard-gated review must unblock `tasks`.');
  }

  const summary = summarizeWorkflowState({
    schema,
    config: baseConfig,
    change: {
      securitySensitive: true,
      securityWaiver: { approved: false, reason: '' }
    },
    artifacts: baseArtifacts,
    sources: {}
  });

  if (!summary.securityReview || summary.securityReview.state !== 'required') {
    issues.push('Workflow validation: workflow summary must expose the canonical review state.');
  }

  const observedStates = unique([
    hardGate.review.state,
    recommended.review.state,
    waived.review.state,
    completed.review.state
  ]);
  REVIEW_STATES.forEach((state) => {
    if (!observedStates.includes(state)) {
      issues.push(`Workflow validation: canonical review state \`${state}\` is not reachable in validation scenarios.`);
    }
  });

  return issues;
}

function validateCheckpointContracts(options = {}) {
  const issues = [];
  const schema = resolveSchema(options);

  DEFAULT_CHECKPOINT_IDS.forEach((checkpointId) => {
    const checkpoint = getCheckpointDefinition(schema, checkpointId);
    if (!checkpoint || checkpoint.id !== checkpointId) {
      issues.push(`Workflow validation: missing checkpoint definition \`${checkpointId}\` in schema.`);
      return;
    }
    CHECKPOINT_STATES.forEach((state) => {
      if (!Array.isArray(checkpoint.states) || !checkpoint.states.includes(state)) {
        issues.push(`Workflow validation: checkpoint \`${checkpointId}\` must declare state \`${state}\`.`);
      }
    });
  });

  const hasFindingCode = (result, code) => Array.isArray(result && result.findings) && result.findings.some((finding) => finding.code === code);

  const common = {
    schema,
    config: {
      schema: schema.id,
      securityReview: {
        mode: 'heuristic',
        required: false,
        allowWaiver: true,
        heuristicHint: 'auth, payment, admin'
      }
    },
    change: {
      securitySensitive: false,
      securityWaiver: { approved: false, reason: '' }
    },
    artifacts: {
      proposal: true,
      specs: true,
      design: true,
      tasks: false,
      'security-review': false
    }
  };

  const specPass = runSpecCheckpoint({
    ...common,
    sources: {
      proposal: '## Why\nNeed workflow checkpoint automation.\n## Rollout\nRollout requires staged migration and compatibility verification.',
      specs: [
        '## ADDED Requirements',
        '### Requirement: Automatic review runtime',
        'The runtime SHALL evaluate checkpoint evidence during rollout migration.',
        '#### Scenario: Coverage',
        '- **WHEN** the checkpoint runs',
        '- **THEN** compatibility work is validated before apply'
      ].join('\n'),
      design: [
        '## Context',
        '## Goals / Non-Goals',
        '## Decisions',
        'Migration and rollout compatibility checks remain required.',
        '## Risks / Trade-offs',
        '## Migration Plan',
        'Document rollback and compatibility guidance for rollout.'
      ].join('\n')
    }
  });
  if (specPass.status !== 'PASS') {
    issues.push('Workflow validation: spec checkpoint should return PASS when rollout detail is aligned and complete.');
  }

  const specNegationPass = runSpecCheckpoint({
    ...common,
    sources: {
      proposal: '## Why\nNeed rollout safety guardrails.\n## Rollout\nRollout requires compatibility checks without downtime.',
      specs: [
        '## ADDED Requirements',
        '### Requirement: Rollout safety',
        'The runtime SHALL require rollout compatibility checks and rollback planning.',
        '#### Scenario: Safety',
        '- **WHEN** rollout executes',
        '- **THEN** compatibility must not regress'
      ].join('\n'),
      design: [
        '## Context',
        '## Goals / Non-Goals',
        '## Decisions',
        'Rollout must not break compatibility.',
        'Rollout requires rollback planning without downtime.',
        '## Risks / Trade-offs',
        '## Migration Plan',
        'Rollback and compatibility checks remain required.'
      ].join('\n')
    }
  });
  if (specNegationPass.status === 'BLOCK' || hasFindingCode(specNegationPass, 'rollout-contradiction')) {
    issues.push('Workflow validation: negative phrasing such as "must not break compatibility" must not be misclassified as rollout contradiction.');
  }

  const specHeadingOnlyPass = runSpecCheckpoint({
    ...common,
    sources: {
      proposal: '## Why\nImprove login UX.',
      specs: [
        '## ADDED Requirements',
        '### Requirement: Login UX',
        'The runtime SHALL improve login interactions.',
        '#### Scenario: Login UX',
        '- **WHEN** user enters credentials',
        '- **THEN** UX feedback is clearer'
      ].join('\n'),
      design: [
        '## Context',
        '## Goals / Non-Goals',
        '## Decisions',
        'Use smaller UI polish changes only.',
        '## Risks / Trade-offs',
        '## Migration Plan'
      ].join('\n')
    }
  });
  if (specHeadingOnlyPass.status === 'BLOCK' || hasFindingCode(specHeadingOnlyPass, 'rollout-detail-missing')) {
    issues.push('Workflow validation: empty migration headings must not trigger rollout warnings or blocking findings.');
  }

  const specWarn = runSpecCheckpoint({
    ...common,
    sources: {
      proposal: '## Why\nNeed workflow checkpoint automation.',
      specs: [
        '## ADDED Requirements',
        '### Requirement: Automatic review runtime',
        'The runtime SHALL evaluate checkpoint evidence.',
        '#### Scenario: Coverage',
        '- **WHEN** checkpoints run',
        '- **THEN** planning drift is detected'
      ].join('\n'),
      design: [
        '## Context',
        '## Goals / Non-Goals',
        '## Decisions',
        'Rollout and migration detail exists only in design.',
        '## Risks / Trade-offs',
        '## Migration Plan',
        'Staged rollout is planned with rollback notes.'
      ].join('\n')
    }
  });
  if (specWarn.status !== 'WARN' || !hasFindingCode(specWarn, 'rollout-detail-missing')) {
    issues.push('Workflow validation: spec checkpoint must WARN when rollout detail is missing from part of planning without contradiction.');
  }

  const specBlock = runSpecCheckpoint({
    ...common,
    sources: {
      proposal: '## Why\nNo migration or rollback is required.',
      specs: [
        '## ADDED Requirements',
        '### Requirement: Runtime migration',
        'The runtime SHALL execute migration during rollout.',
        '#### Scenario: Migration',
        '- **WHEN** checkpoints run',
        '- **THEN** migration compatibility is enforced'
      ].join('\n'),
      design: [
        '## Context',
        '## Goals / Non-Goals',
        '## Decisions',
        'Migration and rollback are required before rollout.',
        '## Risks / Trade-offs',
        '## Migration Plan'
      ].join('\n')
    }
  });
  if (specBlock.status !== 'BLOCK' || !hasFindingCode(specBlock, 'rollout-contradiction')) {
    issues.push('Workflow validation: spec checkpoint must BLOCK when planning artifacts contradict rollout intent.');
  }

  if (specPass.createsArtifacts.length !== 0 || specPass.updatesExistingArtifactsOnly !== true) {
    issues.push('Workflow validation: spec checkpoint must update existing artifacts only.');
  }

  const taskPass = runTaskCheckpoint({
    ...common,
    artifacts: Object.assign({}, common.artifacts, { tasks: true }),
    sources: {
      proposal: '## Why\nCheckpoint review automation with rollout migration and rollback support.',
      specs: [
        '## ADDED Requirements',
        '### Requirement: Automatic planning review',
        'The runtime SHALL support implementation scope with rollout migration and verification.',
        '#### Scenario: Task coverage',
        '- **WHEN** tasks are prepared',
        '- **THEN** migration, compatibility, and verification work is covered'
      ].join('\n'),
      design: [
        '## Context',
        '## Goals / Non-Goals',
        '## Decisions',
        'Implementation keeps migration, rollback, and compatibility aligned.',
        '## Risks / Trade-offs',
        '## Migration Plan',
        'Rollout requires staged compatibility checks and rollback procedures.'
      ].join('\n'),
      tasks: [
        '## 1. Runtime implementation',
        '- [ ] 1.1 Implement automatic planning review engine',
        '- [ ] 1.2 Add migration and compatibility checks for rollout',
        '- [ ] 1.3 Add verification coverage for planning checkpoints',
        '- [ ] 1.4 Add rollback safety task for deployment',
        '- [ ] 1.5 Add supporting verification and test tasks'
      ].join('\n')
    }
  });
  if (taskPass.status !== 'PASS') {
    issues.push('Workflow validation: task checkpoint should PASS when required planning commitments and supporting tasks are covered.');
  }

  const taskHeadingOnlyNoMigrationBlock = runTaskCheckpoint({
    ...common,
    artifacts: Object.assign({}, common.artifacts, { tasks: true }),
    sources: {
      proposal: '## Why\nImprove login UX.',
      specs: [
        '## ADDED Requirements',
        '### Requirement: Login UX',
        'The runtime SHALL improve login interactions.',
        '#### Scenario: Login UX',
        '- **WHEN** user enters credentials',
        '- **THEN** UX feedback is clearer'
      ].join('\n'),
      design: [
        '## Context',
        '## Goals / Non-Goals',
        '## Decisions',
        'Use smaller UI polish changes only.',
        '## Risks / Trade-offs',
        '## Migration Plan'
      ].join('\n'),
      tasks: [
        '## 1. Login implementation',
        '- [ ] 1.1 Implement login UX behavior',
        '- [ ] 1.2 Add verification tests',
        '- [ ] 1.3 Keep compatibility behavior unchanged'
      ].join('\n')
    }
  });
  if (hasFindingCode(taskHeadingOnlyNoMigrationBlock, 'task-migration-coverage-missing')) {
    issues.push('Workflow validation: empty migration headings must not create migration coverage blockers in task checkpoint.');
  }

  const taskMissingCoverage = runTaskCheckpoint({
    ...common,
    artifacts: Object.assign({}, common.artifacts, { tasks: true }),
    sources: {
      proposal: '## Why\nCheckpoint review automation with rollout migration.',
      specs: [
        '## ADDED Requirements',
        '### Requirement: Execution safety',
        'The runtime SHALL include migration and verification coverage.',
        '#### Scenario: Safety',
        '- **WHEN** apply starts',
        '- **THEN** migration and verification are both required'
      ].join('\n'),
      design: [
        '## Context',
        '## Goals / Non-Goals',
        '## Decisions',
        'Rollback and compatibility steps are required.',
        '## Risks / Trade-offs',
        '## Migration Plan',
        'Rollout compatibility requires rollback planning.'
      ].join('\n'),
      tasks: [
        '## 1. Implementation',
        '- [ ] 1.1 Implement checkpoint parser only'
      ].join('\n')
    }
  });
  if (
    taskMissingCoverage.status !== 'BLOCK'
    || !taskMissingCoverage.findings.some((finding) => finding.code.startsWith('task-') && finding.code.endsWith('-coverage-missing'))
  ) {
    issues.push('Workflow validation: task checkpoint must BLOCK when required implementation, migration, rollback, compatibility, or verification work is missing.');
  }

  const taskGate = runTaskCheckpoint({
    ...common,
    change: {
      securitySensitive: true,
      securityWaiver: { approved: false, reason: '' }
    },
    artifacts: Object.assign({}, common.artifacts, { tasks: true, 'security-review': false }),
    sources: {
      proposal: '## Why\nCheckpoint review automation with rollout migration.',
      specs: [
        '## ADDED Requirements',
        '### Requirement: Planning gate',
        'The runtime SHALL preserve rollout compatibility.',
        '#### Scenario: Gate',
        '- **WHEN** task checkpoint runs',
        '- **THEN** apply stays blocked if required security review is missing'
      ].join('\n'),
      design: [
        '## Context',
        '## Goals / Non-Goals',
        '## Decisions',
        'Rollout migration and compatibility are required.',
        '## Risks / Trade-offs',
        '## Migration Plan'
      ].join('\n'),
      tasks: [
        '## 1. Planning',
        '- [ ] 1.1 Implement rollout compatibility checks',
        '- [ ] 1.2 Add migration verification task'
      ].join('\n')
    }
  });
  if (taskGate.status !== 'BLOCK' || !hasFindingCode(taskGate, 'security-review-required-task-checkpoint')) {
    issues.push('Workflow validation: task checkpoint must BLOCK when required security-review is still missing.');
  }

  const executionPass = runExecutionCheckpoint({
    ...common,
    group: {
      title: '1. Documentation',
      text: '## 1. Documentation\n- [x] 1.1 Update migration docs and changelog',
      completed: true
    },
    executionEvidence: {
      changedFiles: ['README.md', 'docs/customization.md'],
      implementationSummary: 'Documentation-only update for rollout guidance.',
      behaviorChanged: false
    }
  });
  if (executionPass.status !== 'PASS') {
    issues.push('Workflow validation: execution checkpoint should PASS docs-only or non-behavioral work when no drift is present.');
  }

  const executionChangedFilesOnly = runExecutionCheckpoint({
    ...common,
    group: {
      title: '1. Add retry logic',
      text: '## 1. Add retry logic\n- [x] 1.1 Add retry logic for failures',
      completed: true
    },
    executionEvidence: {
      changedFiles: ['src/http/client.js']
    }
  });
  if (hasFindingCode(executionChangedFilesOnly, 'task-group-implementation-drift')) {
    issues.push('Workflow validation: changed-files-only execution evidence must not trigger automatic task-group drift blocking.');
  }

  const promptUpdateEvidence = normalizeExecutionEvidence({
    group: {
      title: '2. Prompt update',
      text: '## 2. Prompt update\n- [x] 2.1 Update codex status prompt',
      completed: true
    },
    executionEvidence: {
      changedFiles: ['commands/codex/prompts/opsx-status.md']
    }
  });
  if (promptUpdateEvidence.behavior.docsOnly === true || promptUpdateEvidence.behavior.changed !== true) {
    issues.push('Workflow validation: command/prompt or skill file updates must not be classified as docs-only behavior.');
  }

  const skillUpdateEvidence = normalizeExecutionEvidence({
    group: {
      title: '2. Skill update',
      text: '## 2. Skill update\n- [x] 2.1 Update opsx skill behavior',
      completed: true
    },
    executionEvidence: {
      changedFiles: ['skills/opsx/SKILL.md']
    }
  });
  if (skillUpdateEvidence.behavior.docsOnly === true || skillUpdateEvidence.behavior.changed !== true) {
    issues.push('Workflow validation: command/prompt or skill file updates must not be classified as docs-only behavior.');
  }

  const executionWarn = runExecutionCheckpoint({
    ...common,
    group: {
      title: '2. Runtime',
      text: '## 2. Runtime\n- [x] 2.1 Implement checkpoint runtime behavior',
      completed: true
    },
    executionEvidence: {
      changedFiles: ['lib/workflow.js'],
      implementationSummary: 'Implement runtime checkpoint behavior and migration handling.'
    }
  });
  if (executionWarn.status !== 'WARN' || !hasFindingCode(executionWarn, 'quality-gap')) {
    issues.push('Workflow validation: execution checkpoint should WARN when behavior changes without sufficient verification evidence.');
  }
  if (executionWarn.createsArtifacts.length !== 0 || executionWarn.updatesExistingArtifactsOnly !== true) {
    issues.push('Workflow validation: execution checkpoint must update existing artifacts only.');
  }

  const executionBlock = runExecutionCheckpoint({
    ...common,
    group: {
      title: '2. Implementation',
      text: '## 2. Implementation\n- [x] 2.1 Implement feature',
      completed: true
    },
    executionEvidence: {
      implementationSummary: 'Introduce behavior unrelated to accepted commitments.',
      commitmentMismatch: true
    }
  });
  if (executionBlock.status !== 'BLOCK' || !hasFindingCode(executionBlock, 'implementation-drift')) {
    issues.push('Workflow validation: execution checkpoint must BLOCK when implementation drifts from accepted commitments.');
  }

  const legacySpecBlock = runSpecCheckpoint({
    ...common,
    flags: { scopeDrift: true },
    sources: {
      proposal: '## Why\nSmall change',
      specs: '## ADDED Requirements\n### Requirement: Sample\nThe runtime SHALL work.\n#### Scenario: Sample\n- **WHEN** run\n- **THEN** pass\n',
      design: '## Context\n## Goals / Non-Goals\n## Decisions\nRollout planned.\n## Risks / Trade-offs\n## Migration Plan\n'
    }
  });
  if (legacySpecBlock.status !== 'BLOCK' || !hasFindingCode(legacySpecBlock, 'scope-drift')) {
    issues.push('Workflow validation: legacy spec flags must remain a compatible BLOCK fallback during migration.');
  }

  const legacyTaskBlock = runTaskCheckpoint({
    ...common,
    flags: { outOfScopeTasks: true },
    artifacts: Object.assign({}, common.artifacts, { tasks: true }),
    sources: {
      proposal: '## Why\nCheckpoint runtime with rollout migration.',
      specs: [
        '## ADDED Requirements',
        '### Requirement: Planning',
        'The runtime SHALL preserve rollout migration and verification coverage.',
        '#### Scenario: Planning',
        '- **WHEN** tasks are checked',
        '- **THEN** coverage remains aligned'
      ].join('\n'),
      design: [
        '## Context',
        '## Goals / Non-Goals',
        '## Decisions',
        'Rollout migration and compatibility are required.',
        '## Risks / Trade-offs',
        '## Migration Plan'
      ].join('\n'),
      tasks: [
        '## 1. Planning',
        '- [ ] 1.1 Implement rollout migration coverage',
        '- [ ] 1.2 Add verification test tasks',
        '- [ ] 1.3 Add rollback compatibility task'
      ].join('\n')
    }
  });
  if (legacyTaskBlock.status !== 'BLOCK' || !hasFindingCode(legacyTaskBlock, 'out-of-scope-tasks')) {
    issues.push('Workflow validation: legacy task flags must remain a compatible BLOCK fallback during migration.');
  }

  const legacyExecutionBlock = runExecutionCheckpoint({
    ...common,
    group: {
      title: '3. Legacy fallback',
      text: '## 3. Legacy fallback\n- [x] 3.1 Implement runtime update',
      completed: true
    },
    flags: {
      driftDetected: true
    }
  });
  if (legacyExecutionBlock.status !== 'BLOCK' || !hasFindingCode(legacyExecutionBlock, 'implementation-drift')) {
    issues.push('Workflow validation: legacy execution flags must remain a compatible BLOCK fallback during migration.');
  }

  [specPass, specNegationPass, specHeadingOnlyPass, specWarn, specBlock, taskPass, taskHeadingOnlyNoMigrationBlock, taskMissingCoverage, taskGate, executionPass, executionChangedFilesOnly, executionWarn, executionBlock, legacySpecBlock, legacyTaskBlock, legacyExecutionBlock].forEach((result) => {
    if (!result.checkpoint || !result.status || !Array.isArray(result.findings) || typeof result.nextStep !== 'string') {
      issues.push(`Workflow validation: checkpoint result for \`${result.checkpoint || 'unknown'}\` must expose checkpoint, status, findings, and nextStep.`);
    }
    if (!CHECKPOINT_STATES.includes(result.status)) {
      issues.push(`Workflow validation: checkpoint result for \`${result.checkpoint || 'unknown'}\` must use canonical checkpoint states.`);
    }
  });

  return issues;
}

function getAction(actionId) {
  return ACTIONS.find((action) => action.id === actionId);
}

function getAllActions() {
  return ACTIONS.map((action) => getAction(action.id));
}

function getActionSyntax(platform, actionId) {
  if (platform === 'claude') return `/opsx-${actionId}`;
  if (platform === 'gemini') return `/opsx-${actionId}`;
  if (platform === 'codex') return `$opsx-${actionId}`;
  return actionId;
}

function getPrimaryWorkflowSyntax(platform) {
  if (platform === 'codex') return '$opsx-* (explicit routes only)';
  if (platform === 'claude' || platform === 'gemini') return '/opsx-<action>';
  return 'opsx';
}

function buildFallbackRoutes(platform) {
  if (!['claude', 'codex', 'gemini'].includes(platform)) {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  return {
    onboardRoute: getActionSyntax(platform, 'onboard'),
    newRoute: getActionSyntax(platform, 'new'),
    proposeRoute: getActionSyntax(platform, 'propose')
  };
}

function renderFallbackLine(line, routes) {
  return line
    .replace(/\{\{onboardRoute\}\}/g, routes.onboardRoute)
    .replace(/\{\{newRoute\}\}/g, routes.newRoute)
    .replace(/\{\{proposeRoute\}\}/g, routes.proposeRoute);
}

function getPhaseThreePreflightLines() {
  return [...PHASE_THREE_PREFLIGHT_LINES];
}

function getActionFallbackLines(platform, actionId) {
  const routes = buildFallbackRoutes(platform);
  const lines = ACTION_FALLBACK_LINES[actionId]
    || (MUTATION_HEAVY_ACTION_IDS.has(actionId) ? DEFAULT_MUTATION_FALLBACK_LINES : DEFAULT_NON_MUTATION_FALLBACK_LINES);
  return lines.map((line) => renderFallbackLine(line, routes));
}

module.exports = {
  ACTIONS,
  REVIEW_STATES,
  CHECKPOINT_STATES,
  getAction,
  getAllActions,
  getActionSyntax,
  getPrimaryWorkflowSyntax,
  getPhaseThreePreflightLines,
  getActionFallbackLines,
  resolveSecurityReviewState,
  resolveWorkflowState,
  summarizeWorkflowState,
  normalizePlanningEvidence,
  normalizeExecutionEvidence,
  runSpecSplitCheckpoint,
  runSpecCheckpoint,
  runTaskCheckpoint,
  runExecutionCheckpoint,
  validatePhaseOneWorkflowContract,
  validateCheckpointContracts
};
