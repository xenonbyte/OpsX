const path = require('path');
const { REPO_ROOT } = require('./constants');
const { readText } = require('./fs-utils');
const { renderTemplate } = require('./template');
const { getProfileActions, getActionSyntax, getOpenSpecSyntax, REVIEW_STATES, CHECKPOINT_STATES } = require('./workflow');

function loadTemplate(relativePath) {
  return readText(path.join(REPO_ROOT, 'templates', 'commands', relativePath));
}

function buildCommandList(platform, profile) {
  return getProfileActions(profile)
    .map((action) => `- \`${getActionSyntax(platform, action.id)}\` - ${action.summary}`)
    .join('\n');
}

function buildActionMarkdown(platform, action) {
  const template = loadTemplate('action.md.tmpl');
  const inlineArgumentNote = platform === 'codex'
    ? 'Do not assume text typed after a `/prompts:` command is reliably available as an inline argument in Codex.'
    : 'Use inline arguments when available, but confirm ambiguous names or descriptions before mutating files.';
  return renderTemplate(template, {
    description: action.summary,
    title: `OpenSpec route: ${action.title}`,
    action: action.id,
    profiles: action.profiles.join(', '),
    inline_argument_note: inlineArgumentNote,
    scope: action.scope,
    open_spec_syntax: getOpenSpecSyntax(platform),
    action_syntax: getActionSyntax(platform, action.id),
    review_state_note: REVIEW_STATES.map((state) => `\`${state}\``).join(', '),
    planning_checkpoint_note: '`spec checkpoint` runs after `design` and before `tasks`; `task checkpoint` runs after `tasks` and before `apply`.',
    execution_checkpoint_note: '`execution checkpoint` runs after each top-level task group during `apply`.',
    checkpoint_state_note: CHECKPOINT_STATES.map((state) => `\`${state}\``).join(', ')
  });
}

function buildIndexMarkdown(platform, profile, heading) {
  const template = loadTemplate('index.md.tmpl');
  const platformLabel = platform === 'codex' ? 'Codex' : platform === 'claude' ? 'Claude' : 'Gemini';
  const inlineNote = platform === 'codex'
    ? 'Treat `/prompts:*` as action selectors in Codex. If details are still needed, provide them in the next message.'
    : 'Inline command arguments are acceptable, but the workflow should still confirm missing or ambiguous details.';
  return renderTemplate(template, {
    description: `OpenSpec workflow command index for ${platformLabel}`,
    heading,
    platform_label: platformLabel,
    open_spec_syntax: getOpenSpecSyntax(platform),
    profile: profile,
    command_list: buildCommandList(platform, profile),
    inline_note: inlineNote,
    review_state_note: REVIEW_STATES.map((state) => `\`${state}\``).join(', '),
    checkpoint_note: '`spec checkpoint` before `tasks`, `task checkpoint` before `apply`, and `execution checkpoint` after each top-level task group.',
    checkpoint_state_note: CHECKPOINT_STATES.map((state) => `\`${state}\``).join(', ')
  });
}

function buildCodexEntryMarkdown(profile) {
  const template = loadTemplate('codex-entry.md.tmpl');
  return renderTemplate(template, {
    profile,
    command_list: buildCommandList('codex', profile),
    review_state_note: REVIEW_STATES.map((state) => `\`${state}\``).join(', '),
    checkpoint_note: '`spec checkpoint` before `tasks`, `task checkpoint` before `apply`, and `execution checkpoint` after each top-level task group.'
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

function buildGeminiIndexToml(profile, heading) {
  const template = loadTemplate('gemini-index.toml.tmpl');
  const prompt = buildIndexMarkdown('gemini', profile, heading).replace(/"""/g, '\\\"\\\"\\\"');
  return renderTemplate(template, {
    description: `OpenSpec workflow command index for Gemini`,
    prompt
  });
}

function buildPlatformBundle(platform, profile) {
  const files = {};
  const actions = getProfileActions(profile);

  if (platform === 'claude') {
    files['openspec.md'] = buildIndexMarkdown('claude', profile, 'OpenSpec');
    files['opsx.md'] = buildIndexMarkdown('claude', profile, 'OpenSpec Workflow');
    actions.forEach((action) => {
      files[`opsx/${action.id}.md`] = buildActionMarkdown('claude', action);
    });
    return files;
  }

  if (platform === 'codex') {
    files['prompts/openspec.md'] = buildCodexEntryMarkdown(profile);
    files['prompts/opsx.md'] = buildIndexMarkdown('codex', profile, 'OpenSpec Workflow');
    actions.forEach((action) => {
      files[`prompts/opsx-${action.id}.md`] = buildActionMarkdown('codex', action);
    });
    return files;
  }

  if (platform === 'gemini') {
    files['openspec.toml'] = buildGeminiIndexToml(profile, 'OpenSpec');
    files['opsx.toml'] = buildGeminiIndexToml(profile, 'OpenSpec Workflow');
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
