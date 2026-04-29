const path = require('path');
const { ensureDir, readTextIfFile, writeTextAtomic } = require('./fs-utils');

const DRIFT_SECTIONS = Object.freeze([
  { key: 'newAssumptions', heading: '## New Assumptions' },
  { key: 'scopeChanges', heading: '## Scope Changes' },
  { key: 'outOfBoundFileChanges', heading: '## Out-of-Bound File Changes' },
  { key: 'discoveredRequirements', heading: '## Discovered Requirements' },
  { key: 'userApprovalNeeded', heading: '## User Approval Needed' }
]);

const MAX_CONTEXT_ITEMS = 8;
const MAX_CONTEXT_LINES = 120;
const MAX_CONTEXT_CHARS = 12000;
const MAX_LIST_INLINE_ITEMS = 20;
const MAX_SUMMARY_CHARS = 400;

const DRIFT_SECTION_MAP = DRIFT_SECTIONS.reduce((output, section) => {
  output[section.key] = section.heading;
  output[section.heading.toLowerCase()] = section.heading;
  return output;
}, {});

function toStringArray(value) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => String(entry || '').trim())
      .filter(Boolean);
  }
  const single = String(value || '').trim();
  return single ? [single] : [];
}

function normalizeState(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    return {
      stage: 'INIT',
      nextAction: 'status',
      active: {},
      warnings: [],
      blockers: [],
      verificationLog: [],
      hashes: {}
    };
  }
  const active = state.active && typeof state.active === 'object' && !Array.isArray(state.active)
    ? state.active
    : {};
  return {
    stage: typeof state.stage === 'string' && state.stage.trim() ? state.stage.trim() : 'INIT',
    nextAction: typeof state.nextAction === 'string' && state.nextAction.trim() ? state.nextAction.trim() : 'status',
    active,
    warnings: toStringArray(state.warnings),
    blockers: toStringArray(state.blockers),
    verificationLog: Array.isArray(state.verificationLog) ? state.verificationLog : [],
    hashes: state.hashes && typeof state.hashes === 'object' && !Array.isArray(state.hashes) ? state.hashes : {}
  };
}

function renderList(lines, values, fallbackText = 'None') {
  if (!values.length) {
    lines.push(`- ${fallbackText}`);
    return;
  }
  values.forEach((entry) => lines.push(`- ${entry}`));
}

function normalizeSourceText(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join('\n');
  return typeof value === 'string' ? value : '';
}

function normalizeContextList(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry || '').trim()).filter(Boolean).slice(0, MAX_CONTEXT_ITEMS);
  }
  const single = String(value || '').trim();
  return single ? [single] : [];
}

