const { toNonEmptyString } = require('./string-utils');

const STAGE_VALUES = Object.freeze([
  'INIT',
  'PROPOSAL_READY',
  'SPECS_READY',
  'SPEC_SPLIT_REVIEWED',
  'DESIGN_READY',
  'SECURITY_REVIEW_REQUIRED',
  'SECURITY_REVIEWED',
  'SPEC_REVIEWED',
  'TASKS_READY',
  'APPLYING_GROUP',
  'GROUP_VERIFIED',
  'IMPLEMENTED',
  'VERIFIED',
  'SYNCED',
  'ARCHIVED',
  'BLOCKED'
]);

const STAGE_SET = new Set(STAGE_VALUES);

const LEGACY_STAGE_TO_LIFECYCLE = Object.freeze({
  proposal: 'PROPOSAL_READY',
  specs: 'SPECS_READY',
  design: 'DESIGN_READY',
  tasks: 'TASKS_READY',
  metadata: 'INIT',
  bootstrap: 'INIT'
});

const MUTATION_EVENTS = Object.freeze({
  NEW_SKELETON_CREATED: 'NEW_SKELETON_CREATED',
  PROPOSAL_ACCEPTED: 'PROPOSAL_ACCEPTED',
  SPECS_ACCEPTED: 'SPECS_ACCEPTED',
  SPEC_SPLIT_ACCEPTED: 'SPEC_SPLIT_ACCEPTED',
  DESIGN_ACCEPTED: 'DESIGN_ACCEPTED',
  SECURITY_REVIEW_MARKED_REQUIRED: 'SECURITY_REVIEW_MARKED_REQUIRED',
  SECURITY_REVIEW_ACCEPTED: 'SECURITY_REVIEW_ACCEPTED',
  TASKS_ACCEPTED: 'TASKS_ACCEPTED',
  START_TASK_GROUP: 'START_TASK_GROUP',
  COMPLETE_TASK_GROUP: 'COMPLETE_TASK_GROUP',
  VERIFY_ACCEPTED: 'VERIFY_ACCEPTED',
  SYNC_ACCEPTED: 'SYNC_ACCEPTED',
  ARCHIVE_ACCEPTED: 'ARCHIVE_ACCEPTED',
  BLOCK: 'BLOCK'
});

const DEFAULT_PATCH_TARGETS = Object.freeze(['state.yaml']);

function normalizePatchTargets(patchTargets) {
  if (Array.isArray(patchTargets)) {
    return patchTargets
      .map((entry) => toNonEmptyString(entry))
      .filter(Boolean);
  }
  const single = toNonEmptyString(patchTargets);
  return single ? [single] : [];
}

function normalizeEvent(event) {
  if (typeof event === 'string') {
    return {
      type: toNonEmptyString(event),
      patchTargets: [],
      taskGroup: '',
      nextTaskGroup: ''
    };
  }
  if (!event || typeof event !== 'object' || Array.isArray(event)) {
    return {
      type: '',
      patchTargets: [],
      taskGroup: '',
      nextTaskGroup: ''
    };
  }
  return {
    type: toNonEmptyString(event.type || event.event),
    patchTargets: normalizePatchTargets(event.patchTargets),
    taskGroup: toNonEmptyString(event.taskGroup || event.activeTaskGroup),
    nextTaskGroup: toNonEmptyString(event.nextTaskGroup)
  };
}

function normalizeState(state) {
  const source = state && typeof state === 'object' && !Array.isArray(state) ? state : {};
  const active = source.active && typeof source.active === 'object' && !Array.isArray(source.active)
    ? source.active
    : {};
  const normalizedStage = toNonEmptyString(source.stage);
  const legacyStage = LEGACY_STAGE_TO_LIFECYCLE[normalizedStage.toLowerCase()];
  return {
    ...source,
    stage: STAGE_SET.has(normalizedStage) ? normalizedStage : (legacyStage || 'INIT'),
    active: {
      ...active
    }
  };
}

function resolveTaskGroupFromState(state, event) {
  const fromEvent = toNonEmptyString(event.taskGroup);
  if (fromEvent) return fromEvent;
  const fromState = toNonEmptyString(state.active && state.active.taskGroup);
  if (fromState) return fromState;
  return '';
}

function resolveNextTaskGroupFromState(state, event) {
  const fromEvent = toNonEmptyString(event.nextTaskGroup);
  if (fromEvent) return fromEvent;
  const fromState = toNonEmptyString(state.active && state.active.nextTaskGroup);
  if (fromState) return fromState;
  return '';
}

function buildLifecycleBlockResult(code, message, patchTargets, nextStep) {
  const normalizedPatchTargets = normalizePatchTargets(patchTargets);
  return {
    status: 'BLOCK',
    code: toNonEmptyString(code) || 'lifecycle-blocked',
    message: toNonEmptyString(message) || 'Lifecycle transition blocked.',
    patchTargets: normalizedPatchTargets.length ? normalizedPatchTargets : [...DEFAULT_PATCH_TARGETS],
    nextStep: toNonEmptyString(nextStep) || 'Review state.yaml and retry with a valid lifecycle event.'
  };
}

