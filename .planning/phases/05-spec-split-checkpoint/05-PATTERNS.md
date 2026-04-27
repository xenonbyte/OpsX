# Phase 05: spec-split-checkpoint - Pattern Map

**Mapped:** 2026-04-28
**Files analyzed:** 13 target files/groups
**Analogs found:** 13 / 13

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `schemas/spec-driven/schema.json` | config/schema | transform | `schemas/spec-driven/schema.json` checkpoint entries | exact |
| `lib/spec-validator.js` | utility | transform + file-I/O | `lib/workflow.js` evidence helpers; `lib/runtime-guidance.js` Markdown parser | partial |
| `lib/workflow.js` | service/facade | transform | `lib/workflow.js` `runSpecCheckpoint()` / `buildCheckpointResult()` | exact |
| `lib/change-store.js` | store | file-I/O + CRUD | `lib/change-store.js` checkpoint persistence | exact |
| `lib/generator.js` | generator | transform | `lib/generator.js` `buildActionMarkdown()` / `buildPlatformBundle()` | exact |
| `scripts/test-workflow-runtime.js` | test | batch | `scripts/test-workflow-runtime.js` checkpoint/generator/state tests | exact |
| `skills/opsx/SKILL.md` | docs/guidance | request-response | `skills/opsx/SKILL.md` checkpoint section and execution loop | exact |
| `skills/opsx/references/action-playbooks.md` | docs/guidance | request-response | `skills/opsx/references/action-playbooks.md` common/propose/ff flow | exact |
| `skills/opsx/references/action-playbooks-zh.md` | docs/guidance | request-response | `skills/opsx/references/action-playbooks-zh.md` common/propose/ff flow | exact |
| `commands/claude/**` | generated command docs | transform | `commands/claude/opsx/propose.md` | exact |
| `commands/codex/prompts/**` | generated command docs | transform | `commands/codex/prompts/opsx-propose.md`, `opsx-continue.md`, `opsx-ff.md` | exact |
| `commands/gemini/**` | generated command docs | transform | `commands/gemini/opsx/propose.toml` | exact |
| `lib/runtime-guidance.js` (optional if status/apply surfacing changes) | service | request-response + file-I/O | `lib/runtime-guidance.js` runtime kernel/status/apply flow | role-match |

## Pattern Assignments

### `schemas/spec-driven/schema.json` (config/schema, transform)

**Analog:** `schemas/spec-driven/schema.json`

**Checkpoint entry pattern** (lines 4-34):
```json
"checkpoints": [
  {
    "id": "spec-checkpoint",
    "phase": "planning",
    "trigger": "after-design-before-tasks",
    "insertion": {
      "after": ["design"],
      "before": ["tasks"]
    },
    "states": ["PASS", "WARN", "BLOCK"]
  }
]
```

**Apply to Phase 5:** add `spec-split-checkpoint` before `spec-checkpoint`, with `phase: "planning"`, `trigger: "after-specs-before-design"`, `insertion.after: ["specs"]`, `insertion.before: ["design"]`, and the same states.

---

### `lib/spec-validator.js` (utility, transform + file-I/O)

**Analogs:** `lib/workflow.js`, `lib/runtime-guidance.js`, `skills/opsx/references/artifact-templates.md`

**CommonJS import/helper style** (`lib/workflow.js` lines 1-2; `lib/runtime-guidance.js` lines 1-10):
```javascript
const fs = require('fs');
const path = require('path');
const { loadSchema } = require('./schema');
const { hashTrackedArtifacts, detectArtifactHashDrift } = require('./change-artifacts');
```

Use local CommonJS exports and built-in `fs`/`path`; do not add a Markdown parser dependency.

**Text helper pattern** (`lib/workflow.js` lines 252-291):
```javascript
function getTextBlock(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join('\n');
  return typeof value === 'string' ? value : '';
}

function countMatches(text, regex) {
  const matches = getTextBlock(text).match(regex);
  return matches ? matches.length : 0;
}

function tokenizeText(text, options = {}) {
  const minLength = options.minLength || 3;
  return getTextBlock(text)
    .toLowerCase()
    .split(/[^a-z0-9\u4e00-\u9fff]+/g)
    .map((token) => token.trim())
    .filter(Boolean);
}
```

