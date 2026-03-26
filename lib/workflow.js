const { DEFAULT_PROFILE, DEFAULT_SCHEMA } = require('./constants');
const { loadSchema } = require('./schema');

const ACTIONS = [
  {
    id: 'propose',
    title: 'Propose',
    summary: 'Create a change and generate planning artifacts in one step.',
    scope: 'Keep planning-phase edits inside `openspec/changes/<name>/` unless the user explicitly asks to move into implementation.',
    profiles: ['core', 'expanded']
  },
  {
    id: 'explore',
    title: 'Explore',
    summary: 'Investigate ideas, constraints, and tradeoffs before committing to a change.',
    scope: 'Stay exploratory unless the user clearly asks to create or update artifacts.',
    profiles: ['core', 'expanded']
  },
  {
    id: 'apply',
    title: 'Apply',
    summary: 'Implement tasks from a change and update task state.',
    scope: 'Read the relevant change artifacts before modifying product code.',
    profiles: ['core', 'expanded']
  },
  {
    id: 'archive',
    title: 'Archive',
    summary: 'Archive a completed change and sync specs if needed.',
    scope: 'Archive only completed or explicitly user-approved incomplete changes.',
    profiles: ['core', 'expanded']
  },
  {
    id: 'new',
    title: 'New',
    summary: 'Create an empty change container and metadata.',
    scope: 'Create only the initial change scaffold unless the user asks to continue.',
    profiles: ['expanded']
  },
  {
    id: 'continue',
    title: 'Continue',
    summary: 'Create the next ready artifact based on dependencies.',
    scope: 'Read the current change state first and create only the next valid artifact.',
    profiles: ['expanded']
  },
  {
    id: 'ff',
    title: 'Fast-forward',
    summary: 'Generate all planning artifacts in dependency order.',
    scope: 'Keep fast-forward output limited to planning artifacts.',
    profiles: ['expanded']
  },
  {
    id: 'verify',
    title: 'Verify',
    summary: 'Check completeness, correctness, and coherence against artifacts.',
    scope: 'Report findings with severity and cite the relevant artifact or file path.',
    profiles: ['expanded']
  },
  {
    id: 'sync',
    title: 'Sync',
    summary: 'Merge delta specs from a change into the main spec set.',
    scope: 'Merge only the requested delta specs and report conflicts explicitly.',
    profiles: ['expanded']
  },
  {
    id: 'bulk-archive',
    title: 'Bulk archive',
    summary: 'Archive multiple completed changes together.',
    scope: 'Ask the user to confirm the target set when it is not explicit.',
    profiles: ['expanded']
  },
  {
    id: 'batch-apply',
    title: 'Batch apply',
    summary: 'Apply multiple ready changes in a controlled sequence.',
    scope: 'Clarify execution order or target changes when that affects behavior.',
    profiles: ['expanded']
  },
  {
    id: 'resume',
    title: 'Resume',
    summary: 'Restore context around active changes and recommend the next move.',
    scope: 'If no change is specified, recommend the best active candidate and explain why.',
    profiles: ['expanded']
  },
  {
    id: 'status',
    title: 'Status',
    summary: 'Show change progress, readiness, and blockers.',
    scope: 'Inspect artifacts and task state without changing unrelated files.',
    profiles: ['expanded']
  },
  {
    id: 'onboard',
    title: 'Onboard',
    summary: 'Walk a user through the minimum OpenSpec workflow path.',
    scope: 'Keep onboarding instructional until the user chooses a real change to create.',
    profiles: ['expanded']
  }
];

const PROFILES = {
  core: ['propose', 'explore', 'apply', 'archive'],
  expanded: ACTIONS.map((action) => action.id)
};

