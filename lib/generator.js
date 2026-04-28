const path = require('path');
const { REPO_ROOT } = require('./constants');
const { readText } = require('./fs-utils');
const { renderTemplate } = require('./template');
const {
  getAllActions,
  getActionSyntax,
  getPrimaryWorkflowSyntax,
  getPhaseThreePreflightLines,
  getActionFallbackLines,
  REVIEW_STATES,
  CHECKPOINT_STATES
} = require('./workflow');

function loadTemplate(relativePath) {
  return readText(path.join(REPO_ROOT, 'templates', 'commands', relativePath));
}

function buildCommandList(platform) {
  return getAllActions()
    .map((action) => `- \`${getActionSyntax(platform, action.id)}\` - ${action.summary}`)
    .join('\n');
}

function formatBullets(lines) {
  return (lines || []).map((line) => `- ${line}`).join('\n');
}

function getPlanningCheckpointNote(actionId) {
  if (['propose', 'continue', 'ff'].includes(actionId)) {
    return '`spec-split-checkpoint` runs after `specs` and before `design`; `spec checkpoint` runs after `design` and before `tasks`; `task checkpoint` runs after `tasks` and before `apply`, applies `rules.tdd.mode`, requires `RED` and `VERIFY` for `behavior-change` and `bugfix` groups, and accepts visible `TDD Exemption:` reasons for exempt work.';
  }
  if (actionId === 'apply') {
    return '`spec checkpoint` runs after `design` and before `tasks`; `task checkpoint` runs after `tasks` and before `apply`, applies `rules.tdd.mode`, requires `RED` and `VERIFY` for `behavior-change` and `bugfix` groups, and accepts visible `TDD Exemption:` reasons for exempt work.';
  }
  if (actionId === 'verify') {
    return 'Verify routes must report `PASS`, `WARN`, and `BLOCK` findings with `patchTargets` and a concrete `nextStep` before archive eligibility.';
  }
  if (actionId === 'sync') {
    return 'Sync routes must compute conservative in-memory plans first, then emit `PASS`/`WARN`/`BLOCK`; when blocked, do not write partial sync output.';
  }
  if (actionId === 'archive') {
    return 'Archive routes must require verify/sync preconditions; if a change is `VERIFIED`, run the same safe sync check before moving it into `.opsx/archive/<change-name>/`.';
  }
  if (actionId === 'batch-apply' || actionId === 'bulk-archive') {
    return 'Batch routes must run global preconditions first, then process each change in per-change isolation and report applied/archived, skipped, and blocked counts.';
  }
  return '`spec checkpoint` runs after `design` and before `tasks`; `task checkpoint` runs after `tasks` and before `apply`.';
}

function getExecutionCheckpointNote(actionId) {
  if (actionId === 'apply') {
    return '`execution checkpoint` runs after each top-level task group during `apply` and records completed TDD steps, verification command/result, diff summary, and drift status.';
  }
  if (actionId === 'verify') {
    return 'Verify execution records `PASS`/`WARN`/`BLOCK` findings and blocks downstream archive actions until unresolved `BLOCK` findings are patched.';
  }
  if (actionId === 'sync') {
    return 'Sync execution writes only after full-plan acceptance; when findings include `BLOCK`, do not write partial sync output.';
  }
  if (actionId === 'archive') {
    return 'Archive execution re-runs verify/sync safety, performs internal safe sync from `VERIFIED`, and archives the full change directory at `.opsx/archive/<change-name>/.`';
  }
  if (actionId === 'batch-apply' || actionId === 'bulk-archive') {
    return 'Batch execution keeps per-change isolation, continues through per-change failures, and reports skipped/blocked reasons plus aggregate counts.';
  }
  return '`execution checkpoint` runs after each top-level task group during `apply`.';
}

