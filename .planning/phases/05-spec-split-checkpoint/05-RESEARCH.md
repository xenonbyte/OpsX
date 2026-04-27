# Phase 5: Spec-Split Checkpoint - Research

**Researched:** 2026-04-28  
**Domain:** pre-design split-spec validation, checkpoint contract extension, generated workflow guidance  
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

Copied from `.planning/phases/05-spec-split-checkpoint/05-CONTEXT.md`. [VERIFIED: .planning/phases/05-spec-split-checkpoint/05-CONTEXT.md]

### Locked Decisions

### Checkpoint Placement
- **D-01:** Add `spec-split-checkpoint` to `schemas/spec-driven/schema.json` with trigger `after-specs-before-design`, phase `planning`, states `PASS`, `WARN`, and `BLOCK`, and insertion after `specs` before `design`.
- **D-02:** Treat this checkpoint as an earlier planning gate than the existing `spec-checkpoint`. `spec-split-checkpoint` validates proposal/spec alignment and split-spec integrity before design is generated; `spec-checkpoint` remains the later design-before-tasks gate.
- **D-03:** Persist checkpoint state using the Phase 4 checkpoint/state infrastructure instead of creating a new artifact type. State keys may use a normalized `specSplit` / `spec-split` mapping, but downstream output must keep the canonical checkpoint id `spec-split-checkpoint`.

### Validator Scope
- **D-04:** Implement a reusable validator module rather than burying all logic inside generated prompts. The planner should prefer a small module such as `lib/spec-validator.js` or `lib/spec-split-review.js`, with `lib/workflow.js` exposing the checkpoint runner.
- **D-05:** Validator coverage must include proposal in-scope coverage gaps, unapproved scope expansion, duplicate requirement IDs, likely duplicate behavior across specs, conflicting requirements, empty specs, missing scenarios, and requirements hidden in fenced code blocks.
- **D-06:** Hidden requirement detection should flag formal requirement headings or normative requirement language inside fenced code blocks; those should not silently count as valid requirements.
- **D-07:** Use stable finding codes and patch targets. Findings should point back to existing artifacts such as `proposal`, `specs`, and the affected spec path, not to a new review report.

### Review Behavior
- **D-08:** Simple single-spec changes can be reviewed inline by the checkpoint runner.
- **D-09:** Multi-spec, cross-capability, security-sensitive, or larger requirement sets may escalate to read-only reviewer behavior in generated guidance, but the reviewer must not write files directly and must not create a separate `spec-review.md` artifact.
- **D-10:** Checkpoint failures update or request patches to existing proposal/spec/design/task artifacts. Phase 5 should preserve the existing checkpoint output contract: `checkpoint`, `phase`, `status`, `findings`, `patchTargets`, and `nextStep`.

### Integration Boundaries
- **D-11:** Generated `/opsx-propose`, `$opsx-propose`, `/opsx-continue`, `$opsx-continue`, `/opsx-ff`, and `$opsx-ff` guidance should mention `spec-split-checkpoint` in the specs-before-design path.
- **D-12:** Do not add TDD-light rules in this phase. RED/GREEN/REFACTOR/VERIFY task planning belongs to Phase 6.
- **D-13:** Do not add hard verify/archive gates in this phase. Final quality gates, allowed/forbidden path blocking, and archive blocking belong to Phase 7 and Phase 8.

### Claude's Discretion
The planner may choose exact module names and function boundaries, provided the implementation stays modular, testable, and aligned with `lib/workflow.js` checkpoint conventions. The planner may choose whether state checkpoint keys are stored as `specSplit`, `spec-split`, or the full checkpoint id, provided public output and schema ids remain canonical and tests lock the mapping.

### Deferred Ideas (OUT OF SCOPE)
- TDD-light task template and task-checkpoint enforcement belong to Phase 6.
- Final `opsx-verify`, `opsx-sync`, and `opsx-archive` quality gates belong to Phase 7.
- Path/glob/clean JSON release hardening and broad release coverage belong to Phase 8.
- Supervised checkpoint retry loops remain a future/backlog automation idea and should not be built into Phase 5.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SPEC-01 | The schema defines `spec-split-checkpoint` with trigger `after-specs-before-design` and states `PASS`, `WARN`, and `BLOCK`. | The schema currently declares only `spec-checkpoint`, `task-checkpoint`, and `execution-checkpoint`, while `lib/workflow.js` hardcodes the same three ids in `DEFAULT_CHECKPOINT_IDS`; Phase 5 must update both the schema and workflow contract validators together. [VERIFIED: schemas/spec-driven/schema.json; lib/workflow.js; scripts/test-workflow-runtime.js] |
| SPEC-02 | Spec review checks proposal coverage, unapproved scope expansion, duplicate requirements, conflicting requirements, empty specs, missing scenarios, and requirements hidden in fenced code blocks. | The repo already standardizes spec headings (`## ADDED Requirements`, `### Requirement:`, `#### Scenario:`), and current planning evidence logic already counts requirements/scenarios and token overlap; Phase 5 should extend that into a per-file spec corpus instead of the current single merged `specs.text` block. [VERIFIED: skills/opsx/references/artifact-templates.md; openspec/changes/auto-checkpoint-review/specs/automatic-checkpoint-review/spec.md; lib/workflow.js] |
| SPEC-03 | Spec review can run inline for simple changes and can escalate to read-only reviewer behavior for multi-spec, cross-capability, security-sensitive, or larger requirement sets. | The current public route surface is fixed to explicit `/opsx-*` and `$opsx-*` actions, with no dedicated checkpoint route; the correct bounded implementation is therefore inline review inside existing planning actions plus an advisory read-only escalation path, not a new public command or artifact type. [VERIFIED: .planning/phases/03-skill-and-command-surface-rewrite/03-CONTEXT.md; .planning/phases/05-spec-split-checkpoint/05-CONTEXT.md; lib/workflow.js; skills/opsx/SKILL.md] |
| SPEC-04 | Checkpoint output follows the existing contract: checkpoint, phase, status, findings, patch targets, and next step. | `buildCheckpointResult()` already emits the required shape, but `buildCheckpointNextStep()` has special-case wording only for `spec-checkpoint` and `task-checkpoint`; Phase 5 should reuse the existing result builder while adding explicit `spec-split-checkpoint` next-step semantics and persistence tests. [VERIFIED: lib/workflow.js; scripts/test-workflow-runtime.js] |
</phase_requirements>

