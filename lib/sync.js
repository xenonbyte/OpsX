const fs = require('fs');
const path = require('path');
const { parseSpecFile, reviewSpecSplitEvidence } = require('./spec-validator');
const { writeTextAtomic } = require('./fs-utils');
const { MUTATION_EVENTS, applyMutationEvent } = require('./change-state');
const { loadChangeState, writeChangeState } = require('./change-store');
const { hashTrackedArtifacts } = require('./change-artifacts');

function toNonEmptyString(value) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function toPosixPath(value) {
  return String(value || '').replace(/\\/g, '/');
}

function normalizeStringArray(value) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => toNonEmptyString(String(entry || '')))
      .filter(Boolean);
  }
  const single = toNonEmptyString(String(value || ''));
  return single ? [single] : [];
}

function unique(values = []) {
  return Array.from(new Set(values.filter(Boolean)));
}

function severityRank(level) {
  if (level === 'BLOCK') return 2;
  if (level === 'WARN') return 1;
  return 0;
}

function normalizeFinding(finding) {
  return {
    severity: finding && finding.severity === 'BLOCK' ? 'BLOCK' : 'WARN',
    code: toNonEmptyString(finding && finding.code) || 'sync-finding',
    message: toNonEmptyString(finding && finding.message),
    patchTargets: unique(normalizeStringArray(finding && finding.patchTargets))
  };
}

function addFinding(findings, finding) {
  const normalized = normalizeFinding(finding);
  const existingIndex = findings.findIndex((entry) => entry.code === normalized.code && entry.message === normalized.message);
  if (existingIndex === -1) {
    findings.push(normalized);
    return;
  }

  const existing = findings[existingIndex];
  findings[existingIndex] = {
    severity: severityRank(normalized.severity) > severityRank(existing.severity) ? normalized.severity : existing.severity,
    code: existing.code,
    message: existing.message,
    patchTargets: unique([...existing.patchTargets, ...normalized.patchTargets])
  };
}

function listSpecFiles(specsDir) {
  if (!fs.existsSync(specsDir) || !fs.statSync(specsDir).isDirectory()) return [];
  const files = [];
  const stack = [specsDir];
  while (stack.length > 0) {
    const currentDir = stack.pop();
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    entries.forEach((entry) => {
      const absolutePath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        stack.push(absolutePath);
        return;
      }
      if (entry.isFile() && entry.name === 'spec.md') {
        files.push(absolutePath);
      }
    });
  }
  return files.sort((left, right) => left.localeCompare(right));
}

function resolveRepoRoot(changeDir) {
  const resolved = path.resolve(changeDir);
  const changesDir = path.dirname(resolved);
  const opsxDir = path.dirname(changesDir);
  if (path.basename(changesDir) === 'changes' && path.basename(opsxDir) === '.opsx') {
    return path.dirname(opsxDir);
  }
  return path.dirname(path.dirname(path.dirname(resolved)));
}

function isRemovedSection(sectionName) {
  return /^removed\b/i.test(toNonEmptyString(sectionName));
}

function hasOppositePolarity(left, right) {
  const leftNegative = Boolean(left && left.hasNegativeNormative);
  const leftPositive = Boolean(left && left.hasPositiveNormative);
  const rightNegative = Boolean(right && right.hasNegativeNormative);
  const rightPositive = Boolean(right && right.hasPositiveNormative);
  return (leftNegative && rightPositive) || (rightNegative && leftPositive);
}

function intersectionSize(leftSet, rightSet) {
  if (!leftSet.size || !rightSet.size) return 0;
  let count = 0;
  leftSet.forEach((token) => {
    if (rightSet.has(token)) count += 1;
  });
  return count;
}

function jaccardOverlap(leftSet, rightSet) {
  if (!leftSet.size || !rightSet.size) return 0;
  const intersection = intersectionSize(leftSet, rightSet);
  const union = leftSet.size + rightSet.size - intersection;
  if (!union) return 0;
  return intersection / union;
}

function findOmittedCanonicalRequirements(canonicalRequirements, changeRequirements) {
  const removedIds = new Set(
    changeRequirements
      .filter((requirement) => isRemovedSection(requirement.section))
      .map((requirement) => requirement.id)
      .filter(Boolean)
  );
  const preservedIds = new Set(
    changeRequirements
      .filter((requirement) => !isRemovedSection(requirement.section))
      .map((requirement) => requirement.id)
      .filter(Boolean)
  );

  return canonicalRequirements.filter((requirement) => {
    if (!requirement.id) return false;
    if (preservedIds.has(requirement.id)) return false;
    if (removedIds.has(requirement.id)) return false;
    return true;
  });
}

