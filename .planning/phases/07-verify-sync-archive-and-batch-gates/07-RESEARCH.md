# Phase 07: Verify, Sync, Archive, and Batch Gates - Research

**Researched:** 2026-04-28  
**Domain:** File-backed workflow gate orchestration for OpsX on Node.js. [VERIFIED: .planning/ROADMAP.md, package.json]  
**Confidence:** MEDIUM. [VERIFIED: codebase grep, npm registry, nodejs.org docs]

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
Source: [VERIFIED: .planning/phases/07-verify-sync-archive-and-batch-gates/07-CONTEXT.md]

- **D-01:** `opsx-verify` should default to hard gates for completion correctness. It should `BLOCK` forbidden-path changes, incomplete tasks, missing execution checkpoints, missing strict-mode RED/VERIFY records, unresolved drift blockers, and unsynced specs when an archive path depends on synced specs.
- **D-02:** `opsx-verify` may return `WARN` for lower-risk issues such as docs/config-only extra files, manual verification with an explicit rationale, or non-blocking advisory findings. `WARN` must be visible in the report but must not silently become a pass.
- **D-03:** `opsx-verify` should produce a structured result with `PASS`, `WARN`, or `BLOCK`, severity-classified findings, patch targets, and next action. The result should be usable by prompts, tests, and archive gates.
- **D-04:** Entries under `User approval needed` in `drift.md` are unresolved blockers unless explicitly marked resolved or approved in the change artifacts/state.
- **D-05:** `Files changed outside allowed paths` blocks when the changed file matches `forbiddenPaths` or clearly exceeds the approved scope. Additional docs/config changes may warn if they are not forbidden and are explainable.
- **D-06:** `Scope changes detected` and `Requirements discovered during apply` default to `BLOCK` because they indicate the implementation may have outrun approved proposal/spec/task artifacts. They may pass only after the corresponding proposal/spec/design/tasks/state evidence is updated or explicitly approved.
- **D-07:** `opsx-sync` should be conservative and deterministic. Do not attempt clever section-level automatic merges that can hide requirement conflicts.
- **D-08:** For each change spec under `.opsx/changes/<change>/specs/**`, compare the target `.opsx/specs/**` capability file for omitted requirements, duplicate requirement IDs, conflicting normative language, and likely behavior conflicts before writing.
- **D-09:** If no conflict is detected, `opsx-sync` may replace or append the clearly scoped delta into the canonical spec file. If conflict or omission is detected, return `BLOCK` with patch targets and do not write a partial sync.
- **D-10:** `opsx-archive` accepts `VERIFIED` or `SYNCED` changes. If the change is only `VERIFIED`, archive should run the same sync check internally before moving the change.
- **D-11:** If internal sync is safe, `opsx-archive` can update `.opsx/specs/**`, advance state through `SYNCED`, then archive the change. If sync is unsafe, archive returns `BLOCK` and leaves the change in place.
- **D-12:** `opsx-archive` must block incomplete tasks, missing execution checkpoints, unresolved drift, forbidden-path changes, failed verification, and unsafe sync. It must not archive incomplete changes through implicit user acceptance.
- **D-13:** `opsx-batch-apply` and `opsx-bulk-archive` should process each change independently. For each change, read its own `state.yaml`, `context.md`, `drift.md`, artifacts, and checkpoints; never mix multiple changes into one shared execution context.
- **D-14:** Per-change failure should skip that change, record a clear reason, and continue to the next change. The final report should summarize `applied` / `archived` / `skipped` / `blocked` counts and reasons.
- **D-15:** Global failures may stop the entire batch: missing `.opsx/` workspace, ambiguous target set, unsafe command arguments, broken generation/runtime environment, or any condition that means the batch itself cannot be evaluated safely.
- **D-16:** Phase 7 should add testable library-first gate modules instead of only changing prompt text. Preferred modules are `lib/verify.js`, `lib/sync.js`, `lib/archive.js`, and `lib/batch.js` or similarly scoped equivalents.
- **D-17:** The Node CLI should not become a full workflow runner. Modules should compute gates, reports, state updates, and safe file operations that prompts/skills can rely on; product-code implementation remains agent-driven through `/opsx-*` and `$opsx-*`.
- **D-18:** Generated command prompts, `skills/opsx/SKILL.md`, and bilingual playbooks must stop saying verify/archive hard gates are deferred after Phase 7. They should describe the actual gate behavior and route-specific outputs.
- **D-19:** Runtime tests should cover verify blocking, sync conflict blocking, archive preconditions, internal archive sync, batch isolation, skipped-change reporting, and generated prompt parity for the affected routes.

### Claude's Discretion
Source: [VERIFIED: .planning/phases/07-verify-sync-archive-and-batch-gates/07-CONTEXT.md]

- None explicitly listed in `07-CONTEXT.md`.

### Deferred Ideas (OUT OF SCOPE)
Source: [VERIFIED: .planning/phases/07-verify-sync-archive-and-batch-gates/07-CONTEXT.md]

