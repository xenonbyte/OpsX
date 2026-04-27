const fs = require('fs');
const path = require('path');
const { ensureDir } = require('./fs-utils');
const {
  getCanonicalProjectRoot,
  getLegacyProjectRoot,
  getCanonicalChangesDir,
  writeActiveStateIfMissing,
  writeChangeScaffoldsIfMissing
} = require('./workspace');

const REPO_MOVE_SPECS = [
  {
    id: 'repo-config',
    order: 10,
    fromSegments: ['openspec', 'config.yaml'],
    toSegments: ['.opsx', 'config.yaml'],
    fromDisplay: 'openspec/config.yaml',
    toDisplay: '.opsx/config.yaml'
  },
  {
    id: 'repo-changes',
    order: 20,
    fromSegments: ['openspec', 'changes'],
    toSegments: ['.opsx', 'changes'],
    fromDisplay: 'openspec/changes',
    toDisplay: '.opsx/changes'
  },
  {
    id: 'repo-specs',
    order: 30,
    fromSegments: ['openspec', 'specs'],
    toSegments: ['.opsx', 'specs'],
    fromDisplay: 'openspec/specs',
    toDisplay: '.opsx/specs'
  },
  {
    id: 'repo-archive',
    order: 40,
    fromSegments: ['openspec', 'archive'],
    toSegments: ['.opsx', 'archive'],
    fromDisplay: 'openspec/archive',
    toDisplay: '.opsx/archive'
  }
];

const HOME_MOVE_SPECS = [
  {
    id: 'home-config',
    order: 50,
    fromSegments: ['.openspec', '.opsx-config.yaml'],
    toSegments: ['.opsx', 'config.yaml'],
    fromDisplay: '~/.openspec/.opsx-config.yaml',
    toDisplay: '~/.opsx/config.yaml'
  },
  {
    id: 'home-manifests',
    order: 60,
    fromSegments: ['.openspec', 'manifests'],
    toSegments: ['.opsx', 'manifests'],
    fromDisplay: '~/.openspec/manifests',
    toDisplay: '~/.opsx/manifests'
  },
  {
    id: 'home-skill',
    order: 70,
    fromSegments: ['.openspec', 'skills', 'openspec'],
    toSegments: ['.opsx', 'skills', 'opsx'],
    fromDisplay: '~/.openspec/skills/openspec',
    toDisplay: '~/.opsx/skills/opsx'
  },
  {
    id: 'home-command',
    order: 80,
    fromSegments: ['.openspec', 'commands', 'openspec.md'],
    toSegments: ['.opsx', 'commands', 'opsx.md'],
    fromDisplay: '~/.openspec/commands/openspec.md',
    toDisplay: '~/.opsx/commands/opsx.md'
  }
];

function toUnixPath(value) {
  return String(value || '').replace(/\\/g, '/');
}

function ensureWithinBase(basePath, targetPath, label) {
  const resolvedBase = path.resolve(basePath);
  const resolvedTarget = path.resolve(targetPath);
  const relativePath = path.relative(resolvedBase, resolvedTarget);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new Error(`Refusing path outside ${label} base: ${targetPath}`);
  }
}

function isDirectoryPath(targetPath) {
  return fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory();
}