const TRANSITIONS = Object.freeze({
  INIT: Object.freeze({
    [MUTATION_EVENTS.NEW_SKELETON_CREATED]: () => ({ stage: 'INIT' }),
    [MUTATION_EVENTS.PROPOSAL_ACCEPTED]: () => ({ stage: 'PROPOSAL_READY' }),
    [MUTATION_EVENTS.BLOCK]: () => ({ stage: 'BLOCKED' })
  }),
  PROPOSAL_READY: Object.freeze({
    [MUTATION_EVENTS.SPECS_ACCEPTED]: () => ({ stage: 'SPECS_READY' }),
    [MUTATION_EVENTS.BLOCK]: () => ({ stage: 'BLOCKED' })
  }),
  SPECS_READY: Object.freeze({
    [MUTATION_EVENTS.SPEC_SPLIT_ACCEPTED]: () => ({ stage: 'SPEC_SPLIT_REVIEWED' }),
    [MUTATION_EVENTS.BLOCK]: () => ({ stage: 'BLOCKED' })
  }),
  SPEC_SPLIT_REVIEWED: Object.freeze({
    [MUTATION_EVENTS.DESIGN_ACCEPTED]: () => ({ stage: 'DESIGN_READY' }),
    [MUTATION_EVENTS.BLOCK]: () => ({ stage: 'BLOCKED' })
  }),
  DESIGN_READY: Object.freeze({
    [MUTATION_EVENTS.SECURITY_REVIEW_MARKED_REQUIRED]: () => ({ stage: 'SECURITY_REVIEW_REQUIRED' }),
    [MUTATION_EVENTS.TASKS_ACCEPTED]: () => ({ stage: 'TASKS_READY' }),
    [MUTATION_EVENTS.BLOCK]: () => ({ stage: 'BLOCKED' })
  }),
  SECURITY_REVIEW_REQUIRED: Object.freeze({
    [MUTATION_EVENTS.SECURITY_REVIEW_ACCEPTED]: () => ({ stage: 'SECURITY_REVIEWED' }),
    [MUTATION_EVENTS.BLOCK]: () => ({ stage: 'BLOCKED' })
  }),
  SECURITY_REVIEWED: Object.freeze({
    [MUTATION_EVENTS.TASKS_ACCEPTED]: () => ({ stage: 'TASKS_READY' }),
    [MUTATION_EVENTS.BLOCK]: () => ({ stage: 'BLOCKED' })
  }),
  SPEC_REVIEWED: Object.freeze({
    [MUTATION_EVENTS.TASKS_ACCEPTED]: () => ({ stage: 'TASKS_READY' }),
    [MUTATION_EVENTS.BLOCK]: () => ({ stage: 'BLOCKED' })
  }),
  TASKS_READY: Object.freeze({
    [MUTATION_EVENTS.START_TASK_GROUP]: (state, event) => {
      const taskGroup = resolveTaskGroupFromState(state, event);
      if (!taskGroup) {
        return buildLifecycleBlockResult(
          'missing-task-group',
          'Cannot start a task group from TASKS_READY without taskGroup.',
          event.patchTargets,
          'Select a pending task group or pass taskGroup explicitly before applying.'
        );
      }
      return {
        stage: 'APPLYING_GROUP',
        active: {
          ...(state.active || {}),
          taskGroup,
          nextTaskGroup: resolveNextTaskGroupFromState(state, event) || null
        }
      };
    },
    [MUTATION_EVENTS.BLOCK]: () => ({ stage: 'BLOCKED' })
  }),
  APPLYING_GROUP: Object.freeze({
    [MUTATION_EVENTS.COMPLETE_TASK_GROUP]: (state, event) => {
      const nextTaskGroup = resolveNextTaskGroupFromState(state, event);
      const active = {
        ...(state.active || {}),
        taskGroup: null,
        nextTaskGroup: nextTaskGroup || null
      };
      if (nextTaskGroup) {
        return {
          stage: 'GROUP_VERIFIED',
          active
        };
      }
      return {
        stage: 'IMPLEMENTED',
        active
      };
    },
    [MUTATION_EVENTS.BLOCK]: () => ({ stage: 'BLOCKED' })
  }),
  GROUP_VERIFIED: Object.freeze({
    [MUTATION_EVENTS.START_TASK_GROUP]: (state, event) => {
      const taskGroup = resolveTaskGroupFromState(state, event) || resolveNextTaskGroupFromState(state, event);
      if (!taskGroup) {
        return buildLifecycleBlockResult(
          'missing-task-group',
          'Cannot start a task group from GROUP_VERIFIED without taskGroup or nextTaskGroup.',
          event.patchTargets,
          'Record the next task group in state.yaml or pass taskGroup explicitly before applying.'
        );
      }
      return {
        stage: 'APPLYING_GROUP',
        active: {
          ...(state.active || {}),
          taskGroup,
          nextTaskGroup: resolveNextTaskGroupFromState(state, event) || null
        }
      };
    },
    [MUTATION_EVENTS.VERIFY_ACCEPTED]: () => ({ stage: 'IMPLEMENTED' }),
    [MUTATION_EVENTS.BLOCK]: () => ({ stage: 'BLOCKED' })
  }),
  IMPLEMENTED: Object.freeze({
    [MUTATION_EVENTS.VERIFY_ACCEPTED]: () => ({ stage: 'VERIFIED' }),
    [MUTATION_EVENTS.BLOCK]: () => ({ stage: 'BLOCKED' })
  }),
  VERIFIED: Object.freeze({
    [MUTATION_EVENTS.SYNC_ACCEPTED]: () => ({ stage: 'SYNCED' }),
    [MUTATION_EVENTS.BLOCK]: () => ({ stage: 'BLOCKED' })
  }),
  SYNCED: Object.freeze({
    [MUTATION_EVENTS.ARCHIVE_ACCEPTED]: () => ({ stage: 'ARCHIVED' }),
    [MUTATION_EVENTS.BLOCK]: () => ({ stage: 'BLOCKED' })
  }),
  ARCHIVED: Object.freeze({}),
  BLOCKED: Object.freeze({
    [MUTATION_EVENTS.BLOCK]: () => ({ stage: 'BLOCKED' })
  })
});

