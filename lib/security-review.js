const { DEFAULT_SCHEMA } = require('./constants');
const { loadSchema } = require('./schema');
const { unique } = require('./string-utils');
const { DEFAULT_HEURISTIC_INPUTS } = require('./workflow-constants');
const {
  toList,
  parseHeuristicHints,
  getTextBlock
} = require('./workflow-utils');

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

module.exports = {
  normalizeArtifactPresence,
  resolveSchema,
  getArtifactDefinition,
  resolveSecurityReviewState,
  resolveWorkflowState,
  summarizeWorkflowState
};
