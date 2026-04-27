# Phase 4: Change State Machine and Drift Control - Research

**Researched:** 2026-04-27  
**Domain:** durable change-state persistence, mutation-state transitions, artifact hash drift, task-group execution checkpoints  
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

Copied from `.planning/phases/04-change-state-machine-and-drift-control/04-CONTEXT.md`. [VERIFIED: .planning/phases/04-change-state-machine-and-drift-control/04-CONTEXT.md]

### Locked Decisions

### Runtime Boundary
- **D-01:** Phase 4 is library-first. Build reusable modules for active-change loading, per-change state load/save, transition validation, artifact hashing, context capsule updates, drift ledger updates, and verification event recording.
- **D-02:** Keep public workflow execution in the generated `/opsx-*` and `$opsx-*` command/prompt surfaces. Do not implement full Node CLI equivalents for `opsx propose`, `opsx apply`, `opsx verify`, or archive execution in this phase.
- **D-03:** The Node CLI should be enhanced only where it supports state inspection and recovery, especially `opsx status` and `opsx status --json`. Any new CLI helpers must reflect on-disk state rather than acting as a second workflow engine.
- **D-04:** `opsx-new` skeleton behavior belongs in this phase, but planning should decide the narrowest implementation surface that satisfies STATE-01 without creating a broad command-execution framework.

### State Transitions
- **D-05:** Use a strict transition table for mutation actions. Invalid mutation actions should produce a blocking result rather than silently continuing.
- **D-06:** Read-only actions such as status and resume should remain readable from any stage, including missing or partial state, and should return concrete next steps instead of creating active state implicitly.
- **D-07:** Use disk-backed state as the source of truth. Commands must not rely on previous chat history when `.opsx/active.yaml`, `state.yaml`, `context.md`, and current artifacts exist.
- **D-08:** Recommended stage vocabulary for planning: `INIT`, `PROPOSAL_READY`, `SPECS_READY`, `SPEC_SPLIT_REVIEWED`, `DESIGN_READY`, `SECURITY_REVIEW_REQUIRED`, `SECURITY_REVIEWED`, `SPEC_REVIEWED`, `TASKS_READY`, `APPLYING_GROUP`, `GROUP_VERIFIED`, `IMPLEMENTED`, `VERIFIED`, `SYNCED`, `ARCHIVED`, and `BLOCKED`.

### Artifact Hash Drift
- **D-09:** Each state-aware command should compute hashes for `proposal.md`, `specs/**`, `design.md`, `security-review.md`, and `tasks.md` where present.
- **D-10:** When hashes differ from `state.yaml`, emit a visible warning and reload workflow context from disk before further action.
- **D-11:** Do not silently refresh stored hashes immediately on drift detection. Update hashes only when the current command completes its accepted checkpoint or state update.
- **D-12:** Hash drift should not by itself approve changed scope. If the drift implies new assumptions, changed scope, or missing approval, record it in `drift.md` and expose it through state warnings/blockers as appropriate.

### One-Group Apply Flow
- **D-13:** Runtime support should identify and record the active or next top-level task group from `tasks.md` and `state.yaml`.
- **D-14:** Generated `opsx-apply` command guidance should execute exactly one top-level task group by default. The Node CLI should not attempt to implement product code or automatically mark arbitrary tasks complete.
- **D-15:** After a task group, state updates should record the execution checkpoint, verification command/result, changed files summary when available, `active.taskGroup` progression, and refreshed `context.md` / `drift.md`.
- **D-16:** `opsx-continue` should route from the current state to the next valid action without re-planning unrelated work. For `APPLYING_GROUP`, continue the active group; for planning states, continue the next planning checkpoint.

### Drift and Scope Guards
- **D-17:** Phase 4 should persist `allowedPaths` and `forbiddenPaths` in `state.yaml` and surface warnings in status/apply guidance when available.
- **D-18:** Hard archive/verify enforcement for forbidden-path changes belongs to Phase 7. Phase 4 should create the durable fields and warning plumbing needed by that later gate.
- **D-19:** `drift.md` should capture new assumptions, detected scope changes, out-of-bound file changes, discovered requirements, and unresolved approval needs in a stable format that can be read by later verify/archive commands.

### Claude's Discretion
The planner may decide exact module names and function boundaries, provided the implementation stays modular and testable. The planner may decide whether `opsx-new` is implemented as a narrow CLI subcommand, a reusable library function consumed by command generation, or both, as long as STATE-01 is satisfied without adding a broad Node workflow engine.

### Deferred Ideas (OUT OF SCOPE)
- Full hard enforcement of forbidden paths, unresolved drift, and archive blocking belongs to Phase 7.
- Spec-split validation logic belongs to Phase 5.
- TDD-light checkpoint enforcement belongs to Phase 6.
- Path/glob/clean JSON release hardening belongs to Phase 8, though Phase 4 should avoid designs that make those hardening tasks difficult.
- A complete Node CLI workflow engine for propose/apply/verify/archive is out of scope for Phase 4.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| STATE-01 | `opsx-new` creates a change skeleton with `change.yaml`, `proposal.md`, `design.md`, `tasks.md`, `specs/`, `state.yaml`, `context.md`, and `drift.md`. | The repo already has change metadata and artifact templates, plus `workspace.js` scaffold writers; the missing piece is a richer state/context/drift shape and a safe skeleton creator that does not falsely mark placeholder artifacts as complete. [VERIFIED: templates/project/change-metadata.yaml.tmpl; skills/opsx/references/artifact-templates.md; lib/workspace.js; lib/runtime-guidance.js] |
| STATE-02 | Every `/opsx-*` and `$opsx-*` command reads `.opsx/config.yaml`, `.opsx/active.yaml`, the active change `state.yaml`, `context.md`, and current artifacts before acting. | Phase 3 already baked this preflight contract into `lib/workflow.js`, generated commands, and `skills/opsx`; Phase 4 must make the on-disk `state.yaml` and `context.md` contents trustworthy enough for that contract to matter. [VERIFIED: lib/workflow.js; skills/opsx/SKILL.md; commands/codex/prompts/opsx-status.md; 04-CONTEXT.md] |
| STATE-03 | Commands compute artifact hashes for `proposal.md`, `specs/**`, `design.md`, `security-review.md`, and `tasks.md`, warning and reloading when hashes drift from `state.yaml`. | Current code can already enumerate change files and compute artifact presence, but it does not persist hashes; Node's built-in hash APIs and the existing recursive file walker are enough for a deterministic Phase 4 implementation without waiting for Phase 8 glob hardening. [VERIFIED: lib/fs-utils.js; lib/runtime-guidance.js; .planning/REQUIREMENTS.md] [CITED: https://nodejs.org/api/crypto.html] |
| STATE-04 | `state.yaml` tracks stage, next action, checkpoint states, artifact paths, hashes, active task group, verification log, blockers, warnings, allowed paths, and forbidden paths. | Phase 2's `buildInitialState()` is intentionally too small and the repo-local YAML helper cannot represent the array-heavy Phase 4 shape, so planning must include both schema normalization and a real YAML library. [VERIFIED: lib/workspace.js; lib/yaml.js; .planning/REQUIREMENTS.md] [CITED: https://eemeli.org/yaml/] |
| STATE-05 | `context.md` stays bounded and contains enough current-stage context for a clean-context resume. | `context.md` is currently a migration placeholder only; Phase 4 should regenerate a compact capsule from state, task-group progress, blockers, warnings, and last verification rather than treating markdown prose as a second mutable state store. [VERIFIED: lib/workspace.js; skills/opsx/references/action-playbooks.md; 04-CONTEXT.md] |
| STATE-06 | `drift.md` records new assumptions, detected scope changes, out-of-bound file changes, discovered requirements, and unresolved approval needs. | `drift.md` already has the required headings from Phase 2 scaffolding, and Phase 4 decisions lock it as the durable ledger for warnings and approval gaps. Planning should preserve those headings and add timestamped entries under them. [VERIFIED: lib/workspace.js; .planning/phases/04-change-state-machine-and-drift-control/04-CONTEXT.md] |
| STATE-07 | `opsx-continue` resumes the next valid state-machine action without re-planning unrelated work. | Current runtime already derives `next` artifact/task guidance from artifacts and checkpoints, but it is presence-based only; Phase 4 should route `continue` from normalized persisted stage plus current artifact/hash state. [VERIFIED: lib/runtime-guidance.js; lib/workflow.js; skills/opsx/references/action-playbooks.md] |
| STATE-08 | `opsx-apply` defaults to exactly one top-level task group per run and records an execution checkpoint afterward. | The repo already parses top-level task groups and runs `execution-checkpoint`; Phase 4 should reuse those helpers, persist active/next group in state, and add verification-log/drift/context writes after each completed group. [VERIFIED: lib/runtime-guidance.js; lib/workflow.js; skills/opsx/references/action-playbooks.md; scripts/test-workflow-runtime.js] |
</phase_requirements>

