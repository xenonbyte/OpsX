const fs = require('fs');
const path = require('path');
const { readTextIfFile } = require('./fs-utils');
const { toPosixPath } = require('./path-utils');
const { unique } = require('./string-utils');
const { tokenizeText } = require('./text-utils');
const { listSpecFiles } = require('./spec-files');

const REQUIREMENT_HEADING_PATTERN = /^###\s+Requirement:\s*(.+)\s*$/i;
const SCENARIO_HEADING_PATTERN = /^####\s+Scenario:\s*(.+)\s*$/i;
const HIDDEN_FENCE_PATTERN = /###\s+Requirement:|####\s+Scenario:|\b(SHALL|MUST)\b/i;
const NEGATIVE_NORMATIVE_PATTERN = /\b(must not|shall not|never|cannot)\b/i;
const POSITIVE_NORMATIVE_PATTERN = /\b(shall|must)\b/i;
const NORMATIVE_STOPWORDS = new Set(['shall', 'must', 'not', 'never', 'cannot', 'mustnot', 'shallnot']);
const WHAT_CHANGES_SECTIONS = new Set([
  'what changes',
  'changes',
  '变更内容',
  '修改内容',
  '范围',
  '需求范围'
]);
const CAPABILITY_SECTIONS = new Set([
  'capabilities',
  '能力',
  '能力范围',
  '功能能力'
]);
const CAPABILITY_SUBSECTIONS = new Set([
  'new capabilities',
  'modified capabilities',
  '新增能力',
  '修改能力',
  '变更能力'
]);

function toText(value) {
  return typeof value === 'string' ? value : '';
}

function normalizeWhitespace(value) {
  return toText(value).replace(/\s+/g, ' ').trim();
}

function normalizeRequirementId(title) {
  return normalizeWhitespace(title).toLowerCase();
}

function jaccardOverlap(leftSet, rightSet) {
  if (!leftSet.size || !rightSet.size) return 0;
  let intersection = 0;
  leftSet.forEach((token) => {
    if (rightSet.has(token)) intersection += 1;
  });
  const union = leftSet.size + rightSet.size - intersection;
  if (!union) return 0;
  return intersection / union;
}

function intersectionSize(leftSet, rightSet) {
  if (!leftSet.size || !rightSet.size) return 0;
  let count = 0;
  leftSet.forEach((token) => {
    if (rightSet.has(token)) count += 1;
  });
  return count;
}

function normalizeCapabilityLine(line) {
  return normalizeWhitespace(
    toText(line)
      .replace(/^[-*]\s+/, '')
      .replace(/^\d+[\.)]\s+/, '')
  );
}

function deriveCapabilityFromPath(filePath) {
  const normalized = toPosixPath(filePath);
  const match = normalized.match(/specs\/([^/]+)\/spec\.md$/i);
  if (match) return match[1];
  const parent = path.posix.dirname(normalized);
  return parent === '.' ? 'unknown' : parent.split('/').pop();
}