- `opsx status --json` clean stdout behavior remains Phase 8.
- Path canonicalization, glob-special escaping, and glob artifact output parsing remain Phase 8 unless a narrow helper is required for Phase 7 gate correctness.
- A full autonomous fresh-context task runner remains out of scope for this milestone.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| QUAL-01 | `opsx-verify` checks proposal/specs/design/tasks/code/test alignment, TDD-light records, execution checkpoint completeness, changed-file scope, drift, and configured verification commands. [VERIFIED: .planning/REQUIREMENTS.md] | Use a dedicated `lib/verify.js` that reuses `loadChangeState()`, `detectArtifactHashDrift()`, `parseTopLevelTaskGroups()`, `runTaskCheckpoint()`, `runExecutionCheckpoint()`, and spec-delta parsing from `lib/spec-validator.js`. [VERIFIED: lib/change-store.js, lib/change-artifacts.js, lib/runtime-guidance.js, lib/workflow.js, lib/spec-validator.js] |
| QUAL-02 | `opsx-sync` merges change specs into `.opsx/specs/**` while checking for omissions and requirement conflicts. [VERIFIED: .planning/REQUIREMENTS.md] | Treat `specs/<capability>/spec.md` as delta specs with `ADDED` / `MODIFIED` / `REMOVED` sections, plan the merge in memory, block on conflicts, then write atomically. [VERIFIED: skills/opsx/references/artifact-templates.md, lib/spec-validator.js, lib/fs-utils.js] |
| QUAL-03 | `opsx-archive` blocks unless the change is verified or synced, tasks are complete, execution checkpoints are complete, specs are synced, and drift has no unresolved blockers. [VERIFIED: .planning/REQUIREMENTS.md] | Put precondition evaluation and internal safe-sync orchestration in `lib/archive.js`, and drive lifecycle transitions through `applyMutationEvent()` plus persisted state writes. [VERIFIED: lib/change-state.js, lib/change-store.js, .planning/phases/07-verify-sync-archive-and-batch-gates/07-CONTEXT.md] |
| QUAL-04 | `opsx-batch-apply` and `opsx-bulk-archive` process each change independently without mixing state or context. [VERIFIED: .planning/REQUIREMENTS.md] | Implement batch modules as per-change loops that instantiate fresh kernels and accumulate `ready/skipped/blocked` reports instead of sharing active-change state. [VERIFIED: lib/runtime-guidance.js, .planning/phases/07-verify-sync-archive-and-batch-gates/07-CONTEXT.md] |
</phase_requirements>

## Summary

The repo already contains nearly all Phase 7 prerequisites except the gate modules themselves: normalized persisted state, lifecycle transitions through `VERIFIED` / `SYNCED` / `ARCHIVED`, artifact hash drift detection, execution proof persistence, split-spec conflict review, generated command parity, and a single fast runtime suite. [VERIFIED: lib/change-state.js, lib/change-store.js, lib/change-artifacts.js, lib/spec-validator.js, lib/generator.js, scripts/test-workflow-runtime.js] AGENTS guidance also keeps Codex on explicit `$opsx-*` routes and requires `spec checkpoint` before `tasks`, `task checkpoint` before `apply`, and `execution checkpoint` after each top-level group, so Phase 7 should extend those existing contracts rather than invent new workflow surfaces. [VERIFIED: AGENTS.md]