**Fence-aware Markdown scanning pattern** (`lib/runtime-guidance.js` lines 411-468):
```javascript
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
      current = { heading: headingMatch[1].trim(), lines: [] };
      return;
    }
  }
  if (current) current.lines.push(line);
});
```

Copy this shape for `parseSpecFile()`: keep fenced blocks separately, do not count fenced `### Requirement:` / `#### Scenario:` headings as valid requirements, and emit hidden-requirement findings for fenced normative language.

**Spec format contract** (`skills/opsx/references/artifact-templates.md` lines 21-37):
```markdown
## ADDED Requirements

### Requirement: Example requirement
The system SHALL ...

#### Scenario: Example scenario
- **WHEN** ...
- **THEN** ...
```

**Finding shape pattern** (`lib/workflow.js` lines 671-695):
```javascript
function normalizeFinding(finding = {}) {
  return {
    severity: finding.severity === 'BLOCK' ? 'BLOCK' : 'WARN',
    code: finding.code || 'workflow-check',
    message: finding.message || '',
    patchTargets: normalizePatchTargets(finding.patchTargets || finding.artifacts),
    artifacts: normalizePatchTargets(finding.artifacts || finding.patchTargets)
  };
}

function resolveCheckpointStatus(findings = []) {
  const normalized = findings.map(normalizeFinding);
  if (normalized.some((finding) => finding.severity === 'BLOCK')) return 'BLOCK';
  if (normalized.length) return 'WARN';
  return 'PASS';
}
```

**Core review finding pattern** (`lib/workflow.js` lines 1053-1083):
```javascript
if (!evidence.specs || !evidence.specs.present) {
  findings.push({
    severity: 'BLOCK',
    code: 'specs-missing',
    message: 'Specs content is required before tasks.',
    patchTargets: ['specs']
  });
}
if (evidence.specs && evidence.specs.present && scenarioCount < requirementCount) {
  findings.push({
    severity: 'BLOCK',
    code: 'scenarios-incomplete',
    message: 'Each requirement should have at least one scenario before tasks.',
    patchTargets: ['specs']
  });
}
```

**Apply to Phase 5:** expose deterministic functions such as `collectSpecSplitEvidence()`, `parseSpecFile()`, and `reviewSpecSplitEvidence()`. Findings should use stable codes and patch targets like `proposal`, `specs`, and concrete `specs/<capability>/spec.md` paths.

---

### `lib/workflow.js` (service/facade, transform)

**Analog:** `lib/workflow.js`

**Checkpoint catalog pattern** (lines 177-180):
```javascript
const REVIEW_STATES = ['required', 'recommended', 'waived', 'completed'];
const CHECKPOINT_STATES = ['PASS', 'WARN', 'BLOCK'];
const DEFAULT_CHECKPOINT_IDS = ['spec-checkpoint', 'task-checkpoint', 'execution-checkpoint'];
```

Add `spec-split-checkpoint` to the default checkpoint list so `validateCheckpointContracts()` verifies schema drift.

**Thin checkpoint wrapper pattern** (lines 1043-1083):
```javascript
function runSpecCheckpoint(options = {}) {
  const schema = resolveSchema(options);
  const findings = [];
  const review = options.review || resolveSecurityReviewState(options);
  const evidence = resolvePlanningEvidence(options);

  if (!evidence.proposal || !evidence.proposal.present) {
    findings.push({ severity: 'BLOCK', code: 'proposal-missing', message: 'Proposal content is required before tasks.', patchTargets: ['proposal'] });
  }

  appendRolloutFindings(findings, evidence);
  appendPlanningScopeFindings(findings, evidence);
  appendPlanningLegacyFindings(findings, evidence.legacy || {});

  return buildCheckpointResult(schema, 'spec-checkpoint', findings, { phase: 'planning' });
}
```

`runSpecSplitCheckpoint()` should follow this structure but delegate parser/review logic to `lib/spec-validator.js`.