function truncateText(value, maxLength = MAX_SUMMARY_CHARS) {
  const text = String(value || '').trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function formatBoundedList(values, maxItems = MAX_LIST_INLINE_ITEMS) {
  const normalized = toStringArray(values);
  if (normalized.length <= maxItems) return normalized.join(', ');
  return `${normalized.slice(0, maxItems).join(', ')}, ... +${normalized.length - maxItems} more`;
}

function extractSectionLines(markdown, headings) {
  const text = normalizeSourceText(markdown);
  if (!text.trim()) return [];
  const wanted = new Set(headings.map((heading) => String(heading || '').trim().toLowerCase()).filter(Boolean));
  const lines = text.split(/\r?\n/);
  const collected = [];
  let active = false;

  lines.forEach((line) => {
    const headingMatch = line.match(/^##+\s+(.+)$/);
    if (headingMatch) {
      active = wanted.has(headingMatch[1].trim().toLowerCase());
      return;
    }
    if (!active) return;
    const trimmed = line.trim();
    if (!trimmed) return;
    collected.push(trimmed.replace(/^[-*]\s+/, ''));
  });

  return collected.slice(0, MAX_CONTEXT_ITEMS);
}

function collectRequirementTitles(specsText) {
  return Array.from(normalizeSourceText(specsText).matchAll(/^###\s+Requirement:\s*(.+)$/gmi))
    .map((match) => match[1].trim())
    .filter(Boolean)
    .slice(0, MAX_CONTEXT_ITEMS);
}

function collectTddPlan(tasksText) {
  return normalizeSourceText(tasksText)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /\b(TDD|RED|GREEN|VERIFY|REFACTOR)\b/i.test(line))
    .map((line) => line.replace(/^[-*]\s+/, ''))
    .slice(0, MAX_CONTEXT_ITEMS);
}

function buildExecutionContext(normalized, options = {}) {
  const sourceContext = options.executionContext && typeof options.executionContext === 'object'
    ? options.executionContext
    : {};
  const sources = options.sources && typeof options.sources === 'object' ? options.sources : {};
  const activeTaskGroup = typeof normalized.active.taskGroup === 'string' && normalized.active.taskGroup.trim()
    ? normalized.active.taskGroup.trim()
    : '';
  const nextTaskGroup = typeof normalized.active.nextTaskGroup === 'string' && normalized.active.nextTaskGroup.trim()
    ? normalized.active.nextTaskGroup.trim()
    : '';

  const userIntent = normalizeContextList(sourceContext.userIntent)
    .concat(extractSectionLines(sources.proposal, ['why', '目的', '背景']))
    .slice(0, MAX_CONTEXT_ITEMS);
  const approvedScope = normalizeContextList(sourceContext.approvedScope)
    .concat(extractSectionLines(sources.proposal, ['what changes', 'changes', '变更内容', '修改内容', '范围', '需求范围']))
    .slice(0, MAX_CONTEXT_ITEMS);
  const outOfScope = normalizeContextList(sourceContext.outOfScope)
    .concat(extractSectionLines(sources.proposal, ['out of scope', 'non-goals', '非范围', '不做']))
    .slice(0, MAX_CONTEXT_ITEMS);
  const requirements = normalizeContextList(sourceContext.relevantRequirements)
    .concat(collectRequirementTitles(sources.specs))
    .slice(0, MAX_CONTEXT_ITEMS);
  const decisions = normalizeContextList(sourceContext.relevantDesignDecisions)
    .concat(extractSectionLines(sources.design, ['approach', 'design decisions', '方案', '设计决策']))
    .slice(0, MAX_CONTEXT_ITEMS);
  const tddPlan = normalizeContextList(sourceContext.tddPlan)
    .concat(collectTddPlan(sources.tasks))
    .slice(0, MAX_CONTEXT_ITEMS);
  const doNotDo = normalizeContextList(sourceContext.doNotDo)
    .concat(outOfScope.map((entry) => `Out of scope: ${entry}`))
    .slice(0, MAX_CONTEXT_ITEMS);

  return {
    userIntent,
    approvedScope,
    outOfScope,
    relevantRequirements: requirements,
    relevantDesignDecisions: decisions,
    currentTaskGroup: normalizeContextList(sourceContext.currentTaskGroup)
      .concat([activeTaskGroup || nextTaskGroup].filter(Boolean))
      .slice(0, 3),
    tddPlan,
    doNotDo
  };
}

function renderContextSection(lines, heading, values) {
  lines.push('', `## ${heading}`);
  renderList(lines, normalizeContextList(values), 'UNCONFIRMED');
}

function summarizeLastVerification(entry) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    return ['- None recorded'];
  }

  const at = typeof entry.at === 'string' && entry.at.trim() ? entry.at.trim() : 'unknown';
  const taskGroup = typeof entry.taskGroup === 'string' && entry.taskGroup.trim()
    ? entry.taskGroup.trim()
    : 'unknown';
  const verificationCommand = typeof entry.verificationCommand === 'string' && entry.verificationCommand.trim()
    ? entry.verificationCommand.trim()
    : 'unknown';
  const verificationResult = typeof entry.verificationResult === 'string' && entry.verificationResult.trim()
    ? entry.verificationResult.trim()
    : 'unknown';
  const checkpointStatus = typeof entry.checkpointStatus === 'string' && entry.checkpointStatus.trim()
    ? entry.checkpointStatus.trim()
    : 'unknown';
  const changedFiles = Array.isArray(entry.changedFiles)
    ? entry.changedFiles.map((value) => String(value || '').trim()).filter(Boolean)
    : [];
  const completedSteps = Array.isArray(entry.completedSteps)
    ? entry.completedSteps.map((value) => String(value || '').trim()).filter(Boolean)
    : [];
  const diffSummary = typeof entry.diffSummary === 'string' ? entry.diffSummary.trim() : '';
  const driftStatus = typeof entry.driftStatus === 'string' ? entry.driftStatus.trim() : '';

  const lines = [
    `- At: ${at}`,
    `- Task Group: ${taskGroup}`,
    `- Verification: ${verificationCommand}`,
    `- Result: ${verificationResult}`,
    `- Checkpoint: ${checkpointStatus}`
  ];
  if (changedFiles.length) {
    lines.push(`- Changed Files: ${formatBoundedList(changedFiles)}`);
  }
  if (completedSteps.length) {
    lines.push(`- completedSteps: ${formatBoundedList(completedSteps)}`);
  }
  if (diffSummary) {
    lines.push(`- diffSummary: ${truncateText(diffSummary)}`);
  }
  if (driftStatus) {
    lines.push(`- driftStatus: ${truncateText(driftStatus)}`);
  }
  return lines;
}

function boundContextCapsule(lines) {
  const boundedLines = lines.length > MAX_CONTEXT_LINES
    ? lines.slice(0, MAX_CONTEXT_LINES - 3).concat([
      '',
      '## Truncation',
      '- Content truncated to keep context capsule bounded.'
    ])
    : lines.slice();
  let text = `${boundedLines.join('\n')}\n`;
  if (text.length <= MAX_CONTEXT_CHARS) return text;
  const notice = '\n## Truncation\n- Content truncated to keep context capsule bounded.\n';
  const limit = Math.max(0, MAX_CONTEXT_CHARS - notice.length);
  return `${text.slice(0, limit).trimEnd()}${notice}`;
}

function renderContextCapsule(state, options = {}) {
  const normalized = normalizeState(state);
  const activeTaskGroup = typeof normalized.active.taskGroup === 'string' && normalized.active.taskGroup.trim()
    ? normalized.active.taskGroup.trim()
    : null;
  const nextTaskGroup = typeof normalized.active.nextTaskGroup === 'string' && normalized.active.nextTaskGroup.trim()
    ? normalized.active.nextTaskGroup.trim()
    : null;
  const warningItems = toStringArray(options.warnings || []).concat(normalized.warnings);
  const blockerItems = toStringArray(options.blockers || []).concat(normalized.blockers);
  const dedupWarnings = Array.from(new Set(warningItems));
  const dedupBlockers = Array.from(new Set(blockerItems));
  const verificationLog = normalized.verificationLog;
  const lastVerification = verificationLog.length ? verificationLog[verificationLog.length - 1] : null;
  const hashWarnings = toStringArray(options.hashDriftWarnings || []);
  const hashStatus = String(options.hashStatus || '').trim() || (hashWarnings.length ? 'drift warning' : 'up-to-date');
  const hashPaths = Object.keys(normalized.hashes).sort((left, right) => left.localeCompare(right));
  const executionContext = buildExecutionContext(normalized, options);

  const lines = [
    '# Context Capsule',
    '',
    '## Stage',
    `- Stage: ${normalized.stage}`,
    `- Next Action: ${normalized.nextAction}`,
    '',
    '## Active Task Group',
    `- Current: ${activeTaskGroup || 'None'}`,
    `- Next: ${nextTaskGroup || 'None'}`,
  ];
  renderContextSection(lines, 'User Intent', executionContext.userIntent);
  renderContextSection(lines, 'Approved Scope', executionContext.approvedScope);
  renderContextSection(lines, 'Out of Scope', executionContext.outOfScope);
  renderContextSection(lines, 'Relevant Requirements', executionContext.relevantRequirements);
  renderContextSection(lines, 'Relevant Design Decisions', executionContext.relevantDesignDecisions);
  renderContextSection(lines, 'Current Task Group', executionContext.currentTaskGroup);
  renderContextSection(lines, 'TDD Plan', executionContext.tddPlan);
  renderContextSection(lines, 'Do Not Do', executionContext.doNotDo);

  lines.push('', '## Warnings');
  renderList(lines, dedupWarnings);

  lines.push('', '## Blockers');
  renderList(lines, dedupBlockers);

  lines.push('', '## Last Verification');
  summarizeLastVerification(lastVerification).forEach((line) => lines.push(line));

  lines.push('', '## Hash Status', `- Status: ${hashStatus}`);
  if (hashWarnings.length) {
    hashWarnings.forEach((warning) => lines.push(`- Warning: ${warning}`));
  }
  if (hashPaths.length) {
    lines.push(`- Tracked Paths: ${formatBoundedList(hashPaths)}`);
  } else {
    lines.push('- Tracked Paths: None');
  }

  return boundContextCapsule(lines);
}

function createDriftTemplate() {
  const lines = ['# Drift Log', ''];
  DRIFT_SECTIONS.forEach((section, index) => {
    lines.push(section.heading, '');
    if (index < DRIFT_SECTIONS.length - 1) {
      lines.push('');
    }
  });
  return `${lines.join('\n')}\n`;
}

function ensureDriftHeadings(text) {
  const content = typeof text === 'string' && text.trim().length > 0 ? text : createDriftTemplate();
  const lines = content.replace(/\r/g, '').split('\n');

  if (!lines.some((line) => line.trim() === '# Drift Log')) {
    lines.unshift('', '# Drift Log');
  }

  DRIFT_SECTIONS.forEach((section) => {
    if (!lines.some((line) => line.trim() === section.heading)) {
      if (lines.length && lines[lines.length - 1].trim() !== '') {
        lines.push('');
      }
      lines.push(section.heading, '');
    }
  });

  return lines;
}

function resolveDriftHeading(section) {
  const normalized = String(section || '').trim();
  if (!normalized) return null;
  if (Object.prototype.hasOwnProperty.call(DRIFT_SECTION_MAP, normalized)) {
    return DRIFT_SECTION_MAP[normalized];
  }
  const lower = normalized.toLowerCase();
  if (Object.prototype.hasOwnProperty.call(DRIFT_SECTION_MAP, lower)) {
    return DRIFT_SECTION_MAP[lower];
  }
  return null;
}

function normalizeDriftEntries(entries) {
  const grouped = {};
  if (!Array.isArray(entries)) return grouped;

  entries.forEach((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return;
    const heading = resolveDriftHeading(entry.section || entry.heading);
    if (!heading) return;
    const message = String(entry.text || entry.message || '').trim();
    if (!message) return;
    const atValue = String(entry.at || '').trim();
    const parsedAt = atValue ? new Date(atValue) : new Date();
    const stamp = Number.isNaN(parsedAt.getTime()) ? new Date().toISOString() : parsedAt.toISOString();
    if (!grouped[heading]) grouped[heading] = [];
    grouped[heading].push(`- ${stamp} ${message}`);
  });

  return grouped;
}

function appendBulletsUnderHeading(lines, heading, bullets) {
  if (!bullets || !bullets.length) return lines;
  const headingIndex = lines.findIndex((line) => line.trim() === heading);
  if (headingIndex < 0) return lines;

  let insertIndex = lines.length;
  for (let index = headingIndex + 1; index < lines.length; index += 1) {
    if (/^##\s+/.test(lines[index].trim())) {
      insertIndex = index;
      break;
    }
  }

  const toInsert = [];
  if (insertIndex > headingIndex + 1 && lines[insertIndex - 1].trim() !== '') {
    toInsert.push('');
  }
  bullets.forEach((bullet) => toInsert.push(bullet));
  if (insertIndex < lines.length && toInsert.length && toInsert[toInsert.length - 1] !== '') {
    toInsert.push('');
  }

  lines.splice(insertIndex, 0, ...toInsert);
  return lines;
}

function appendDriftLedger(driftPath, entries) {
  const normalizedPath = path.resolve(driftPath);
  ensureDir(path.dirname(normalizedPath));

  const groupedEntries = normalizeDriftEntries(entries);
  const sourceText = readTextIfFile(normalizedPath, createDriftTemplate());
  const lines = ensureDriftHeadings(sourceText);

  DRIFT_SECTIONS.forEach((section) => {
    appendBulletsUnderHeading(lines, section.heading, groupedEntries[section.heading] || []);
  });

  const output = `${lines.join('\n').replace(/\n+$/, '')}\n`;
  writeTextAtomic(normalizedPath, output);
  return output;
}

module.exports = {
  renderContextCapsule,
  appendDriftLedger
};
