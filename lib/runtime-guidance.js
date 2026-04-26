const fs = require('fs');
const path = require('path');
const { REPO_ROOT, DEFAULT_SCHEMA } = require('./constants');
const { loadSchema, getSchemaPath } = require('./schema');
const { readYamlFile, loadGlobalConfig, normalizeConfig, deepMerge } = require('./config');
const { listFiles, readText } = require('./fs-utils');
const { runTaskCheckpoint, resolveSecurityReviewState } = require('./workflow');

const CHANGE_NAME_PATTERN = /^[a-z0-9][a-z0-9-_]*$/i;
const CAPABILITY_PATTERN = /^[a-z0-9][a-z0-9-_]*$/i;
const COMPLETION_STATES = ['done', 'ready', 'blocked'];

class RuntimeGuidanceError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'RuntimeGuidanceError';
    this.code = code;
    this.details = details;
  }
}

function toUnixPath(value) {
  return String(value || '').replace(/\\/g, '/');
}

function ensureSafeChangeName(changeName) {
  const normalized = String(changeName || '').trim();
  if (!normalized) {
    throw new RuntimeGuidanceError(
      'invalid-change-name',
      'Change name is required.',
      { expected: 'non-empty string' }
    );
  }
  if (normalized.includes('/') || normalized.includes('\\') || normalized.includes('..')) {
    throw new RuntimeGuidanceError(
      'invalid-change-name',
      'Change name must not include path separators or traversal markers.',
      { changeName: normalized }
    );
  }
  if (!CHANGE_NAME_PATTERN.test(normalized)) {
    throw new RuntimeGuidanceError(
      'invalid-change-name',
      'Change name contains unsupported characters.',
      { changeName: normalized, pattern: CHANGE_NAME_PATTERN.source }
    );
  }
  return normalized;
}

function ensureSafeCapability(capability) {
  const normalized = String(capability || '').trim();
  if (!normalized) return '';
  if (normalized.includes('/') || normalized.includes('\\') || normalized.includes('..')) {
    throw new RuntimeGuidanceError(
      'invalid-capability',
      'Capability must not include path separators or traversal markers.',
      { capability: normalized }
    );
  }
  if (!CAPABILITY_PATTERN.test(normalized)) {
    throw new RuntimeGuidanceError(
      'invalid-capability',
      'Capability contains unsupported characters.',
      { capability: normalized, pattern: CAPABILITY_PATTERN.source }
    );
  }
  return normalized;
}

function ensureInside(baseDir, targetPath, code = 'invalid-path') {
  const relative = path.relative(baseDir, targetPath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new RuntimeGuidanceError(code, 'Resolved path escapes the expected base directory.', {
      baseDir,
      targetPath
    });
  }
}

function ensureSchema(schemaName, options = {}) {
  const resolvedSchemaName = schemaName || DEFAULT_SCHEMA;
  if (options.schema && typeof options.schema === 'object') return options.schema;
  try {
    return loadSchema(resolvedSchemaName);
  } catch (error) {
    throw new RuntimeGuidanceError(
      'schema-not-found',
      `Schema not found: ${resolvedSchemaName}`,
      { schema: resolvedSchemaName, cause: error && error.message ? error.message : String(error) }
    );
  }
}

function resolveRuntimeConfig(options = {}) {
  const repoRoot = options.repoRoot || REPO_ROOT;
  const homeDir = options.homeDir || process.env.HOME;
  const changeName = ensureSafeChangeName(options.changeName);
  const openSpecDir = path.join(repoRoot, 'openspec');
  const changesDir = path.join(openSpecDir, 'changes');
  const changeDir = path.join(changesDir, changeName);

  ensureInside(changesDir, changeDir, 'invalid-change-path');
  if (!fs.existsSync(changeDir) || !fs.statSync(changeDir).isDirectory()) {
    throw new RuntimeGuidanceError(
      'change-not-found',
      `Change does not exist: ${changeName}`,
      { changeName, changeDir }
    );
  }

  const projectConfigPath = path.join(openSpecDir, 'config.yaml');
  const changeConfigPath = path.join(changeDir, '.openspec.yaml');
  const globalConfig = loadGlobalConfig(homeDir);
  const projectConfig = fs.existsSync(projectConfigPath) ? readYamlFile(projectConfigPath) : {};
  const changeConfig = fs.existsSync(changeConfigPath) ? readYamlFile(changeConfigPath) : {};

  const merged = normalizeConfig(
    deepMerge(
      deepMerge(globalConfig, projectConfig),
      changeConfig
    )
  );

  return {
    repoRoot,
    openSpecDir,
    changesDir,
    changeDir,
    changeName,
    projectConfigPath,
    changeConfigPath,
    globalConfig,
    projectConfig,
    changeConfig,
    config: merged
  };
}

