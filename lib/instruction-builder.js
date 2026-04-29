const {
  RuntimeGuidanceError,
  buildStatus,
  buildRuntimeKernel,
  resolveArtifactTargetPath,
  loadArtifactTemplate,
  collectArtifactSources,
  normalizeSourceBlock,
  parseTopLevelTaskGroups,
  resolveActionRoute,
  loadPersistedStateView,
  inspectReadOnlyHashDrift
} = require('./artifact-graph');
const { runTaskCheckpoint } = require('./checkpoint-task');
const {
  resolveContinueAction,
  resolveNextArtifact: resolveNextArtifactFromState
} = require('./change-state');

function buildResumeInstructions(options = {}) {
  const status = buildStatus(options);
  const payload = {
    change: status.change,
    stage: status.stage,
    nextAction: status.nextAction,
    nextArtifact: status.nextArtifact,
    route: status.route,
    active: {
      taskGroup: status.active.taskGroup || null,
      nextTaskGroup: status.active.nextTaskGroup || null
    },
    blockers: status.blockers.slice(),
    warnings: status.warnings.slice(),
    summary: status.blockers.length
      ? 'Resolve blockers before resuming.'
      : `Continue with ${status.route}.`
  };

  if (options.format === 'text') {
    const lines = [
      '# Resume instructions',
      `- change: ${payload.change}`,
      `- stage: ${payload.stage}`,
      `- nextAction: ${payload.nextAction}`,
      `- nextArtifact: ${payload.nextArtifact || 'none'}`,
      `- route: ${payload.route}`
    ];
    if (payload.active.taskGroup) {
      lines.push(`- activeTaskGroup: ${payload.active.taskGroup}`);
    }
    if (payload.blockers.length) {
      lines.push('## Blockers', ...payload.blockers.map((entry) => `- ${entry}`));
    }
    if (payload.warnings.length) {
      lines.push('## Warnings', ...payload.warnings.map((entry) => `- ${entry}`));
    }
    lines.push('', payload.summary);
    return lines.join('\n');
  }

  return payload;
}

function buildContinueInstructions(options = {}) {
  const status = buildStatus(options);
  const nextAction = resolveContinueAction({
    stage: status.stage,
    active: status.active
  });
  const nextArtifact = resolveNextArtifactFromState({
    stage: status.stage,
    active: status.active
  });
  const normalizedAction = String(nextAction || '').trim() || status.nextAction;
  const payload = {
    change: status.change,
    stage: status.stage,
    nextAction: normalizedAction,
    nextArtifact,
    route: resolveActionRoute(normalizedAction),
    active: {
      taskGroup: status.active.taskGroup || null,
      nextTaskGroup: status.active.nextTaskGroup || null
    },
    blockers: status.blockers.slice(),
    warnings: status.warnings.slice()
  };

  if (status.stage === 'APPLYING_GROUP') {
    payload.active.taskGroup = status.active.taskGroup || null;
  }

  if (options.format === 'text') {
    const lines = [
      '# Continue instructions',
      `- change: ${payload.change}`,
      `- stage: ${payload.stage}`,
      `- nextAction: ${payload.nextAction}`,
      `- nextArtifact: ${payload.nextArtifact || 'none'}`,
      `- route: ${payload.route}`
    ];
    if (payload.active.taskGroup) {
      lines.push(`- activeTaskGroup: ${payload.active.taskGroup}`);
    }
    if (payload.blockers.length) {
      lines.push('## Blockers', ...payload.blockers.map((entry) => `- ${entry}`));
    }
    if (payload.warnings.length) {
      lines.push('## Warnings', ...payload.warnings.map((entry) => `- ${entry}`));
    }
    return lines.join('\n');
  }

  return payload;
}

