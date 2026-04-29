const fs = require('fs');
const path = require('path');
const { ensureDir } = require('./fs-utils');
const { MUTATION_EVENTS, applyMutationEvent } = require('./change-state');
const {
  loadChangeState,
  writeChangeState,
  loadActiveChangePointer,
  writeActiveChangePointer
} = require('./change-store');
const { evaluateVerifyGate } = require('./verify');
const { planSync, applySyncPlan, acceptSyncPlan } = require('./sync');
const { ensureWithinBase, toPosixPath } = require('./path-utils');
const {
  toNonEmptyString,
  normalizeStringArray,
  unique
} = require('./string-utils');
const {
  createFindingAdder,
  hasBlockingFindings,
  sortFindings
} = require('./finding-utils');
const { resolveRepoRoot } = require('./repo-root');

const addArchiveFinding = createFindingAdder({ defaultCode: 'archive-finding' });

function collectVerificationChangedFiles(state) {
  const verificationLog = Array.isArray(state && state.verificationLog) ? state.verificationLog : [];
  return unique(verificationLog.flatMap((entry) => normalizeStringArray(entry && entry.changedFiles)));
}

function buildArchivePaths(changeDir, repoRootOverride) {
  const resolvedChangeDir = path.resolve(changeDir);
  const repoRoot = path.resolve(repoRootOverride || resolveRepoRoot(resolvedChangeDir));
  const changeName = path.basename(resolvedChangeDir);
  const changesRoot = path.join(repoRoot, '.opsx', 'changes');
  const archiveRoot = path.join(repoRoot, '.opsx', 'archive');
  const archiveTargetDir = path.join(archiveRoot, changeName);
  ensureWithinBase(changesRoot, resolvedChangeDir, '.opsx changes');
  ensureWithinBase(archiveRoot, archiveTargetDir, '.opsx archive');
  return {
    changeDir: resolvedChangeDir,
    repoRoot,
    changeName,
    changesRoot,
    archiveRoot,
    archiveTargetDir
  };
}

function evaluateArchiveGate(options = {}) {
  const paths = buildArchivePaths(options.changeDir || process.cwd(), options.repoRoot);
  const state = loadChangeState(paths.changeDir);
  const findings = [];
  const changedFiles = normalizeStringArray(options.changedFiles);
  const verifyChangedFiles = changedFiles.length > 0 ? changedFiles : collectVerificationChangedFiles(state);

  if (state.stage !== 'VERIFIED' && state.stage !== 'SYNCED') {
    addArchiveFinding(findings, {
      severity: 'BLOCK',
      code: 'archive-stage-invalid',
      message: 'Archive requires lifecycle stage VERIFIED or SYNCED.',
      patchTargets: ['state.yaml']
    });
  }

  const verifyGate = evaluateVerifyGate({
    changeDir: paths.changeDir,
    changedFiles: verifyChangedFiles
  });
  verifyGate.findings.forEach((finding) => addArchiveFinding(findings, finding));
  if (verifyGate.status === 'BLOCK') {
    addArchiveFinding(findings, {
      severity: 'BLOCK',
      code: 'archive-verify-blocked',
      message: 'Archive is blocked because verify gate has blocking findings.',
      patchTargets: verifyGate.patchTargets
    });
  }

  let syncPlan = null;
  if (state.stage === 'VERIFIED' && !hasBlockingFindings(findings)) {
    syncPlan = planSync({
      changeDir: paths.changeDir,
      repoRoot: paths.repoRoot
    });
    syncPlan.findings.forEach((finding) => addArchiveFinding(findings, finding));
    if (syncPlan.status === 'BLOCK') {
      addArchiveFinding(findings, {
        severity: 'BLOCK',
        code: 'archive-sync-unsafe',
        message: 'Archive is blocked because safe sync planning found blocking conflicts.',
        patchTargets: syncPlan.patchTargets
      });
    }
  }

  if (fs.existsSync(paths.archiveTargetDir)) {
    addArchiveFinding(findings, {
      severity: 'BLOCK',
      code: 'archive-target-exists',
      message: `Archive target already exists for change "${paths.changeName}".`,
      patchTargets: [toPosixPath(path.join('.opsx', 'archive', paths.changeName))]
    });
  }

  const normalizedFindings = sortFindings(findings);
  const patchTargets = unique(normalizedFindings.flatMap((finding) => finding.patchTargets));
  const status = hasBlockingFindings(normalizedFindings)
    ? 'BLOCK'
    : (normalizedFindings.length > 0 ? 'WARN' : 'PASS');

  return {
    status,
    findings: normalizedFindings,
    patchTargets,
    nextAction: status === 'BLOCK'
      ? 'Resolve archive precondition blockers before retrying archive.'
      : 'Archive preconditions are satisfied.',
    repoRoot: paths.repoRoot,
    changeDir: paths.changeDir,
    changeName: paths.changeName,
    archiveTargetDir: paths.archiveTargetDir,
    syncPlan,
    syncRequired: state.stage === 'VERIFIED',
    verifyGate
  };
}