function normalizeRequires(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry) => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function validateSchemaGraph(schema, options = {}) {
  if (!schema || typeof schema !== 'object') {
    throw new RuntimeGuidanceError('invalid-schema', 'Schema payload must be an object.');
  }
  const artifacts = Array.isArray(schema.artifacts) ? schema.artifacts : [];
  if (!artifacts.length) {
    throw new RuntimeGuidanceError('invalid-schema', 'Schema must declare at least one artifact.', {
      schema: schema.id || options.schemaName || DEFAULT_SCHEMA
    });
  }

  const seen = new Map();
  const nodes = artifacts.map((artifact, index) => {
    const id = typeof artifact.id === 'string' ? artifact.id.trim() : '';
    if (!id) {
      throw new RuntimeGuidanceError('schema-artifact-id-missing', 'Schema artifact is missing id.', {
        index
      });
    }
    if (seen.has(id)) {
      throw new RuntimeGuidanceError(
        'schema-duplicate-artifact-id',
        `Duplicate artifact id detected: ${id}`,
        { id, firstIndex: seen.get(id), duplicateIndex: index }
      );
    }
    seen.set(id, index);
    return {
      id,
      path: typeof artifact.path === 'string' ? artifact.path : '',
      optional: artifact.optional === true,
      requires: normalizeRequires(artifact.requires),
      gates: normalizeRequires(artifact.gates)
    };
  });

  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  nodes.forEach((node) => {
    node.requires.forEach((requiredId) => {
      if (!nodeMap.has(requiredId)) {
        throw new RuntimeGuidanceError(
          'schema-invalid-requires',
          `Artifact \`${node.id}\` requires unknown artifact \`${requiredId}\`.`,
          { artifact: node.id, required: requiredId }
        );
      }
    });
    node.gates.forEach((gatedId) => {
      if (!nodeMap.has(gatedId)) {
        throw new RuntimeGuidanceError(
          'schema-invalid-gates',
          `Artifact \`${node.id}\` gates unknown artifact \`${gatedId}\`.`,
          { artifact: node.id, gated: gatedId }
        );
      }
    });
  });

  const visiting = new Set();
  const visited = new Set();
  const stack = [];
  const cycles = [];

  function dfs(node) {
    if (visited.has(node.id)) return;
    if (visiting.has(node.id)) {
      const cycleStart = stack.indexOf(node.id);
      const cycle = cycleStart >= 0 ? stack.slice(cycleStart).concat(node.id) : [node.id, node.id];
      cycles.push(cycle);
      return;
    }
    visiting.add(node.id);
    stack.push(node.id);
    node.requires.forEach((requiredId) => {
      const nextNode = nodeMap.get(requiredId);
      if (nextNode) dfs(nextNode);
    });
    stack.pop();
    visiting.delete(node.id);
    visited.add(node.id);
  }

  nodes.forEach((node) => dfs(node));
  if (cycles.length) {
    throw new RuntimeGuidanceError(
      'schema-dependency-cycle',
      'Schema dependency graph contains cycle(s).',
      { cycles }
    );
  }

  return {
    schema: schema.id || options.schemaName || DEFAULT_SCHEMA,
    artifacts: nodes
  };
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function compilePathPattern(pathPattern) {
  const normalized = toUnixPath(pathPattern);
  const escaped = escapeRegex(normalized).replace(/<[^>]+>/g, '[^/]+');
  return new RegExp(`^${escaped}$`);
}

function resolveChangeFileMatches(changeDir, pathPattern) {
  const files = listFiles(changeDir).map((relativePath) => toUnixPath(relativePath));
  const pattern = compilePathPattern(pathPattern);
  return files.filter((relativePath) => pattern.test(relativePath)).sort();
}

function detectArtifactCompletion(options = {}) {
  const graph = options.graph || validateSchemaGraph(options.schema, options);
  const changeDir = options.changeDir;
  if (!changeDir) {
    throw new RuntimeGuidanceError('invalid-change-path', 'changeDir is required for completion detection.');
  }
  return graph.artifacts.reduce((output, artifact) => {
    const matchedFiles = resolveChangeFileMatches(changeDir, artifact.path);
    output[artifact.id] = {
      done: matchedFiles.length > 0,
      matchedFiles
    };
    return output;
  }, {});
}

function deriveArtifactStates(options = {}) {
  const graph = options.graph || validateSchemaGraph(options.schema, options);
  const completion = options.completion || {};
  const review = options.review || {};
  const securityReviewNode = graph.artifacts.find((artifact) => artifact.id === 'security-review');
  const securityReviewGates = new Set(securityReviewNode ? securityReviewNode.gates : []);
  const securityReviewDone = completion['security-review'] && completion['security-review'].done === true;
  const securityReviewCompleted = review.completed === true || securityReviewDone === true;
  const securityReviewRequired = review.required === true;
  const securityReviewActive = securityReviewRequired || securityReviewCompleted;

  return graph.artifacts.reduce((output, artifact) => {
    const completionEntry = completion[artifact.id] || { done: false, matchedFiles: [] };
    const missingDependencies = artifact.requires
      .filter((dependencyId) => !(completion[dependencyId] && completion[dependencyId].done));
    if (
      securityReviewRequired
      && securityReviewGates.has(artifact.id)
      && securityReviewCompleted !== true
      && !missingDependencies.includes('security-review')
    ) {
      missingDependencies.push('security-review');
    }
    const outOfOrder = completionEntry.done === true && missingDependencies.length > 0;
    const state = completionEntry.done ? 'done' : (missingDependencies.length ? 'blocked' : 'ready');
    output[artifact.id] = {
      state,
      done: completionEntry.done === true,
      ready: state === 'ready',
      blocked: state === 'blocked',
      optional: artifact.optional === true,
      active: artifact.id === 'security-review' ? securityReviewActive : true,
      path: artifact.path,
      matchedFiles: (completionEntry.matchedFiles || []).slice(),
      requires: artifact.requires.slice(),
      gates: artifact.gates.slice(),
      missingDependencies,
      outOfOrder
    };
    return output;
  }, {});
}

function countArtifactsByState(artifactStates = {}) {
  const summary = {
    done: 0,
    ready: 0,
    blocked: 0
  };
  Object.keys(artifactStates).forEach((artifactId) => {
    if (artifactStates[artifactId].active === false) return;
    const state = artifactStates[artifactId].state;
    if (COMPLETION_STATES.includes(state)) {
      summary[state] += 1;
    }
  });
  return summary;
}

function resolveNextArtifact(graph, artifactStates) {
  const activeArtifacts = graph.artifacts
    .filter((artifact) => artifactStates[artifact.id] && artifactStates[artifact.id].active !== false);
  const requiredPending = activeArtifacts
    .filter((artifact) => artifact.optional !== true && artifactStates[artifact.id].done !== true);
  const readyRequired = requiredPending.find((artifact) => artifactStates[artifact.id].ready === true);
  if (readyRequired) {
    return {
      stage: 'planning',
      artifactId: readyRequired.id,
      path: readyRequired.path,
      reason: 'first-ready-required-artifact'
    };
  }

  if (requiredPending.length) {
    const blockedRequired = requiredPending[0];
    const blockers = artifactStates[blockedRequired.id].missingDependencies.slice();
    const blockerSet = new Set(blockers);
    const readyGate = activeArtifacts.find((artifact) => (
      artifact.optional === true
      && artifactStates[artifact.id].ready === true
      && blockerSet.has(artifact.id)
    ));
    if (readyGate) {
      return {
        stage: 'planning',
        artifactId: readyGate.id,
        path: readyGate.path,
        reason: 'optional-gate-ready',
        unblocks: blockedRequired.id
      };
    }
    return {
      stage: 'planning',
      artifactId: blockedRequired.id,
      path: blockedRequired.path,
      reason: 'blocked-by-dependencies',
      blockers
    };
  }

  const readyOptional = activeArtifacts.find((artifact) => artifact.optional === true && artifactStates[artifact.id].ready === true);
  if (readyOptional) {
    return {
      stage: 'planning',
      artifactId: readyOptional.id,
      path: readyOptional.path,
      reason: 'optional-artifact-ready'
    };
  }

  return {
    stage: 'apply',
    artifactId: null,
    path: null,
    reason: 'planning-artifacts-complete'
  };
}

function loadArtifactTemplateIndex(options = {}) {
  const language = options.language === 'zh' ? 'zh' : 'en';
  const templateRoot = options.templateRoot || REPO_ROOT;
  const fileName = language === 'zh' ? 'artifact-templates-zh.md' : 'artifact-templates.md';
  const sourcePath = path.join(templateRoot, 'skills', 'opsx', 'references', fileName);
  if (!fs.existsSync(sourcePath)) {
    throw new RuntimeGuidanceError(
      'template-index-not-found',
      `Artifact template reference not found: ${fileName}`,
      { sourcePath }
    );
  }
  const text = readText(sourcePath);
  const lines = text.split(/\r?\n/);
  const sections = [];
  let current = null;
  let inFence = false;

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (/^```/.test(trimmed)) {
      if (current) current.lines.push(line);
      inFence = !inFence;
      return;
    }
    if (!inFence) {
      const headingMatch = line.match(/^##\s+(.+)$/);
      if (headingMatch) {
        if (current) sections.push(current);
        current = {
          heading: headingMatch[1].trim(),
          lines: []
        };
        return;
      }
    }
    if (current) current.lines.push(line);
  });
  if (current) sections.push(current);

  const byPath = {};

  sections.forEach((section) => {
    const heading = section.heading;
    if (!heading || !/\.md$/i.test(heading)) return;
    const body = section.lines.join('\n');
    const fencedMatch = body.match(/```markdown\s*\n([\s\S]*?)\n```/i)
      || body.match(/```\s*\n([\s\S]*?)\n```/i);
    if (fencedMatch) {
      byPath[heading] = fencedMatch[1];
    }
  });

  return {
    language,
    sourcePath,
    templates: byPath
  };
}

function resolveArtifactTargetPath(artifactPath, options = {}) {
  const placeholderRegex = /<[^>]+>/g;
  if (!placeholderRegex.test(artifactPath)) return artifactPath;
  const capability = ensureSafeCapability(options.capability || '');
  if (!capability) return null;
  return artifactPath.replace(placeholderRegex, capability);
}

function loadArtifactTemplate(options = {}) {
  const graph = options.graph || validateSchemaGraph(options.schema, options);
  const artifactId = String(options.artifactId || '').trim();
  const artifact = graph.artifacts.find((entry) => entry.id === artifactId);
  if (!artifact) {
    throw new RuntimeGuidanceError(
      'unknown-artifact',
      `Unknown artifact id: ${artifactId}`,
      { artifactId, knownArtifacts: graph.artifacts.map((entry) => entry.id) }
    );
  }
  const index = loadArtifactTemplateIndex(options);
  const content = index.templates[artifact.path] || '';
  return {
    artifactId: artifact.id,
    path: artifact.path,
    language: index.language,
    sourcePath: index.sourcePath,
    content
  };
}

function collectArtifactSources(changeDir) {
  const proposalPath = path.join(changeDir, 'proposal.md');
  const designPath = path.join(changeDir, 'design.md');
  const tasksPath = path.join(changeDir, 'tasks.md');
  const specsDir = path.join(changeDir, 'specs');
  const specsText = fs.existsSync(specsDir)
    ? listFiles(specsDir)
      .filter((relativePath) => toUnixPath(relativePath).endsWith('/spec.md') || toUnixPath(relativePath) === 'spec.md')
      .map((relativePath) => readText(path.join(specsDir, relativePath)))
      .join('\n\n')
    : '';

  return {
    proposal: fs.existsSync(proposalPath) ? readText(proposalPath) : '',
    specs: specsText,
    design: fs.existsSync(designPath) ? readText(designPath) : '',
    tasks: fs.existsSync(tasksPath) ? readText(tasksPath) : ''
  };
}

function normalizeSourceBlock(value) {
  if (Array.isArray(value)) {
    return value
      .filter((entry) => entry !== undefined && entry !== null)
      .map((entry) => String(entry))
      .join('\n');
  }
  if (value === undefined || value === null) return '';
  return String(value);
}

function hasMeaningfulSourceContent(value) {
  return normalizeSourceBlock(value).trim().length > 0;
}

function mergeRuntimeSources(providedSources = {}, fileSources = {}) {
  const merged = Object.assign({}, providedSources || {});

  Object.keys(fileSources || {}).forEach((key) => {
    const fileValue = fileSources[key];
    const hasFileContent = hasMeaningfulSourceContent(fileValue);

    if (hasFileContent || !(key in merged)) {
      merged[key] = fileValue;
    }
  });

  return merged;
}

function parseTopLevelTaskGroups(tasksText) {
  const text = normalizeSourceBlock(tasksText);
  const headingMatches = Array.from(text.matchAll(/^##\s+(\d+\.\s+.+)$/gm));
  return headingMatches.map((match, index) => {
    const start = match.index;
    const end = index + 1 < headingMatches.length ? headingMatches[index + 1].index : text.length;
    const block = text.slice(start, end).trim();
    const checklist = Array.from(block.matchAll(/^- \[([ xX])\]\s+(.+)$/gm)).map((item) => ({
      done: item[1].toLowerCase() === 'x',
      text: item[2].trim()
    }));
    return {
      title: match[1].trim(),
      text: block,
      items: checklist,
      completed: checklist.length > 0 && checklist.every((item) => item.done),
      pendingItems: checklist.filter((item) => !item.done).map((item) => item.text),
      completedItems: checklist.filter((item) => item.done).map((item) => item.text)
    };
  });
}

function buildRuntimeKernel(options = {}) {
  const runtime = resolveRuntimeConfig(options);
  const schemaName = options.schemaName || runtime.changeConfig.schema || runtime.config.schema || DEFAULT_SCHEMA;
  const schema = ensureSchema(schemaName, options);
  const graph = validateSchemaGraph(schema, { schemaName });
  const completion = detectArtifactCompletion({ graph, changeDir: runtime.changeDir });
  const sources = mergeRuntimeSources(options.sources, collectArtifactSources(runtime.changeDir));
  const artifactPresence = graph.artifacts.reduce((output, artifact) => {
    output[artifact.id] = completion[artifact.id] && completion[artifact.id].done === true;
    return output;
  }, {});
  const review = resolveSecurityReviewState({
    schema,
    config: runtime.config,
    change: runtime.changeConfig,
    artifacts: artifactPresence,
    sources
  });
  const artifactStates = deriveArtifactStates({ graph, completion, review });
  const stateSummary = countArtifactsByState(artifactStates);
  const next = resolveNextArtifact(graph, artifactStates);

  const requiredArtifacts = graph.artifacts.filter((artifact) => artifact.optional !== true);
  const requiredDone = requiredArtifacts.filter((artifact) => artifactStates[artifact.id].done === true).length;
  const progressTotal = requiredArtifacts.length || 1;
  const progressPercent = Math.round((requiredDone / progressTotal) * 100);

  return {
    change: runtime.changeName,
    changeConfig: runtime.changeConfig,
    paths: {
      repoRoot: runtime.repoRoot,
      changeDir: runtime.changeDir,
      schemaPath: getSchemaPath(schemaName)
    },
    schema: graph.schema,
    config: runtime.config,
    sources,
    review,
    graph,
    completion,
    artifactStates,
    stateSummary,
    progress: {
      requiredDone,
      requiredTotal: requiredArtifacts.length,
      percent: progressPercent
    },
    next
  };
}

function buildStatus(options = {}) {
  const kernel = buildRuntimeKernel(options);
  return {
    change: kernel.change,
    schema: kernel.schema,
    progress: kernel.progress,
    summary: kernel.stateSummary,
    artifacts: kernel.graph.artifacts.reduce((output, artifact) => {
      const state = kernel.artifactStates[artifact.id];
      output[artifact.id] = {
        state: state.state,
        active: state.active,
        optional: state.optional,
        path: state.path,
        requires: state.requires.slice(),
        missingDependencies: state.missingDependencies.slice(),
        outOfOrder: state.outOfOrder,
        matchedFiles: state.matchedFiles.slice()
      };
      return output;
    }, {}),
    review: kernel.review,
    next: kernel.next
  };
}

function buildArtifactInstructions(options = {}) {
  const artifactId = String(options.artifactId || '').trim();
  if (!artifactId) {
    throw new RuntimeGuidanceError('artifact-id-required', 'artifactId is required.');
  }
  const kernel = buildRuntimeKernel(options);
  const artifact = kernel.graph.artifacts.find((entry) => entry.id === artifactId);
  if (!artifact) {
    throw new RuntimeGuidanceError(
      'unknown-artifact',
      `Unknown artifact id: ${artifactId}`,
      { artifactId, knownArtifacts: kernel.graph.artifacts.map((entry) => entry.id) }
    );
  }

  const state = kernel.artifactStates[artifact.id];
  const targetPath = resolveArtifactTargetPath(artifact.path, { capability: options.capability });
  const template = loadArtifactTemplate({
    graph: kernel.graph,
    artifactId,
    language: options.language || kernel.config.language
  });

  const dependencyIds = Array.from(new Set([
    ...artifact.requires,
    ...state.missingDependencies
  ]));
  const dependencies = dependencyIds.map((requiredId) => ({
    artifactId: requiredId,
    state: kernel.artifactStates[requiredId] ? kernel.artifactStates[requiredId].state : 'missing',
    path: kernel.artifactStates[requiredId] ? kernel.artifactStates[requiredId].path : null
  }));

  const warnings = [];
  if (state.missingDependencies.length) {
    warnings.push(`Artifact is blocked by dependencies: ${state.missingDependencies.join(', ')}`);
  }
  if (!targetPath && artifact.path.includes('<')) {
    warnings.push('Capability is required to resolve target path for parameterized artifact path.');
  }

  const payload = {
    change: kernel.change,
    schema: kernel.schema,
    artifact: {
      id: artifact.id,
      state: state.state,
      optional: artifact.optional === true,
      path: artifact.path,
      targetPath,
      readyForWrite: state.ready === true && Boolean(targetPath),
      missingDependencies: state.missingDependencies.slice()
    },
    dependencies,
    context: {
      project: kernel.config.context || '',
      rules: kernel.config.rules && kernel.config.rules[artifact.id] ? kernel.config.rules[artifact.id] : '',
      securityReview: kernel.config.securityReview
    },
    template,
    warnings
  };

  if (options.format === 'text') {
    const lines = [
      `# Artifact instructions: ${artifact.id}`,
      `- change: ${payload.change}`,
      `- state: ${payload.artifact.state}`,
      `- readyForWrite: ${payload.artifact.readyForWrite ? 'yes' : 'no'}`,
      `- targetPath: ${payload.artifact.targetPath || '(needs capability)'}`,
      `- missingDependencies: ${payload.artifact.missingDependencies.length ? payload.artifact.missingDependencies.join(', ') : 'none'}`,
      '',
      '## Template',
      '```markdown',
      payload.template.content || '',
      '```'
    ];
    if (warnings.length) {
      lines.push('', '## Warnings', ...warnings.map((warning) => `- ${warning}`));
    }
    return lines.join('\n');
  }

  return payload;
}