## Project Constraints (from AGENTS.md)

- Read `openspec/config.yaml` for project context and workflow defaults. [VERIFIED: AGENTS.md; openspec/config.yaml]
- Keep change artifacts under `openspec/changes/` in repo-authored guidance, even though runtime commands operate on `.opsx/changes/` after migration. [VERIFIED: AGENTS.md; .planning/phases/03-skill-and-command-surface-rewrite/03-CONTEXT.md; .planning/phases/04-change-state-machine-and-drift-control/04-CONTEXT.md]
- Keep `security-review.md` between `design.md` and `tasks.md` when required or recommended. [VERIFIED: AGENTS.md; schemas/spec-driven/schema.json; lib/workflow.js]
- Run `spec checkpoint` before `tasks`, `task checkpoint` before `apply`, and `execution checkpoint` after each top-level task group; Phase 5 must add `spec-split-checkpoint` earlier without removing those later gates. [VERIFIED: AGENTS.md; schemas/spec-driven/schema.json; lib/generator.js; .planning/phases/05-spec-split-checkpoint/05-CONTEXT.md]
- Keep `proposal.md`, `specs/`, `design.md`, and `tasks.md` aligned when a checkpoint finds drift. [VERIFIED: AGENTS.md; skills/opsx/SKILL.md; skills/opsx/references/artifact-templates.md]
- No additional `.claude/skills/` or `.agents/skills/` directories were found in this repo, so there are no extra project-local skill rules beyond `AGENTS.md`. [VERIFIED: rg --files -g '.claude/skills/**' -g '.agents/skills/**']

## Summary

External web research is not needed for this phase. The implementation problem is fully local: the repo already contains the target stage vocabulary (`SPEC_SPLIT_REVIEWED`), the transition event (`SPEC_SPLIT_ACCEPTED`), the checkpoint result contract, generator-backed command surfaces, bilingual skill guidance, and a single regression suite that currently passes `53 test(s)`. [VERIFIED: lib/change-state.js; lib/workspace.js; lib/workflow.js; lib/generator.js; skills/opsx/SKILL.md; skills/opsx/references/action-playbooks.md; skills/opsx/references/action-playbooks-zh.md; npm run test:workflow-runtime]

The critical gap is that current Phase 4 code still assumes exactly three checkpoints and a flattened spec corpus. `schemas/spec-driven/schema.json` has no `spec-split-checkpoint`; `DEFAULT_CHECKPOINT_IDS` in `lib/workflow.js` lists only `spec-checkpoint`, `task-checkpoint`, and `execution-checkpoint`; `normalizePlanningEvidence()` merges all specs into one `specs.text`; and `normalizeChangeState()` drops any persisted checkpoint key outside `spec`, `task`, and `execution`. A schema-only patch would therefore leave validation, state persistence, next-step wording, and generated guidance inconsistent. [VERIFIED: schemas/spec-driven/schema.json; lib/workflow.js; lib/change-store.js; node -e normalizeChangeState probe]

The clean Phase 5 shape is four bounded deliverables: add the checkpoint to the schema and workflow/state catalogs; introduce a small repo-local spec-review module that parses each `specs/**/spec.md` file and emits deterministic findings; wire that runner into existing planning actions without adding a new public command or review artifact; and extend the existing generator/skill/test surfaces so the new checkpoint order is locked end-to-end. [VERIFIED: .planning/phases/05-spec-split-checkpoint/05-CONTEXT.md; .planning/phases/03-skill-and-command-surface-rewrite/03-CONTEXT.md; lib/workflow.js; lib/change-store.js; lib/generator.js; scripts/test-workflow-runtime.js]