The biggest planning risk is path-scope enforcement, not verify/archive wiring. [VERIFIED: scripts/test-workflow-runtime.js, lib/change-store.js] The repo stores glob-like `allowedPaths` / `forbiddenPaths` values such as `lib/**` and `*.pem`, but no matcher helper exists today. [VERIFIED: scripts/test-workflow-runtime.js, codebase grep] Local Node `v24.8.0` exposes `path.matchesGlob()`, but the package engine floor is still `>=14.14.0`, and Node’s official docs say `path.matchesGlob()` was only added in `v20.17.0` / `v22.5.0`. [VERIFIED: package.json, node --version] [CITED: https://nodejs.org/download/release/v24.1.0/docs/api/path.html] Planning should therefore either add a Node-14-compatible matcher now or explicitly narrow supported pattern semantics for Phase 7. [VERIFIED: package.json, codebase grep]

**Primary recommendation:** Build four library-first modules (`verify`, `sync`, `archive`, `batch`) on top of existing state/checkpoint/spec-validator helpers, use a conservative plan-then-write sync path, and refresh the 15 affected generated route files mechanically from source-of-truth plus the `opsx` skill/playbooks. [VERIFIED: .planning/phases/07-verify-sync-archive-and-batch-gates/07-CONTEXT.md, lib/change-store.js, lib/workflow.js, lib/generator.js, skills/opsx/SKILL.md]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Verify gate evaluation | API / Backend | Database / Storage | Gate logic is local Node library code, but every decision depends on persisted `.opsx/changes/<name>/state.yaml`, `context.md`, `drift.md`, tasks, and execution proof. [VERIFIED: lib/change-store.js, lib/runtime-guidance.js, lib/workflow.js] |
| Conservative spec sync | Database / Storage | API / Backend | The write target is canonical `.opsx/specs/**`, while conflict detection and merge planning belong in deterministic library code. [VERIFIED: .planning/REQUIREMENTS.md, skills/opsx/references/artifact-templates.md, lib/spec-validator.js] |
| Archive gating and move | API / Backend | Database / Storage | Preconditions are computed in code, but success requires safe state transition plus file moves into `.opsx/archive/**`. [VERIFIED: lib/change-state.js, .planning/REQUIREMENTS.md, README.md] |
| Batch isolation and reporting | API / Backend | Database / Storage | Batch behavior should loop over changes with fresh per-change reads and aggregate reports without shared mutable state. [VERIFIED: .planning/phases/07-verify-sync-archive-and-batch-gates/07-CONTEXT.md, lib/runtime-guidance.js] |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js runtime | `>=14.14.0` engine floor; local env `v24.8.0`. [VERIFIED: package.json, node --version] | Runtime, file I/O, hashing, tests. [VERIFIED: package.json, lib/fs-utils.js, lib/change-artifacts.js, scripts/test-workflow-runtime.js] | The package already ships as plain CommonJS plus Node built-ins; Phase 7 should stay in that shape. [VERIFIED: package.json, codebase grep] |
| `yaml` | `2.8.3` in repo; current npm version `2.8.3`, published `2026-03-21T10:37:06.001Z`. [VERIFIED: package.json, npm registry] | Read/write `.opsx/*.yaml` state and config. [VERIFIED: lib/change-store.js, package.json] | Already pinned in the repo and still current on npm, so no YAML-stack change is needed for Phase 7. [VERIFIED: package.json, npm registry] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `picomatch` | `4.0.4`, Node `>=12`, current npm publish `2026-03-23T20:39:47.960Z`. [VERIFIED: npm registry] | Glob matcher for `allowedPaths` / `forbiddenPaths` under the repo’s Node 14 engine floor. [CITED: https://github.com/micromatch/picomatch] | Use if Phase 7 keeps glob semantics such as `lib/**` and `*.pem` instead of narrowing patterns to exact/prefix rules. [VERIFIED: scripts/test-workflow-runtime.js, package.json] |
| Node built-ins `fs`, `path`, `crypto` | bundled with Node. [VERIFIED: lib/fs-utils.js, lib/change-artifacts.js] | Atomic writes, safe renames, path normalization, SHA-256 drift hashing. [VERIFIED: lib/fs-utils.js, lib/change-artifacts.js] | Use for all write paths, state moves, and archive operations; do not add a second file-state abstraction. [VERIFIED: lib/fs-utils.js, lib/migrate.js] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `picomatch@4.0.4` | `node:path.matchesGlob()` | Built-in matching is attractive, but Node docs say the API only appeared in `v20.17.0` / `v22.5.0`, while this package still declares `>=14.14.0`. [VERIFIED: package.json] [CITED: https://nodejs.org/download/release/v24.1.0/docs/api/path.html] |
| Reusing `collectSpecSplitEvidence()` / `reviewSpecSplitEvidence()` | A second sync-specific Markdown parser | A second parser would duplicate requirement/scenario/conflict logic that already exists and make Phase 7 drift harder to test. [VERIFIED: lib/spec-validator.js] |

**Installation:**
```bash
npm install
npm install picomatch@4.0.4
```

**Version verification:** `yaml@2.8.3` is current on npm as of 2026-04-28 and was published on 2026-03-21. [VERIFIED: npm registry] `picomatch@4.0.4` is current on npm as of 2026-04-28 and was published on 2026-03-23. [VERIFIED: npm registry]

## Architecture Patterns

### System Architecture Diagram

Recommended data flow for Phase 7, using current repo seams. [VERIFIED: lib/change-store.js, lib/runtime-guidance.js, lib/workflow.js, lib/spec-validator.js]

```text
User route (/opsx-verify | /opsx-sync | /opsx-archive | /opsx-batch-apply | /opsx-bulk-archive)
  -> strict preflight reads (.opsx/config.yaml, .opsx/active.yaml, change state/context/artifacts)
  -> per-change runtime load
       -> persisted state + checkpoints
       -> tasks/execution proof
       -> drift ledger + hash inspection
       -> change-local delta specs + canonical .opsx/specs
  -> gate module
       -> verify: PASS/WARN/BLOCK report
       -> sync: plan writes or BLOCK
       -> archive: verify + internal safe sync + move plan
       -> batch: isolate each change, aggregate skipped/blocked reasons
  -> accepted mutation path only
       -> apply lifecycle transition
       -> write state.yaml/context.md/drift.md atomically
       -> write .opsx/specs/** atomically when sync is safe
       -> move archived change under .opsx/archive/**
  -> source-of-truth regeneration
       -> skill/playbooks/workflow metadata
       -> buildPlatformBundle()
       -> checked-in bundle parity test
```

### Recommended Project Structure
```text
lib/
├── verify.js            # Verify gate collection, classification, report assembly
├── sync.js              # Delta-spec merge planning and safe atomic writes
├── archive.js           # Archive preconditions, internal safe sync, move orchestration
├── batch.js             # Per-change isolation loops and aggregate reporting
├── runtime-guidance.js  # Thin route payload builders that call gate modules
├── workflow.js          # Shared checkpoint semantics and generated prompt metadata
└── spec-validator.js    # Shared requirement/scenario/conflict parser

scripts/
└── test-workflow-runtime.js  # Extend existing fast suite instead of adding a second test harness
```

### Pattern 1: Evaluate First, Mutate Second
**What:** Make each gate module return a deterministic report first, then perform lifecycle/state/spec/archive writes only on an accepted path. [VERIFIED: lib/change-store.js, lib/change-state.js]  
**When to use:** `verify`, `sync`, and `archive` should all follow this split because current state helpers refresh hashes only after accepted checkpoint/state writes. [VERIFIED: lib/change-store.js, lib/change-artifacts.js]  
**Example:**
```javascript
// Source: lib/change-state.js, lib/change-store.js
const transition = applyMutationEvent(state, { type: MUTATION_EVENTS.VERIFY_ACCEPTED });
if (transition.status === 'OK') {
  writeChangeState(changeDir, {
    ...transition.state,
    nextAction: transition.nextAction
  });
}
```

### Pattern 2: Delta-Spec Sync by Requirement Blocks, Not Whole-File Blind Replace
**What:** Treat `specs/<capability>/spec.md` as delta specs with `ADDED` / `MODIFIED` / `REMOVED` sections, parse both change-local and canonical capability files, then plan an in-memory merged result before any write. [VERIFIED: skills/opsx/references/artifact-templates.md, lib/spec-validator.js]  
**When to use:** `opsx-sync` and archive-internal sync both need this because change specs are not guaranteed to be full canonical replacements. [VERIFIED: skills/opsx/references/artifact-templates.md, .planning/phases/07-verify-sync-archive-and-batch-gates/07-CONTEXT.md]  
**Example:**
```javascript
// Source: lib/spec-validator.js
const evidence = collectSpecSplitEvidence({
  proposalText,
  specFiles: [
    { path: '.opsx/specs/core/spec.md', text: currentCanonicalText },
    { path: '.opsx/changes/demo/specs/core/spec.md', text: changeDeltaText }
  ]
});
const findings = reviewSpecSplitEvidence(evidence);
```

### Pattern 3: Batch Routes Are Per-Change Loops, Not Shared Execution Contexts
**What:** Resolve targets once, then instantiate fresh per-change state/artifact reads for every item and aggregate results at the end. [VERIFIED: .planning/phases/07-verify-sync-archive-and-batch-gates/07-CONTEXT.md, lib/runtime-guidance.js]  
**When to use:** `opsx-batch-apply` and `opsx-bulk-archive`. [VERIFIED: .planning/REQUIREMENTS.md]  
**Example:**
```javascript
// Source pattern: lib/runtime-guidance.js
for (const changeName of targetChanges) {
  const applyView = buildApplyInstructions({ repoRoot, changeName });
  results.push({ changeName, ready: applyView.ready, blockers: applyView.prerequisites });
}
```

### Anti-Patterns to Avoid
- **Stage-only verify/archive:** Do not treat `state.stage === IMPLEMENTED` or `VERIFIED` as enough by itself; rerun proof, drift, and sync safety checks before mutating state. [VERIFIED: .planning/phases/07-verify-sync-archive-and-batch-gates/07-CONTEXT.md, lib/change-state.js]
- **Partial sync writes:** Do not write any `.opsx/specs/**` file until the full merge plan is conflict-free, because D-09 explicitly forbids partial sync on conflict. [VERIFIED: .planning/phases/07-verify-sync-archive-and-batch-gates/07-CONTEXT.md]
- **Hand-edited generated route files:** Do not patch `commands/**` directly without changing generator source or playbook source, because the runtime suite enforces bundle parity. [VERIFIED: lib/generator.js, scripts/test-workflow-runtime.js]
- **Shared batch state:** Do not reuse one loaded `state.yaml` / `context.md` object across changes; load each change independently. [VERIFIED: .planning/phases/07-verify-sync-archive-and-batch-gates/07-CONTEXT.md]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Requirement/conflict parser for sync | A second Markdown parser for specs | `collectSpecSplitEvidence()` and `reviewSpecSplitEvidence()` from `lib/spec-validator.js` | These already parse requirements, scenarios, fenced-code violations, duplicates, and conflicts, and they keep finding codes deterministic. [VERIFIED: lib/spec-validator.js] |
| Lifecycle writes | Manual `state.stage = 'VERIFIED'` / `'SYNCED'` / `'ARCHIVED'` strings | `applyMutationEvent()` + `writeChangeState()` / `recordCheckpointResult()` | Existing transitions already define the legal state machine and invalid-transition blocking. [VERIFIED: lib/change-state.js, lib/change-store.js] |
| Context/drift refresh | Ad hoc `context.md` / `drift.md` string assembly | `renderContextCapsule()` and `appendDriftLedger()` | Existing helpers keep headings stable and already persist proof summaries and drift entries. [VERIFIED: lib/change-capsule.js, lib/change-store.js] |
| Route prompt refresh | Manual edits to `commands/claude/**`, `commands/codex/**`, `commands/gemini/**` | `buildPlatformBundle()` plus checked-in parity assertions | The runtime suite already blocks mismatched or extra generated files. [VERIFIED: lib/generator.js, scripts/test-workflow-runtime.js] |
| Glob pattern evaluator | A homegrown `*` / `**` parser | `picomatch` if Phase 7 keeps glob semantics | The repo has no matcher today, the test fixtures already use glob syntax, and Node built-in matching is too new for the current engine floor. [VERIFIED: scripts/test-workflow-runtime.js, package.json, codebase grep] [CITED: https://nodejs.org/download/release/v24.1.0/docs/api/path.html] |

**Key insight:** Phase 7 risk comes from hidden divergence between persisted evidence, delta-spec semantics, and generated route guidance, not from missing raw file I/O primitives. [VERIFIED: lib/change-store.js, skills/opsx/references/action-playbooks.md, scripts/test-workflow-runtime.js]

## Common Pitfalls

### Pitfall 1: Verifying Against Stale State
**What goes wrong:** Verify or archive passes against stale hashes or pre-edit state. [VERIFIED: lib/change-artifacts.js, lib/runtime-guidance.js]  
**Why it happens:** Read-only routes already warn and reload on hash drift, but there is no Phase 7 gate yet that makes the same drift visible as a hard archive/verify input. [VERIFIED: lib/runtime-guidance.js, skills/opsx/SKILL.md]  
**How to avoid:** Start every verify/sync/archive evaluation with `hashTrackedArtifacts()` plus `detectArtifactHashDrift()`, reload persisted state, and surface unresolved drift in the final report before any write. [VERIFIED: lib/change-artifacts.js, lib/runtime-guidance.js]  
**Warning signs:** `state.yaml` hashes differ from current artifacts, or `context.md` warnings mention hash drift. [VERIFIED: lib/change-artifacts.js, lib/change-capsule.js]

### Pitfall 2: Losing Canonical Spec Content During Sync
**What goes wrong:** A delta spec overwrites untouched canonical requirements or silently merges conflicting requirement text. [VERIFIED: skills/opsx/references/artifact-templates.md, .planning/phases/07-verify-sync-archive-and-batch-gates/07-CONTEXT.md]  
**Why it happens:** Change-local specs are delta-oriented (`ADDED` / `MODIFIED` / `REMOVED`), but the current repo has no sync planner yet. [VERIFIED: skills/opsx/references/artifact-templates.md, codebase grep]  
**How to avoid:** Parse change-local and canonical capability specs, compute a merge plan in memory, verify that untouched canonical requirements remain present unless explicitly removed, and write atomically only after a clean plan. [VERIFIED: lib/spec-validator.js, lib/fs-utils.js]  
**Warning signs:** Multiple requirements normalize to the same title, or `reviewSpecSplitEvidence()` reports duplicates/conflicts. [VERIFIED: lib/spec-validator.js]

### Pitfall 3: Letting Archive Bypass Verify/Sync Through Route Ergonomics
**What goes wrong:** `$opsx-archive` becomes a convenient escape hatch around `verify` or `sync`. [VERIFIED: .planning/phases/07-verify-sync-archive-and-batch-gates/07-CONTEXT.md]  
**Why it happens:** Current route source text still says archive may accept explicitly user-approved incomplete changes and still contains pre-Phase-7 deferred wording. [VERIFIED: lib/workflow.js, commands/codex/prompts/opsx-archive.md, skills/opsx/SKILL.md, skills/opsx/references/action-playbooks.md]  
**How to avoid:** Make `archive` call the same library gates as standalone `verify` and `sync`, and fail closed if any prerequisite remains `BLOCK`. [VERIFIED: .planning/phases/07-verify-sync-archive-and-batch-gates/07-CONTEXT.md]  
**Warning signs:** Source-of-truth still includes “explicitly user-approved incomplete changes” or “deferred to Phase 7”. [VERIFIED: lib/workflow.js, skills/opsx/SKILL.md, skills/opsx/references/action-playbooks.md]

### Pitfall 4: Batch Context Bleed
**What goes wrong:** One change’s blockers, active task group, or drift warnings leak into another change’s batch result. [VERIFIED: .planning/phases/07-verify-sync-archive-and-batch-gates/07-CONTEXT.md]  
**Why it happens:** Existing helpers are per-change, but there is no batch module yet to enforce fresh loads per iteration. [VERIFIED: lib/change-store.js, lib/runtime-guidance.js]  
**How to avoid:** Use per-change kernels and keep batch aggregation to plain data objects; never reuse a mutable “current change” object across loop iterations. [VERIFIED: lib/runtime-guidance.js]  
**Warning signs:** Batch output reports the wrong task group, route, or blocker for later items. [ASSUMED]

### Pitfall 5: Source-of-Truth Drift After Runtime Work Lands
**What goes wrong:** Library behavior changes ship, but generated prompts, skill guardrails, and playbooks still describe old advisory semantics. [VERIFIED: lib/generator.js, scripts/test-workflow-runtime.js, skills/opsx/SKILL.md]  
**Why it happens:** Current route files are generated wrappers, while the actual behavior text lives in `lib/workflow.js`, `templates/commands/action.md.tmpl`, `skills/opsx/SKILL.md`, and bilingual playbooks. [VERIFIED: lib/generator.js, templates/commands/action.md.tmpl, skills/opsx/SKILL.md, skills/opsx/references/action-playbooks.md]  
**How to avoid:** Update source-of-truth first, regenerate the 15 affected command files, and keep parity assertions green in the existing runtime suite. [VERIFIED: lib/generator.js, scripts/test-workflow-runtime.js]  
**Warning signs:** `commands/**` mentions old semantics such as deferred hard gates or incomplete-archive escape hatches. [VERIFIED: commands/claude/opsx/archive.md, commands/codex/prompts/opsx-archive.md, commands/gemini/opsx/archive.toml]

## Code Examples

Verified patterns from existing source:

### Accepted Checkpoint Writes Refresh State Through Existing Store Helpers
```javascript
// Source: lib/change-store.js
const checkpointed = recordCheckpointResult(
  resolvedChangeDir,
  'execution',
  checkpointResult,
  refreshedHashes
);
```

### Split-Spec Evidence Collection Already Produces Parsed Requirement Objects
```javascript
// Source: lib/spec-validator.js
const evidence = collectSpecSplitEvidence({
  proposalText,
  specFiles
});
const findings = reviewSpecSplitEvidence(evidence);
```

### Generated Route Bundles Already Have a Strict Checked-In Parity Gate
```javascript
// Source: scripts/test-workflow-runtime.js
const generatedBundles = {
  claude: buildPlatformBundle('claude'),
  codex: buildPlatformBundle('codex'),
  gemini: buildPlatformBundle('gemini')
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Drift and path-boundary issues are advisory only in skill/playbook guidance. [VERIFIED: skills/opsx/SKILL.md, skills/opsx/references/action-playbooks.md] | Phase 7 should hard-block verify/archive on forbidden paths, unresolved drift, incomplete tasks, and missing proof. [VERIFIED: .planning/phases/07-verify-sync-archive-and-batch-gates/07-CONTEXT.md] | Locked on 2026-04-28 in Phase 7 context. [VERIFIED: .planning/phases/07-verify-sync-archive-and-batch-gates/07-CONTEXT.md] | Planner must schedule runtime gate modules before prompt refresh. [VERIFIED: .planning/phases/07-verify-sync-archive-and-batch-gates/07-CONTEXT.md] |
| Route wrappers are generic “follow the playbook” shells. [VERIFIED: commands/codex/prompts/opsx-verify.md, templates/commands/action.md.tmpl] | Route outputs now need route-specific hard-gate wording and outputs, but still generated from shared source. [VERIFIED: .planning/phases/07-verify-sync-archive-and-batch-gates/07-CONTEXT.md, lib/generator.js] | Phase 7. [VERIFIED: .planning/phases/07-verify-sync-archive-and-batch-gates/07-CONTEXT.md] | Refresh scope is 15 generated route files plus skill/playbook source. [VERIFIED: commands/claude/opsx/*.md, commands/codex/prompts/opsx-*.md, commands/gemini/opsx/*.toml, skills/opsx/SKILL.md, skills/opsx/references/action-playbooks.md, skills/opsx/references/action-playbooks-zh.md] |
| `node:path.matchesGlob()` looks usable in the local Node 24 shell. [VERIFIED: node --version] | The package engine floor still forces a cross-version matcher decision because Node docs show `matchesGlob()` was added much later. [VERIFIED: package.json] [CITED: https://nodejs.org/download/release/v24.1.0/docs/api/path.html] | Node docs currently mark the API as added in v20.17.0 / v22.5.0 and stabilized later. [CITED: https://nodejs.org/download/release/v24.1.0/docs/api/path.html] | Planner must either add a compatible matcher now or narrow pattern semantics explicitly. [VERIFIED: package.json, scripts/test-workflow-runtime.js] |

**Deprecated/outdated:**
- `Archive only completed or explicitly user-approved incomplete changes.` is outdated for Phase 7 because D-12 requires hard blocking on incomplete work. [VERIFIED: lib/workflow.js, .planning/phases/07-verify-sync-archive-and-batch-gates/07-CONTEXT.md]
- Skill/playbook lines that say hard verify/archive enforcement is “deferred to Phase 7” are outdated once this phase lands. [VERIFIED: skills/opsx/SKILL.md, skills/opsx/references/action-playbooks.md, skills/opsx/references/action-playbooks-zh.md]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Archived changes should preserve the full per-change evidence directory under `.opsx/archive/<change-name>/` rather than collapsing to a summary file. [ASSUMED] | Architecture Patterns / Open Questions | Archive implementation and restore/debug workflows could be planned against the wrong filesystem shape. |
| A2 | Batch apply should remain an orchestration/reporting layer over existing per-change `apply` readiness rather than becoming a product-code executor inside Node. [ASSUMED] | Summary / Architecture Patterns | Planner could under-scope or over-scope `lib/batch.js` responsibilities. |

## Open Questions

1. **Should Phase 7 add a matcher dependency now, or narrow path-scope semantics until Phase 8?**
   - What we know: the repo already stores glob-like patterns and current tests use values such as `lib/**` and `*.pem`. [VERIFIED: scripts/test-workflow-runtime.js]
   - What's unclear: whether adding `picomatch@4.0.4` is acceptable for this repo, or whether the project prefers to avoid a new dependency and temporarily limit pattern syntax. [VERIFIED: npm registry, package.json] [CITED: https://github.com/micromatch/picomatch]
   - Recommendation: decide this in planning Wave 0, because it affects `verify`, `archive`, fixtures, and any route wording about path blockers. [VERIFIED: scripts/test-workflow-runtime.js, .planning/phases/07-verify-sync-archive-and-batch-gates/07-CONTEXT.md]

2. **What exact on-disk shape should archived changes use?**
   - What we know: `.opsx/archive/**` is tracked, but the repo only verifies tracking policy, not archived change directory layout. [VERIFIED: README.md, scripts/test-workflow-runtime.js]
   - What's unclear: whether archive writes a full moved directory, a timestamped directory, or another preserved bundle shape. [VERIFIED: codebase grep]
   - Recommendation: pick and lock a full-directory archive shape before implementation so `archive` and `bulk-archive` tests can assert exact paths. [ASSUMED]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime modules and `npm run test:workflow-runtime`. [VERIFIED: package.json, scripts/test-workflow-runtime.js] | ✓ [VERIFIED: node --version] | `v24.8.0` local; package floor `>=14.14.0`. [VERIFIED: node --version, package.json] | — |
| npm | Dependency install and registry version verification. [VERIFIED: package.json, npm registry] | ✓ [VERIFIED: npm --version] | `11.6.0`. [VERIFIED: npm --version] | — |

**Missing dependencies with no fallback:**
- None identified for research or planning. [VERIFIED: node --version, npm --version]

**Missing dependencies with fallback:**
- None identified; any new matcher dependency would be installed through npm in-repo. [VERIFIED: npm --version] [ASSUMED]

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Repo-local Node assert harness in `scripts/test-workflow-runtime.js`. [VERIFIED: scripts/test-workflow-runtime.js] |
| Config file | none. [VERIFIED: codebase grep] |
| Quick run command | `npm run test:workflow-runtime`. [VERIFIED: package.json] |
| Full suite command | `npm run test:workflow-runtime`. [VERIFIED: package.json] |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| QUAL-01 | Verify returns `PASS/WARN/BLOCK` for proof gaps, drift, task completeness, TDD evidence, and path scope. [VERIFIED: .planning/REQUIREMENTS.md, .planning/phases/07-verify-sync-archive-and-batch-gates/07-CONTEXT.md] | unit/integration | `npm run test:workflow-runtime` | ✅ `scripts/test-workflow-runtime.js` [VERIFIED: package.json, scripts/test-workflow-runtime.js] |
| QUAL-02 | Sync blocks omissions/conflicts and performs no partial writes. [VERIFIED: .planning/REQUIREMENTS.md, .planning/phases/07-verify-sync-archive-and-batch-gates/07-CONTEXT.md] | integration | `npm run test:workflow-runtime` | ✅ `scripts/test-workflow-runtime.js` [VERIFIED: package.json, scripts/test-workflow-runtime.js] |
| QUAL-03 | Archive blocks unsafe states, can run internal safe sync from `VERIFIED`, and advances lifecycle only on success. [VERIFIED: .planning/REQUIREMENTS.md, lib/change-state.js] | integration | `npm run test:workflow-runtime` | ✅ `scripts/test-workflow-runtime.js` [VERIFIED: package.json, scripts/test-workflow-runtime.js] |
| QUAL-04 | Batch apply / bulk archive keep per-change isolation and report skipped reasons. [VERIFIED: .planning/REQUIREMENTS.md, .planning/phases/07-verify-sync-archive-and-batch-gates/07-CONTEXT.md] | integration | `npm run test:workflow-runtime` | ✅ `scripts/test-workflow-runtime.js` [VERIFIED: package.json, scripts/test-workflow-runtime.js] |

### Sampling Rate
- **Per task commit:** `npm run test:workflow-runtime`. [VERIFIED: package.json]
- **Per wave merge:** `npm run test:workflow-runtime`. [VERIFIED: package.json]
- **Phase gate:** Full runtime suite green, plus no generated bundle parity drift for the 15 affected route files. [VERIFIED: scripts/test-workflow-runtime.js]

### Wave 0 Gaps
- [ ] `scripts/test-workflow-runtime.js` — add QUAL-01 fixtures for forbidden-path block, unresolved `User approval needed`, `scopeChanges` / `discoveredRequirements` block, incomplete task groups, missing execution proof, and manual-only verification warnings. [VERIFIED: .planning/REQUIREMENTS.md, .planning/phases/07-verify-sync-archive-and-batch-gates/07-CONTEXT.md]
- [ ] `scripts/test-workflow-runtime.js` — add QUAL-02 fixtures for `ADDED` / `MODIFIED` / `REMOVED` sync plans, omitted-target protection, duplicate/conflicting requirements, and atomic no-partial-write guarantees. [VERIFIED: skills/opsx/references/artifact-templates.md, .planning/REQUIREMENTS.md]
- [ ] `scripts/test-workflow-runtime.js` — add QUAL-03 fixtures for archive-from-VERIFIED with safe internal sync, archive-from-SYNCED happy path, and block conditions for incomplete tasks, unresolved drift, forbidden paths, and unsafe sync. [VERIFIED: .planning/REQUIREMENTS.md, .planning/phases/07-verify-sync-archive-and-batch-gates/07-CONTEXT.md]
- [ ] `scripts/test-workflow-runtime.js` — add QUAL-04 fixtures for per-change isolation and aggregate `applied` / `archived` / `skipped` / `blocked` reporting in batch flows. [VERIFIED: .planning/REQUIREMENTS.md, .planning/phases/07-verify-sync-archive-and-batch-gates/07-CONTEXT.md]
- [ ] `scripts/test-workflow-runtime.js` — add prompt/source assertions for verify/sync/archive/batch route wording and strict checked-in parity across Claude/Codex/Gemini. [VERIFIED: lib/generator.js, scripts/test-workflow-runtime.js]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no. [VERIFIED: codebase grep] | No auth surface is introduced in this phase. [VERIFIED: .planning/ROADMAP.md, codebase grep] |
| V3 Session Management | no. [VERIFIED: codebase grep] | No session or cookie handling exists in the Phase 7 scope. [VERIFIED: .planning/ROADMAP.md, codebase grep] |
| V4 Access Control | no. [VERIFIED: codebase grep] | Phase 7 is local workspace gating, not a multi-user authorization surface. [VERIFIED: .planning/ROADMAP.md, codebase grep] |
| V5 Input Validation | yes. [VERIFIED: lib/change-store.js, lib/workspace.js, lib/migrate.js] | Reuse safe change-name/capability checks, base-path guards, normalized state loaders, and deterministic spec parsing. [VERIFIED: lib/runtime-guidance.js, lib/change-store.js, lib/spec-validator.js] |
| V6 Cryptography | no. [VERIFIED: codebase grep] | `crypto.createHash('sha256')` is used for drift detection only, not for secrecy or trust-boundary cryptography. [VERIFIED: lib/change-artifacts.js] |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Path traversal or unsafe archive destination | Tampering | Reuse `ensureWithinBase()`-style guards, normalize POSIX-relative paths, and write/move only inside `.opsx` roots. [VERIFIED: lib/change-store.js, lib/migrate.js, lib/workspace.js] |
| Verifying against stale artifacts | Tampering | Hash current artifacts, reload on drift, and block archive/verify if drift remains unresolved. [VERIFIED: lib/change-artifacts.js, lib/runtime-guidance.js, .planning/phases/07-verify-sync-archive-and-batch-gates/07-CONTEXT.md] |
| Spec merge hides requirement conflict | Tampering | Parse delta and canonical specs, run conflict review before write, and disallow partial sync on conflict. [VERIFIED: lib/spec-validator.js, .planning/phases/07-verify-sync-archive-and-batch-gates/07-CONTEXT.md] |
| Batch loop mixes change context | Tampering | Instantiate a fresh per-change load/plan cycle and aggregate plain result objects only. [VERIFIED: .planning/phases/07-verify-sync-archive-and-batch-gates/07-CONTEXT.md, lib/runtime-guidance.js] |

## Sources

### Primary (HIGH confidence)
- `.planning/phases/07-verify-sync-archive-and-batch-gates/07-CONTEXT.md` - locked Phase 7 decisions and scope.
- `.planning/REQUIREMENTS.md` - QUAL-01 through QUAL-04 requirement text.
- `.planning/ROADMAP.md` - Phase 7 goal and success criteria.
- `AGENTS.md` - explicit route and checkpoint-order constraints.
- `lib/change-state.js` - lifecycle stages and accepted mutation events.
- `lib/change-store.js` - persisted state normalization, checkpoint writes, context/drift updates.
- `lib/change-artifacts.js` - tracked artifact hashing and drift detection.
- `lib/spec-validator.js` - requirement/scenario/conflict parsing and review findings.
- `lib/workflow.js` - checkpoint semantics, TDD evidence parsing, action summaries/scopes.
- `lib/runtime-guidance.js` - per-change runtime builders and read-only drift reload pattern.
- `lib/generator.js` and `templates/commands/action.md.tmpl` - generated route source-of-truth.
- `skills/opsx/SKILL.md`, `skills/opsx/references/action-playbooks.md`, `skills/opsx/references/action-playbooks-zh.md` - current shipped workflow guardrails and outdated deferred wording.
- `scripts/test-workflow-runtime.js` - current fast validation harness, route parity checks, and existing fixture style.
- `package.json` - engine floor, dependency inventory, test command.
- Node.js path API docs - `path.matchesGlob()` availability and stabilization history. [CITED: https://nodejs.org/download/release/v24.1.0/docs/api/path.html]
- npm registry - current versions and publish dates for `yaml`, `picomatch`, and `minimatch`. [VERIFIED: npm registry]

### Secondary (MEDIUM confidence)
- Picomatch GitHub README - matcher capabilities, no-dependency claim, and install/API shape. [CITED: https://github.com/micromatch/picomatch]

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM - existing runtime stack is clear, but the Phase 7 matcher choice depends on whether the project accepts one small new dependency. [VERIFIED: package.json, scripts/test-workflow-runtime.js, npm registry]
- Architecture: HIGH - current code already exposes the exact read/decide/write seams Phase 7 needs. [VERIFIED: lib/change-store.js, lib/change-state.js, lib/runtime-guidance.js, lib/spec-validator.js]
- Pitfalls: HIGH - the main failure modes are directly visible in current source and current shipped deferred wording. [VERIFIED: lib/workflow.js, skills/opsx/SKILL.md, skills/opsx/references/action-playbooks.md]

**Research date:** 2026-04-28  
**Valid until:** 2026-05-28 for local-code findings; re-check npm/Node version facts before implementation if planning starts later. [VERIFIED: npm registry] [CITED: https://nodejs.org/download/release/v24.1.0/docs/api/path.html]
