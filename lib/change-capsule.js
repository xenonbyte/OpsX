const fs = require('fs');
const path = require('path');
const { ensureDir, writeTextAtomic } = require('./fs-utils');

const DRIFT_SECTIONS = Object.freeze([
  { key: 'newAssumptions', heading: '## New Assumptions' },
  { key: 'scopeChanges', heading: '## Scope Changes' },
  { key: 'outOfBoundFileChanges', heading: '## Out-of-Bound File Changes' },
  { key: 'discoveredRequirements', heading: '## Discovered Requirements' },
  { key: 'userApprovalNeeded', heading: '## User Approval Needed' }
]);

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
    lines.push(`- Changed Files: ${changedFiles.join(', ')}`);
  }
  if (completedSteps.length) {
    lines.push(`- completedSteps: ${completedSteps.join(', ')}`);
  }
  if (diffSummary) {
    lines.push(`- diffSummary: ${diffSummary}`);
  }
  if (driftStatus) {
    lines.push(`- driftStatus: ${driftStatus}`);
  }
  return lines;
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
    '',
    '## Warnings'
  ];
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
    lines.push(`- Tracked Paths: ${hashPaths.join(', ')}`);
  } else {
    lines.push('- Tracked Paths: None');
  }

  return `${lines.join('\n')}\n`;
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
  const sourceText = fs.existsSync(normalizedPath) ? fs.readFileSync(normalizedPath, 'utf8') : createDriftTemplate();
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