**Primary recommendation:** implement Phase 5 as a repo-local validator and contract extension that reuses `buildCheckpointResult()`, `change-state`, `change-store`, `buildPlatformBundle()`, and the existing runtime test harness; do not add a new public route, a standalone `spec-review.md`, or a new dependency just to parse the constrained spec format. [VERIFIED: .planning/phases/05-spec-split-checkpoint/05-CONTEXT.md; .planning/phases/03-skill-and-command-surface-rewrite/03-CONTEXT.md; lib/workflow.js; lib/generator.js; skills/opsx/references/artifact-templates.md; package.json]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| `spec-split-checkpoint` schema/catalog definition | Static schema + workflow metadata | Generated prompt surface | The canonical checkpoint id, trigger, insertion order, and allowed states live in `schema.json` and `lib/workflow.js`; generated commands and skill docs only mirror that contract. [VERIFIED: schemas/spec-driven/schema.json; lib/workflow.js; lib/generator.js] |
| Per-spec parsing and split-spec finding generation | Local runtime validator | Filesystem / change artifacts | The validator must read `proposal.md` plus on-disk `specs/**/spec.md` files, parse headings and fences deterministically, then emit finding codes and patch targets that point back to existing artifacts. [VERIFIED: skills/opsx/references/artifact-templates.md; openspec/changes/auto-checkpoint-review/specs/automatic-checkpoint-review/spec.md; .planning/phases/05-spec-split-checkpoint/05-CONTEXT.md] |
| Checkpoint persistence and lifecycle advancement | Change state/store layer | Workflow runner | Phase 4 already owns `SPEC_SPLIT_ACCEPTED` and `SPEC_SPLIT_REVIEWED`, plus checkpoint result persistence; Phase 5 should reuse those layers instead of inventing a separate review state file. [VERIFIED: lib/change-state.js; lib/change-store.js; .planning/phases/04-change-state-machine-and-drift-control/04-CONTEXT.md] |
| Inline versus read-only reviewer escalation | Planning action guidance | Local runtime validator | There is no public `opsx-spec-split-checkpoint` action; Phase 5 escalation therefore belongs inside `propose`, `continue`, and `ff` guidance, informed by validator risk signals, while remaining read-only and artifact-free. [VERIFIED: .planning/phases/03-skill-and-command-surface-rewrite/03-CONTEXT.md; .planning/phases/05-spec-split-checkpoint/05-CONTEXT.md; lib/workflow.js; skills/opsx/references/action-playbooks.md] |
| Regression locking | Runtime test harness | Generator + state/store + workflow | One existing script already verifies schema, state, generator, skill, CLI, and checkpoint contracts; extending it is cheaper and more reliable than adding a second test framework. [VERIFIED: package.json; scripts/test-workflow-runtime.js; npm run test:workflow-runtime] |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js runtime | `>=14.14.0` in-project; local machine `v24.8.0` | Runs the CommonJS workflow modules, synchronous file I/O, regex-based parsing, and the regression harness. | The package already targets Node `>=14.14.0`, and the local environment exceeds that floor, so Phase 5 can stay inside built-in `fs`, `path`, and string/regex APIs. [VERIFIED: package.json; node --version] |
| `lib/workflow.js` | repo-local | Canonical checkpoint states, result shape, planning evidence helpers, and contract validators. | Phase 5 should add `runSpecSplitCheckpoint()` here so all checkpoint types keep one contract surface and one validation entrypoint. [VERIFIED: lib/workflow.js] |
| `lib/change-state.js` + `lib/change-store.js` | repo-local | Persisted planning stages, checkpoint slots, and accepted-write state updates. | Phase 4 already introduced `SPEC_SPLIT_ACCEPTED`/`SPEC_SPLIT_REVIEWED`, but `change-store` currently preserves only `spec`, `task`, and `execution`; Phase 5 must extend that existing layer rather than bypass it. [VERIFIED: lib/change-state.js; lib/change-store.js; node -e normalizeChangeState probe] |
| `yaml` | `2.8.3` | Existing YAML dependency used for `state.yaml` and `active.yaml`. | No new serialization package is needed for Phase 5 because the repo already depends on `yaml@2.8.3` and the current tests execute successfully with it installed. [VERIFIED: package.json; npm run test:workflow-runtime] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `lib/generator.js` | repo-local | Source-of-truth notes for generated checkpoint wording across Claude, Codex, and Gemini. | Update this when the checkpoint order changes, then regenerate checked-in `commands/**` rather than hand-editing generated files. [VERIFIED: lib/generator.js; scripts/test-workflow-runtime.js] |
| `skills/opsx/SKILL.md` | repo-local | Skill-level workflow loop and guardrails. | Update it when checkpoint order or planning behavior changes; it already documents checkpoint sequencing and artifact patching rules. [VERIFIED: skills/opsx/SKILL.md] |
| `skills/opsx/references/action-playbooks*.md` | repo-local | English/Chinese route playbooks that mirror generated behavior. | Update these when `propose`, `continue`, `ff`, or status-style instructions need to mention `spec-split-checkpoint`. [VERIFIED: skills/opsx/references/action-playbooks.md; skills/opsx/references/action-playbooks-zh.md] |
| `scripts/test-workflow-runtime.js` | repo-local | Custom `assert`-based integration suite. | Extend this file with spec-split schema, parser, persistence, and guidance cases instead of creating a separate Phase 5 test runner. [VERIFIED: scripts/test-workflow-runtime.js; npm run test:workflow-runtime] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Repo-local validator module | Prompt-only review logic inside generated commands | Prompt-only review would be hard to regression-test, impossible to reuse from `lib/workflow.js`, and directly contradicts D-04's requirement for a reusable module. [VERIFIED: .planning/phases/05-spec-split-checkpoint/05-CONTEXT.md; lib/workflow.js] |
| Existing explicit public route set | Add a new `/opsx-spec-split-checkpoint` or `$opsx-spec-split-checkpoint` command | A new public route would reopen the Phase 3 command-surface decision; the bounded implementation is to keep the checkpoint as an internal step within `propose`, `continue`, and `ff`. [VERIFIED: .planning/phases/03-skill-and-command-surface-rewrite/03-CONTEXT.md; .planning/phases/05-spec-split-checkpoint/05-CONTEXT.md; lib/workflow.js] |
| Bounded heading/fence parser over spec templates | Full general-purpose Markdown AST pipeline | The spec grammar is already constrained to `Requirement` and `Scenario` headings plus fenced code blocks, so a small line-oriented parser stays easier to test and avoids adding a dependency solely for local workflow files. [VERIFIED: skills/opsx/references/artifact-templates.md; openspec/changes/auto-checkpoint-review/specs/automatic-checkpoint-review/spec.md] |
| Explicit `specSplit` checkpoint slot with alias mapping | Preserve arbitrary unknown checkpoint keys generically | A generic map is more future-flexible, but the current Phase 4 state normalizer is explicit and Phase 5 needs one bounded addition; isolating alias mapping keeps this phase small and testable. [ASSUMED] |

**Installation:** No new packages are required for Phase 5; the repo already has the only non-built-in dependency it needs for state persistence. [VERIFIED: package.json]

```bash
npm run test:workflow-runtime
```

**Version verification:** `package.json` pins `yaml@2.8.3`, and the local environment provides Node `v24.8.0` plus npm `11.6.0`. No additional package version verification was needed because this phase does not require a new external library. [VERIFIED: package.json; node --version; npm --version]

## Architecture Patterns

### System Architecture Diagram

```text
Planning action (`propose` / `continue` / `ff`)
  |
  v
Preflight reads
  .opsx/config.yaml
  -> .opsx/active.yaml
  -> state.yaml / context.md
  -> proposal.md + specs/**/spec.md
  |
  v
Spec-split evidence collector
  -> enumerate spec files
  -> strip fenced code from main parse
  -> parse requirement/scenario headings per file
  -> keep fenced blocks separately for hidden-requirement checks
  |
  v
Split-spec review engine
  -> proposal coverage gap checks
  -> scope expansion checks
  -> duplicate requirement key checks
  -> likely duplicate behavior heuristics
  -> conflicting language checks
  -> empty spec / missing scenario checks
  -> read-only reviewer escalation recommendation for risky cases
  |
  v
Checkpoint wrapper in lib/workflow.js
  -> buildCheckpointResult('spec-split-checkpoint')
  -> canonical status PASS / WARN / BLOCK
  -> patchTargets reference existing artifacts only
  |
  +--> BLOCK / WARN findings
  |      -> patch proposal/specs/design/tasks
  |      -> do not create spec-review.md
  |
  '--> accepted checkpoint
         -> recordCheckpointResult(...)
         -> applyMutationEvent(SPEC_SPLIT_ACCEPTED)
         -> stage becomes SPEC_SPLIT_REVIEWED
         -> design generation may proceed

Static alignment boundary
  lib/generator.js + skills/opsx/*
    -> mention spec-split-checkpoint between specs and design
    -> regenerate checked-in commands/** from source of truth
```