const REVIEW_STATES = ['required', 'recommended', 'waived', 'completed'];
const CHECKPOINT_STATES = ['PASS', 'WARN', 'BLOCK'];
const DEFAULT_HEURISTIC_INPUTS = ['request', 'proposal', 'specs', 'design'];
const DEFAULT_CHECKPOINT_IDS = ['spec-checkpoint', 'task-checkpoint', 'execution-checkpoint'];

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
    active: completed || explicitRequired || heuristicTriggered || waiverApproved,
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
      matchedSignals: resolved.review.matchedSignals,
      waiverReason: resolved.review.waiverReason,
      blockers: resolved.review.blockerArtifacts
    } : null,
    artifacts: Object.keys(resolved.artifacts).reduce((output, artifactId) => {
      output[artifactId] = {
        state: resolved.artifacts[artifactId].state,
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
      items: Array.from(body.matchAll(/^- \[[ x]\]\s+.+$/gm)).map((item) => item[0])
    };
  });
}

function runSpecCheckpoint(options = {}) {
  const schema = resolveSchema(options);
  const proposalText = getSourceBlock(options.sources, 'proposal');
  const specsText = getSourceBlock(options.sources, 'specs');
  const designText = getSourceBlock(options.sources, 'design');
  const findings = [];
  const review = options.review || resolveSecurityReviewState(options);
  const requirementCount = countMatches(specsText, /^### Requirement:/gm);
  const scenarioCount = countMatches(specsText, /^#### Scenario:/gm);
  const flags = options.flags || {};

  if (!proposalText) {
    findings.push({ severity: 'BLOCK', code: 'proposal-missing', message: 'Proposal content is required before tasks.', patchTargets: ['proposal'] });
  }
  if (!specsText) {
    findings.push({ severity: 'BLOCK', code: 'specs-missing', message: 'Specs content is required before tasks.', patchTargets: ['specs'] });
  }
  if (!designText) {
    findings.push({ severity: 'BLOCK', code: 'design-missing', message: 'Design content is required before tasks.', patchTargets: ['design'] });
  }
  if (specsText && requirementCount === 0) {
    findings.push({ severity: 'BLOCK', code: 'requirements-missing', message: 'Specs must contain at least one requirement before tasks.', patchTargets: ['specs'] });
  }
  if (specsText && scenarioCount < requirementCount) {
    findings.push({ severity: 'BLOCK', code: 'scenarios-incomplete', message: 'Each requirement should have at least one scenario before tasks.', patchTargets: ['specs'] });
  }
  if (specsText && requirementCount > 0 && !/\b(SHALL|MUST)\b/.test(specsText)) {
    findings.push({ severity: 'WARN', code: 'normative-language-missing', message: 'Specs should use SHALL or MUST in requirement language.', patchTargets: ['specs'] });
  }
  if (designText && !hasSection(designText, 'Migration Plan')) {
    findings.push({ severity: 'WARN', code: 'migration-plan-missing', message: 'Design should call out migration planning before tasks.', patchTargets: ['design'] });
  }
  if (designText && !hasKeyword(designText, 'rollout') && !hasKeyword(designText, 'compatib')) {
    findings.push({ severity: 'WARN', code: 'rollout-constraint-missing', message: 'Design should mention rollout or compatibility considerations.', patchTargets: ['design'] });
  }
  if (flags.scopeDrift === true) {
    findings.push({ severity: 'BLOCK', code: 'scope-drift', message: 'Planning artifacts drift from the approved proposal scope.', patchTargets: ['proposal', 'specs', 'design'] });
  }
  if (flags.crossSpecConflict === true) {
    findings.push({ severity: 'BLOCK', code: 'cross-spec-conflict', message: 'Specs conflict with each other and must be reconciled.', patchTargets: ['specs'] });
  }
  if (review.required && !(options.artifacts || {})['security-review']) {
    findings.push({ severity: 'BLOCK', code: 'security-review-required', message: 'Security review is required before tasks can begin.', patchTargets: ['security-review'] });
  } else if (review.recommended && !review.waived && !review.completed) {
    findings.push({ severity: 'WARN', code: 'security-review-recommended', message: 'Security review is recommended before tasks proceed.', patchTargets: ['security-review'] });
  }

  return buildCheckpointResult(schema, 'spec-checkpoint', findings, { phase: 'planning' });
}

function runTaskCheckpoint(options = {}) {
  const schema = resolveSchema(options);
  const tasksText = getSourceBlock(options.sources, 'tasks');
  const specsText = getSourceBlock(options.sources, 'specs');
  const designText = getSourceBlock(options.sources, 'design');
  const findings = [];
  const groups = extractTopLevelTaskGroups(tasksText);
  const checklistItems = Array.from(getTextBlock(tasksText).matchAll(/^- \[[ x]\]\s+.+$/gm)).map((match) => match[0]);
  const review = options.review || resolveSecurityReviewState(options);
  const flags = options.flags || {};

  if (!tasksText) {
    findings.push({ severity: 'BLOCK', code: 'tasks-missing', message: 'Tasks content is required before apply.', patchTargets: ['tasks'] });
  }
  if (!specsText) {
    findings.push({ severity: 'BLOCK', code: 'specs-missing', message: 'Specs must still be present for task validation.', patchTargets: ['specs'] });
  }
  if (!designText) {
    findings.push({ severity: 'BLOCK', code: 'design-missing', message: 'Design must still be present for task validation.', patchTargets: ['design'] });
  }
  if (tasksText && groups.length === 0) {
    findings.push({ severity: 'BLOCK', code: 'task-groups-missing', message: 'Tasks must be organized into top-level task groups.', patchTargets: ['tasks'] });
  }
  if (tasksText && checklistItems.length === 0) {
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
  if ((review.required || review.recommended || review.completed) && tasksText && !hasAnyKeyword(tasksText, ['security', 'auth', 'permission', 'audit', 'rate limit'])) {
    findings.push({ severity: 'WARN', code: 'security-task-coverage-missing', message: 'Tasks should capture security control work for security-sensitive changes.', patchTargets: ['tasks'] });
  }
  if (flags.outOfScopeTasks === true) {
    findings.push({ severity: 'BLOCK', code: 'out-of-scope-tasks', message: 'Task plan contains out-of-scope work not supported by specs or design.', patchTargets: ['tasks', 'specs', 'design'] });
  }
  if (flags.orderingConflict === true) {
    findings.push({ severity: 'WARN', code: 'task-ordering-conflict', message: 'Task ordering should be revised to better match dependency order.', patchTargets: ['tasks'] });
  }

  return buildCheckpointResult(schema, 'task-checkpoint', findings, { phase: 'planning' });
}

function runExecutionCheckpoint(options = {}) {
  const schema = resolveSchema(options);
  const review = options.review || resolveSecurityReviewState(options);
  const group = options.group || {};
  const groupTitle = group.title || '';
  const groupText = getTextBlock(group.text);
  const findings = [];
  const flags = options.flags || {};

  if (!groupTitle) {
    findings.push({ severity: 'BLOCK', code: 'task-group-missing', message: 'Execution checkpoint requires a top-level task-group title.', patchTargets: ['tasks'] });
  }
  if (!groupText) {
    findings.push({ severity: 'BLOCK', code: 'task-group-body-missing', message: 'Execution checkpoint requires the completed task-group body.', patchTargets: ['tasks'] });
  }
  if (group.completed !== true) {
    findings.push({ severity: 'BLOCK', code: 'task-group-incomplete', message: 'Execution checkpoint can run only after a top-level task group is completed.', patchTargets: ['tasks'] });
  }
  if (flags.driftDetected === true || flags.newConstraints === true) {
    findings.push({ severity: 'BLOCK', code: 'implementation-drift', message: 'Implementation drift or new constraints require existing artifacts to be updated before continuing.', patchTargets: ['specs', 'design', 'tasks'] });
  }
  if (flags.securityControlGap === true) {
    findings.push({
      severity: review.required || review.completed ? 'BLOCK' : 'WARN',
      code: 'security-control-gap',
      message: 'Implementation is missing required or expected security controls for this task group.',
      patchTargets: review.required || review.completed ? ['security-review', 'tasks'] : ['tasks']
    });
  }
  if (flags.qualityGap === true || (flags.requiresTesting === true && !hasAnyKeyword(groupText, ['test', 'verify']))) {
    findings.push({ severity: 'WARN', code: 'quality-gap', message: 'Task-group output should include testing or verification work before moving on.', patchTargets: ['tasks'] });
  }
  if (flags.nextGroupBlocked === true) {
    findings.push({ severity: 'BLOCK', code: 'next-group-not-ready', message: 'The next top-level task group is not ready to begin yet.', patchTargets: ['tasks', 'design'] });
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
  if (recommended.artifacts.tasks.state !== 'READY') {
    issues.push('Workflow validation: heuristic recommendations must not block `tasks` by default.');
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

  const specResult = runSpecCheckpoint({
    ...common,
    sources: {
      proposal: '## Why\nNeed auth flow',
      specs: '## ADDED Requirements\n### Requirement: Auth\nThe system SHALL support login.\n',
      design: '## Context\n## Goals / Non-Goals\n## Decisions\n## Risks / Trade-offs\n## Migration Plan\n'
    }
  });
  if (!CHECKPOINT_STATES.includes(specResult.status)) {
    issues.push('Workflow validation: spec checkpoint must emit a canonical checkpoint state.');
  }
  if (specResult.createsArtifacts.length !== 0 || specResult.updatesExistingArtifactsOnly !== true) {
    issues.push('Workflow validation: spec checkpoint must update existing artifacts only.');
  }

  const taskResult = runTaskCheckpoint({
    ...common,
    artifacts: Object.assign({}, common.artifacts, { tasks: true }),
    sources: {
      specs: '## ADDED Requirements\n### Requirement: Auth\nThe system SHALL support login.\n#### Scenario: Success\n- **WHEN** user logs in\n- **THEN** access is granted\n',
      design: '## Context\n## Goals / Non-Goals\n## Decisions\n## Risks / Trade-offs\n## Migration Plan\n',
      tasks: '## 1. Setup\n'
    }
  });
  if (taskResult.status !== 'BLOCK') {
    issues.push('Workflow validation: task checkpoint must block incomplete task-group plans before apply.');
  }

  const executionWarn = runExecutionCheckpoint({
    ...common,
    group: {
      title: '1. Setup',
      text: '## 1. Setup\n- [x] 1.1 Add runtime wiring',
      completed: true
    },
    flags: {
      requiresTesting: true
    }
  });
  if (executionWarn.status !== 'WARN') {
    issues.push('Workflow validation: execution checkpoint should warn when requested verification coverage is missing.');
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
    flags: {
      driftDetected: true
    }
  });
  if (executionBlock.status !== 'BLOCK') {
    issues.push('Workflow validation: execution checkpoint must block continuation when drift is detected.');
  }

  [specResult, taskResult, executionWarn, executionBlock].forEach((result) => {
    if (!result.checkpoint || !result.status || !Array.isArray(result.findings) || typeof result.nextStep !== 'string') {
      issues.push(`Workflow validation: checkpoint result for \`${result.checkpoint || 'unknown'}\` must expose checkpoint, status, findings, and nextStep.`);
    }
  });

  return issues;
}

function getAction(actionId) {
  return ACTIONS.find((action) => action.id === actionId);
}

function getProfileActions(profile = DEFAULT_PROFILE) {
  const resolvedProfile = PROFILES[profile] ? profile : DEFAULT_PROFILE;
  return PROFILES[resolvedProfile].map(getAction);
}

function getActionSyntax(platform, actionId) {
  if (platform === 'claude') return `/opsx:${actionId}`;
  if (platform === 'gemini') return `/opsx:${actionId}`;
  if (platform === 'codex') return `/prompts:opsx-${actionId}`;
  return actionId;
}

function getOpenSpecSyntax(platform) {
  if (platform === 'codex') return '$openspec <request>';
  return '/openspec <request>';
}

module.exports = {
  ACTIONS,
  PROFILES,
  REVIEW_STATES,
  CHECKPOINT_STATES,
  getAction,
  getProfileActions,
  getActionSyntax,
  getOpenSpecSyntax,
  resolveSecurityReviewState,
  resolveWorkflowState,
  summarizeWorkflowState,
  runSpecCheckpoint,
  runTaskCheckpoint,
  runExecutionCheckpoint,
  validatePhaseOneWorkflowContract,
  validateCheckpointContracts
};