function resolveContinueAction(state = {}) {
  const normalized = normalizeState(state);
  switch (normalized.stage) {
    case 'INIT':
    case 'PROPOSAL_READY':
    case 'SPECS_READY':
    case 'SPEC_SPLIT_REVIEWED':
    case 'DESIGN_READY':
    case 'SECURITY_REVIEW_REQUIRED':
    case 'SECURITY_REVIEWED':
    case 'SPEC_REVIEWED':
      return 'continue';
    case 'TASKS_READY':
    case 'APPLYING_GROUP':
      return 'apply';
    case 'GROUP_VERIFIED':
      return toNonEmptyString(normalized.active && normalized.active.nextTaskGroup) ? 'apply' : 'verify';
    case 'IMPLEMENTED':
      return 'verify';
    case 'VERIFIED':
      return 'sync';
    case 'SYNCED':
      return 'archive';
    default:
      return 'status';
  }
}

function resolveNextArtifact(state = {}) {
  const normalized = normalizeState(state);
  switch (normalized.stage) {
    case 'INIT':
      return 'proposal';
    case 'PROPOSAL_READY':
      return 'specs';
    case 'SPECS_READY':
      return 'spec-split-checkpoint';
    case 'SPEC_SPLIT_REVIEWED':
      return 'design';
    case 'DESIGN_READY':
      return 'tasks';
    case 'SECURITY_REVIEW_REQUIRED':
      return 'security-review';
    case 'SECURITY_REVIEWED':
    case 'SPEC_REVIEWED':
      return 'tasks';
    default:
      return null;
  }
}

function applyMutationEvent(state, event) {
  const normalizedState = normalizeState(state);
  const normalizedEvent = normalizeEvent(event);
  const eventType = normalizedEvent.type;

  if (!eventType || !Object.prototype.hasOwnProperty.call(MUTATION_EVENTS, eventType)) {
    return buildLifecycleBlockResult(
      'invalid-transition',
      `Unknown lifecycle event "${eventType || 'empty'}" for stage "${normalizedState.stage}".`,
      normalizedEvent.patchTargets,
      'Use a supported mutation event from MUTATION_EVENTS.'
    );
  }

  const stageTransitions = TRANSITIONS[normalizedState.stage] || {};
  const transition = stageTransitions[eventType];
  if (typeof transition !== 'function') {
    return buildLifecycleBlockResult(
      'invalid-transition',
      `Invalid transition: ${normalizedState.stage} -> ${eventType}.`,
      normalizedEvent.patchTargets,
      'Review state.yaml stage and choose a valid next mutation event.'
    );
  }

  const transitionResult = transition(normalizedState, normalizedEvent) || {};
  if (transitionResult.status === 'BLOCK') return transitionResult;
  const targetStage = toNonEmptyString(transitionResult.stage);
  const nextStage = STAGE_SET.has(targetStage) ? targetStage : normalizedState.stage;
  const nextState = {
    ...normalizedState,
    ...transitionResult,
    stage: nextStage
  };

  return {
    status: 'OK',
    stage: nextState.stage,
    nextAction: resolveContinueAction(nextState),
    state: nextState,
    event: eventType
  };
}

module.exports = {
  STAGE_VALUES,
  MUTATION_EVENTS,
  applyMutationEvent,
  resolveContinueAction,
  resolveNextArtifact,
  buildLifecycleBlockResult
};