This flow keeps Phase 5 inside the existing architecture: schema and workflow remain the contract layer, review logic is deterministic and local, accepted writes reuse Phase 4 state infrastructure, and guidance surfaces are refreshed from source-of-truth generators instead of ad hoc edits. [VERIFIED: .planning/phases/05-spec-split-checkpoint/05-CONTEXT.md; lib/change-state.js; lib/change-store.js; lib/workflow.js; lib/generator.js; skills/opsx/SKILL.md]

### Recommended Project Structure

```text
lib/
├── spec-validator.js        # new: parse per-file specs and generate split-spec findings
├── workflow.js              # add runSpecSplitCheckpoint() and contract validation
├── change-store.js          # add specSplit checkpoint slot / alias normalization
├── change-state.js          # reuse SPEC_SPLIT_ACCEPTED -> SPEC_SPLIT_REVIEWED
├── generator.js             # update checkpoint order notes for generated commands
├── runtime-guidance.js      # optional read-only surfacing of spec-split state/results
└── workspace.js             # existing stage defaults remain compatible

scripts/
└── test-workflow-runtime.js # extend with Phase 5 schema/validator/persistence/guidance cases

skills/opsx/
├── SKILL.md
└── references/
    ├── action-playbooks.md
    └── action-playbooks-zh.md
```

This structure preserves the existing repo boundaries: parsing/review is isolated in one small module, `workflow.js` stays the checkpoint facade, state persistence remains centralized, and all generated or skill-facing behavior still flows through existing source-of-truth files. [VERIFIED: lib/workflow.js; lib/change-store.js; lib/generator.js; skills/opsx/SKILL.md; .planning/phases/05-spec-split-checkpoint/05-CONTEXT.md]

### Pattern 1: Parse a Structured Spec Corpus First

**What:** Build a per-file corpus like `{ path, capability, sections, requirements, scenarios, fencedBlocks, tokens }` before adding findings. This is the key architectural change from the current `normalizePlanningEvidence()` model, which flattens every spec into one `specs.text` string. [VERIFIED: lib/workflow.js; skills/opsx/references/artifact-templates.md]

**When to use:** Use this at the start of `runSpecSplitCheckpoint()` whenever `specs/**/spec.md` files are present and before any duplicate/conflict/scope checks run. [VERIFIED: .planning/phases/05-spec-split-checkpoint/05-CONTEXT.md; lib/change-artifacts.js]

**Example:**

```javascript
// Source pattern: lib/workflow.js normalizePlanningEvidence() + artifact-templates.md
function collectSpecSplitEvidence({ proposalText, specFiles }) {
  const corpus = specFiles.map(({ path, text }) => parseSpecFile(path, text));
  return {
    proposal: parseProposalScope(proposalText),
    specs: corpus,
    requirementCount: corpus.reduce((sum, spec) => sum + spec.requirements.length, 0),
    scenarioCount: corpus.reduce((sum, spec) => sum + spec.scenarios.length, 0)
  };
}
```

### Pattern 2: Keep the Checkpoint Wrapper Thin

**What:** Put parsing and finding logic in the new validator module, then let `lib/workflow.js` do only schema resolution, review-state lookup, canonical result shaping, and next-step wording. This matches the current `runSpecCheckpoint()` and `runTaskCheckpoint()` pattern. [VERIFIED: lib/workflow.js; .planning/phases/05-spec-split-checkpoint/05-CONTEXT.md]

**When to use:** Use this pattern for `runSpecSplitCheckpoint()` and any later checkpoint that needs custom validation but the same result contract. [VERIFIED: lib/workflow.js]

**Example:**

```javascript
// Source pattern: lib/workflow.js runSpecCheckpoint() + buildCheckpointResult()
function runSpecSplitCheckpoint(options = {}) {
  const schema = resolveSchema(options);
  const evidence = collectSpecSplitEvidence(options);
  const findings = reviewSpecSplitEvidence(evidence, options);
  return buildCheckpointResult(schema, 'spec-split-checkpoint', findings, {
    phase: 'planning',
    nextStep: findings.length ? undefined : 'Proceed to design.'
  });
}
```

### Pattern 3: Normalize Checkpoint Keys at the State Boundary

**What:** Accept canonical ids like `spec-split-checkpoint` at the workflow layer, but normalize them to one persisted state key before writing `state.yaml`. Without this, Phase 4's explicit checkpoint shape will drop the new checkpoint on write. [VERIFIED: lib/change-store.js; node -e normalizeChangeState probe; .planning/phases/05-spec-split-checkpoint/05-CONTEXT.md]

**When to use:** Use this in `createDefaultCheckpoints()`, `normalizeChangeState()`, and `recordCheckpointResult()`. [VERIFIED: lib/change-store.js]

**Example:**

```javascript
// Source pattern: lib/change-store.js createDefaultCheckpoints() + recordCheckpointResult()
const CHECKPOINT_KEY_ALIASES = Object.freeze({
  'spec-checkpoint': 'spec',
  'spec-split-checkpoint': 'specSplit',
  'task-checkpoint': 'task',
  'execution-checkpoint': 'execution'
});
```

### Anti-Patterns to Avoid