function listChildDirectories(directoryPath) {
  if (!isDirectoryPath(directoryPath)) return [];
  return fs.readdirSync(directoryPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function setAbortReason(plan, message) {
  if (!plan.abortReason) {
    plan.abortReason = message;
  }
}

function validateDestinationParents(plan, move, baseDir, label) {
  let current = path.resolve(baseDir);
  const targetParent = path.dirname(path.resolve(move.to));
  ensureWithinBase(baseDir, targetParent, label);

  path.relative(current, targetParent)
    .split(path.sep)
    .filter(Boolean)
    .forEach((segment) => {
      current = path.join(current, segment);
      if (fs.existsSync(current) && !fs.statSync(current).isDirectory()) {
        setAbortReason(plan, `Canonical destination parent is not a directory: ${move.toDisplay}`);
      }
    });
}

function buildMoveFromSpec(spec, cwd, homeDir, scope) {
  const baseDir = scope === 'home' ? homeDir : cwd;
  const sourcePath = path.join(baseDir, ...spec.fromSegments);
  const destinationPath = path.join(baseDir, ...spec.toSegments);
  return {
    id: spec.id,
    scope,
    order: spec.order,
    from: sourcePath,
    to: destinationPath,
    sourceCheckPath: sourcePath,
    fromDisplay: spec.fromDisplay,
    toDisplay: spec.toDisplay
  };
}

function appendMoveIfSelected(plan, move, baseDir, label) {
  ensureWithinBase(baseDir, move.from, label);
  ensureWithinBase(baseDir, move.to, label);
  ensureWithinBase(baseDir, move.sourceCheckPath, label);
  if (!fs.existsSync(move.sourceCheckPath)) return;
  plan.moves.push(move);
  validateDestinationParents(plan, move, baseDir, label);
  if (fs.existsSync(move.to)) {
    setAbortReason(plan, `Canonical destination already exists: ${move.toDisplay}`);
  }
}

function appendCreate(plan, repoRoot, displayPath) {
  const targetPath = path.join(repoRoot, ...displayPath.split('/'));
  ensureWithinBase(repoRoot, targetPath, 'repo');
  plan.creates.push({
    path: targetPath,
    display: displayPath
  });
}

function collectLegacyCandidates(plan) {
  const knownTopLevel = new Set(['.opsx-config.yaml', 'manifests', 'skills', 'commands', 'backups']);
  const seen = new Set();

  function pushCandidate(candidatePath, reason) {
    if (!fs.existsSync(candidatePath)) return;
    ensureWithinBase(plan.homeDir, candidatePath, 'home');
    const display = `~/${toUnixPath(path.relative(plan.homeDir, candidatePath))}`;
    const key = `${display}:${reason}`;
    if (seen.has(key)) return;
    seen.add(key);
    plan.legacyCandidates.push({
      path: candidatePath,
      display,
      reason
    });
    plan.warnings.push(`${display} (${reason})`);
  }

  pushCandidate(path.join(plan.legacySharedHome, 'backups'), 'legacy backup content is not auto-migrated');

  if (!isDirectoryPath(plan.legacySharedHome)) return;

  fs.readdirSync(plan.legacySharedHome).forEach((entryName) => {
    if (!knownTopLevel.has(entryName)) {
      pushCandidate(path.join(plan.legacySharedHome, entryName), 'unknown legacy shared-home entry');
    }
  });

  const legacySkillsRoot = path.join(plan.legacySharedHome, 'skills');
  if (isDirectoryPath(legacySkillsRoot)) {
    fs.readdirSync(legacySkillsRoot, { withFileTypes: true })
      .filter((entry) => entry.name !== 'openspec')
      .forEach((entry) => {
        pushCandidate(path.join(legacySkillsRoot, entry.name), 'unknown legacy skills entry');
      });
  }

  const legacyCommandsRoot = path.join(plan.legacySharedHome, 'commands');
  if (isDirectoryPath(legacyCommandsRoot)) {
    fs.readdirSync(legacyCommandsRoot, { withFileTypes: true })
      .filter((entry) => entry.name !== 'openspec.md')
      .forEach((entry) => {
        pushCandidate(path.join(legacyCommandsRoot, entry.name), 'unknown legacy commands entry');
      });
  }
}

function collectMetadataMoves(plan) {
  const legacyChangesDir = path.join(plan.legacyProjectRoot, 'changes');
  const canonicalChangesDir = path.join(plan.canonicalProjectRoot, 'changes');
  const changeNames = listChildDirectories(legacyChangesDir);

  changeNames.forEach((changeName) => {
    const legacyMetadataPath = path.join(legacyChangesDir, changeName, '.openspec.yaml');
    if (!fs.existsSync(legacyMetadataPath)) return;

    const projectedLegacyDestination = path.join(legacyChangesDir, changeName, 'change.yaml');
    if (fs.existsSync(projectedLegacyDestination)) {
      setAbortReason(plan, `Canonical destination already exists: .opsx/changes/${changeName}/change.yaml`);
    }

    const move = {
      id: `repo-change-metadata:${changeName}`,
      scope: 'repo',
      order: 90,
      from: path.join(canonicalChangesDir, changeName, '.openspec.yaml'),
      to: path.join(canonicalChangesDir, changeName, 'change.yaml'),
      sourceCheckPath: legacyMetadataPath,
      fromDisplay: `openspec/changes/${changeName}/.openspec.yaml`,
      toDisplay: `.opsx/changes/${changeName}/change.yaml`
    };

    ensureWithinBase(plan.cwd, move.from, 'repo');
    ensureWithinBase(plan.cwd, move.to, 'repo');
    ensureWithinBase(plan.cwd, move.sourceCheckPath, 'repo');
    plan.moves.push(move);
    validateDestinationParents(plan, move, plan.cwd, 'repo');
    if (fs.existsSync(move.to)) {
      setAbortReason(plan, `Canonical destination already exists: ${move.toDisplay}`);
    }
  });
}

function collectCreatePlan(plan) {
  if (!fs.existsSync(path.join(plan.canonicalProjectRoot, 'active.yaml'))) {
    appendCreate(plan, plan.cwd, '.opsx/active.yaml');
  }

  const legacyChangesDir = path.join(plan.legacyProjectRoot, 'changes');
  const canonicalChangesDir = path.join(plan.canonicalProjectRoot, 'changes');
  const changeNames = listChildDirectories(legacyChangesDir).length
    ? listChildDirectories(legacyChangesDir)
    : listChildDirectories(canonicalChangesDir);

  changeNames.forEach((changeName) => {
    const probeDir = fs.existsSync(path.join(legacyChangesDir, changeName))
      ? path.join(legacyChangesDir, changeName)
      : path.join(canonicalChangesDir, changeName);

    ['state.yaml', 'context.md', 'drift.md'].forEach((fileName) => {
      const probePath = path.join(probeDir, fileName);
      if (!fs.existsSync(probePath)) {
        appendCreate(plan, plan.cwd, `.opsx/changes/${changeName}/${fileName}`);
      }
    });
  });
}

function validateSelectedSources(plan) {
  plan.moves.forEach((move) => {
    if (!fs.existsSync(move.sourceCheckPath)) {
      setAbortReason(plan, `Planned source missing after selection: ${move.fromDisplay}`);
    }
  });
}

function sortMoves(moves) {
  return moves.slice().sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return a.fromDisplay.localeCompare(b.fromDisplay);
  });
}