function buildArtifactInstructions(options = {}) {
  const artifactId = String(options.artifactId || '').trim();
  if (!artifactId) {
    throw new RuntimeGuidanceError('artifact-id-required', 'artifactId is required.');
  }
  const kernel = buildRuntimeKernel(options);
  const artifact = kernel.graph.artifacts.find((entry) => entry.id === artifactId);
  if (!artifact) {
    throw new RuntimeGuidanceError(
      'unknown-artifact',
      `Unknown artifact id: ${artifactId}`,
      { artifactId, knownArtifacts: kernel.graph.artifacts.map((entry) => entry.id) }
    );
  }

  const state = kernel.artifactStates[artifact.id];
  const targetPath = resolveArtifactTargetPath(artifact.path, { capability: options.capability });
  const template = loadArtifactTemplate({
    graph: kernel.graph,
    artifactId,
    language: options.language || kernel.config.language
  });

  const dependencyIds = Array.from(new Set([
    ...artifact.requires,
    ...state.missingDependencies
  ]));
  const dependencies = dependencyIds.map((requiredId) => ({
    artifactId: requiredId,
    state: kernel.artifactStates[requiredId] ? kernel.artifactStates[requiredId].state : 'missing',
    path: kernel.artifactStates[requiredId] ? kernel.artifactStates[requiredId].path : null
  }));

  const warnings = [];
  if (state.missingDependencies.length) {
    warnings.push(`Artifact is blocked by dependencies: ${state.missingDependencies.join(', ')}`);
  }
  if (!targetPath && artifact.path.includes('<')) {
    warnings.push('Capability is required to resolve target path for parameterized artifact path.');
  }

  const payload = {
    change: kernel.change,
    schema: kernel.schema,
    artifact: {
      id: artifact.id,
      state: state.state,
      optional: artifact.optional === true,
      path: artifact.path,
      targetPath,
      readyForWrite: state.ready === true && Boolean(targetPath),
      missingDependencies: state.missingDependencies.slice()
    },
    dependencies,
    context: {
      project: kernel.config.context || '',
      rules: kernel.config.rules && kernel.config.rules[artifact.id] ? kernel.config.rules[artifact.id] : '',
      securityReview: kernel.config.securityReview
    },
    template,
    warnings
  };

  if (options.format === 'text') {
    const lines = [
      `# Artifact instructions: ${artifact.id}`,
      `- change: ${payload.change}`,
      `- state: ${payload.artifact.state}`,
      `- readyForWrite: ${payload.artifact.readyForWrite ? 'yes' : 'no'}`,
      `- targetPath: ${payload.artifact.targetPath || '(needs capability)'}`,
      `- missingDependencies: ${payload.artifact.missingDependencies.length ? payload.artifact.missingDependencies.join(', ') : 'none'}`,
      '',
      '## Template',
      '```markdown',
      payload.template.content || '',
      '```'
    ];
    if (warnings.length) {
      lines.push('', '## Warnings', ...warnings.map((warning) => `- ${warning}`));
    }
    return lines.join('\n');
  }

  return payload;
}