## Project Constraints (from AGENTS.md)

- Read `openspec/config.yaml` for project context and workflow defaults. [VERIFIED: AGENTS.md; openspec/config.yaml]
- Keep `security-review.md` between `design.md` and `tasks.md` when required or recommended. [VERIFIED: AGENTS.md; schemas/spec-driven/schema.json; lib/workflow.js]
- Run `spec checkpoint` before `tasks`, `task checkpoint` before `apply`, and `execution checkpoint` after each top-level task group. [VERIFIED: AGENTS.md; schemas/spec-driven/schema.json; lib/workflow.js]
- Keep `proposal.md`, `specs/`, `design.md`, and `tasks.md` aligned during implementation. [VERIFIED: AGENTS.md; skills/opsx/SKILL.md]
- These authoring constraints sit alongside the Phase 2 and Phase 4 runtime decision that `.opsx/` is the on-disk workflow surface for commands and state recovery; planning should not re-open that path decision. [VERIFIED: AGENTS.md; .planning/phases/04-change-state-machine-and-drift-control/04-CONTEXT.md; lib/constants.js]

## Summary

Phase 4 is not starting from zero: the repository already has artifact-graph logic, checkpoint validators, task-group parsing, migration-time `state.yaml` scaffolds, and explicit prompt preflight rules. The actual gap is that none of those pieces persist lifecycle truth yet; `buildRuntimeKernel()` and `buildStatus()` still infer progress from file presence, which will break immediately once `opsx-new` starts creating placeholder `proposal.md`, `design.md`, and `tasks.md` skeletons. Planning therefore has to decouple "artifact file exists" from "artifact stage has been accepted" before wiring any new skeleton creator. [VERIFIED: lib/runtime-guidance.js; lib/workspace.js; skills/opsx/references/artifact-templates.md; .planning/REQUIREMENTS.md]