function collectCapabilityFindings(capabilityContext) {
  const findings = [];
  const { relativePath, canonicalSpec, changeSpec } = capabilityContext;
  const canonicalRequirementList = Array.isArray(canonicalSpec.requirements) ? canonicalSpec.requirements : [];
  const changeRequirementList = Array.isArray(changeSpec.requirements) ? changeSpec.requirements : [];
  const patchTargets = [
    toPosixPath(path.join('.opsx', 'specs', relativePath)),
    toPosixPath(path.join('specs', relativePath))
  ];

  const reviewFindings = reviewSpecSplitEvidence({
    proposal: { scopeLines: [], scopeTokens: [] },
    specFiles: [changeSpec],
    requirements: changeRequirementList
  });
  reviewFindings.forEach((finding) => {
    if (finding.severity === 'BLOCK') {
      addFinding(findings, finding);
      return;
    }
    if (finding.code === 'duplicate-behavior-likely') {
      addFinding(findings, {
        severity: 'BLOCK',
        code: 'likely-behavior-conflict',
        message: `Likely behavior conflict detected while syncing "${relativePath}".`,
        patchTargets
      });
    }
  });

  const omittedRequirements = findOmittedCanonicalRequirements(canonicalRequirementList, changeRequirementList);
  omittedRequirements.forEach((requirement) => {
    addFinding(findings, {
      severity: 'BLOCK',
      code: 'omitted-canonical-requirement',
      message: `Sync omitted canonical requirements without explicit removal: "${requirement.title}".`,
      patchTargets
    });
  });

  const activeChangeRequirements = changeRequirementList.filter((requirement) => !isRemovedSection(requirement.section));
  canonicalRequirementList.forEach((canonicalRequirement) => {
    const canonicalTokens = new Set(canonicalRequirement.bodyTokens || []);
    const canonicalNouns = new Set(canonicalRequirement.nounTokens || []);
    activeChangeRequirements.forEach((deltaRequirement) => {
      const deltaTokens = new Set(deltaRequirement.bodyTokens || []);
      const deltaNouns = new Set(deltaRequirement.nounTokens || []);
      const overlap = jaccardOverlap(canonicalTokens, deltaTokens);
      const nounOverlap = intersectionSize(canonicalNouns, deltaNouns);

      if (overlap >= 0.6 && hasOppositePolarity(canonicalRequirement, deltaRequirement) && nounOverlap > 0) {
        addFinding(findings, {
          severity: 'BLOCK',
          code: 'conflicting-requirements',
          message: `Requirements "${canonicalRequirement.title}" and "${deltaRequirement.title}" conflict in "${relativePath}".`,
          patchTargets
        });
        return;
      }

      if (overlap >= 0.85 && canonicalRequirement.id !== deltaRequirement.id) {
        addFinding(findings, {
          severity: 'BLOCK',
          code: 'likely-behavior-conflict',
          message: `Likely behavior conflict between canonical and delta requirements in "${relativePath}".`,
          patchTargets
        });
      }
    });
  });

  return findings;
}

