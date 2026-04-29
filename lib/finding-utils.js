const {
  toNonEmptyString,
  normalizeStringArray,
  unique
} = require('./string-utils');

function severityRank(level) {
  if (level === 'BLOCK') return 2;
  if (level === 'WARN') return 1;
  return 0;
}

function normalizeFinding(finding = {}, options = {}) {
  const source = finding && typeof finding === 'object' && !Array.isArray(finding) ? finding : {};
  const defaultCode = toNonEmptyString(options.defaultCode) || 'finding';
  const normalized = {
    severity: source.severity === 'BLOCK' ? 'BLOCK' : 'WARN',
    code: toNonEmptyString(source.code) || defaultCode,
    message: toNonEmptyString(source.message),
    patchTargets: unique(normalizeStringArray(source.patchTargets || source.artifacts))
  };

  if (options.includeArtifacts) {
    normalized.artifacts = unique(normalizeStringArray(source.artifacts || source.patchTargets));
  }

  return normalized;
}

function addFinding(findings, finding, options = {}) {
  const normalized = normalizeFinding(finding, options);
  const existingIndex = findings.findIndex((entry) => (
    entry.code === normalized.code && entry.message === normalized.message
  ));

  if (existingIndex === -1) {
    findings.push(normalized);
    return;
  }

  const existing = findings[existingIndex];
  const merged = {
    ...existing,
    severity: severityRank(normalized.severity) > severityRank(existing.severity)
      ? normalized.severity
      : existing.severity,
    code: existing.code,
    message: existing.message,
    patchTargets: unique([
      ...normalizeStringArray(existing.patchTargets),
      ...normalized.patchTargets
    ])
  };

  if (options.includeArtifacts) {
    merged.artifacts = unique([
      ...normalizeStringArray(existing.artifacts),
      ...normalizeStringArray(existing.patchTargets),
      ...normalizeStringArray(normalized.artifacts),
      ...normalized.patchTargets
    ]);
  }

  findings[existingIndex] = merged;
}

function createFindingAdder(options = {}) {
  return (findings, finding) => addFinding(findings, finding, options);
}

function hasBlockingFindings(findings = []) {
  return findings.some((finding) => finding && finding.severity === 'BLOCK');
}

function sortFindings(findings = []) {
  return findings.slice().sort((left, right) => {
    if (left.code !== right.code) return left.code.localeCompare(right.code);
    const leftTarget = (left.patchTargets || [])[0] || '';
    const rightTarget = (right.patchTargets || [])[0] || '';
    if (leftTarget !== rightTarget) return leftTarget.localeCompare(rightTarget);
    return left.message.localeCompare(right.message);
  });
}

module.exports = {
  severityRank,
  normalizeFinding,
  addFinding,
  createFindingAdder,
  hasBlockingFindings,
  sortFindings
};