The cleanest library-first approach is to model mutating actions with XState v5 pure transition functions and keep status/resume as read-only selectors over normalized disk state. XState's pure `initialTransition()` and `transition()` APIs are explicitly designed to compute next state and emitted actions without a live actor or side effects, which matches the user constraint to avoid building a full Node execution engine. XState's persistence docs also warn that restored actor state can become incompatible when machine logic changes, so Phase 4 should persist a small domain-shaped `state.yaml` rather than raw actor internals. [VERIFIED: npm registry] [CITED: https://dev.stately.ai/docs/pure-transitions] [CITED: https://stately.ai/docs/persistence]

The second hard blocker is serialization. Phase 2's repo-local `lib/yaml.js` only handles object mappings and block scalars; it has no sequence parser and `stringifyYaml()` returns an empty string for arrays. That is incompatible with Phase 4's required `verificationLog`, `blockers`, `warnings`, `allowedPaths`, and `forbiddenPaths` collections. Use `yaml@2.8.3` for `state.yaml` and `active.yaml`, keep `context.md` and `drift.md` as generated markdown sidecars, and reuse Node's built-in `crypto.createHash('sha256')` for deterministic artifact digests. [VERIFIED: lib/yaml.js; npm registry] [CITED: https://eemeli.org/yaml/] [CITED: https://nodejs.org/api/crypto.html]

`npm run test:workflow-runtime` currently passes 31/31 and already covers artifact readiness, checkpoints, migration scaffolds, status truthfulness, and generated command parity, so the phase should extend that existing harness instead of introducing a second test framework. [VERIFIED: scripts/test-workflow-runtime.js; npm run test:workflow-runtime]

**Primary recommendation:** plan Phase 4 as four bounded deliverables: `yaml`-backed state store and normalizer, XState pure mutation machine, hash/context/drift services, and consumer integrations across `opsx-new`, status/resume/continue/apply guidance, generated prompts, and the existing runtime regression suite. [VERIFIED: lib/runtime-guidance.js; lib/workspace.js; lib/workflow.js; skills/opsx/SKILL.md] [CITED: https://dev.stately.ai/docs/pure-transitions] [CITED: https://eemeli.org/yaml/]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Active change discovery and normalized state load | Filesystem / Storage | CLI / Local Runtime | `.opsx/active.yaml`, `change.yaml`, and `state.yaml` are disk-backed workflow truth, so read/normalize logic belongs in a storage-focused service rather than prompt text or CLI switches. [VERIFIED: lib/workspace.js; lib/config.js; 04-CONTEXT.md] |
| Mutation transition validation for `new`, `propose`, `ff`, `continue`, and `apply` | CLI / Local Runtime | Filesystem / Storage | Transition selection and checkpoint integration are runtime rules, but they must operate on persisted storage state and write back only accepted next snapshots. [VERIFIED: lib/workflow.js; lib/runtime-guidance.js; 04-CONTEXT.md] [CITED: https://dev.stately.ai/docs/pure-transitions] |
| Read-only `status` and `resume` summaries | CLI / Local Runtime | Filesystem / Storage | These actions must stay non-mutating from any partial state, so they should be selectors over normalized storage plus artifact inspection, not machine events that rewrite state. [VERIFIED: lib/cli.js; lib/runtime-guidance.js; skills/opsx/references/action-playbooks.md; 04-CONTEXT.md] |
| Artifact hash and drift detection | Filesystem / Storage | CLI / Local Runtime | Hashes are derived from files on disk; warnings and reload behavior are runtime responses to that storage comparison. [VERIFIED: lib/fs-utils.js; .planning/REQUIREMENTS.md; 04-CONTEXT.md] [CITED: https://nodejs.org/api/crypto.html] |
| Context capsule and drift ledger generation | Filesystem / Storage | CLI / Local Runtime | `context.md` and `drift.md` are durable sidecars written beside `state.yaml`; they should be synthesized from runtime state and artifact inspection, not authored independently. [VERIFIED: lib/workspace.js; .planning/REQUIREMENTS.md; 04-CONTEXT.md] |
| Prompt/skill preflight alignment | Static Prompts / Skills | CLI / Local Runtime | The generated `/opsx-*` and `$opsx-*` surfaces already require state reads before acting, so Phase 4 must refresh those static instructions once the new durable state model exists. [VERIFIED: lib/workflow.js; skills/opsx/SKILL.md; commands/codex/prompts/opsx-apply.md] |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js runtime | `>=14.14.0` in-project; local machine `v24.8.0` | Runs the CLI, synchronous file I/O, hashing, and regression suite. | The package already targets Node `>=14.14.0`, and the local environment exceeds that floor, so Phase 4 can use built-in `fs`, `path`, and `crypto` APIs without changing the engine contract. [VERIFIED: package.json; node --version] |
| `xstate` | `5.31.0` published 2026-04-27 | Strict mutation transition table with guards, deterministic next-state computation, and optional state restoration helpers. | XState v5 documents pure `initialTransition()` and `transition()` functions that compute next state and actions without a live actor, which is exactly the library-first/non-engine pattern this phase needs. [VERIFIED: npm registry] [CITED: https://stately.ai/docs/xstate] [CITED: https://dev.stately.ai/docs/pure-transitions] |
| `yaml` | `2.8.3` published 2026-03-21 | Parse and write `active.yaml` / `state.yaml` with arrays, nested objects, and comment-preserving document edits. | The official docs expose both simple parse/stringify APIs and `parseDocument()` for richer edits, while the current repo-local parser cannot represent the required Phase 4 shape. [VERIFIED: npm registry; lib/yaml.js] [CITED: https://eemeli.org/yaml/] |
| `node:crypto` | bundled with Node | Stable SHA-256 hashing for artifacts and task-group drift snapshots. | Node's built-in `createHash()`, `hash.update()`, and `hash.digest()` provide the required cryptographic digests without adding another dependency or hand-rolling checksums. [CITED: https://nodejs.org/api/crypto.html] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `lib/workflow.js` | repo-local | Existing security-review state resolution, checkpoint engines, top-level task-group parsing, and next-step wording. | Reuse for `task-checkpoint`, `execution-checkpoint`, and task-group completion logic instead of duplicating that reasoning in the new state-machine layer. [VERIFIED: lib/workflow.js] |
| `lib/runtime-guidance.js` | repo-local | Existing artifact graph, read-model summaries, and `buildApplyInstructions()` / `buildStatus()` output shapes. | Keep it as the read model, but change it to consume normalized persisted state rather than treating file presence as the only lifecycle truth. [VERIFIED: lib/runtime-guidance.js] |
| `scripts/test-workflow-runtime.js` | repo-local | Current Node `assert`-based integration/regression harness. | Extend this script with state normalization, drift, `opsx-new`, and one-group apply cases; do not introduce Jest/Vitest for a one-file custom harness. [VERIFIED: scripts/test-workflow-runtime.js; npm run test:workflow-runtime] |
| `lib/fs-utils.js` | repo-local | Recursive file enumeration and simple write helpers. | Reuse its sorted `listFiles()` walker for fixed artifact hashing; add an atomic write helper rather than replacing the module wholesale. [VERIFIED: lib/fs-utils.js] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `xstate@5.31.0` | `robot3@1.2.0` | `robot3` is smaller, but XState is the only candidate verified here with official pure-transition docs, guard composition docs, and explicit persistence caveats that map directly to Phase 4's needs. [VERIFIED: npm registry] [CITED: https://dev.stately.ai/docs/pure-transitions] [CITED: https://stately.ai/docs/guards] |
| `xstate@5.31.0` | `javascript-state-machine@3.1.0` | `javascript-state-machine` is mature, but the registry metadata here shows it is older and it does not provide the same documented pure transition/persistence model needed for resumable disk-backed workflows. [VERIFIED: npm registry] |
| `yaml@2.8.3` | Extend `lib/yaml.js` | The current parser has no sequence support and no document-level editing model, so extending it would be hand-rolling the exact infrastructure this phase is trying to avoid. [VERIFIED: lib/yaml.js] [CITED: https://eemeli.org/yaml/] |
| Existing sorted file walker + prefix filters | `fast-glob@3.3.3` | `fast-glob` is current and well-documented, but Phase 4 only needs deterministic hashing for a fixed artifact set; the current recursive walker is sufficient until Phase 8's broader path/glob hardening. [VERIFIED: npm registry; lib/fs-utils.js; .planning/REQUIREMENTS.md] [CITED: https://www.npmjs.com/package/fast-glob] |

**Installation:**
```bash
npm install xstate yaml
```

**Version verification:** `xstate@5.31.0` was verified against the npm registry and published on 2026-04-27; `yaml@2.8.3` was verified against the npm registry and published on 2026-03-21. [VERIFIED: npm registry]

## Architecture Patterns

### System Architecture Diagram

```text
User route or CLI action
  |
  v
Preflight loader
  read .opsx/config.yaml
  -> read .opsx/active.yaml
  -> read change.yaml / state.yaml / context.md
  -> inspect current artifacts
  |
  +--> Read-only selector path (`status`, `resume`)
  |      |
  |      +--> normalize legacy scaffold state
  |      +--> inspect checkpoints / task groups / warnings
  |      '--> render next-step summary without writes
  |
  '--> Mutation path (`new`, `propose`, `ff`, `continue`, `apply`)
         |
         +--> normalize legacy scaffold state
         +--> compute artifact hashes and compare with stored hashes
         +--> warn + reload if drift detected
         +--> run XState pure transition for the requested event
         +--> run checkpoint / task-group integration
         +--> persist updated active.yaml + state.yaml
         +--> regenerate context.md + drift.md
         '--> return warnings, blockers, and next action

Static alignment boundary:
  lib/workflow.js / generator / skills / commands
    -> keep prompt preflight and fallback wording aligned with the on-disk state model
```

The diagram is prescriptive: read-only commands stay selector-only, mutating commands pass through normalized state + hash check + transition validation, and markdown sidecars are outputs of accepted state writes rather than independent sources of truth. [VERIFIED: lib/runtime-guidance.js; lib/workflow.js; skills/opsx/SKILL.md; 04-CONTEXT.md] [CITED: https://dev.stately.ai/docs/pure-transitions]

### Recommended Project Structure

```text
lib/
├── change-state.js      # stage enum, transition events, state normalizer, mutation machine
├── change-store.js      # load/save active.yaml and state.yaml, atomic writes, schema upgrades
├── change-artifacts.js  # artifact inventory, top-level task groups, stable hash computation
├── change-capsule.js    # context.md synthesis and drift.md append/update helpers
├── runtime-guidance.js  # read-only selectors consume normalized state
├── workflow.js          # existing checkpoints and security-review logic
├── workspace.js         # canonical paths and skeleton creation helpers
└── cli.js               # status/new-facing thin entrypoints only
```

This layout keeps path helpers and existing read/checkpoint logic in place while isolating the new persistent-state responsibilities into focused modules. `lib/cli.js` remains thin, which matches the Phase 4 boundary decision. [VERIFIED: lib/cli.js; lib/workspace.js; lib/runtime-guidance.js; lib/workflow.js; 04-CONTEXT.md]

### Recommended State Shapes

Use a normalized, human-readable domain shape on disk rather than raw XState actor internals. This keeps `state.yaml` reviewable, compatible with Phase 2 scaffolds, and independent of XState's internal snapshot schema. [VERIFIED: lib/workspace.js; .planning/REQUIREMENTS.md] [CITED: https://stately.ai/docs/persistence]

```yaml
# .opsx/active.yaml
version: 1
activeChange: demo-change
updatedAt: 2026-04-27T14:00:00.000Z

# .opsx/changes/<change>/state.yaml
version: 1
change: demo-change
stage: INIT
nextAction: opsx-propose
artifacts:
  proposal:
    path: proposal.md
    sha256: ""
    present: true
  specs:
    baseDir: specs
    files: []
    sha256: ""
  design:
    path: design.md
    sha256: ""
    present: true
  securityReview:
    path: security-review.md
    sha256: ""
    present: false
  tasks:
    path: tasks.md
    sha256: ""
    present: true
checkpoints:
  spec:
    status: PENDING
    updatedAt: ""
  task:
    status: PENDING
    updatedAt: ""
  execution:
    status: PENDING
    updatedAt: ""
    lastTaskGroup: ""
active:
  taskGroup:
    id: ""
    title: ""
    index: 0
verificationLog: []
blockers: []
warnings: []
allowedPaths: []
forbiddenPaths: []
updatedAt: 2026-04-27T14:00:00.000Z
```

Recommended `context.md` shape: one bounded capsule with stage, next action, active/next task group, unresolved blockers, warnings, last verification, and artifact hash status. Recommended `drift.md` shape: keep the Phase 2 headings and append timestamped bullets under each section instead of inventing a second schema file. [VERIFIED: lib/workspace.js; .planning/phases/02-opsx-workspace-and-migration/02-CONTEXT.md; .planning/phases/04-change-state-machine-and-drift-control/04-CONTEXT.md]

### Pattern 1: Normalize Legacy Phase 2 Scaffolds Before Any Decision

**What:** Treat Phase 2 `state.yaml` files as sparse input, not as the final Phase 4 schema. Fill missing arrays/maps/defaults in memory before computing next action or hashes. [VERIFIED: lib/workspace.js; .planning/phases/02-opsx-workspace-and-migration/02-CONTEXT.md]

**When to use:** Every read of `state.yaml`, including `status` and `resume`. [VERIFIED: 04-CONTEXT.md; lib/runtime-guidance.js]

**Example:**
```javascript
// Source: local Phase 2 scaffold shape + Phase 4 requirement shape
function normalizeState(raw = {}, changeName) {
  return {
    version: raw.version || 1,
    change: raw.change || changeName,
    stage: raw.stage || 'INIT',
    nextAction: raw.nextAction || 'opsx-propose',
    artifacts: raw.artifacts || {},
    checkpoints: raw.checkpoints || {},
    verificationLog: Array.isArray(raw.verificationLog) ? raw.verificationLog : [],
    blockers: Array.isArray(raw.blockers) ? raw.blockers : [],
    warnings: Array.isArray(raw.warnings) ? raw.warnings : [],
    allowedPaths: Array.isArray(raw.allowedPaths) ? raw.allowedPaths : [],
    forbiddenPaths: Array.isArray(raw.forbiddenPaths) ? raw.forbiddenPaths : []
  };
}
```

### Pattern 2: Use XState Pure Transitions for Mutations Only

**What:** Use `transition(machine, state, event)` to validate and compute next state for mutating actions, then apply side effects outside the machine. Keep `status` and `resume` as selectors, not events. [CITED: https://dev.stately.ai/docs/pure-transitions] [VERIFIED: 04-CONTEXT.md]

**When to use:** `new`, `propose`, `ff`, `continue`, `apply`, and accepted checkpoint writes. [VERIFIED: .planning/REQUIREMENTS.md; 04-CONTEXT.md]

**Example:**
```javascript
// Source: XState pure transition docs
const { createMachine, transition } = require('xstate');

const machine = createMachine({
  initial: 'INIT',
  states: {
    INIT: {
      on: {
        PROPOSAL_ACCEPTED: { target: 'PROPOSAL_READY' }
      }
    },
    PROPOSAL_READY: {}
  }
});

const restored = machine.resolveState({
  value: state.stage,
  context: state
});
const [nextState, actions] = transition(machine, restored, {
  type: 'PROPOSAL_ACCEPTED'
});
```

### Pattern 3: Hash First, Warn + Reload, Then Transition

**What:** Compute fresh artifact hashes before any mutation, compare with stored hashes, and if drift exists, emit warnings and rebuild the in-memory read model from disk before deciding the next mutation. Only persist refreshed hashes after the current command completes an accepted checkpoint or state write. [VERIFIED: 04-CONTEXT.md] [CITED: https://nodejs.org/api/crypto.html]

**When to use:** Every state-aware command except empty-workspace fallbacks. [VERIFIED: .planning/REQUIREMENTS.md; skills/opsx/SKILL.md]

**Example:**
```javascript
// Source: Node crypto docs + project file walker pattern
const fs = require('fs');
const path = require('path');
const { createHash } = require('node:crypto');

function hashFiles(changeDir, relativeFiles) {
  const hash = createHash('sha256');
  for (const relativePath of relativeFiles.slice().sort()) {
    hash.update(relativePath);
    hash.update('\0');
    hash.update(fs.readFileSync(path.join(changeDir, relativePath)));
    hash.update('\0');
  }
  return hash.digest('hex');
}
```

### Pattern 4: Generate `context.md` from State, Not from Chat Memory

**What:** Treat `context.md` as a bounded derived capsule written after accepted state changes, not as freeform notes that the runtime later tries to parse. [VERIFIED: .planning/REQUIREMENTS.md; lib/workspace.js; 04-CONTEXT.md]

**When to use:** After `opsx-new`, after any accepted artifact checkpoint, and after each completed task group. [VERIFIED: .planning/REQUIREMENTS.md; 04-CONTEXT.md]

**Example:**
```markdown
# Context Capsule

- Change: demo-change
- Stage: APPLYING_GROUP
- Next action: Continue task group `2. Runtime integration`

## Active Task Group
- Current: 2. Runtime integration
- Remaining groups: 3

## Blockers
- None

## Last Verification
- 2026-04-27T14:00:00Z `npm run test:workflow-runtime` PASS
```

### Pattern 5: Use `yaml` Document APIs for Incremental State Edits

**What:** Parse YAML documents as documents, update specific keys, and stringify back, rather than rebuilding the entire object via an incomplete homegrown parser. [VERIFIED: lib/yaml.js] [CITED: https://eemeli.org/yaml/]

**When to use:** `active.yaml` pointer updates, `state.yaml` warnings/blockers/log entries, and any future comment-preserving edits. [VERIFIED: .planning/REQUIREMENTS.md]

**Example:**
```javascript
// Source: yaml Document API docs
const fs = require('fs');
const { parseDocument } = require('yaml');

const doc = parseDocument(fs.readFileSync(statePath, 'utf8'));
doc.set('warnings', [...(doc.get('warnings') || []), 'artifact hash drift detected']);
fs.writeFileSync(statePath, `${String(doc)}\n`, 'utf8');
```

### Anti-Patterns to Avoid

- **Presence-as-completion logic:** If `opsx-new` creates placeholder `design.md` and `tasks.md`, the current `detectArtifactCompletion()` logic will report them as done. Phase 4 must stop using raw file presence as the sole lifecycle signal. [VERIFIED: lib/runtime-guidance.js; lib/workspace.js]
- **Ad hoc extensions to `lib/yaml.js`:** Adding one-off array parsing for `verificationLog` or `allowedPaths` will keep growing a partial YAML parser. Replace it for state files instead. [VERIFIED: lib/yaml.js] [CITED: https://eemeli.org/yaml/]
- **Persisting raw XState actor snapshots in YAML:** XState supports persisted snapshots, but its docs explicitly warn about incompatible restored state when logic changes. Persist domain state, not internal machine state. [CITED: https://stately.ai/docs/persistence]
- **Updating stored hashes immediately on drift detection:** That would erase evidence of unreviewed artifact edits and violate the locked Phase 4 policy. [VERIFIED: 04-CONTEXT.md]
- **Letting `status` or `resume` write state implicitly:** Read-only actions must remain readable from empty or partial state and must not create `.opsx/active.yaml` or new checkpoints. [VERIFIED: 04-CONTEXT.md; skills/opsx/references/action-playbooks.md]
- **Writing state/capsule files non-atomically:** `writeText()` currently writes directly. Durable state updates should write a temp file in the same directory and `renameSync()` it into place so half-written files do not become the recovery source. [VERIFIED: lib/fs-utils.js] [CITED: https://nodejs.org/api/fs.html]

## Plan Slicing Recommendations

1. **Wave 0: contract and failing tests**  
   Add regression cases that prove placeholder files do not equal accepted stages, sparse Phase 2 states normalize correctly, and hash drift warns without silently updating stored digests. This is the safest first slice because it locks the biggest semantic gap before module churn. [VERIFIED: lib/runtime-guidance.js; lib/workspace.js; scripts/test-workflow-runtime.js]
2. **Wave 1: state store and serializer**  
   Introduce `yaml`-backed load/save helpers, atomic write support, and state normalization for `active.yaml` / `state.yaml`. Do not touch generated prompts yet. [VERIFIED: lib/yaml.js; lib/fs-utils.js; 04-CONTEXT.md] [CITED: https://eemeli.org/yaml/]
3. **Wave 2: mutation machine and read selectors**  
   Add XState pure transitions for mutating actions and adapt `runtime-guidance.js` / `status` selectors to consume normalized persisted stage, checkpoint, and task-group data. [VERIFIED: lib/runtime-guidance.js; lib/workflow.js] [CITED: https://dev.stately.ai/docs/pure-transitions]
4. **Wave 3: hash, context, drift, and one-group apply**  
   Implement artifact hashing, warn+reload plumbing, `context.md` synthesis, `drift.md` updates, and execution-checkpoint persistence for exactly one top-level task group. [VERIFIED: 04-CONTEXT.md; lib/workflow.js; lib/runtime-guidance.js]
5. **Wave 4: surface integration**  
   Wire `opsx-new`, richer `opsx status`, and prompt/skill/generated-command wording so the public workflow surfaces accurately describe the new durable state behavior. [VERIFIED: lib/cli.js; lib/workflow.js; skills/opsx/SKILL.md; commands/codex/prompts/opsx-new.md]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Rich YAML parsing and document edits | A bespoke array/comment-aware extension of `lib/yaml.js` | `yaml@2.8.3` | Phase 4 needs arrays and nested document edits, and the official library already supports parse/stringify plus `parseDocument()`. [VERIFIED: lib/yaml.js; npm registry] [CITED: https://eemeli.org/yaml/] |
| Mutation transition engine | A long `switch` / nested `if` table that mixes state validation and side effects | `xstate@5.31.0` pure transitions | XState pure transitions give deterministic guards and next-state computation without creating a live actor or a broad execution engine. [VERIFIED: npm registry] [CITED: https://dev.stately.ai/docs/pure-transitions] |
| Artifact digests | Homegrown checksum logic or non-cryptographic hashes | `node:crypto.createHash('sha256')` | The built-in crypto APIs are stable, portable, and already support incremental updates over sorted file content. [CITED: https://nodejs.org/api/crypto.html] |
| New test framework | A second test runner just for Phase 4 | Existing `scripts/test-workflow-runtime.js` harness | The repo already has a fast assert-based suite with temp fixtures, CLI spawning, and command-parity checks; duplicating that would increase drift. [VERIFIED: scripts/test-workflow-runtime.js; npm run test:workflow-runtime] |

**Key insight:** the parts most likely to cause Phase 4 regressions are serializer gaps and lifecycle semantics, not raw file I/O. Spend new complexity on state normalization and transition clarity, not on re-creating parser or test infrastructure that the ecosystem already solved. [VERIFIED: lib/yaml.js; lib/runtime-guidance.js; scripts/test-workflow-runtime.js] [CITED: https://dev.stately.ai/docs/pure-transitions] [CITED: https://eemeli.org/yaml/]

## Common Pitfalls

### Pitfall 1: Placeholder Files Get Treated as Completed Planning
**What goes wrong:** `opsx-new` creates template files and the runtime immediately thinks planning is done because the files exist. [VERIFIED: lib/runtime-guidance.js; skills/opsx/references/artifact-templates.md]  
**Why it happens:** `detectArtifactCompletion()` only checks whether matching files exist. [VERIFIED: lib/runtime-guidance.js]  
**How to avoid:** Make persisted stage/checkpoint data authoritative for lifecycle progression; treat file presence as supporting evidence only. [VERIFIED: 04-CONTEXT.md]  
**Warning signs:** `status` shows `design` or `tasks` as done right after `opsx-new`, or `continue` jumps straight to `apply`. [VERIFIED: lib/runtime-guidance.js; .planning/REQUIREMENTS.md]

### Pitfall 2: Phase 2 Sparse States Break Phase 4 Readers
**What goes wrong:** migrated repos have minimal `state.yaml` content and Phase 4 code crashes or misroutes because arrays/maps/checkpoints are missing. [VERIFIED: lib/workspace.js; .planning/phases/02-opsx-workspace-and-migration/02-CONTEXT.md]  
**Why it happens:** Phase 2 explicitly created honest scaffolds, not the full Phase 4 schema. [VERIFIED: .planning/phases/02-opsx-workspace-and-migration/02-CONTEXT.md]  
**How to avoid:** Normalize on every read, preserve compatibility defaults, and only write the richer shape after an accepted Phase 4 state update. [VERIFIED: lib/workspace.js; 04-CONTEXT.md]  
**Warning signs:** `status` or `resume` fails only on migrated changes while new changes behave correctly. [VERIFIED: lib/workspace.js; lib/cli.js]

### Pitfall 3: Drift Detection Silently Accepts Unreviewed Artifact Edits
**What goes wrong:** a command notices drift, rewrites stored hashes immediately, and future commands stop warning even though no checkpoint reviewed the change. [VERIFIED: 04-CONTEXT.md]  
**Why it happens:** hash storage is updated as part of reload rather than as part of accepted state advancement. [VERIFIED: 04-CONTEXT.md]  
**How to avoid:** split drift inspection from accepted writes; warn + reload first, refresh stored hashes only after checkpoint/state acceptance. [VERIFIED: 04-CONTEXT.md]  
**Warning signs:** `drift.md` stays empty even after manual artifact edits, or warnings disappear after running `status`. [VERIFIED: .planning/REQUIREMENTS.md; 04-CONTEXT.md]

### Pitfall 4: `context.md` Becomes a Second Mutable State Store
**What goes wrong:** state is updated in YAML but `context.md` lags behind or is manually edited into contradiction. [VERIFIED: lib/workspace.js; .planning/REQUIREMENTS.md]  
**Why it happens:** freeform markdown is easy to change independently from machine state. [VERIFIED: lib/workspace.js]  
**How to avoid:** regenerate a bounded capsule from normalized state and verification logs after each accepted mutation; do not parse business logic back out of `context.md`. [VERIFIED: 04-CONTEXT.md]  
**Warning signs:** `status` and `resume` disagree on active task group, blockers, or next action. [VERIFIED: lib/runtime-guidance.js; skills/opsx/references/action-playbooks.md]

### Pitfall 5: Raw XState Persistence Leaks Machine Internals onto Disk
**What goes wrong:** `state.yaml` stores an opaque actor snapshot that becomes hard to review and brittle across machine changes. [CITED: https://stately.ai/docs/persistence]  
**Why it happens:** XState supports persisted snapshots, but those are machine-internal state, not a stable human-facing contract. [CITED: https://stately.ai/docs/persistence]  
**How to avoid:** store only domain fields on disk (`stage`, `nextAction`, `checkpoints`, `active.taskGroup`, hashes, warnings, logs) and reconstruct the XState snapshot in memory. [VERIFIED: .planning/REQUIREMENTS.md; 04-CONTEXT.md]  
**Warning signs:** YAML files contain nested XState-specific node metadata or restored state breaks after adding a new stage. [CITED: https://stately.ai/docs/persistence]

## Code Examples

Verified patterns from official sources:

### Mutation Transition Without a Live Actor
```javascript
// Source: https://dev.stately.ai/docs/pure-transitions
const { createMachine, transition } = require('xstate');

const changeMachine = createMachine({
  initial: 'TASKS_READY',
  states: {
    TASKS_READY: {
      on: {
        START_GROUP: { target: 'APPLYING_GROUP' }
      }
    },
    APPLYING_GROUP: {
      on: {
        GROUP_CHECKPOINT_PASS: { target: 'GROUP_VERIFIED' }
      }
    },
    GROUP_VERIFIED: {}
  }
});

const restored = changeMachine.resolveState({
  value: state.stage,
  context: state
});
const [nextState, actions] = transition(changeMachine, restored, {
  type: 'START_GROUP'
});
```

### YAML Document Update for Array Fields
```javascript
// Source: https://eemeli.org/yaml/
const fs = require('fs');
const { parseDocument } = require('yaml');

function appendWarning(statePath, warning) {
  const doc = parseDocument(fs.readFileSync(statePath, 'utf8'));
  const current = doc.get('warnings') || [];
  doc.set('warnings', [...current, warning]);
  fs.writeFileSync(statePath, `${String(doc)}\n`, 'utf8');
}
```

### Stable Artifact Hashing
```javascript
// Source: https://nodejs.org/api/crypto.html
const fs = require('fs');
const path = require('path');
const { createHash } = require('node:crypto');

function digestArtifactSet(changeDir, files) {
  const hash = createHash('sha256');
  for (const relativePath of files.slice().sort()) {
    hash.update(relativePath);
    hash.update('\0');
    hash.update(fs.readFileSync(path.join(changeDir, relativePath)));
    hash.update('\0');
  }
  return hash.digest('hex');
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Live actor or ad hoc runtime flow to compute state changes | XState pure `initialTransition()` / `transition()` helpers for side-effect-free next-state computation | XState v5 pure-transition docs describe this current API; transitions page notes the `transition()` flow for XState v5.19.0+ behavior. [VERIFIED: npm registry] [CITED: https://dev.stately.ai/docs/pure-transitions] [CITED: https://stately.ai/docs/transitions] | Phase 4 can stay library-first and deterministic without turning `opsx` into a long-running workflow engine. |
| Mapping-only YAML helpers for simple config files | `yaml` v2 document APIs for nested collections and incremental edits | Current docs are for `yaml@2` and expose `parseDocument()` plus document mutation APIs. [VERIFIED: npm registry] [CITED: https://eemeli.org/yaml/] | `state.yaml` can safely hold arrays/logs/path lists without expanding a homegrown parser. |
| Artifact-file presence as workflow truth | Persisted stage/checkpoint/task-group state plus hash drift warnings | This is the project-specific Phase 4 shift required by STATE-01 through STATE-08. [VERIFIED: .planning/REQUIREMENTS.md; lib/runtime-guidance.js; 04-CONTEXT.md] | Placeholder skeleton files stop short-circuiting the workflow, and resume logic can survive context compaction. |

**Deprecated/outdated:**
- `lib/yaml.js` as the sole state serializer for Phase 4 is outdated for this phase's array-heavy schema. [VERIFIED: lib/yaml.js; .planning/REQUIREMENTS.md]
- File presence alone as the lifecycle source of truth is outdated once `opsx-new` creates placeholder planning artifacts. [VERIFIED: lib/runtime-guidance.js; lib/workspace.js; .planning/REQUIREMENTS.md]

## Assumptions Log

No `[ASSUMED]` claims were required for this research; all material claims were verified from local code, the npm registry, or official documentation.

## Open Questions

1. **Should Phase 4 expose a narrow `opsx new` CLI subcommand, or only a reusable library function consumed by prompts and tests?**  
   What we know: `lib/cli.js` currently exposes `status` but not `new`, and the locked context explicitly leaves the narrow implementation surface to planner discretion. [VERIFIED: lib/cli.js; 04-CONTEXT.md]  
   What's unclear: whether local smoke testing and operator ergonomics justify a thin CLI entry now. [VERIFIED: lib/cli.js; 04-CONTEXT.md]  
   Recommendation: implement a reusable `createChangeSkeleton()` library first, then add a thin CLI wrapper only if the plan needs it for manual verification. [VERIFIED: 04-CONTEXT.md]

2. **Should `state.yaml` keep `version: 1` with richer normalized fields, or bump the schema version during Phase 4?**  
   What we know: Phase 2 scaffolds already write `version: 1`, and no current runtime reader appears to branch on that version. [VERIFIED: lib/workspace.js; scripts/test-workflow-runtime.js]  
   What's unclear: whether the planner wants an explicit one-time upgrade marker or a silent in-memory normalizer. [VERIFIED: lib/workspace.js]  
   Recommendation: normalize sparse v1 records on read and keep `version: 1` unless a dedicated upgrade task is explicitly planned; that is the least disruptive path for migrated repos. [VERIFIED: lib/workspace.js; .planning/phases/02-opsx-workspace-and-migration/02-CONTEXT.md]

3. **What should `opsx-new` create inside `specs/` when no capability name is known yet?**  
   What we know: STATE-01 requires a `specs/` skeleton, while the current template expects `specs/<capability>/spec.md`. [VERIFIED: .planning/REQUIREMENTS.md; skills/opsx/references/artifact-templates.md]  
   What's unclear: whether a stub capability file should be invented without user scope. [VERIFIED: skills/opsx/references/artifact-templates.md]  
   Recommendation: create the `specs/` directory only, and let `continue` / `propose` create the first capability-specific spec when real scope exists. [VERIFIED: 04-CONTEXT.md; skills/opsx/references/action-playbooks.md]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | CLI runtime, new dependencies, regression suite | ✓ | `v24.8.0` | — |
| npm | Adding `xstate` and `yaml`, running package scripts, registry verification | ✓ | `11.6.0` | — |
| git | Existing runtime suite uses `git check-ignore` assertions | ✓ | `2.46.0` | If unavailable, convert ignore-policy checks to manual verification only. [VERIFIED: scripts/test-workflow-runtime.js] |

**Missing dependencies with no fallback:**
- None. [VERIFIED: node --version; npm --version; git --version]

**Missing dependencies with fallback:**
- None. [VERIFIED: node --version; npm --version; git --version]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Custom Node `assert` + `child_process.spawnSync` harness in `scripts/test-workflow-runtime.js`. [VERIFIED: scripts/test-workflow-runtime.js] |
| Config file | none. [VERIFIED: package.json; rg repo scan] |
| Quick run command | `npm run test:workflow-runtime` [VERIFIED: package.json] |
| Full suite command | `npm run test:workflow-runtime` [VERIFIED: package.json] |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| STATE-01 | `opsx-new` creates full skeleton and updates `.opsx/active.yaml` without falsely marking planning complete. | integration | `npm run test:workflow-runtime` | ✅ existing script, new cases required. [VERIFIED: scripts/test-workflow-runtime.js] |
| STATE-02 | Status/resume/apply/preflight consumers all load config, active state, `state.yaml`, `context.md`, and current artifacts. | integration | `npm run test:workflow-runtime` | ✅ existing script, expand generated-surface and runtime assertions. [VERIFIED: scripts/test-workflow-runtime.js; skills/opsx/SKILL.md] |
| STATE-03 | Artifact hash drift warns, reloads from disk, and does not silently refresh stored hashes. | unit + integration | `npm run test:workflow-runtime` | ✅ existing script, new hash fixtures required. [VERIFIED: scripts/test-workflow-runtime.js] |
| STATE-04 | `state.yaml` normalizes Phase 2 sparse scaffolds and persists the full Phase 4 shape. | unit | `npm run test:workflow-runtime` | ✅ existing script, new normalizer cases required. [VERIFIED: scripts/test-workflow-runtime.js; lib/workspace.js] |
| STATE-05 | `context.md` stays bounded and mirrors current-stage state. | unit + integration | `npm run test:workflow-runtime` | ✅ existing script, new capsule assertions required. [VERIFIED: scripts/test-workflow-runtime.js] |
| STATE-06 | `drift.md` records new assumptions, scope changes, path warnings, requirements, and approvals in stable sections. | unit + integration | `npm run test:workflow-runtime` | ✅ existing script, new ledger assertions required. [VERIFIED: scripts/test-workflow-runtime.js; lib/workspace.js] |
| STATE-07 | `opsx-continue` resumes the next valid action from persisted stage without re-planning unrelated work. | integration | `npm run test:workflow-runtime` | ✅ existing script, new partial-state routing cases required. [VERIFIED: scripts/test-workflow-runtime.js; lib/runtime-guidance.js] |
| STATE-08 | `opsx-apply` advances exactly one top-level task group and records execution-checkpoint evidence afterward. | integration | `npm run test:workflow-runtime` | ✅ existing script, new one-group persistence cases required. [VERIFIED: scripts/test-workflow-runtime.js; lib/workflow.js] |

### Sampling Rate

- **Per task commit:** `npm run test:workflow-runtime` [VERIFIED: package.json]
- **Per wave merge:** `npm run test:workflow-runtime` plus focused fixture assertions for the wave's new state paths. [VERIFIED: scripts/test-workflow-runtime.js]
- **Phase gate:** Full `npm run test:workflow-runtime` green, including new state/hash/drift/group cases, before `/gsd-verify-work`. [VERIFIED: package.json]

### Wave 0 Gaps

- [ ] `scripts/test-workflow-runtime.js` — add a failing case proving placeholder `design.md` / `tasks.md` from `opsx-new` do not auto-mark planning complete. [VERIFIED: lib/runtime-guidance.js; skills/opsx/references/artifact-templates.md]
- [ ] `scripts/test-workflow-runtime.js` — add Phase 2 sparse-state normalization cases for missing arrays/maps/checkpoints. [VERIFIED: lib/workspace.js]
- [ ] `scripts/test-workflow-runtime.js` — add hash-drift warn+reload fixtures that verify stored hashes only update after accepted writes. [VERIFIED: 04-CONTEXT.md]
- [ ] `scripts/test-workflow-runtime.js` — add one-group apply persistence cases covering `active.taskGroup`, `verificationLog`, `context.md`, and `drift.md`. [VERIFIED: .planning/REQUIREMENTS.md; lib/workflow.js]
- [ ] `scripts/test-workflow-runtime.js` — add read-only `status` / `resume` cases for invalid YAML, missing active change, and partial state recovery. [VERIFIED: lib/cli.js; skills/opsx/references/action-playbooks.md]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Not in scope for this local workflow-state phase. [VERIFIED: .planning/REQUIREMENTS.md; .planning/ROADMAP.md] |
| V3 Session Management | no | Not in scope for this local workflow-state phase. [VERIFIED: .planning/REQUIREMENTS.md; .planning/ROADMAP.md] |
| V4 Access Control | no | Phase 4 only persists path policy fields and warnings; hard enforcement is deferred to Phase 7. [VERIFIED: 04-CONTEXT.md] |
| V5 Input Validation | yes | Reuse `ensureSafeChangeName()`, path containment checks, YAML schema normalization, and explicit blockers on invalid mutation transitions. [VERIFIED: lib/runtime-guidance.js; lib/workspace.js; 04-CONTEXT.md] |
| V6 Cryptography | yes | Use built-in `node:crypto` SHA-256 hashing; never hand-roll artifact digest logic. [CITED: https://nodejs.org/api/crypto.html] |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Change-name or path traversal escaping `.opsx/changes/<name>` | Tampering | Keep the existing safe-name regex and `path.relative()` / containment checks for every resolved file path. [VERIFIED: lib/runtime-guidance.js; lib/workspace.js] |
| Malformed or adversarial `state.yaml` causing undefined mutation behavior | Tampering / Denial of Service | Parse with `yaml`, normalize required fields, and block mutating actions on invalid state rather than guessing defaults mid-transition. [VERIFIED: lib/yaml.js; 04-CONTEXT.md] [CITED: https://eemeli.org/yaml/] |
| Silent acceptance of artifact edits after drift | Repudiation / Tampering | Warn + reload on drift, append ledger entries, and update stored hashes only after accepted checkpoints or state writes. [VERIFIED: 04-CONTEXT.md] |
| Weak or inconsistent artifact digest computation | Tampering | Use sorted relative-path ordering and built-in SHA-256 via `node:crypto.createHash()`. [CITED: https://nodejs.org/api/crypto.html] |

## Sources

### Primary (HIGH confidence)
- Local code inspection: `lib/workspace.js`, `lib/runtime-guidance.js`, `lib/workflow.js`, `lib/cli.js`, `lib/yaml.js`, `lib/fs-utils.js`, `lib/config.js`, `scripts/test-workflow-runtime.js`, `skills/opsx/SKILL.md`, `skills/opsx/references/action-playbooks.md`, `skills/opsx/references/artifact-templates.md`, `templates/project/change-metadata.yaml.tmpl`. [VERIFIED: local code]
- `.planning/phases/04-change-state-machine-and-drift-control/04-CONTEXT.md` - locked Phase 4 decisions and deferred scope. [VERIFIED: local planning docs]
- `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/STATE.md`, `.planning/PROJECT.md` - requirement mapping, phase boundaries, and milestone intent. [VERIFIED: local planning docs]
- `https://dev.stately.ai/docs/pure-transitions` - pure `initialTransition()` / `transition()` guidance for side-effect-free state changes. [CITED: https://dev.stately.ai/docs/pure-transitions]
- `https://stately.ai/docs/xstate`, `https://stately.ai/docs/guards`, `https://stately.ai/docs/transitions`, `https://stately.ai/docs/persistence`, `https://stately.ai/docs/context` - XState v5 machine/guard/context/persistence behavior. [CITED: https://stately.ai/docs/xstate] [CITED: https://stately.ai/docs/guards] [CITED: https://stately.ai/docs/transitions] [CITED: https://stately.ai/docs/persistence] [CITED: https://stately.ai/docs/context]
- `https://eemeli.org/yaml/` - official `yaml` v2 parse/stringify and document API. [CITED: https://eemeli.org/yaml/]
- `https://nodejs.org/api/crypto.html`, `https://nodejs.org/api/fs.html` - built-in hashing and atomic-write-adjacent file primitives. [CITED: https://nodejs.org/api/crypto.html] [CITED: https://nodejs.org/api/fs.html]
- npm registry lookups for `xstate`, `yaml`, `fast-glob`, `robot3`, and `javascript-state-machine`. [VERIFIED: npm registry]

### Secondary (MEDIUM confidence)
- `https://www.npmjs.com/package/fast-glob` - current package README for `cwd`, `absolute`, `ignore`, and `onlyFiles` options used only for alternative evaluation. [CITED: https://www.npmjs.com/package/fast-glob]

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - current package versions were verified against the npm registry and the library recommendations are backed by official XState, YAML, and Node docs. [VERIFIED: npm registry] [CITED: https://dev.stately.ai/docs/pure-transitions] [CITED: https://eemeli.org/yaml/]
- Architecture: HIGH - module-boundary and migration-compatibility recommendations come directly from local code inspection and the locked Phase 4 context. [VERIFIED: lib/runtime-guidance.js; lib/workspace.js; lib/workflow.js; 04-CONTEXT.md]
- Pitfalls: HIGH - the biggest risks are directly observable in current code (`lib/yaml.js` limitations, presence-based artifact completion, direct file writes) and confirmed by current requirements. [VERIFIED: lib/yaml.js; lib/runtime-guidance.js; lib/fs-utils.js; .planning/REQUIREMENTS.md]

**Research date:** 2026-04-27  
**Valid until:** 2026-05-11