function planSync(options = {}) {
  const changeDir = path.resolve(options.changeDir || process.cwd());
  const repoRoot = path.resolve(options.repoRoot || resolveRepoRoot(changeDir));
  const changeSpecsDir = path.join(changeDir, 'specs');
  const canonicalSpecsDir = path.join(repoRoot, '.opsx', 'specs');
  const specFiles = listSpecFiles(changeSpecsDir);
  const findings = [];
  const writes = [];

  if (specFiles.length === 0) {
    addFinding(findings, {
      severity: 'BLOCK',
      code: 'sync-specs-missing',
      message: 'No change-local spec.md files were found for sync planning.',
      patchTargets: ['specs']
    });
  }

  specFiles.forEach((changeSpecPath) => {
    const relativePath = toPosixPath(path.relative(changeSpecsDir, changeSpecPath));
    const canonicalPath = path.join(canonicalSpecsDir, relativePath);
    const changeText = fs.readFileSync(changeSpecPath, 'utf8');
    const canonicalText = fs.existsSync(canonicalPath) ? fs.readFileSync(canonicalPath, 'utf8') : '';
    const canonicalSpec = parseSpecFile(path.join('.opsx', 'specs', relativePath), canonicalText);
    const changeSpec = parseSpecFile(path.join('specs', relativePath), changeText);
    const capabilityFindings = collectCapabilityFindings({
      relativePath,
      canonicalSpec,
      changeSpec
    });
    capabilityFindings.forEach((finding) => addFinding(findings, finding));
    writes.push({
      relativePath,
      targetPath: canonicalPath,
      content: changeText
    });
  });

  const sortedFindings = findings.sort((left, right) => {
    if (left.code !== right.code) return left.code.localeCompare(right.code);
    const leftTarget = left.patchTargets[0] || '';
    const rightTarget = right.patchTargets[0] || '';
    if (leftTarget !== rightTarget) return leftTarget.localeCompare(rightTarget);
    return left.message.localeCompare(right.message);
  });
  const patchTargets = unique(sortedFindings.flatMap((finding) => finding.patchTargets));
  const blocked = sortedFindings.some((finding) => finding.severity === 'BLOCK');

  return {
    status: blocked ? 'BLOCK' : 'PASS',
    changeDir,
    repoRoot,
    canonicalSpecsDir,
    findings: sortedFindings,
    patchTargets,
    writes: blocked ? [] : writes,
    nextAction: blocked
      ? 'Resolve blocking sync findings before writing canonical specs.'
      : 'Apply sync plan to write canonical specs atomically.'
  };
}

function applySyncPlan(plan) {
  const normalizedPlan = plan && typeof plan === 'object' ? plan : {};
  const findings = Array.isArray(normalizedPlan.findings) ? normalizedPlan.findings.map(normalizeFinding) : [];
  const blocked = normalizedPlan.status === 'BLOCK'
    || findings.some((finding) => finding.severity === 'BLOCK');
  if (blocked) {
    return Object.assign({}, normalizedPlan, {
      status: 'BLOCK',
      findings,
      writesApplied: 0,
      applied: false
    });
  }

  const writes = Array.isArray(normalizedPlan.writes) ? normalizedPlan.writes : [];
  writes.forEach((entry) => {
    if (!entry || typeof entry !== 'object') {
      throw new Error('Sync plan write entry must be an object.');
    }
    const targetPath = toNonEmptyString(entry.targetPath);
    if (!targetPath) {
      throw new Error('Sync plan write entry is missing targetPath.');
    }
    writeTextAtomic(targetPath, typeof entry.content === 'string' ? entry.content : '');
  });

  return Object.assign({}, normalizedPlan, {
    status: 'PASS',
    findings,
    writesApplied: writes.length,
    applied: true
  });
}

function acceptSyncPlan(changeDir, appliedPlan = {}) {
  const resolvedChangeDir = path.resolve(changeDir);
  const findings = Array.isArray(appliedPlan.findings) ? appliedPlan.findings.map(normalizeFinding) : [];
  const blocked = appliedPlan.status === 'BLOCK'
    || findings.some((finding) => finding.severity === 'BLOCK');
  if (blocked) {
    throw new Error('Cannot accept sync plan while blocking findings remain.');
  }
  if (appliedPlan.applied !== true) {
    throw new Error('Cannot accept sync plan before applySyncPlan succeeds.');
  }

  const state = loadChangeState(resolvedChangeDir);
  const transition = applyMutationEvent(state, {
    type: MUTATION_EVENTS.SYNC_ACCEPTED,
    patchTargets: appliedPlan.patchTargets
  });
  if (transition.status !== 'OK') {
    throw new Error(transition.message || 'Sync acceptance transition failed.');
  }

  const refreshedHashes = hashTrackedArtifacts(resolvedChangeDir);
  const warningMessages = findings
    .filter((finding) => finding.severity === 'WARN')
    .map((finding) => finding.message)
    .filter(Boolean);

  return writeChangeState(resolvedChangeDir, Object.assign({}, transition.state, {
    nextAction: transition.nextAction,
    hashes: refreshedHashes,
    blockers: [],
    warnings: unique([
      ...normalizeStringArray(state.warnings),
      ...warningMessages
    ])
  }));
}

module.exports = {
  planSync,
  applySyncPlan,
  acceptSyncPlan
};