- **Prompt-only validation:** burying split-spec review logic inside generated prompts would bypass tests, duplicate rules across platforms, and violate D-04's reusable-module decision. [VERIFIED: .planning/phases/05-spec-split-checkpoint/05-CONTEXT.md; lib/workflow.js]
- **Standalone `spec-review.md`:** the phase explicitly forbids extra review artifacts; findings must patch existing `proposal.md`, `specs/**/spec.md`, `design.md`, or `tasks.md`. [VERIFIED: .planning/phases/05-spec-split-checkpoint/05-CONTEXT.md; skills/opsx/SKILL.md]
- **New public checkpoint route:** adding `/opsx-spec-split-checkpoint` or `$opsx-spec-split-checkpoint` would reopen the Phase 3 public surface and is unnecessary because `propose`, `continue`, and `ff` already own planning flow. [VERIFIED: .planning/phases/03-skill-and-command-surface-rewrite/03-CONTEXT.md; .planning/phases/05-spec-split-checkpoint/05-CONTEXT.md]
- **Raw regex over unfiltered Markdown:** if requirement/scenario counting scans fenced code blocks directly, hidden requirements can either be missed as a finding or incorrectly counted as valid spec content. [VERIFIED: .planning/phases/05-spec-split-checkpoint/05-CONTEXT.md; skills/opsx/references/artifact-templates.md]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Review artifact lifecycle | `spec-review.md` plus custom storage | `buildCheckpointResult()` + `patchTargets` + existing planning artifacts | The contract already says checkpoint results update existing artifacts only and create no new review files. [VERIFIED: lib/workflow.js; .planning/phases/05-spec-split-checkpoint/05-CONTEXT.md] |
| Generated command refresh | Manual edits to `commands/**` | Edit `lib/generator.js` and regenerate from `buildPlatformBundle()` | Phase 3 locked centralized generation and current tests already protect bundle parity. [VERIFIED: .planning/phases/03-skill-and-command-surface-rewrite/03-CONTEXT.md; lib/generator.js; scripts/test-workflow-runtime.js] |
| Secondary lifecycle engine | Ad hoc JSON or prompt-local checkpoint status | Existing `change-state.js` events/stages plus `change-store.js` persistence | Phase 4 already owns durable checkpoint state and contains the exact split-spec stage/event primitives this phase needs. [VERIFIED: .planning/phases/04-change-state-machine-and-drift-control/04-CONTEXT.md; lib/change-state.js; lib/change-store.js] |
| Non-deterministic duplicate detection as the primary path | LLM-only reviewer for every change | Deterministic local heuristics first, optional read-only escalation only for risky cases | D-08 and D-09 require inline local review for simple cases while keeping higher-risk escalation read-only and bounded. [VERIFIED: .planning/phases/05-spec-split-checkpoint/05-CONTEXT.md] |

**Key insight:** this phase does not need a general-purpose review platform. The spec format is already narrow and the workflow already has a checkpoint contract, so a deterministic parser plus bounded heuristics is sufficient for the base path, while risky changes can still request human-or-agent judgment without creating new artifacts or public commands. [VERIFIED: skills/opsx/references/artifact-templates.md; .planning/phases/05-spec-split-checkpoint/05-CONTEXT.md]

## Common Pitfalls

### Pitfall 1: Shipping Only the Schema Row

**What goes wrong:** `schema.json` gains `spec-split-checkpoint`, but validation, next-step wording, state persistence, and generated guidance still behave as if only three checkpoints exist. [VERIFIED: schemas/spec-driven/schema.json; lib/workflow.js; lib/change-store.js]

**Why it happens:** the current contract is duplicated across schema, `DEFAULT_CHECKPOINT_IDS`, `buildCheckpointNextStep()`, generator text, skill docs, and explicit checkpoint slots in state normalization. [VERIFIED: lib/workflow.js; lib/generator.js; skills/opsx/SKILL.md; lib/change-store.js]

**How to avoid:** change the schema, workflow checkpoint catalog, state key normalization, generator notes, skill docs, and runtime tests in one bounded slice. [VERIFIED: .planning/phases/05-spec-split-checkpoint/05-CONTEXT.md; scripts/test-workflow-runtime.js]

**Warning signs:** `validateCheckpointContracts()` still passes while `state.yaml` never shows a spec-split result, or generated command text still says the first planning checkpoint is after `design`. [VERIFIED: lib/workflow.js; lib/change-store.js; lib/generator.js]

### Pitfall 2: Flattening All Specs Into One Blob

**What goes wrong:** duplicate/conflict findings can only point to a generic `specs` target, and cross-spec reasoning becomes too weak to distinguish one bad file from another. [VERIFIED: lib/workflow.js; .planning/phases/05-spec-split-checkpoint/05-CONTEXT.md]

**Why it happens:** `normalizePlanningEvidence()` currently stores `specs.text`, `requirementCount`, and `scenarioCount`, but it does not preserve per-file requirement records. [VERIFIED: lib/workflow.js]

**How to avoid:** parse each `specs/<capability>/spec.md` into a structured record first, then aggregate across the corpus only after file-level findings can be attached. [VERIFIED: skills/opsx/references/artifact-templates.md; openspec/changes/auto-checkpoint-review/specs/automatic-checkpoint-review/spec.md]

**Warning signs:** all findings use `patchTargets: ['specs']` even when only one spec file is wrong, or duplicate detection cannot report which requirements collided. [VERIFIED: .planning/phases/05-spec-split-checkpoint/05-CONTEXT.md]

### Pitfall 3: Losing the New Checkpoint on State Round-Trip

**What goes wrong:** `recordCheckpointResult()` appears to write the split-spec result, but `normalizeChangeState()` removes it because only `spec`, `task`, and `execution` are preserved. [VERIFIED: lib/change-store.js; node -e normalizeChangeState probe]

**Why it happens:** Phase 4 normalized the checkpoint shape explicitly instead of preserving unknown keys. [VERIFIED: lib/change-store.js; .planning/phases/04-change-state-machine-and-drift-control/04-CONTEXT.md]

**How to avoid:** add a normalized `specSplit` slot or explicit alias mapping and lock it with a state round-trip test. [VERIFIED: .planning/phases/05-spec-split-checkpoint/05-CONTEXT.md; scripts/test-workflow-runtime.js] [ASSUMED]

**Warning signs:** state writes succeed but `buildStatus()` or direct YAML inspection never shows any split-spec checkpoint metadata. [VERIFIED: lib/change-store.js; lib/runtime-guidance.js]