**Result contract pattern** (lines 854-884):
```javascript
function buildCheckpointResult(schema, checkpointId, findings = [], extra = {}) {
  const checkpoint = getCheckpointDefinition(schema, checkpointId);
  const normalizedFindings = findings.map(normalizeFinding);
  const patchTargets = unique(normalizedFindings.flatMap((finding) => finding.patchTargets));
  const status = resolveCheckpointStatus(normalizedFindings);
  return {
    checkpoint: checkpoint.id,
    phase: checkpoint.phase || extra.phase || 'planning',
    status,
    findings: normalizedFindings,
    nextStep: extra.nextStep || buildCheckpointNextStep(checkpoint.id, status, patchTargets),
    patchTargets,
    updatesExistingArtifactsOnly: true,
    createsArtifacts: [],
    trigger: checkpoint.trigger || null,
    insertion: checkpoint.insertion || null
  };
}
```

Preserve this contract exactly for `spec-split-checkpoint`.

**Contract validation pattern** (lines 1445-1460, 1732-1735 in tests):
```javascript
DEFAULT_CHECKPOINT_IDS.forEach((checkpointId) => {
  const checkpoint = getCheckpointDefinition(schema, checkpointId);
  if (!checkpoint || checkpoint.id !== checkpointId) {
    issues.push(`Workflow validation: missing checkpoint definition \`${checkpointId}\` in schema.`);
    return;
  }
  CHECKPOINT_STATES.forEach((state) => {
    if (!Array.isArray(checkpoint.states) || !checkpoint.states.includes(state)) {
      issues.push(`Workflow validation: checkpoint \`${checkpointId}\` must declare state \`${state}\`.`);
    }
  });
});
```

**Exports pattern** (lines 1986-2005):
```javascript
module.exports = {
  ACTIONS,
  REVIEW_STATES,
  CHECKPOINT_STATES,
  normalizePlanningEvidence,
  runSpecCheckpoint,
  runTaskCheckpoint,
  runExecutionCheckpoint,
  validateCheckpointContracts
};
```

Export `runSpecSplitCheckpoint` and any needed evidence collector only if tests or runtime guidance need it.

---

### `lib/change-store.js` (store, file-I/O + CRUD)

**Analog:** `lib/change-store.js`

**Default checkpoint slots** (lines 49-53, 180-185):
```javascript
const DEFAULT_CHECKPOINTS = Object.freeze({
  spec: Object.freeze({ status: 'PENDING', updatedAt: null }),
  task: Object.freeze({ status: 'PENDING', updatedAt: null }),
  execution: Object.freeze({ status: 'PENDING', updatedAt: null })
});

