const { PRODUCT_SHORT_NAME, SHARED_HOME_NAME } = require('./constants');

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
    scope: 'Archive only changes that pass verify and sync preconditions, and if a change is only VERIFIED, run the same safe sync check before moving it.'
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
    scope: 'Return PASS/WARN/BLOCK findings with patch targets and a concrete next action.'
  },
  {
    id: 'sync',
    title: 'Sync',
    summary: 'Merge delta specs from a change into the main spec set.',
    scope: 'Compute sync changes in memory first, report PASS/WARN/BLOCK findings, and do not write partial sync output when blocked.'
  },
  {
    id: 'bulk-archive',
    title: 'Bulk archive',
    summary: 'Archive multiple completed changes together.',
    scope: 'Run global preconditions first, then archive each change in per-change isolation with skipped/blocked reasons.'
  },
  {
    id: 'batch-apply',
    title: 'Batch apply',
    summary: 'Apply multiple ready changes in a controlled sequence.',
    scope: 'Use per-change isolation, keep running after per-change failures, and report applied/skipped/blocked counts.'
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
    'Create only the new-change scaffold: `change.yaml`, `specs/`, `state.yaml`, `context.md`, and `drift.md`; do not create placeholder planning artifacts.',
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
  verify: Object.freeze([
    'If `.opsx/config.yaml` is missing, stop and redirect to `{{onboardRoute}}`.',
    'If `.opsx/active.yaml` is missing or points to a missing change, stop and ask the user to run `{{newRoute}}` or `{{proposeRoute}}`.',
    'Run `implementation-consistency-checkpoint` for `IMPLEMENTED` changes before accepting verify.',
    'Emit PASS/WARN/BLOCK findings with patch targets and a concrete next action before sync or archive.'
  ]),
  sync: Object.freeze([
    'If `.opsx/config.yaml` is missing, stop and redirect to `{{onboardRoute}}`.',
    'If `.opsx/active.yaml` is missing or points to a missing change, stop and ask the user to run `{{newRoute}}` or `{{proposeRoute}}`.',
    'Build a conservative in-memory sync plan first, then emit PASS/WARN/BLOCK findings.',
    'When findings include BLOCK conflicts, do not write partial sync output.'
  ]),
  archive: Object.freeze([
    'If `.opsx/config.yaml` is missing, stop and redirect to `{{onboardRoute}}`.',
    'If `.opsx/active.yaml` is missing or points to a missing change, stop and ask the user to run `{{newRoute}}` or `{{proposeRoute}}`.',
    'Archive only changes that pass verify and sync preconditions.',
    'If the change is only VERIFIED, run the same safe sync check before moving it.',
    'Move the full change directory into `.opsx/archive/<change-name>/` after PASS gate acceptance.'
  ]),
  'batch-apply': Object.freeze([
    'If `.opsx/config.yaml` is missing, stop and redirect to `{{onboardRoute}}`.',
    'Evaluate global preconditions first and stop immediately when they fail with BLOCK.',
    'Run each target change in per-change isolation and report applied/skipped/blocked results with reasons.'
  ]),
  'bulk-archive': Object.freeze([
    'If `.opsx/config.yaml` is missing, stop and redirect to `{{onboardRoute}}`.',
    'Evaluate global preconditions first and stop immediately when they fail with BLOCK.',
    'Run each target change in per-change isolation and report archived/skipped/blocked results with reasons.'
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
  OPSX_SKILL_DIR_PREFIX,
  LEGACY_SKILL_DIR_PREFIX,
  LEGACY_CHANGE_DIR_PREFIX,
  getAction,
  getAllActions,
  getActionSyntax,
  getPrimaryWorkflowSyntax,
  getPhaseThreePreflightLines,
  getActionFallbackLines
};