function buildActionMarkdown(platform, action) {
  const template = loadTemplate('action.md.tmpl');
  const inlineArgumentNote = platform === 'codex'
    ? 'Do not assume text typed after a `$opsx-*` command is reliably available as an inline argument in Codex.'
    : 'Use inline arguments when available, but confirm ambiguous names or descriptions before mutating files.';
  const preflightLines = formatBullets(getPhaseThreePreflightLines());
  const fallbackLines = formatBullets(getActionFallbackLines(platform, action.id));
  return renderTemplate(template, {
    description: action.summary,
    title: `OpsX route: ${action.title}`,
    action: action.id,
    inline_argument_note: inlineArgumentNote,
    scope: action.scope,
    primary_workflow_syntax: getPrimaryWorkflowSyntax(platform),
    action_syntax: getActionSyntax(platform, action.id),
    review_state_note: REVIEW_STATES.map((state) => `\`${state}\``).join(', '),
    planning_checkpoint_note: getPlanningCheckpointNote(action.id),
    execution_checkpoint_note: getExecutionCheckpointNote(action.id),
    checkpoint_state_note: CHECKPOINT_STATES.map((state) => `\`${state}\``).join(', '),
    preflight_note: preflightLines,
    fallback_note: fallbackLines
  });
}

function buildIndexMarkdown(platform, heading) {
  const template = loadTemplate('index.md.tmpl');
  const platformLabel = platform === 'codex' ? 'Codex' : platform === 'claude' ? 'Claude' : 'Gemini';
  const inlineNote = platform === 'codex'
    ? 'Treat `$opsx-*` as action selectors in Codex. If details are still needed, provide them in the next message.'
    : 'Inline command arguments are acceptable, but the workflow should still confirm missing or ambiguous details.';
  return renderTemplate(template, {
    description: `OpsX workflow command index for ${platformLabel}`,
    heading,
    platform_label: platformLabel,
    primary_workflow_syntax: getPrimaryWorkflowSyntax(platform),
    command_list: buildCommandList(platform),
    inline_note: inlineNote,
    review_state_note: REVIEW_STATES.map((state) => `\`${state}\``).join(', '),
    checkpoint_note: '`spec checkpoint` before `tasks`, `task checkpoint` before `apply`, and `execution checkpoint` after each top-level task group.',
    checkpoint_state_note: CHECKPOINT_STATES.map((state) => `\`${state}\``).join(', '),
    preflight_note: formatBullets(getPhaseThreePreflightLines())
  });
}

function buildCodexEntryMarkdown() {
  const template = loadTemplate('codex-entry.md.tmpl');
  return renderTemplate(template, {
    command_list: buildCommandList('codex'),
    review_state_note: REVIEW_STATES.map((state) => `\`${state}\``).join(', '),
    checkpoint_note: '`spec checkpoint` before `tasks`, `task checkpoint` before `apply`, and `execution checkpoint` after each top-level task group.',
    preflight_note: formatBullets(getPhaseThreePreflightLines())
  });
}

function buildGeminiActionToml(action) {
  const template = loadTemplate('gemini-action.toml.tmpl');
  const prompt = buildActionMarkdown('gemini', action).replace(/"""/g, '\\\"\\\"\\\"');
  return renderTemplate(template, {
    description: action.summary.replace(/"/g, '\\"'),
    prompt
  });
}

function buildGeminiIndexToml(heading) {
  const template = loadTemplate('gemini-index.toml.tmpl');
  const prompt = buildIndexMarkdown('gemini', heading).replace(/"""/g, '\\\"\\\"\\\"');
  return renderTemplate(template, {
    description: 'OpsX workflow command index for Gemini',
    prompt
  });
}

function buildPlatformBundle(platform) {
  const files = {};
  const actions = getAllActions();

  if (platform === 'claude') {
    files['opsx.md'] = buildIndexMarkdown('claude', 'OpsX Workflow');
    actions.forEach((action) => {
      files[`opsx/${action.id}.md`] = buildActionMarkdown('claude', action);
    });
    return files;
  }

  if (platform === 'codex') {
    files['prompts/opsx.md'] = buildCodexEntryMarkdown();
    actions.forEach((action) => {
      files[`prompts/opsx-${action.id}.md`] = buildActionMarkdown('codex', action);
    });
    return files;
  }

  if (platform === 'gemini') {
    files['opsx.toml'] = buildGeminiIndexToml('OpsX Workflow');
    actions.forEach((action) => {
      files[`opsx/${action.id}.toml`] = buildGeminiActionToml(action);
    });
    return files;
  }

  throw new Error(`Unsupported platform: ${platform}`);
}
module.exports = {
  buildPlatformBundle
};