function parseProposalScope(proposalText = '') {
  const lines = toText(proposalText).split(/\r?\n/);
  const collected = [];
  let activeSection = '';
  let activeSubsection = '';

  lines.forEach((line) => {
    const trimmed = line.trim();
    const h2 = trimmed.match(/^##\s+(.+)$/);
    if (h2) {
      activeSection = normalizeWhitespace(h2[1]).toLowerCase();
      activeSubsection = '';
      return;
    }
    const h3 = trimmed.match(/^###\s+(.+)$/);
    if (h3) {
      activeSubsection = normalizeWhitespace(h3[1]).toLowerCase();
      return;
    }
    if (!trimmed) return;

    const inWhatChanges = WHAT_CHANGES_SECTIONS.has(activeSection);
    const inCapabilities = CAPABILITY_SECTIONS.has(activeSection);
    const inCapabilitySubsection = CAPABILITY_SUBSECTIONS.has(activeSubsection);
    if (!inWhatChanges && !(inCapabilities && (!activeSubsection || inCapabilitySubsection))) return;

    const normalizedLine = normalizeCapabilityLine(trimmed);
    if (!normalizedLine) return;
    collected.push({
      text: normalizedLine,
      section: activeSection || null,
      subsection: activeSubsection || null
    });
  });

  const tokenSet = new Set(tokenizeText(collected.map((entry) => entry.text).join('\n')));
  return {
    lines: collected,
    tokens: Array.from(tokenSet),
    tokenSet
  };
}

function parseSpecFile(filePath, text) {
  const normalizedPath = toPosixPath(filePath);
  const sourceText = toText(text);
  const lines = sourceText.split(/\r?\n/);
  const requirements = [];
  const fencedBlocks = [];
  const capability = deriveCapabilityFromPath(normalizedPath);
  let inFence = false;
  let currentFence = null;
  let currentSection = 'root';
  let currentRequirement = null;
  let orphanScenarioCount = 0;

  function flushRequirement() {
    if (!currentRequirement) return;
    const bodyText = currentRequirement.bodyLines.join('\n').trim();
    const titleTokens = tokenizeText(currentRequirement.title);
    const bodyTokens = tokenizeText(bodyText);
    const allTokens = unique([...titleTokens, ...bodyTokens]);
    const nounTokens = allTokens.filter((token) => !NORMATIVE_STOPWORDS.has(token));
    const requirementText = `${currentRequirement.title}\n${bodyText}`;
    const hasNegativeNormative = NEGATIVE_NORMATIVE_PATTERN.test(requirementText);
    const hasPositiveNormative = POSITIVE_NORMATIVE_PATTERN.test(requirementText) && !hasNegativeNormative;

    requirements.push({
      ref: `${normalizedPath}#${requirements.length + 1}`,
      path: normalizedPath,
      capability,
      section: currentRequirement.section,
      title: currentRequirement.title,
      id: normalizeRequirementId(currentRequirement.title),
      body: bodyText,
      scenarioCount: currentRequirement.scenarioTitles.length,
      scenarioTitles: currentRequirement.scenarioTitles.slice(),
      bodyTokens,
      tokens: allTokens,
      nounTokens,
      hasNegativeNormative,
      hasPositiveNormative
    });
    currentRequirement = null;
  }

  function flushFence(endLine) {
    if (!currentFence) return;
    fencedBlocks.push({
      startLine: currentFence.startLine,
      endLine,
      text: currentFence.lines.join('\n')
    });
    currentFence = null;
  }

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const trimmed = line.trim();
    const fenceMatch = trimmed.match(/^(```|~~~)/);
    if (fenceMatch) {
      if (inFence) {
        flushFence(lineNumber);
        inFence = false;
      } else {
        inFence = true;
        currentFence = {
          startLine: lineNumber,
          lines: []
        };
      }
      return;
    }

    if (inFence) {
      currentFence.lines.push(line);
      return;
    }

    const sectionMatch = line.match(/^##\s+(.+)$/);
    if (sectionMatch) {
      flushRequirement();
      currentSection = normalizeWhitespace(sectionMatch[1]) || 'root';
      return;
    }

    const requirementMatch = line.match(REQUIREMENT_HEADING_PATTERN);
    if (requirementMatch) {
      flushRequirement();
      currentRequirement = {
        title: normalizeWhitespace(requirementMatch[1]),
        section: currentSection,
        bodyLines: [],
        scenarioTitles: []
      };
      return;
    }

    const scenarioMatch = line.match(SCENARIO_HEADING_PATTERN);
    if (scenarioMatch) {
      if (currentRequirement) {
        currentRequirement.scenarioTitles.push(normalizeWhitespace(scenarioMatch[1]));
      } else {
        orphanScenarioCount += 1;
      }
      return;
    }

    if (currentRequirement) currentRequirement.bodyLines.push(line);
  });

  flushRequirement();
  if (inFence) flushFence(lines.length);

  return {
    path: normalizedPath,
    text: sourceText,
    capability,
    requirements,
    scenarioCount: requirements.reduce((sum, requirement) => sum + requirement.scenarioCount, 0) + orphanScenarioCount,
    fencedBlocks,
    requirementCount: requirements.length,
    orphanScenarioCount
  };
}

function resolveSpecFileInputs(options = {}) {
  if (Array.isArray(options.specFiles)) {
    return options.specFiles.map((entry) => ({
      path: toPosixPath(entry.path),
      text: toText(entry.text)
    }));
  }

  if (options.specs && typeof options.specs === 'object' && !Array.isArray(options.specs)) {
    return Object.keys(options.specs)
      .sort((left, right) => left.localeCompare(right))
      .map((filePath) => ({ path: toPosixPath(filePath), text: toText(options.specs[filePath]) }));
  }

  const specsDir = options.specsDir || (options.changeDir ? path.join(options.changeDir, 'specs') : null);
  if (!specsDir || !fs.existsSync(specsDir)) return [];

  return listSpecFiles(specsDir).map((absolutePath) => ({
    path: toPosixPath(path.relative(options.changeDir || process.cwd(), absolutePath)),
    text: fs.readFileSync(absolutePath, 'utf8')
  }));
}

function collectSpecSplitEvidence(options = {}) {
  const proposalPath = options.proposalPath || (options.changeDir ? path.join(options.changeDir, 'proposal.md') : null);
  const proposalText = typeof options.proposalText === 'string'
    ? options.proposalText
    : (proposalPath ? readTextIfFile(proposalPath) : '');
  const proposalScope = parseProposalScope(proposalText);
  const parsedSpecFiles = resolveSpecFileInputs(options)
    .map((entry) => parseSpecFile(entry.path, entry.text))
    .sort((left, right) => left.path.localeCompare(right.path));
  const requirements = parsedSpecFiles.flatMap((specFile) => specFile.requirements);

  return {
    proposal: {
      path: 'proposal',
      text: proposalText,
      scopeLines: proposalScope.lines,
      scopeTokens: proposalScope.tokens
    },
    specFiles: parsedSpecFiles,
    requirements,
    counts: {
      specFileCount: parsedSpecFiles.length,
      requirementCount: requirements.length,
      scenarioCount: parsedSpecFiles.reduce((sum, specFile) => sum + specFile.scenarioCount, 0),
      fencedBlockCount: parsedSpecFiles.reduce((sum, specFile) => sum + specFile.fencedBlocks.length, 0)
    }
  };
}

function buildFinding(severity, code, message, patchTargets) {
  return {
    severity,
    code,
    message,
    patchTargets: unique((patchTargets || []).map((target) => toPosixPath(target))).sort((left, right) => left.localeCompare(right))
  };
}

function reviewSpecSplitEvidence(evidence, options = {}) {
  const findings = [];
  const specFiles = Array.isArray(evidence && evidence.specFiles) ? evidence.specFiles : [];
  const requirements = Array.isArray(evidence && evidence.requirements)
    ? evidence.requirements
    : specFiles.flatMap((specFile) => specFile.requirements || []);
  const proposalScopeLines = Array.isArray(evidence && evidence.proposal && evidence.proposal.scopeLines)
    ? evidence.proposal.scopeLines
    : [];
  const proposalTokenSet = new Set(Array.isArray(evidence && evidence.proposal && evidence.proposal.scopeTokens)
    ? evidence.proposal.scopeTokens
    : []);
  const duplicateBehaviorThreshold = Number.isFinite(options.duplicateBehaviorThreshold)
    ? options.duplicateBehaviorThreshold
    : 0.75;

  specFiles.forEach((specFile) => {
    if (!specFile.requirementCount) {
      findings.push(buildFinding(
        'BLOCK',
        'spec-empty',
        `Spec file "${specFile.path}" has no valid requirements outside fenced code blocks.`,
        [specFile.path]
      ));
    }

    (specFile.requirements || []).forEach((requirement) => {
      if (requirement.scenarioCount === 0) {
        findings.push(buildFinding(
          'BLOCK',
          'scenario-missing',
          `Requirement "${requirement.title}" in "${requirement.path}" has no scenario heading outside fenced code blocks.`,
          [requirement.path]
        ));
      }
    });

    (specFile.fencedBlocks || []).forEach((block, index) => {
      if (!HIDDEN_FENCE_PATTERN.test(toText(block.text))) return;
      findings.push(buildFinding(
        'BLOCK',
        'hidden-requirement-in-fence',
        `Fenced block ${index + 1} in "${specFile.path}" contains hidden requirement content.`,
        [specFile.path]
      ));
    });
  });

  const duplicateIdGroups = new Map();
  requirements.forEach((requirement) => {
    if (!requirement.id) return;
    const list = duplicateIdGroups.get(requirement.id) || [];
    list.push(requirement);
    duplicateIdGroups.set(requirement.id, list);
  });

  const duplicatePairs = [];
  duplicateIdGroups.forEach((group, id) => {
    if (group.length < 2) return;
    findings.push(buildFinding(
      'BLOCK',
      'duplicate-requirement-id',
      `Requirement id "${id}" appears multiple times across split specs.`,
      group.map((entry) => entry.path)
    ));
    for (let i = 0; i < group.length; i += 1) {
      for (let j = i + 1; j < group.length; j += 1) {
        duplicatePairs.push({ left: group[i], right: group[j], reason: 'duplicate-id' });
      }
    }
  });

  const duplicateBehaviorPairs = [];
  for (let i = 0; i < requirements.length; i += 1) {
    for (let j = i + 1; j < requirements.length; j += 1) {
      const left = requirements[i];
      const right = requirements[j];
      if (left.id === right.id) continue;
      if (left.path === right.path && left.section === right.section) continue;
      const overlap = jaccardOverlap(new Set(left.bodyTokens || []), new Set(right.bodyTokens || []));
      if (overlap < duplicateBehaviorThreshold) continue;
      duplicateBehaviorPairs.push({ left, right, overlap });
      findings.push(buildFinding(
        'WARN',
        'duplicate-behavior-likely',
        `Requirements "${left.title}" and "${right.title}" look semantically duplicated (body overlap ${overlap.toFixed(2)}).`,
        [left.path, right.path]
      ));
    }
  }

  const conflictCandidates = [...duplicatePairs, ...duplicateBehaviorPairs];
  const seenConflictPairKeys = new Set();
  conflictCandidates.forEach((pair) => {
    const left = pair.left;
    const right = pair.right;
    const key = [left.ref, right.ref].sort((a, b) => a.localeCompare(b)).join('|');
    if (seenConflictPairKeys.has(key)) return;
    seenConflictPairKeys.add(key);

    const nounOverlap = intersectionSize(new Set(left.nounTokens || []), new Set(right.nounTokens || []));
    const hasOppositePolarity = (
      (left.hasNegativeNormative && right.hasPositiveNormative)
      || (right.hasNegativeNormative && left.hasPositiveNormative)
    );
    if (!hasOppositePolarity || nounOverlap === 0) return;

    findings.push(buildFinding(
      'BLOCK',
      'conflicting-requirements',
      `Requirements "${left.title}" and "${right.title}" conflict on overlapping behavior tokens.`,
      [left.path, right.path]
    ));
  });

  const requirementTokenSets = requirements.map((requirement) => new Set(requirement.tokens || []));
  const uncoveredCapabilities = proposalScopeLines.filter((entry) => {
    const tokenSet = new Set(tokenizeText(entry.text, { minLength: options.minCoverageTokenLength || 2 }));
    if (!tokenSet.size) return false;
    return !requirementTokenSets.some((requirementTokens) => intersectionSize(tokenSet, requirementTokens) > 0);
  });
  if (uncoveredCapabilities.length > 0) {
    findings.push(buildFinding(
      'WARN',
      'proposal-coverage-gap',
      `Proposal scope lines missing spec coverage: ${uncoveredCapabilities.map((entry) => `"${entry.text}"`).join('; ')}`,
      ['proposal', 'specs']
    ));
  }

  requirements.forEach((requirement) => {
    const requirementTokens = new Set(requirement.tokens || []);
    const overlap = intersectionSize(requirementTokens, proposalTokenSet);
    const novelTokens = Array.from(requirementTokens).filter((token) => !proposalTokenSet.has(token));
    if (overlap > 0 || novelTokens.length < 3) return;
    findings.push(buildFinding(
      'WARN',
      'scope-expansion-unapproved',
      `Requirement "${requirement.title}" introduces scope not present in proposal terms: ${novelTokens.slice(0, 6).join(', ')}.`,
      ['proposal', requirement.path]
    ));
  });

  return findings.sort((left, right) => {
    if (left.code !== right.code) return left.code.localeCompare(right.code);
    const leftTarget = left.patchTargets[0] || '';
    const rightTarget = right.patchTargets[0] || '';
    if (leftTarget !== rightTarget) return leftTarget.localeCompare(rightTarget);
    return left.message.localeCompare(right.message);
  });
}

module.exports = {
  collectSpecSplitEvidence,
  parseSpecFile,
  reviewSpecSplitEvidence
};