function createMigrationPlan(options = {}) {
  const cwd = path.resolve(options.cwd || process.cwd());
  const homeDir = path.resolve(options.homeDir || process.env.HOME || '');

  if (!homeDir || homeDir === path.resolve(path.parse(homeDir).root)) {
    throw new Error('Cannot resolve home directory for migration planning.');
  }

  const plan = {
    cwd,
    homeDir,
    canonicalProjectRoot: getCanonicalProjectRoot(cwd),
    legacyProjectRoot: getLegacyProjectRoot(cwd),
    canonicalSharedHome: path.join(homeDir, '.opsx'),
    legacySharedHome: path.join(homeDir, '.openspec'),
    moves: [],
    creates: [],
    warnings: [],
    legacyCandidates: [],
    abortReason: ''
  };

  if (fs.existsSync(plan.canonicalProjectRoot)) {
    setAbortReason(plan, 'Canonical project root already exists: .opsx/');
  }

  REPO_MOVE_SPECS
    .map((spec) => buildMoveFromSpec(spec, cwd, homeDir, 'repo'))
    .forEach((move) => appendMoveIfSelected(plan, move, cwd, 'repo'));

  HOME_MOVE_SPECS
    .map((spec) => buildMoveFromSpec(spec, cwd, homeDir, 'home'))
    .forEach((move) => appendMoveIfSelected(plan, move, homeDir, 'home'));

  collectMetadataMoves(plan);
  collectLegacyCandidates(plan);
  collectCreatePlan(plan);
  validateSelectedSources(plan);

  return plan;
}

function formatMigrationPlan(plan, options = {}) {
  const dryRun = options.dryRun !== false;
  const heading = dryRun ? 'OpsX migration plan (dry-run)' : 'OpsX migration plan (execute)';
  const lines = [heading, ''];

  const orderedMoves = sortMoves(plan.moves);
  orderedMoves.forEach((move) => {
    lines.push(`MOVE ${move.fromDisplay} -> ${move.toDisplay}`);
  });

  plan.creates.forEach((entry) => {
    lines.push(`CREATE ${entry.display}`);
  });

  if (!orderedMoves.length && !plan.creates.length) {
    lines.push('(no operations)');
  }

  if (plan.warnings.length) {
    lines.push('');
    plan.warnings.forEach((warning) => {
      lines.push(`WARNING ${warning}`);
    });
  }

  if (plan.abortReason) {
    lines.push('');
    lines.push(`ABORT ${plan.abortReason}`);
  }

  return lines.join('\n');
}