function createDefaultCheckpoints() {
  return {
    spec: Object.assign({}, DEFAULT_CHECKPOINTS.spec),
    task: Object.assign({}, DEFAULT_CHECKPOINTS.task),
    execution: Object.assign({}, DEFAULT_CHECKPOINTS.execution)
  };
}
```

Add a bounded `specSplit` (or chosen normalized key) slot here.

**Normalization pattern** (lines 236-262):
```javascript
function normalizeChangeState(raw, options = {}) {
  const input = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const base = buildChangeStateSkeleton(fallbackName, options.changeDir);
  const checkpoints = input.checkpoints && typeof input.checkpoints === 'object' && !Array.isArray(input.checkpoints)
    ? input.checkpoints
    : {};

  return {
    checkpoints: {
      spec: normalizeCheckpoint(checkpoints.spec, base.checkpoints.spec),
      task: normalizeCheckpoint(checkpoints.task, base.checkpoints.task),
      execution: normalizeCheckpoint(checkpoints.execution, base.checkpoints.execution)
    }
  };
}
```

Use explicit alias normalization for canonical `spec-split-checkpoint` -> persisted `specSplit`/chosen key so state round-trips do not drop the new checkpoint.

**Write/persist pattern** (lines 350-379):
```javascript
function recordCheckpointResult(changeDir, checkpointId, result, currentHashes) {
  const checkpointKey = toNonEmptyString(checkpointId);
  if (!checkpointKey) {
    throw new Error('checkpointId is required.');
  }

  const normalizedResult = normalizeCheckpointResult(result);
  const state = loadChangeState(changeDir);
  const checkpointPayload = {
    status: normalizedResult.status || 'PENDING',
    updatedAt: now
  };

  const nextState = Object.assign({}, state, {
    checkpoints: Object.assign({}, state.checkpoints, {
      [checkpointKey]: checkpointPayload
    })
  });

  return writeChangeState(changeDir, nextState);
}
```

Do key normalization before assigning `[checkpointKey]`.

---

### `lib/generator.js` (generator, transform)

**Analog:** `lib/generator.js`

**Template fill pattern** (lines 29-50):
```javascript
function buildActionMarkdown(platform, action) {
  const template = loadTemplate('action.md.tmpl');
  const preflightLines = formatBullets(getPhaseThreePreflightLines());
  const fallbackLines = formatBullets(getActionFallbackLines(platform, action.id));
  return renderTemplate(template, {
    action: action.id,
    action_syntax: getActionSyntax(platform, action.id),
    planning_checkpoint_note: '`spec checkpoint` runs after `design` and before `tasks`; `task checkpoint` runs after `tasks` and before `apply`.',
    execution_checkpoint_note: '`execution checkpoint` runs after each top-level task group during `apply`.',
    checkpoint_state_note: CHECKPOINT_STATES.map((state) => `\`${state}\``).join(', '),
    preflight_note: preflightLines,
    fallback_note: fallbackLines
  });
}
```

Update the source note here rather than editing generated command files directly.

**Bundle generation pattern** (lines 101-127):
```javascript
function buildPlatformBundle(platform) {
  const files = {};
  const actions = getAllActions();

  if (platform === 'claude') {
    files['opsx.md'] = buildIndexMarkdown('claude', 'OpsX Workflow');
    actions.forEach((action) => {
      files[`opsx/${action.id}.md`] = buildActionMarkdown('claude', action);
    });
    return files;
  }
  // codex and gemini branches follow the same generated map pattern.
}
```

Regenerate `commands/**` from `buildPlatformBundle()` output after changing generator notes.

---

### `scripts/test-workflow-runtime.js` (test, batch)

**Analog:** `scripts/test-workflow-runtime.js`

**Import pattern** (lines 23-38):
```javascript
const {
  runExecutionCheckpoint,
  summarizeWorkflowState,
  validatePhaseOneWorkflowContract,
  validateCheckpointContracts,
  getAllActions,
  getActionSyntax
} = require('../lib/workflow');
const { buildPlatformBundle } = require('../lib/generator');
```

Add imports for `runSpecSplitCheckpoint` and the new validator module exports if they are public.

**Local test registration pattern** (lines 397-399):
```javascript
function test(name, fn) {
  tests.push({ name, fn });
}
```

**State/default checkpoint test pattern** (lines 493-509):
```javascript
test('change-store normalizes sparse Phase 2 state to Phase 4 defaults', () => {
  const { normalizeChangeState } = require('../lib/change-store');
  const normalized = normalizeChangeState({ change: 'legacy-normalize', stage: 'tasks' });

  ['spec', 'task', 'execution'].forEach((checkpointId) => {
    assert(Object.prototype.hasOwnProperty.call(normalized.checkpoints, checkpointId));
  });
});
```

Extend this to include the new normalized split-spec checkpoint key and canonical alias round-trip.

**Checkpoint validator smoke pattern** (lines 1732-1735):
```javascript
test('checkpoint contract validators remain green after runtime module integration', () => {
  assert.deepStrictEqual(validatePhaseOneWorkflowContract(), []);
  assert.deepStrictEqual(validateCheckpointContracts(), []);
});
```

**Generated parity pattern** (lines 2087-2210):
```javascript
const generatedBundles = {
  claude: buildPlatformBundle('claude'),
  codex: buildPlatformBundle('codex'),
  gemini: buildPlatformBundle('gemini')
};

Object.entries(bundleParity).forEach(([platform, parity]) => {
  assert.deepStrictEqual(parity.missing, [], `${platform} checked-in bundle is missing generated files`);
  assert.deepStrictEqual(parity.mismatched, [], `${platform} checked-in bundle content drifts from generated output`);
  assert.deepStrictEqual(parity.extra, [], `${platform} checked-in bundle has extra tracked files outside generated output`);
});
```

Add assertions that generated propose/continue/ff guidance mentions `spec-split-checkpoint` between specs and design.

---

### `skills/opsx/SKILL.md` (docs/guidance, request-response)

**Analog:** `skills/opsx/SKILL.md`

**Checkpoint guidance pattern** (lines 94-102):
```markdown
## Checkpoints

- `spec checkpoint`: after `design`, before `tasks`
- `task checkpoint`: after `tasks`, before `apply`
- `execution checkpoint`: after each top-level task group during `apply`
- Canonical checkpoint states are `PASS`, `WARN`, and `BLOCK`.
- Checkpoints do not create `spec-review.md`, `task-review.md`, or `execution-review.md`.
- When a checkpoint finds issues, update existing artifacts such as `proposal.md`, `specs/*.md`, `design.md`, `security-review.md`, or `tasks.md`.
```

Insert `spec-split-checkpoint` before the existing spec checkpoint and explicitly preserve "no `spec-review.md`".

**Execution loop pattern** (lines 115-124):
```markdown
8. Run `spec checkpoint` before entering `tasks`, and `task checkpoint` before entering `apply`.
9. During `apply`, execute one top-level task group, run `execution checkpoint`, persist verification command/result plus changed files, refresh `context.md` / `drift.md`, then stop.
10. Report changed files, current state, next step, and blockers.
```

Update this to run `spec-split-checkpoint` after specs and before design, then `spec checkpoint` before tasks.

---

### `skills/opsx/references/action-playbooks.md` (docs/guidance, request-response)

**Analog:** `skills/opsx/references/action-playbooks.md`

**Common setup pattern** (lines 5-15):
```markdown
## Common setup

1. Resolve config from change metadata, project config, then global config.
2. Apply `context` and per-artifact `rules` before writing.
3. Read `.opsx/config.yaml` and `.opsx/active.yaml` when those files exist.
4. When an active change exists, read active `state.yaml`, `context.md`, and current artifacts (`proposal.md`, `specs/`, `design.md`, optional `security-review.md`, and `tasks.md`) before mutating files.
8. Run `spec checkpoint` after `design` and before `tasks`.
9. Run `task checkpoint` after `tasks` and before `apply`.
```

Add the new specs-before-design checkpoint in this common setup.

**Route-specific planning pattern** (lines 24-29, 58-63):
```markdown
## propose

- Create a change name.
- Create `change.yaml`.
- Generate proposal, specs, design, and tasks.
- Hand off to `apply`.

## ff

- Generate all planning artifacts in dependency order.
- Record assumptions explicitly.
- Insert `security-review.md` between `design` and `tasks` when explicit config requires it or when the workflow chooses to include it after a heuristic match.
- Finish planning by passing `spec checkpoint` and `task checkpoint` before handing off to `apply`.
```

Update `propose`, `continue`, and `ff` guidance to run the split-spec checkpoint after specs are written and before design/tasks depend on them.

---

### `skills/opsx/references/action-playbooks-zh.md` (docs/guidance, request-response)

**Analog:** `skills/opsx/references/action-playbooks-zh.md`

**Chinese common setup pattern** (lines 5-15):
```markdown
## 通用前置步骤

1. 先解析 change metadata、project config、global config。
2. 在写工件前应用 `context` 和对应工件的 `rules`。
3. 在文件存在时读取 `.opsx/config.yaml` 与 `.opsx/active.yaml`。
4. 若存在 active change，修改文件前先读取该 change 的 `state.yaml`、`context.md`，以及当前工件（`proposal.md`、`specs/`、`design.md`、可选 `security-review.md`、`tasks.md`）。
8. 在 `design` 之后、`tasks` 之前运行 `spec checkpoint`。
9. 在 `tasks` 之后、`apply` 之前运行 `task checkpoint`。
```

Keep Chinese wording, but leave technical ids (`spec-split-checkpoint`, `spec checkpoint`) untranslated.

**Chinese route-specific pattern** (lines 24-29, 58-63):
```markdown
## propose

- 生成 change 名称。
- 创建 `change.yaml`。
- 一次生成 proposal、specs、design、tasks。
- 完成后交接到 `apply`。

## ff

- 按依赖顺序一次生成所有规划工件。
- 显式记录假设。
- 在显式要求或启发式命中时，将 `security-review.md` 插入到 `design` 和 `tasks` 之间。
- 在交给 `apply` 前，先通过 `spec checkpoint` 和 `task checkpoint`。
```

---

### `commands/claude/**`, `commands/codex/prompts/**`, `commands/gemini/**` (generated command docs, transform)

**Analogs:** generated propose/continue/ff command files and `lib/generator.js`

**Codex action output pattern** (`commands/codex/prompts/opsx-propose.md` lines 12-35):
```markdown
Execution rules:
- Follow the `propose` playbook from the `opsx` skill and its referenced files.
- CLI quick checks: `opsx check`, `opsx doc`, and `opsx language <en|zh>`.
- Preflight before acting:
- Read `.opsx/config.yaml` if present to confirm schema, language, and workspace rules.
- `spec checkpoint` runs after `design` and before `tasks`; `task checkpoint` runs after `tasks` and before `apply`.
- `execution checkpoint` runs after each top-level task group during `apply`.
- Checkpoint outcomes use `PASS`, `WARN`, `BLOCK` and update existing artifacts instead of creating new review files.
```

**Claude output differs only in route syntax** (`commands/claude/opsx/propose.md` lines 8-31):
```markdown
Workflow action: `propose`
Primary workflow entry: `/opsx-<action>`
Explicit action route: `/opsx-propose`
...
- `spec checkpoint` runs after `design` and before `tasks`; `task checkpoint` runs after `tasks` and before `apply`.
```

**Gemini TOML wrapper pattern** (`commands/gemini/opsx/propose.toml` lines 1-39):
```toml
description = "Create a change and generate planning artifacts in one step."
prompt = """
---
description: Create a change and generate planning artifacts in one step.
---
# OpsX route: Propose
...
"""
```

**Generated file rule:** do not hand-edit these except as regenerated outputs. Source edits belong in `lib/generator.js` and templates if the template itself must change. The runtime suite enforces parity against `buildPlatformBundle()`.

---

### `lib/runtime-guidance.js` (optional, service, request-response + file-I/O)

**Analog:** `lib/runtime-guidance.js`

**Runtime imports pattern** (lines 1-10):
```javascript
const fs = require('fs');
const path = require('path');
const { loadSchema, getSchemaPath } = require('./schema');
const { runTaskCheckpoint, resolveSecurityReviewState } = require('./workflow');
const { loadChangeState } = require('./change-store');
const { resolveContinueAction } = require('./change-state');
const { hashTrackedArtifacts, detectArtifactHashDrift } = require('./change-artifacts');
```

If status/apply guidance needs to surface the new checkpoint, import `runSpecSplitCheckpoint` beside the existing workflow import.

**Status/kernel pattern** (lines 653-748):
```javascript
function buildRuntimeKernel(options = {}) {
  const runtime = resolveRuntimeConfig(options);
  const schema = ensureSchema(schemaName, options);
  const graph = validateSchemaGraph(schema, { schemaName });
  const completion = detectArtifactCompletion({ graph, changeDir: runtime.changeDir });
  const sources = mergeRuntimeSources(options.sources, collectArtifactSources(runtime.changeDir));
  const review = resolveSecurityReviewState({ schema, config: runtime.config, change: runtime.changeConfig, artifacts: artifactPresence, sources });
  return { change: runtime.changeName, schema: graph.schema, sources, review, graph, completion, artifactStates };
}
```

**Apply-checkpoint pattern** (lines 950-1027):
```javascript
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

const payload = {
  checkpoint: {
    status: checkpoint.status,
    findings: checkpoint.findings.map((finding) => ({
      severity: finding.severity,
      code: finding.code,
      patchTargets: finding.patchTargets
    }))
  }
};
```

Use the same payload shape if exposing split-spec status in `continue`/`status` guidance.

## Shared Patterns

### Checkpoint Result Contract
**Source:** `lib/workflow.js` lines 868-884
**Apply to:** `runSpecSplitCheckpoint`, tests, status/guidance payloads

```javascript
return {
  checkpoint: checkpoint.id,
  phase: checkpoint.phase || extra.phase || 'planning',
  status,
  findings: normalizedFindings,
  nextStep: extra.nextStep || buildCheckpointNextStep(checkpoint.id, status, patchTargets),
  patchTargets,
  updatesExistingArtifactsOnly: true,
  createsArtifacts: [],
  trigger: checkpoint.trigger || null,
  insertion: checkpoint.insertion || null
};
```

### Existing Artifact Patch Targets Only
**Source:** `skills/opsx/SKILL.md` lines 99-102; `skills/opsx/references/action-playbooks.md` lines 123-125
**Apply to:** all validator/workflow findings and generated guidance

```markdown
- Checkpoints do not create `spec-review.md`, `task-review.md`, or `execution-review.md`.
- When a checkpoint finds issues, update existing artifacts such as `proposal.md`, `specs/*.md`, `design.md`, `security-review.md`, or `tasks.md`.
```

### Lifecycle Transition Reuse
**Source:** `lib/change-state.js` lines 31-45, 143-149, 230-240
**Apply to:** accepted split-spec checkpoint state advancement

```javascript
const MUTATION_EVENTS = Object.freeze({
  SPECS_ACCEPTED: 'SPECS_ACCEPTED',
  SPEC_SPLIT_ACCEPTED: 'SPEC_SPLIT_ACCEPTED',
  DESIGN_ACCEPTED: 'DESIGN_ACCEPTED'
});

SPECS_READY: Object.freeze({
  [MUTATION_EVENTS.SPEC_SPLIT_ACCEPTED]: () => ({ stage: 'SPEC_SPLIT_REVIEWED' }),
  [MUTATION_EVENTS.BLOCK]: () => ({ stage: 'BLOCKED' })
});
```

No new lifecycle engine is needed.

### Tracked Spec Artifacts
**Source:** `lib/change-artifacts.js` lines 6-21
**Apply to:** checkpoint hash refresh and drift warnings

```javascript
const TRACKED_FILES = Object.freeze([
  'proposal.md',
  'design.md',
  'security-review.md',
  'tasks.md'
]);

function isTrackedArtifactPath(relativePath) {
  const normalized = toUnixPath(relativePath);
  if (TRACKED_FILES.includes(normalized)) return true;
  return /^specs\/.+\/spec\.md$/.test(normalized);
}
```

### Generated Command Parity
**Source:** `scripts/test-workflow-runtime.js` lines 2099-2210
**Apply to:** all `commands/**` refreshes

```javascript
const generatedBundles = {
  claude: buildPlatformBundle('claude'),
  codex: buildPlatformBundle('codex'),
  gemini: buildPlatformBundle('gemini')
};

assert.deepStrictEqual(parity.missing, [], `${platform} checked-in bundle is missing generated files`);
assert.deepStrictEqual(parity.mismatched, [], `${platform} checked-in bundle content drifts from generated output`);
assert.deepStrictEqual(parity.extra, [], `${platform} checked-in bundle has extra tracked files outside generated output`);
```

### Project Config / Repo Guidance
**Source:** `AGENTS.md` lines 3-9 and `openspec/config.yaml`
**Apply to:** guidance docs and generated command wording

```markdown
- Keep `security-review.md` between `design.md` and `tasks.md` when required or recommended.
- Run `spec checkpoint` before `tasks`, `task checkpoint` before `apply`, and `execution checkpoint` after each top-level task group.
- When implementing a change, keep `proposal.md`, `specs/`, `design.md`, and `tasks.md` aligned.
```

Update this sequence by inserting `spec-split-checkpoint` before design without removing the existing gates.

## No Analog Found

No target file lacks a usable analog. `lib/spec-validator.js` has no exact existing split-spec validator, but `lib/workflow.js` and `lib/runtime-guidance.js` provide sufficient parser, finding, and checkpoint wrapper patterns.

## Metadata

**Analog search scope:** `lib/`, `schemas/`, `scripts/`, `skills/`, `templates/`, `commands/`, `openspec/config.yaml`, `AGENTS.md`
**Files scanned:** 82 files from `rg --files lib schemas scripts skills templates commands`
**Pattern extraction date:** 2026-04-28
**Project-local skills:** none found under `.claude/skills/` or `.agents/skills/`