### Pitfall 4: Guidance Drift Across Source-of-Truth and Checked-In Commands

**What goes wrong:** skill docs or generated prompt bundles keep telling users that the first planning checkpoint is `spec checkpoint` after `design`, even after the validator changes. [VERIFIED: lib/generator.js; skills/opsx/SKILL.md; skills/opsx/references/action-playbooks.md]

**Why it happens:** checkpoint wording currently exists in both source-of-truth generator strings and distributed skill/playbook docs. [VERIFIED: lib/generator.js; skills/opsx/SKILL.md; skills/opsx/references/action-playbooks.md; skills/opsx/references/action-playbooks-zh.md]

**How to avoid:** update `lib/generator.js`, `skills/opsx/SKILL.md`, both playbooks, then regenerate and parity-check `commands/**`. [VERIFIED: lib/generator.js; scripts/test-workflow-runtime.js; .planning/phases/03-skill-and-command-surface-rewrite/03-CONTEXT.md]

**Warning signs:** `rg -n "spec checkpoint" lib/generator.js skills/opsx commands` still shows only the old design-before-tasks wording without `spec-split-checkpoint`. [VERIFIED: lib/generator.js; skills/opsx/SKILL.md; skills/opsx/references/action-playbooks.md]

### Pitfall 5: Reviewer Escalation Becomes Mutating or Artifact-Creating

**What goes wrong:** the “read-only reviewer” ends up editing files directly or creating `spec-review.md`, which violates the phase boundary. [VERIFIED: .planning/phases/05-spec-split-checkpoint/05-CONTEXT.md]

**Why it happens:** it is easy to conflate “use a reviewer for riskier cases” with “introduce a separate review workflow.” [VERIFIED: .planning/phases/05-spec-split-checkpoint/05-CONTEXT.md]

**How to avoid:** encode escalation as checkpoint findings and next-step guidance only; keep the actual checkpoint output contract unchanged and patch existing artifacts manually or through normal planning actions afterward. [VERIFIED: .planning/phases/05-spec-split-checkpoint/05-CONTEXT.md; lib/workflow.js]

**Warning signs:** new files named `spec-review.md`, `review.md`, or any prompt text that tells the reviewer to write artifacts directly. [VERIFIED: .planning/phases/05-spec-split-checkpoint/05-CONTEXT.md]

### Pitfall 6: Letting Fenced Code Count as Real Spec Content

**What goes wrong:** a code sample containing `### Requirement:` or `SHALL` can either satisfy requirement/scenario counters incorrectly or hide normative behavior from the validator. [VERIFIED: .planning/phases/05-spec-split-checkpoint/05-CONTEXT.md; skills/opsx/references/artifact-templates.md]

**Why it happens:** current planning checks use regexes over raw markdown text, which do not distinguish prose from fenced blocks. [VERIFIED: lib/workflow.js]

**How to avoid:** strip fenced blocks before main parsing, then scan those blocks separately for hidden requirement headings or normative language and report them explicitly. [VERIFIED: .planning/phases/05-spec-split-checkpoint/05-CONTEXT.md]

**Warning signs:** the requirement count changes when content is wrapped in triple backticks, or hidden requirements inside code blocks never produce findings. [VERIFIED: lib/workflow.js; .planning/phases/05-spec-split-checkpoint/05-CONTEXT.md]

## Code Examples

Verified patterns from repo-local source-of-truth files:

### Canonical Checkpoint Result Wrapper

```javascript
// Source: lib/workflow.js
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
    createsArtifacts: []
  };
}
```

This is the contract Phase 5 should reuse verbatim for `spec-split-checkpoint`; the new runner should add findings, not invent a new result shape. [VERIFIED: lib/workflow.js]

### State Checkpoint Persistence Shape

```javascript
// Source: lib/change-store.js
function createDefaultCheckpoints() {
  return {
    spec: Object.assign({}, DEFAULT_CHECKPOINTS.spec),
    task: Object.assign({}, DEFAULT_CHECKPOINTS.task),
    execution: Object.assign({}, DEFAULT_CHECKPOINTS.execution)
  };
}
```

Phase 5 must change this boundary because the current default shape has no slot for split-spec review, and `normalizeChangeState()` mirrors the same limitation. [VERIFIED: lib/change-store.js; node -e normalizeChangeState probe]

### Spec Grammar the Validator Can Rely On

```markdown
## ADDED Requirements

### Requirement: Example requirement
The system SHALL ...

#### Scenario: Example scenario
- **WHEN** ...
- **THEN** ...
```

The local spec template already standardizes these headings, which is why a bounded parser is viable without adding a general-purpose markdown dependency. [VERIFIED: skills/opsx/references/artifact-templates.md; skills/opsx/references/artifact-templates-zh.md]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| First planning review happens only at `spec-checkpoint` after `design`. | Add `spec-split-checkpoint` after `specs` and before `design`, while keeping `spec-checkpoint` as the later design-before-tasks gate. | Phase 5 scope for 2026-04-28 planning. [VERIFIED: schemas/spec-driven/schema.json; .planning/ROADMAP.md; .planning/phases/05-spec-split-checkpoint/05-CONTEXT.md] | Design generation stops depending on broken or drifted split specs. [VERIFIED: .planning/ROADMAP.md; .planning/PROJECT.md] |
| Planning evidence keeps one merged `specs.text` block. | Build a structured per-file spec corpus before applying duplicate/conflict/scope checks. | Recommended for Phase 5. [VERIFIED: lib/workflow.js; skills/opsx/references/artifact-templates.md] | Findings can point to exact spec files and requirement headings instead of generic `specs` drift. [VERIFIED: .planning/phases/05-spec-split-checkpoint/05-CONTEXT.md] |
| Persisted checkpoint state supports only `spec`, `task`, and `execution`. | Extend normalized state to preserve split-spec review under a stable alias or canonical key mapping. | Required for Phase 5. [VERIFIED: lib/change-store.js; node -e normalizeChangeState probe; .planning/phases/05-spec-split-checkpoint/05-CONTEXT.md] | Accepted split-spec review survives disk round-trips and later status/continue flows. [VERIFIED: lib/change-store.js; lib/runtime-guidance.js] |