function runMigration(options = {}) {
  const cwd = path.resolve(options.cwd || process.cwd());
  const homeDir = path.resolve(options.homeDir || process.env.HOME || '');
  const dryRun = options.dryRun === true;

  if (dryRun) {
    const plan = createMigrationPlan({ cwd, homeDir });
    return formatMigrationPlan(plan, { dryRun: true });
  }

  const firstPreflight = createMigrationPlan({ cwd, homeDir });
  if (firstPreflight.abortReason) {
    throw new Error(`Migration aborted: ${firstPreflight.abortReason}`);
  }

  const plan = createMigrationPlan({ cwd, homeDir });
  if (plan.abortReason) {
    throw new Error(`Migration aborted: ${plan.abortReason}`);
  }

  const moved = [];
  sortMoves(plan.moves).forEach((move) => {
    ensureWithinBase(move.scope === 'home' ? homeDir : cwd, move.from, move.scope);
    ensureWithinBase(move.scope === 'home' ? homeDir : cwd, move.to, move.scope);
    if (!fs.existsSync(move.from)) {
      throw new Error(`Migration aborted: Planned source missing after selection: ${move.fromDisplay}`);
    }
    ensureDir(path.dirname(move.to));
    fs.renameSync(move.from, move.to);
    moved.push(move);
  });

  let createdCount = 0;
  const activeResult = writeActiveStateIfMissing(cwd, options.activeChange || '');
  if (activeResult.created) createdCount += 1;

  const canonicalChangesDir = getCanonicalChangesDir(cwd);
  if (isDirectoryPath(canonicalChangesDir)) {
    fs.readdirSync(canonicalChangesDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .forEach((entry) => {
        const scaffoldResult = writeChangeScaffoldsIfMissing(path.join(canonicalChangesDir, entry.name), entry.name);
        createdCount += scaffoldResult.created.length;
      });
  }

  return [
    'OpsX migration complete.',
    `- moves: ${moved.length}`,
    `- creates: ${createdCount}`,
    `- warnings: ${plan.warnings.length}`
  ].concat(plan.warnings.map((warning) => `- warning: ${warning}`)).join('\n');
}

function getMigrationStatus(options = {}) {
  const cwd = path.resolve(options.cwd || process.cwd());
  const homeDir = path.resolve(options.homeDir || process.env.HOME || '');
  const plan = createMigrationPlan({ cwd, homeDir });

  const status = {
    cwd: plan.cwd,
    homeDir: plan.homeDir,
    canonical: {
      projectRoot: plan.canonicalProjectRoot,
      projectExists: fs.existsSync(plan.canonicalProjectRoot),
      sharedHome: plan.canonicalSharedHome,
      sharedExists: fs.existsSync(plan.canonicalSharedHome)
    },
    legacy: {
      projectRoot: plan.legacyProjectRoot,
      projectExists: fs.existsSync(plan.legacyProjectRoot),
      sharedHome: plan.legacySharedHome,
      sharedExists: fs.existsSync(plan.legacySharedHome),
      candidates: plan.legacyCandidates.map((entry) => ({
        path: entry.path,
        display: entry.display,
        reason: entry.reason
      }))
    },
    migration: {
      pendingMoves: plan.moves.length,
      pendingCreates: plan.creates.length,
      warnings: plan.warnings.slice(),
      abortReason: plan.abortReason || ''
    }
  };

  if (options.format === 'text' || options.display === true) {
    const lines = [
      'OpsX migration status',
      `- canonical project root: ${status.canonical.projectExists ? 'present' : 'missing'} (${status.canonical.projectRoot})`,
      `- canonical shared home: ${status.canonical.sharedExists ? 'present' : 'missing'} (${status.canonical.sharedHome})`,
      `- legacy project root: ${status.legacy.projectExists ? 'present' : 'missing'} (${status.legacy.projectRoot})`,
      `- legacy shared home: ${status.legacy.sharedExists ? 'present' : 'missing'} (${status.legacy.sharedHome})`,
      `- pending moves: ${status.migration.pendingMoves}`,
      `- pending creates: ${status.migration.pendingCreates}`
    ];
    if (status.legacy.candidates.length) {
      status.legacy.candidates.forEach((entry) => {
        lines.push(`- legacy candidate: ${entry.display} (${entry.reason})`);
      });
    }
    if (status.migration.abortReason) {
      lines.push(`- abort: ${status.migration.abortReason}`);
    }
    return lines.join('\n');
  }

  return status;
}

module.exports = {
  createMigrationPlan,
  formatMigrationPlan,
  runMigration,
  getMigrationStatus
};
