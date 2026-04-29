const fs = require('fs');
const path = require('path');
const { parseSpecFile, reviewSpecSplitEvidence } = require('./spec-validator');
const { createTempSiblingPath, ensureDir, readTextIfFile } = require('./fs-utils');
const { MUTATION_EVENTS, applyMutationEvent } = require('./change-state');
const { loadChangeState, writeChangeState } = require('./change-store');
const { hashTrackedArtifacts } = require('./change-artifacts');
const {
  toNonEmptyString,
  normalizeStringArray,
  unique
} = require('./string-utils');
const {
  normalizeFinding: normalizeSharedFinding,
  createFindingAdder,
  sortFindings
} = require('./finding-utils');
const { resolveRepoRoot } = require('./repo-root');
const { listSpecFiles } = require('./spec-files');
const {
  toPosixPath,
  normalizeRelativePath,
  ensureWithinBase,
  realpathIfExists
} = require('./path-utils');

function resolveCanonicalSpecsDir(plan = {}) {
  const repoRoot = path.resolve(plan.repoRoot || process.cwd());
  const expectedSpecsDir = path.join(repoRoot, '.opsx', 'specs');
  const suppliedSpecsDir = toNonEmptyString(plan.canonicalSpecsDir);
  if (
    suppliedSpecsDir
    && path.resolve(suppliedSpecsDir) !== expectedSpecsDir
    && realpathIfExists(suppliedSpecsDir) !== realpathIfExists(expectedSpecsDir)
  ) {
    throw new Error('Sync plan canonicalSpecsDir must match repoRoot/.opsx/specs.');
  }
  return expectedSpecsDir;
}

function normalizeFinding(finding) {
  return normalizeSharedFinding(finding, { defaultCode: 'sync-finding' });
}

const addSyncFinding = createFindingAdder({ defaultCode: 'sync-finding' });

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
      addSyncFinding(findings, finding);
      return;
    }
    if (finding.code === 'duplicate-behavior-likely') {
      addSyncFinding(findings, {
        severity: 'BLOCK',
        code: 'likely-behavior-conflict',
        message: `Likely behavior conflict detected while syncing "${relativePath}".`,
        patchTargets
      });
    }
  });

  const omittedRequirements = findOmittedCanonicalRequirements(canonicalRequirementList, changeRequirementList);
  omittedRequirements.forEach((requirement) => {
    addSyncFinding(findings, {
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
        addSyncFinding(findings, {
          severity: 'BLOCK',
          code: 'conflicting-requirements',
          message: `Requirements "${canonicalRequirement.title}" and "${deltaRequirement.title}" conflict in "${relativePath}".`,
          patchTargets
        });
        return;
      }

      if (overlap >= 0.85 && canonicalRequirement.id !== deltaRequirement.id) {
        addSyncFinding(findings, {
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
    addSyncFinding(findings, {
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
    const canonicalText = readTextIfFile(canonicalPath);
    const canonicalSpec = parseSpecFile(path.join('.opsx', 'specs', relativePath), canonicalText);
    const changeSpec = parseSpecFile(path.join('specs', relativePath), changeText);
    const capabilityFindings = collectCapabilityFindings({
      relativePath,
      canonicalSpec,
      changeSpec
    });
    capabilityFindings.forEach((finding) => addSyncFinding(findings, finding));
    writes.push({
      relativePath,
      targetPath: canonicalPath,
      content: changeText
    });
  });

  const sortedFindings = sortFindings(findings);
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

  const canonicalSpecsDir = resolveCanonicalSpecsDir(normalizedPlan);
  const writes = (Array.isArray(normalizedPlan.writes) ? normalizedPlan.writes : []).map((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      throw new Error('Sync plan write entry must be an object.');
    }
    const targetPath = path.resolve(toNonEmptyString(entry.targetPath));
    if (!toNonEmptyString(entry.targetPath)) {
      throw new Error('Sync plan write entry is missing targetPath.');
    }
    ensureWithinBase(canonicalSpecsDir, targetPath, '.opsx/specs');
    return {
      targetPath,
      content: typeof entry.content === 'string' ? entry.content : '',
      tempPath: createTempSiblingPath(targetPath, `sync-${index}.tmp`),
      backupPath: createTempSiblingPath(targetPath, `sync-${index}.bak`),
      hadOriginal: fs.existsSync(targetPath)
    };
  });

  try {
    writes.forEach((entry) => {
      ensureDir(path.dirname(entry.targetPath));
      fs.writeFileSync(entry.tempPath, entry.content, 'utf8');
    });
  } catch (error) {
    writes.forEach((entry) => {
      if (fs.existsSync(entry.tempPath)) fs.rmSync(entry.tempPath, { force: true });
    });
    throw error;
  }

  const completed = [];
  try {
    writes.forEach((entry) => {
      if (entry.hadOriginal) {
        fs.copyFileSync(entry.targetPath, entry.backupPath);
      }
      fs.renameSync(entry.tempPath, entry.targetPath);
      completed.push(entry);
    });
  } catch (error) {
    completed.slice().reverse().forEach((entry) => {
      if (entry.hadOriginal && fs.existsSync(entry.backupPath)) {
        fs.copyFileSync(entry.backupPath, entry.targetPath);
      } else if (!entry.hadOriginal && fs.existsSync(entry.targetPath)) {
        fs.rmSync(entry.targetPath, { force: true });
      }
    });
    writes.forEach((entry) => {
      if (fs.existsSync(entry.tempPath)) fs.rmSync(entry.tempPath, { force: true });
    });
    throw error;
  } finally {
    writes.forEach((entry) => {
      if (fs.existsSync(entry.backupPath)) fs.rmSync(entry.backupPath, { force: true });
    });
  }

  return Object.assign({}, normalizedPlan, {
    status: 'PASS',
    findings,
    writesApplied: writes.length,
    applied: true
  });
}

function collectCanonicalOutputs(appliedPlan = {}) {
  const repoRoot = path.resolve(appliedPlan.repoRoot || process.cwd());
  const writes = Array.isArray(appliedPlan.writes) ? appliedPlan.writes : [];
  return unique(writes.map((entry) => {
    const relativePath = normalizeRelativePath(entry && entry.relativePath);
    if (relativePath) return `.opsx/specs/${relativePath}`;
    const targetPath = toNonEmptyString(entry && entry.targetPath);
    return targetPath ? normalizeRelativePath(path.relative(repoRoot, path.resolve(targetPath))) : '';
  }).filter(Boolean));
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
    sync: {
      acceptedAt: new Date().toISOString(),
      canonicalOutputs: collectCanonicalOutputs(appliedPlan),
      writesApplied: Number(appliedPlan.writesApplied) || 0
    },
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