function buildApplyInstructions(options = {}) {
  const kernel = buildRuntimeKernel(options);
  const tasksState = kernel.artifactStates.tasks;
  const tasksText = normalizeSourceBlock(kernel.sources ? kernel.sources.tasks : '');
  const groups = parseTopLevelTaskGroups(tasksText);
  const pendingGroups = groups
    .filter((group) => group.completed !== true)
    .map((group) => ({
      title: group.title,
      pendingItems: group.pendingItems.slice(),
      completedItems: group.completedItems.slice()
    }));
  const persistedState = loadPersistedStateView(kernel.paths.changeDir);
  const driftInspection = inspectReadOnlyHashDrift(kernel.paths.changeDir, persistedState);
  const driftAwareState = driftInspection.stateView;
  const activeGroupTitle = driftAwareState.stage === 'APPLYING_GROUP'
    ? String(driftAwareState.active.taskGroup || '').trim()
    : '';
  const queuedGroupTitle = String(driftAwareState.active.nextTaskGroup || '').trim();
  const preferredGroupTitles = [activeGroupTitle, queuedGroupTitle].filter(Boolean);
  let selectedGroup = null;
  for (const preferredGroupTitle of preferredGroupTitles) {
    selectedGroup = pendingGroups.find((group) => group.title === preferredGroupTitle) || null;
    if (selectedGroup) break;
  }
  if (!selectedGroup) {
    selectedGroup = pendingGroups.length ? pendingGroups[0] : null;
  }
  const remainingGroups = selectedGroup ? [selectedGroup] : [];
  const allowedPathWarnings = driftAwareState.allowedPaths.map((entry) => `Allowed path scope: ${entry}`);
  const forbiddenPathWarnings = driftAwareState.forbiddenPaths.map((entry) => `Forbidden path warning: ${entry}`);

  const sources = kernel.sources || collectArtifactSources(kernel.paths.changeDir);
  const checkpoint = runTaskCheckpoint({
    schemaName: kernel.schema,
    artifacts: kernel.graph.artifacts.reduce((output, artifact) => {
      output[artifact.id] = kernel.artifactStates[artifact.id].done === true;
      return output;
    }, {}),
    sources,
    config: kernel.config,
    change: kernel.changeConfig
  });

  const prerequisites = [];
  const incompleteRequiredArtifacts = kernel.graph.artifacts
    .filter((artifact) => artifact.optional !== true)
    .filter((artifact) => !(kernel.artifactStates[artifact.id] && kernel.artifactStates[artifact.id].done === true))
    .map((artifact) => artifact.id);

  incompleteRequiredArtifacts.forEach((artifactId) => {
    prerequisites.push(`${artifactId} artifact is not completed`);
  });

  if (!tasksState || tasksState.done !== true) {
    if (!prerequisites.includes('tasks artifact is not completed')) {
      prerequisites.push('tasks artifact is not completed');
    }
  }
  if (checkpoint.status === 'BLOCK') {
    checkpoint.findings.forEach((finding) => prerequisites.push(finding.message));
  }

  const checkpointTdd = checkpoint && checkpoint.tdd && typeof checkpoint.tdd === 'object' ? checkpoint.tdd : {};
  const checkpointTddGroups = Array.isArray(checkpointTdd.groups) ? checkpointTdd.groups : [];
  const selectedTaskGroupTitle = remainingGroups.length ? remainingGroups[0].title : '';
  const selectedTddGroup = selectedTaskGroupTitle
    ? checkpointTddGroups.find((group) => String(group.heading || '').trim() === selectedTaskGroupTitle) || null
    : null;
  const configuredTddMode = (
    kernel.config
    && kernel.config.rules
    && kernel.config.rules.tdd
    && typeof kernel.config.rules.tdd.mode === 'string'
  )
    ? kernel.config.rules.tdd.mode
    : 'strict';
  const tddMode = typeof checkpointTdd.mode === 'string' ? checkpointTdd.mode : configuredTddMode;
  const nextTaskGroupClass = selectedTddGroup && selectedTddGroup.class
    ? String(selectedTddGroup.class).trim()
    : null;
  const nextTaskGroupExempt = selectedTddGroup ? selectedTddGroup.exempt === true : false;
  const tddCheckpointFindings = checkpoint.findings
    .filter((finding) => String(finding.code || '').startsWith('tdd-'))
    .map((finding) => ({
      severity: finding.severity,
      code: finding.code,
      patchTargets: finding.patchTargets
    }));

  const payload = {
    change: kernel.change,
    schema: kernel.schema,
    ready: prerequisites.length === 0,
    prerequisites,
    checkpoint: {
      status: checkpoint.status,
      findings: checkpoint.findings.map((finding) => ({
        severity: finding.severity,
        code: finding.code,
        patchTargets: finding.patchTargets
      })),
      tddFindings: tddCheckpointFindings
    },
    tddMode,
    nextTaskGroupClass,
    nextTaskGroupExempt,
    remainingTaskGroups: remainingGroups,
    nextTaskGroup: remainingGroups.length ? remainingGroups[0].title : null,
    active: {
      taskGroup: driftAwareState.active.taskGroup || null,
      nextTaskGroup: driftAwareState.active.nextTaskGroup || null
    },
    hashDriftWarnings: driftInspection.drift.warnings.slice(),
    allowedPathWarnings,
    forbiddenPathWarnings
  };

  if (options.format === 'text') {
    const lines = [
      '# Apply instructions',
      `- change: ${payload.change}`,
      `- ready: ${payload.ready ? 'yes' : 'no'}`,
      `- taskCheckpoint: ${payload.checkpoint.status}`,
      `- tddMode: ${payload.tddMode}`,
      `- nextTaskGroupClass: ${payload.nextTaskGroupClass || '(none)'}`,
      `- nextTaskGroupExempt: ${payload.nextTaskGroupExempt ? 'yes' : 'no'}`,
      `- nextTaskGroup: ${payload.nextTaskGroup || '(none)'}`,
      '',
      '## Remaining task groups'
    ];
    if (!remainingGroups.length) {
      lines.push('- none');
    } else {
      remainingGroups.forEach((group) => {
        lines.push(`- ${group.title}`);
        group.pendingItems.forEach((item) => lines.push(`  - [ ] ${item}`));
      });
    }
    if (prerequisites.length) {
      lines.push('', '## Prerequisites', ...prerequisites.map((item) => `- ${item}`));
    }
    if (payload.checkpoint.tddFindings.length) {
      lines.push(
        '',
        '## TDD Findings',
        ...payload.checkpoint.tddFindings.map((finding) => `- ${finding.severity} ${finding.code}`)
      );
    }
    if (payload.hashDriftWarnings.length) {
      lines.push('', '## Hash Drift Warnings', ...payload.hashDriftWarnings.map((item) => `- ${item}`));
    }
    if (payload.allowedPathWarnings.length) {
      lines.push('', '## Allowed Path Warnings', ...payload.allowedPathWarnings.map((item) => `- ${item}`));
    }
    if (payload.forbiddenPathWarnings.length) {
      lines.push('', '## Forbidden Path Warnings', ...payload.forbiddenPathWarnings.map((item) => `- ${item}`));
    }
    return lines.join('\n');
  }

  return payload;
}

module.exports = {
  buildResumeInstructions,
  buildContinueInstructions,
  buildArtifactInstructions,
  buildApplyInstructions
};