**Deprecated/outdated:**

- Prompt-only split-spec review is outdated for this repo because D-04 explicitly requires a reusable validator module exposed through `lib/workflow.js`. [VERIFIED: .planning/phases/05-spec-split-checkpoint/05-CONTEXT.md]
- A standalone `spec-review.md` artifact is out of scope because D-09 and D-10 require read-only escalation and patching existing artifacts only. [VERIFIED: .planning/phases/05-spec-split-checkpoint/05-CONTEXT.md]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Requirement “IDs” should be derived from normalized `### Requirement:` heading text because the current spec template has no separate machine-readable id field. [ASSUMED] | Architecture Patterns; Common Pitfalls | Duplicate-requirement detection may need a spec-format change instead of simple title normalization. |
| A2 | “Larger requirement sets” can be implemented with a small deterministic threshold such as total requirement count or spec-file count, not only subjective judgment. [ASSUMED] | Open Questions; Common Pitfalls | Reviewer escalation may be too noisy or too weak until the threshold is tuned. |
| A3 | Using an explicit persisted `specSplit` alias is a better bounded Phase 5 choice than redesigning checkpoint storage as a fully generic open-ended map. [ASSUMED] | Standard Stack; Common Pitfalls | Future checkpoint additions may require another normalization refactor. |

## Open Questions

1. **What numeric threshold should trigger read-only reviewer escalation for “larger requirement sets”?**
   - What we know: multi-spec, cross-capability, security-sensitive, and larger changes may escalate, but the context does not define a numeric threshold. [VERIFIED: .planning/phases/05-spec-split-checkpoint/05-CONTEXT.md]
   - What's unclear: whether a dense single-spec change should escalate at 5, 6, 8, or some other requirement count. [ASSUMED]
   - Recommendation: planner should lock one small deterministic threshold and add direct tests for “below threshold stays inline” and “above threshold recommends read-only reviewer.” [ASSUMED]

2. **Which persisted checkpoint key should Phase 5 standardize on?**
   - What we know: the context allows `specSplit`, `spec-split`, or the full canonical id in persisted state as long as public output stays `spec-split-checkpoint`. [VERIFIED: .planning/phases/05-spec-split-checkpoint/05-CONTEXT.md]
   - What's unclear: whether future phases will add enough checkpoints to justify a generic map right now. [ASSUMED]
   - Recommendation: use `checkpoints.specSplit` internally and centralize alias mapping at the state boundary so the public checkpoint id remains canonical. [ASSUMED]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All Phase 5 runtime modules and tests | ✓ | `v24.8.0` | None needed. [VERIFIED: node --version] |
| npm | Running the existing regression suite | ✓ | `11.6.0` | `node scripts/test-workflow-runtime.js` directly. [VERIFIED: npm --version; package.json] |
| Local `yaml` dependency | Existing `change-store` state persistence | ✓ | `2.8.3` | None needed; already installed because runtime tests pass. [VERIFIED: package.json; npm run test:workflow-runtime] |

**Missing dependencies with no fallback:**
- None. [VERIFIED: node --version; npm --version; npm run test:workflow-runtime]

**Missing dependencies with fallback:**
- None. [VERIFIED: node --version; npm --version; npm run test:workflow-runtime]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Custom Node.js integration/regression script using built-in `assert`. [VERIFIED: scripts/test-workflow-runtime.js] |
| Config file | none. [VERIFIED: package.json; scripts/test-workflow-runtime.js] |
| Quick run command | `npm run test:workflow-runtime` [VERIFIED: package.json] |
| Full suite command | `npm run test:workflow-runtime` [VERIFIED: package.json] |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SPEC-01 | Schema and workflow contract include `spec-split-checkpoint` with correct trigger/insertion/states. [VERIFIED: .planning/REQUIREMENTS.md; .planning/ROADMAP.md] | integration | `npm run test:workflow-runtime` | ✅ existing script; new assertions required. [VERIFIED: scripts/test-workflow-runtime.js] |
| SPEC-02 | Validator catches duplicate requirement keys, likely duplicate behavior, conflicting language, empty specs, missing scenarios, proposal coverage gaps, scope expansion, and hidden fenced-code requirements. [VERIFIED: .planning/REQUIREMENTS.md; .planning/phases/05-spec-split-checkpoint/05-CONTEXT.md] | integration | `npm run test:workflow-runtime` | ✅ existing script; new fixtures/cases required. [VERIFIED: scripts/test-workflow-runtime.js] |
| SPEC-03 | Inline review stays local for simple cases and risky changes recommend read-only reviewer behavior without creating new files. [VERIFIED: .planning/REQUIREMENTS.md; .planning/phases/05-spec-split-checkpoint/05-CONTEXT.md] | integration | `npm run test:workflow-runtime` | ✅ existing script; new guidance/result assertions required. [VERIFIED: scripts/test-workflow-runtime.js] |
| SPEC-04 | Output stays on canonical checkpoint contract and persists via Phase 4 state infrastructure. [VERIFIED: .planning/REQUIREMENTS.md; lib/workflow.js; lib/change-store.js] | integration | `npm run test:workflow-runtime` | ✅ existing script; new result-shape and state round-trip assertions required. [VERIFIED: scripts/test-workflow-runtime.js] |

### Sampling Rate

- **Per task commit:** `npm run test:workflow-runtime` [VERIFIED: package.json]
- **Per wave merge:** `npm run test:workflow-runtime` [VERIFIED: package.json]
- **Phase gate:** Full suite green before `/gsd-verify-work`. [VERIFIED: package.json; CONTINUITY.md]

### Wave 0 Gaps

