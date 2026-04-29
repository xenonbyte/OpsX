const { unique } = require('./string-utils');
const {
  REVIEW_STATES,
  CHECKPOINT_STATES,
  DEFAULT_CHECKPOINT_IDS
} = require('./workflow-constants');
const {
  resolveSchema,
  getArtifactDefinition,
  resolveWorkflowState,
  summarizeWorkflowState
} = require('./security-review');
const { getCheckpointDefinition } = require('./checkpoint-result');
const { runSpecCheckpoint } = require('./checkpoint-spec');
const { runTaskCheckpoint } = require('./checkpoint-task');
const { runExecutionCheckpoint } = require('./checkpoint-execution');
const { normalizeExecutionEvidence } = require('./planning-evidence');

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

function hasFindingCode(result, code) {
  return Array.isArray(result && result.findings) && result.findings.some((finding) => finding.code === code);
}

function buildCommonCheckpointContext(schema) {
  return {
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

  const common = buildCommonCheckpointContext(schema);
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
        '## Test Plan',
        '- Behavior: checkpoint review automation runtime behavior.',
        '- Requirement/Scenario: TDD-03 checkpoint contract validator.',
        '- Verification: automated runtime checks.',
        '- TDD Mode: strict',
        '- Exemption Reason: none',
        '',
        '## 1. Runtime implementation',
        '- TDD Class: behavior-change',
        '- [ ] RED: Add automatic planning review engine regression coverage.',
        '- [ ] GREEN: Implement automatic planning review engine.',
        '- [ ] VERIFY: Add verification coverage for planning checkpoints.',
        '- [ ] 1.2 Add migration and compatibility checks for rollout',
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
      behaviorChanged: false,
      completedSteps: ['VERIFY'],
      verificationCommand: 'npm run test:workflow-runtime',
      verificationResult: 'PASS',
      diffSummary: 'Updated docs and changelog copy.',
      driftStatus: 'clean'
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
      changedFiles: ['src/http/client.js'],
      completedSteps: ['GREEN'],
      verificationCommand: 'npm run test:workflow-runtime',
      verificationResult: 'PASS',
      diffSummary: 'Updated retry client logic.',
      driftStatus: 'clean'
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
      changedFiles: ['commands/codex/skills/opsx-status/SKILL.md']
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
      implementationSummary: 'Implement runtime checkpoint behavior and migration handling.',
      completedSteps: ['GREEN'],
      verificationCommand: 'npm run test:workflow-runtime',
      verificationResult: 'PASS',
      diffSummary: 'Implemented runtime checkpoint behavior and migration handling.',
      driftStatus: 'clean'
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
      commitmentMismatch: true,
      completedSteps: ['GREEN'],
      verificationCommand: 'npm run test:workflow-runtime',
      verificationResult: 'PASS',
      diffSummary: 'Introduced behavior unrelated to commitments.',
      driftStatus: 'drifted'
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

  [
    specPass,
    specNegationPass,
    specHeadingOnlyPass,
    specWarn,
    specBlock,
    taskPass,
    taskHeadingOnlyNoMigrationBlock,
    taskMissingCoverage,
    taskGate,
    executionPass,
    executionChangedFilesOnly,
    executionWarn,
    executionBlock,
    legacySpecBlock,
    legacyTaskBlock,
    legacyExecutionBlock
  ].forEach((result) => {
    if (!result.checkpoint || !result.status || !Array.isArray(result.findings) || typeof result.nextStep !== 'string') {
      issues.push(`Workflow validation: checkpoint result for \`${result.checkpoint || 'unknown'}\` must expose checkpoint, status, findings, and nextStep.`);
    }
    if (!CHECKPOINT_STATES.includes(result.status)) {
      issues.push(`Workflow validation: checkpoint result for \`${result.checkpoint || 'unknown'}\` must use canonical checkpoint states.`);
    }
  });

  return issues;
}

module.exports = {
  validatePhaseOneWorkflowContract,
  validateCheckpointContracts
};