function buildApplyInstructions(options = {}) {
  const kernel = buildRuntimeKernel(options);
  const tasksState = kernel.artifactStates.tasks;
  const tasksText = normalizeSourceBlock(kernel.sources ? kernel.sources.tasks : '');
  const groups = parseTopLevelTaskGroups(tasksText);
  const remainingGroups = groups
    .filter((group) => group.completed !== true)
    .map((group) => ({
      title: group.title,
      pendingItems: group.pendingItems.slice(),
      completedItems: group.completedItems.slice()
    }));

  const sources = kernel.sources || collectArtifactSources(kernel.paths.changeDir);
  const checkpoint = runTaskCheckpoint({
    schemaName: kernel.schema,
    artifacts: kernel.graph.artifacts.reduce((output, artifact) => {
      output[artifact.id] = kernel.artifactStates[artifact.id].done === true;
      return output;
    }, {}),
    sources,
    config: kernel.config,
    change: kernel.changeConfig
  });

  const prerequisites = [];
  const incompleteRequiredArtifacts = kernel.graph.artifacts
    .filter((artifact) => artifact.optional !== true)
    .filter((artifact) => !(kernel.artifactStates[artifact.id] && kernel.artifactStates[artifact.id].done === true))
    .map((artifact) => artifact.id);

  incompleteRequiredArtifacts.forEach((artifactId) => {
    prerequisites.push(`${artifactId} artifact is not completed`);
  });

  if (!tasksState || tasksState.done !== true) {
    // Keep the existing message stable even though `tasks` is now also covered
    // by the generic incomplete-required-artifact pass above.
    if (!prerequisites.includes('tasks artifact is not completed')) {
      prerequisites.push('tasks artifact is not completed');
    }
  }
  if (checkpoint.status === 'BLOCK') {
    checkpoint.findings.forEach((finding) => prerequisites.push(finding.message));
  }

  const payload = {
    change: kernel.change,
    schema: kernel.schema,
    ready: prerequisites.length === 0,
    prerequisites,
    checkpoint: {
      status: checkpoint.status,
      findings: checkpoint.findings.map((finding) => ({
        severity: finding.severity,
        code: finding.code,
        patchTargets: finding.patchTargets
      }))
    },
    remainingTaskGroups: remainingGroups,
    nextTaskGroup: remainingGroups.length ? remainingGroups[0].title : null
  };

  if (options.format === 'text') {
    const lines = [
      '# Apply instructions',
      `- change: ${payload.change}`,
      `- ready: ${payload.ready ? 'yes' : 'no'}`,
      `- taskCheckpoint: ${payload.checkpoint.status}`,
      `- nextTaskGroup: ${payload.nextTaskGroup || '(none)'}`,
      '',
      '## Remaining task groups'
    ];
    if (!remainingGroups.length) {
      lines.push('- none');
    } else {
      remainingGroups.forEach((group) => {
        lines.push(`- ${group.title}`);
        group.pendingItems.forEach((item) => lines.push(`  - [ ] ${item}`));
      });
    }
    if (prerequisites.length) {
      lines.push('', '## Prerequisites', ...prerequisites.map((item) => `- ${item}`));
    }
    return lines.join('\n');
  }

  return payload;
}

module.exports = {
  RuntimeGuidanceError,
  ensureSafeChangeName,
  ensureSafeCapability,
  resolveRuntimeConfig,
  ensureSchema,
  validateSchemaGraph,
  detectArtifactCompletion,
  deriveArtifactStates,
  loadArtifactTemplateIndex,
  loadArtifactTemplate,
  buildRuntimeKernel,
  buildStatus,
  buildArtifactInstructions,
  buildApplyInstructions,
  parseTopLevelTaskGroups
};