function buildSyncBlockedResult(gateResult, syncFindings) {
  const findings = [];
  if (Array.isArray(gateResult && gateResult.findings)) {
    gateResult.findings.forEach((finding) => addArchiveFinding(findings, finding));
  }
  syncFindings.forEach((finding) => addArchiveFinding(findings, finding));
  addArchiveFinding(findings, {
    severity: 'BLOCK',
    code: 'archive-sync-unsafe',
    message: 'Archive is blocked because safe sync planning found blocking conflicts.',
    patchTargets: unique(syncFindings.flatMap((finding) => normalizeStringArray(finding.patchTargets)))
  });
  const normalizedFindings = sortFindings(findings);
  return {
    status: 'BLOCK',
    findings: normalizedFindings,
    patchTargets: unique(normalizedFindings.flatMap((finding) => finding.patchTargets)),
    nextAction: 'Resolve archive precondition blockers before retrying archive.',
    syncApplied: false,
    archived: false
  };
}

function archiveChange(options = {}) {
  const previousGateResult = options.gateResult && typeof options.gateResult === 'object'
    ? options.gateResult
    : {};
  const gateResult = evaluateArchiveGate(Object.assign({}, options, {
    changeDir: options.changeDir || previousGateResult.changeDir,
    repoRoot: options.repoRoot || previousGateResult.repoRoot
  }));
  if (gateResult.status === 'BLOCK') {
    return Object.assign({}, gateResult, {
      syncApplied: false,
      archived: false
    });
  }

  const paths = buildArchivePaths(gateResult.changeDir || options.changeDir || process.cwd(), gateResult.repoRoot || options.repoRoot);
  if (fs.existsSync(paths.archiveTargetDir)) {
    return {
      status: 'BLOCK',
      findings: [{
        severity: 'BLOCK',
        code: 'archive-target-exists',
        message: `Archive target already exists for change "${paths.changeName}".`,
        patchTargets: [toPosixPath(path.join('.opsx', 'archive', paths.changeName))]
      }],
      patchTargets: [toPosixPath(path.join('.opsx', 'archive', paths.changeName))],
      nextAction: 'Choose a unique archive target before retrying archive.',
      syncApplied: false,
      archived: false
    };
  }

  let syncApplied = false;
  let state = loadChangeState(paths.changeDir);
  if (state.stage === 'VERIFIED') {
    const syncPlan = gateResult.syncPlan && gateResult.syncPlan.status !== 'BLOCK'
      ? gateResult.syncPlan
      : planSync({ changeDir: paths.changeDir, repoRoot: paths.repoRoot });
    const appliedSyncPlan = applySyncPlan(syncPlan);
    if (appliedSyncPlan.status === 'BLOCK') {
      return buildSyncBlockedResult(gateResult, appliedSyncPlan.findings || []);
    }
    state = acceptSyncPlan(paths.changeDir, appliedSyncPlan);
    syncApplied = true;
  }

  const transition = applyMutationEvent(state, {
    type: MUTATION_EVENTS.ARCHIVE_ACCEPTED,
    patchTargets: [toPosixPath(path.join('.opsx', 'archive', paths.changeName))]
  });
  if (transition.status !== 'OK') {
    throw new Error(transition.message || 'Archive acceptance transition failed.');
  }

  writeChangeState(paths.changeDir, Object.assign({}, transition.state, {
    nextAction: transition.nextAction,
    blockers: []
  }));

  ensureDir(paths.archiveRoot);
  fs.renameSync(paths.changeDir, paths.archiveTargetDir);

  const activePointer = loadActiveChangePointer(paths.repoRoot);
  if (activePointer.activeChange === paths.changeName) {
    writeActiveChangePointer(paths.repoRoot, '');
  }

  return {
    status: 'PASS',
    findings: Array.isArray(gateResult.findings) ? gateResult.findings : [],
    patchTargets: Array.isArray(gateResult.patchTargets) ? gateResult.patchTargets : [],
    nextAction: 'Archive completed successfully.',
    repoRoot: paths.repoRoot,
    changeName: paths.changeName,
    archivedChangeDir: paths.archiveTargetDir,
    syncApplied,
    archived: true
  };
}

module.exports = {
  evaluateArchiveGate,
  archiveChange
};