- [ ] `scripts/test-workflow-runtime.js` — add schema-order and `DEFAULT_CHECKPOINT_IDS` coverage for `spec-split-checkpoint`. [VERIFIED: schemas/spec-driven/schema.json; lib/workflow.js]
- [ ] `scripts/test-workflow-runtime.js` — add validator cases for duplicate requirement keys, likely duplicate behavior, conflicting language, hidden fenced-code requirements, empty specs, and missing scenarios. [VERIFIED: .planning/phases/05-spec-split-checkpoint/05-CONTEXT.md; skills/opsx/references/artifact-templates.md]
- [ ] `scripts/test-workflow-runtime.js` — add state round-trip coverage proving the split-spec checkpoint key survives `normalizeChangeState()` and `recordCheckpointResult()`. [VERIFIED: lib/change-store.js; node -e normalizeChangeState probe]
- [ ] `scripts/test-workflow-runtime.js` — add source-of-truth guidance assertions for generator output and bilingual playbooks mentioning `spec-split-checkpoint` before design. [VERIFIED: lib/generator.js; skills/opsx/SKILL.md; skills/opsx/references/action-playbooks.md; skills/opsx/references/action-playbooks-zh.md]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Phase 5 does not implement user auth or identity flows. [VERIFIED: .planning/ROADMAP.md; .planning/REQUIREMENTS.md] |
| V3 Session Management | no | Phase 5 is local planning validation, not session lifecycle logic. [VERIFIED: .planning/ROADMAP.md; .planning/REQUIREMENTS.md] |
| V4 Access Control | no | The phase does not add authorization decisions; it reuses local file-bound workflow state only. [VERIFIED: .planning/ROADMAP.md; lib/runtime-guidance.js] |
| V5 Input Validation | yes | Reuse safe path handling and bounded parsing for change names, capability names, spec file paths, and fenced-code scanning; do not trust raw markdown as already-normalized input. [VERIFIED: lib/runtime-guidance.js; lib/workspace.js; .planning/phases/05-spec-split-checkpoint/05-CONTEXT.md] |
| V6 Cryptography | no | Phase 5 does not add new crypto requirements beyond existing artifact hashing from earlier phases. [VERIFIED: .planning/ROADMAP.md; lib/change-artifacts.js] |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Unsafe change or capability names escaping the repo root | Tampering | Keep using `ensureSafeChangeName()`, `ensureSafeCapability()`, and path-boundary checks for any new spec-file discovery or reviewer helper. [VERIFIED: lib/runtime-guidance.js; lib/workspace.js] |
| Fenced code blocks hiding normative requirements or fake headings | Spoofing / Tampering | Strip fenced blocks from the main requirement parser, then scan them separately for `Requirement:` headings or normative `SHALL`/`MUST` language and flag them. [VERIFIED: .planning/phases/05-spec-split-checkpoint/05-CONTEXT.md; skills/opsx/references/artifact-templates.md] |
| Silent proposal-to-spec scope expansion | Tampering | Reuse proposal/spec token overlap and explicit patch targets so new scope gets surfaced before design is generated. [VERIFIED: lib/workflow.js; .planning/phases/05-spec-split-checkpoint/05-CONTEXT.md] |

## Sources

### Primary (HIGH confidence)

- `.planning/phases/05-spec-split-checkpoint/05-CONTEXT.md` - locked Phase 5 decisions, boundaries, and deferred work.
- `.planning/REQUIREMENTS.md` - SPEC-01 through SPEC-04 and TEST-04 scope.
- `.planning/ROADMAP.md` - Phase 5 goal and success criteria.
- `.planning/STATE.md` - current project position and prior-phase dependencies.
- `.planning/phases/03-skill-and-command-surface-rewrite/03-CONTEXT.md` - explicit public route constraints and generated-surface policy.
- `.planning/phases/04-change-state-machine-and-drift-control/04-CONTEXT.md` - checkpoint/state infrastructure decisions Phase 5 must reuse.
- `openspec/config.yaml` - project workflow defaults and security-review mode.
- `schemas/spec-driven/schema.json` - current checkpoint and artifact catalog.
- `lib/workflow.js` - current checkpoint contract, planning evidence model, and generator-facing strings.
- `lib/change-state.js` - existing split-spec stage/event support.
- `lib/change-store.js` - persisted checkpoint shape and current slot limitation.
- `lib/change-artifacts.js` - tracked artifact set used for persisted state and drift.
- `lib/runtime-guidance.js` - status/apply/read-only consumers of persisted state.
- `lib/generator.js` - source-of-truth checkpoint wording for generated command bundles.
- `lib/workspace.js` - stage defaults and new-change scaffolding compatibility.
- `skills/opsx/SKILL.md` - workflow loop and checkpoint rules.
- `skills/opsx/references/action-playbooks.md` - English route behavior.
- `skills/opsx/references/action-playbooks-zh.md` - Chinese route behavior.
- `skills/opsx/references/artifact-templates.md` - spec heading grammar and task artifact rules.
- `openspec/changes/auto-checkpoint-review/specs/automatic-checkpoint-review/spec.md` - representative real-world spec corpus with multiple requirements and scenarios.
- `scripts/test-workflow-runtime.js` - current test harness, runtime contract coverage, and source-of-truth parity checks.
- `package.json` - runtime/test scripts, dependency list, and Node engine floor.
- `node --version` / `npm --version` - local environment availability.
- `npm run test:workflow-runtime` - verified green regression baseline (`53 test(s) passed`).
- `node -e normalizeChangeState probe` - verified that extra checkpoint keys are currently dropped by state normalization.

### Secondary (MEDIUM confidence)

- None. Local codebase evidence was sufficient. [VERIFIED: repo inspection]

### Tertiary (LOW confidence)

- None. No web-only findings were needed. [VERIFIED: repo inspection]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Phase 5 can be planned entirely from repo-local modules, package metadata, and a passing baseline test suite. [VERIFIED: package.json; lib/workflow.js; npm run test:workflow-runtime]
- Architecture: HIGH - the repo already exposes the relevant boundaries: workflow contract, state persistence, generator source-of-truth, and stage transitions. [VERIFIED: lib/workflow.js; lib/change-state.js; lib/change-store.js; lib/generator.js]
- Pitfalls: HIGH - the biggest failure modes are directly visible in current code, including the missing schema row, hardcoded checkpoint catalog, flattened spec evidence, and dropped unknown checkpoint keys. [VERIFIED: schemas/spec-driven/schema.json; lib/workflow.js; lib/change-store.js]

**Research date:** 2026-04-28  
**Valid until:** 2026-05-28
