const { PRODUCT_SHORT_NAME, SHARED_HOME_NAME } = require('./constants');
const { unique } = require('./string-utils');
const {
  PLANNING_ROLLOUT_ARTIFACTS,
  COMMITMENT_CATEGORIES,
  SECURITY_KEYWORDS
} = require('./workflow-constants');
const {
  getTextBlock,
  getSourceBlock,
  countMatches,
  hasKeyword,
  hasAnyKeyword,
  toTokenSet,
  setIntersectionSize,
  extractChecklistItems,
  extractCompletedChecklistItems,
  normalizeChecklistItem,
  extractCompletedTddSteps,
  toList
} = require('./workflow-utils');
const {
  ROLLOUT_NOT_REQUIRED_PATTERNS,
  detectRolloutProfile,
  removeMarkdownHeadings,
  extractStatements
} = require('./rollout-detector');

const OPSX_SKILL_DIR_PREFIX = `skills/${PRODUCT_SHORT_NAME}/`;
const LEGACY_WORKSPACE_SEGMENT = SHARED_HOME_NAME.replace(/^\./, '');
const LEGACY_SKILL_DIR_PREFIX = `skills/${LEGACY_WORKSPACE_SEGMENT}/`;
const LEGACY_CHANGE_DIR_PREFIX = `${LEGACY_WORKSPACE_SEGMENT}/changes/`;
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
const CATEGORY_KEYWORDS = {
  implementation: ['implement', 'feature', 'runtime', 'behavior', 'api', 'logic', 'code', 'integration', 'engine'],
  migration: ['migration', 'migrate', 'backfill', 'upgrade', 'schema change', 'data move', 'rollout'],
  rollback: ['rollback', 'roll back', 'revert'],
  compatibility: ['compatib', 'backward', 'forward compatible', 'legacy'],
  verification: ['test', 'verify', 'validation', 'qa', 'assert', 'coverage']
};
const CONSTRAINT_KEYWORDS = ['constraint', 'limitation', 'blocked by', 'follow-up required', 'new dependency', 'new assumption', '新的约束', '限制'];
const EXECUTION_DOC_HINT_KEYWORDS = ['doc', 'docs', 'readme', 'changelog', 'comment', 'comments', 'metadata'];
const EXECUTION_BEHAVIOR_HINT_KEYWORDS = ['runtime', 'api', 'endpoint', 'handler', 'logic', 'database', 'query', 'schema', 'migration', 'feature', 'bugfix', 'behavior'];

function includesAnyKeyword(text, keywords = []) {
  return hasAnyKeyword(text, keywords);
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
    toTokenSet(text).forEach((token) => scopeTerms.add(token));
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
  const verificationCommand = getTextBlock(explicit.verificationCommand || options.verificationCommand || group.verificationCommand).trim();
  const verificationResult = getTextBlock(explicit.verificationResult || options.verificationResult || group.verificationResult).trim();
  const diffSummary = getTextBlock(explicit.diffSummary || options.diffSummary || group.diffSummary).trim();
  const driftStatus = getTextBlock(explicit.driftStatus || options.driftStatus || group.driftStatus).trim();
  const driftSummary = getTextBlock(explicit.driftSummary || options.driftSummary || group.driftSummary).trim();
  const completedSteps = extractCompletedTddSteps(completedItems, explicit.completedSteps);
  const verificationSignals = [verificationSummary, groupText, implementationSummary].join('\n');
  const verificationPresent = Boolean(verificationSummary)
    || includesAnyKeyword(verificationSignals, ['test', 'verify', 'validation', 'qa', 'assert', 'coverage']);
  const requiresTesting = explicit.requiresTesting === true || legacy.requiresTesting === true || behaviorChanged;
  const constraints = unique([
    ...toList(explicit.newConstraints),
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
    execution: {
      completedSteps,
      verificationCommand,
      verificationResult,
      diffSummary,
      driftStatus,
      driftSummary
    },
    legacy
  };
}

module.exports = {
  includesAnyKeyword,
  detectCategoryInText,
  detectSecurityInText,
  normalizeLegacyPlanningFlags,
  mergeLegacyPlanningFlags,
  normalizeLegacyExecutionFlags,
  extractTopLevelTaskGroups,
  resolvePlanningEvidence,
  normalizePlanningEvidence,
  normalizeSpecSplitSpecFiles,
  countUniqueCapabilityDirectories,
  normalizeChangedFiles,
  normalizeExecutionEvidence
};
