# Phase 6: TDD-Light Workflow - Research

**Researched:** 2026-04-28  
**Domain:** TDD-light task planning, checkpoint enforcement, and execution evidence persistence  
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

Copied from `.planning/phases/06-tdd-light-workflow/06-CONTEXT.md`. [VERIFIED: .planning/phases/06-tdd-light-workflow/06-CONTEXT.md]

### Locked Decisions

### TDD Mode Semantics
- **D-01:** Default `rules.tdd.mode` should be `strict`, not `light`, so behavior-change and bugfix tasks actually follow the RED/VERIFY discipline by default.
- **D-02:** `off` disables TDD checkpoint enforcement. `light` emits WARN findings for missing required TDD evidence. `strict` emits BLOCK findings for missing required RED or VERIFY evidence.
- **D-03:** Strict mode requires RED and VERIFY for behavior-change and bugfix work. GREEN is expected in generated task structure but should not be a separate BLOCK condition if the task plan is otherwise coherent. REFACTOR is always optional and must not block.
- **D-04:** The workflow should still be called TDD-light because enforcement is scoped to behavior-change and bugfix work, not every task type and not every top-level group.

### Task Template Shape
- **D-05:** `tasks.md` templates should add a top-level `## Test Plan` section with behavior under test, linked requirement/scenario when known, verification method, TDD mode, and exemption reason when applicable.
- **D-06:** Behavior-change and bugfix top-level task groups should use explicit child tasks named `RED`, `GREEN`, optional `REFACTOR`, and `VERIFY`.
- **D-07:** Docs-only, copy-only, config-only, migration-only, and generated-refresh-only groups may be exempt from RED/GREEN/VERIFY when the task plan states an exemption reason and still provides an appropriate verification action.

### Classification and Exemptions
- **D-08:** `.opsx/config.yaml` should define `rules.tdd.requireFor` and `rules.tdd.exempt` lists. Default `requireFor` should include `behavior-change` and `bugfix`; default `exempt` should include `docs-only`, `copy-only`, and `config-only`.
- **D-09:** Checkpoint logic may use simple heuristics from proposal/design/tasks text to classify task groups, but explicit `tasks.md` markers or exemption text should take precedence over heuristics.
- **D-10:** Exemptions should be visible in `tasks.md`; silent exemptions make downstream planning and review less reliable.

### Checkpoint Evidence
- **D-11:** `task-checkpoint` should report missing RED or VERIFY as WARN in `light` mode and BLOCK in `strict` mode for required task classes.
- **D-12:** `execution-checkpoint` should record completed TDD steps, verification command/result, diff summary, and drift for each top-level task group.
- **D-13:** Manual verification is acceptable only when the task plan explains why automated verification is not practical. In `light` mode unsupported manual-only verification should WARN; in `strict` mode missing RED or missing VERIFY still BLOCKS.
- **D-14:** Phase 6 should reuse existing state/checkpoint storage where possible instead of introducing a separate TDD record artifact.

### Carry-Forward Constraints
- **D-15:** Keep the implementation library-first and bounded. Do not build a full Node workflow runner or autonomous agent engine.
- **D-16:** Preserve Phase 4 one-top-level-task-group apply guidance; Phase 6 only strengthens the task and execution evidence attached to each group.
- **D-17:** Keep generated command/skill/docs surfaces source-of-truth driven. Update templates/playbooks/generators and verify generated parity rather than hand-editing only generated files.

### Claude's Discretion
None stated in `06-CONTEXT.md`. [VERIFIED: .planning/phases/06-tdd-light-workflow/06-CONTEXT.md]

### Deferred Ideas (OUT OF SCOPE)
- Final `opsx-verify`, `opsx-sync`, `opsx-archive`, path guard, unresolved drift blocking, and batch workflow enforcement remain Phase 7.
- Clean `opsx status --json`, path canonicalization, glob escaping, and broader regression hardening remain Phase 8.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TDD-01 | `.opsx/config.yaml` supports `rules.tdd.mode` with `off`, `light`, and `strict`. | `templates/project/config.yaml.tmpl` currently exposes only `rules.proposal`, `rules.design`, and `rules.tasks`, while `normalizeConfig()` preserves arbitrary nested `rules` but adds no `rules.tdd` defaults or list normalization; Phase 6 therefore needs both template and runtime config work, not just docs. [VERIFIED: templates/project/config.yaml.tmpl; lib/config.js; node -e normalizeConfig probe] |
| TDD-02 | `tasks.md` templates include a Test Plan and RED/GREEN/REFACTOR/VERIFY task structure for behavior changes and bug fixes. | The current artifact templates offer only numbered top-level task groups, the bilingual playbooks still say TDD-light is deferred to Phase 6, and `skills/opsx/SKILL.md` keeps the same deferral note; template and guidance surfaces must be updated together. [VERIFIED: skills/opsx/references/artifact-templates.md; skills/opsx/references/artifact-templates-zh.md; skills/opsx/references/action-playbooks.md; skills/opsx/references/action-playbooks-zh.md; skills/opsx/SKILL.md] |
| TDD-03 | `task-checkpoint` warns in light mode when behavior changes lack RED or VERIFY tasks and blocks in strict mode. | `runTaskCheckpoint()` currently checks only artifact presence, numbered groups, checklist items, generic testing/rollout/security/scope coverage, and a direct probe with `rules.tdd.mode: strict` produces no TDD-specific finding codes; enforcement must be added in runtime logic. [VERIFIED: lib/workflow.js; node -e runTaskCheckpoint probe] |
| TDD-04 | `execution-checkpoint` records completed steps, verification command/result, diff summary, and drift after each top-level task group. | `recordTaskGroupExecution()` currently persists only `at`, `taskGroup`, `verificationCommand`, `verificationResult`, `changedFiles`, and `checkpointStatus`, and `renderContextCapsule()` renders only that minimal last-verification block; additive execution evidence persistence is required. [VERIFIED: lib/change-store.js; lib/change-capsule.js; node -e verificationLog probe] |
</phase_requirements>

## Project Constraints (from AGENTS.md)

- Read `openspec/config.yaml` for project context and workflow defaults. [VERIFIED: AGENTS.md; openspec/config.yaml]
- Keep repo-authored guidance pointing at `openspec/changes/`, even though runtime commands read and write `.opsx/changes/` after migration. [VERIFIED: AGENTS.md; .planning/phases/03-skill-and-command-surface-rewrite/03-CONTEXT.md; .planning/phases/04-change-state-machine-and-drift-control/04-CONTEXT.md]
- Keep `security-review.md` between `design.md` and `tasks.md` when required or recommended. [VERIFIED: AGENTS.md; schemas/spec-driven/schema.json; lib/workflow.js]
- Run `spec checkpoint` before `tasks`, `task checkpoint` before `apply`, and `execution checkpoint` after each top-level task group; Phase 6 changes semantics of the last two instead of adding a new checkpoint id. [VERIFIED: AGENTS.md; schemas/spec-driven/schema.json; .planning/ROADMAP.md]
- Keep `proposal.md`, `specs/`, `design.md`, and `tasks.md` aligned when a checkpoint finds drift; do not introduce a separate TDD review artifact. [VERIFIED: AGENTS.md; skills/opsx/SKILL.md; .planning/phases/06-tdd-light-workflow/06-CONTEXT.md]
- No repo-local `.claude/skills/` or `.agents/skills/` directories were found, so there are no extra project-local skill rules beyond `AGENTS.md`. [VERIFIED: ls .claude/skills .agents/skills 2>/dev/null]

## Summary

This phase is a local contract extension on top of the Phase 4 and Phase 5 workflow runtime, not a new lifecycle stage. `schemas/spec-driven/schema.json` already contains the correct `task-checkpoint` and `execution-checkpoint` rows, `lib/change-state.js` already models `TASKS_READY`, `APPLYING_GROUP`, `GROUP_VERIFIED`, and `IMPLEMENTED`, and the existing runtime suite currently passes `66 test(s)`. [VERIFIED: schemas/spec-driven/schema.json; lib/change-state.js; npm run test:workflow-runtime]

The main implementation gap is runtime policy, not wording. `normalizeConfig()` currently leaves `rules.tdd` undefined unless a caller provides it, `runTaskCheckpoint()` ignores TDD config entirely, `buildApplyInstructions()` exposes only generic checkpoint status and next task group, `recordTaskGroupExecution()` stores no TDD-step or diff-summary evidence, and `renderContextCapsule()` can only summarize the old six-field verification entry. A template-only change would therefore make `tasks.md` look TDD-aware while enforcement and persisted proof stay unchanged. [VERIFIED: lib/config.js; lib/workflow.js; lib/runtime-guidance.js; lib/change-store.js; lib/change-capsule.js; node -e normalizeConfig probe; node -e runTaskCheckpoint probe; node -e verificationLog probe]

The safest plan split is four bounded slices: add normalized TDD policy defaults and task-group classification helpers; update task templates and bilingual playbooks with `## Test Plan` plus explicit RED/GREEN/REFACTOR/VERIFY examples and visible exemptions; extend `task-checkpoint` and `execution-checkpoint` plus execution persistence; then refresh tests and any adjacent source-of-truth surfaces that still carry “deferred to Phase 6” wording. [VERIFIED: .planning/phases/06-tdd-light-workflow/06-CONTEXT.md; skills/opsx/references/artifact-templates.md; skills/opsx/references/action-playbooks.md; skills/opsx/SKILL.md; lib/generator.js; scripts/test-workflow-runtime.js]

**Primary recommendation:** implement Phase 6 as an additive extension of existing `task-checkpoint` and `execution-checkpoint` behavior plus `state.yaml` verification entries; do not add a new checkpoint id, a new TDD artifact, or a new parser dependency. [VERIFIED: schemas/spec-driven/schema.json; lib/workflow.js; lib/change-store.js; package.json; .planning/phases/06-tdd-light-workflow/06-CONTEXT.md]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| `rules.tdd` defaults, config precedence, and mode normalization | API / Backend | CDN / Static | `resolveRuntimeConfig()` merges global, project, and change config through `normalizeConfig()`, while `templates/project/config.yaml.tmpl` only seeds the project file content. [VERIFIED: lib/runtime-guidance.js; lib/config.js; templates/project/config.yaml.tmpl] |
| `tasks.md` TDD structure, Test Plan, and visible exemption wording | CDN / Static | API / Backend | The canonical authored shape lives in artifact templates and bilingual playbooks, but runtime logic still reads the written markdown and enforces it later. [VERIFIED: skills/opsx/references/artifact-templates.md; skills/opsx/references/artifact-templates-zh.md; skills/opsx/references/action-playbooks.md; skills/opsx/references/action-playbooks-zh.md; lib/workflow.js] |
| Task-group classification and TDD WARN/BLOCK decisions | API / Backend | Database / Storage | `runTaskCheckpoint()` and `runExecutionCheckpoint()` own the actual enforcement semantics, while persisted state only records the accepted outcome of those decisions. [VERIFIED: lib/workflow.js; lib/change-store.js] |
| Execution proof, resume context, and drift sidecars | Database / Storage | API / Backend | `recordTaskGroupExecution()` writes `state.yaml`, `context.md`, and `drift.md`, and `buildStatus()` / `buildApplyInstructions()` consume that stored state on later runs. [VERIFIED: lib/change-store.js; lib/change-capsule.js; lib/runtime-guidance.js] |
| Prompt and skill parity for TDD-light wording | CDN / Static | API / Backend | `lib/generator.js`, `skills/opsx/SKILL.md`, and checked-in `commands/**` mirror workflow rules and are already guarded by the runtime suite. [VERIFIED: lib/generator.js; skills/opsx/SKILL.md; commands/codex/prompts/opsx-apply.md; scripts/test-workflow-runtime.js] |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js runtime | `>=14.14.0` in-project; local machine `v24.8.0` | Runs the CommonJS workflow modules, synchronous file I/O, regex-based markdown inspection, and the regression harness. | The package already targets Node `>=14.14.0`, and the current machine exceeds that floor, so Phase 6 can stay inside built-in APIs. [VERIFIED: package.json; node --version] |
| `yaml` | `2.8.3` published `2026-03-21` | Parses and writes `.opsx/config.yaml`, `state.yaml`, and `active.yaml`. | The repo already depends on `yaml@2.8.3`, and `npm view` shows that same version as current on the registry, so no new config/state serialization dependency is needed. [VERIFIED: package.json; npm view yaml version time --json] |
| `lib/config.js` | repo-local | Normalizes config defaults and precedence. | Phase 6 needs TDD mode and list defaults to live here, because this is the shared normalization boundary used by runtime guidance. [VERIFIED: lib/config.js; lib/runtime-guidance.js] |
| `lib/workflow.js` | repo-local | Canonical checkpoint contract, planning evidence extraction, group parsing, and task/execution checkpoint logic. | All TDD-light enforcement belongs here because the current probes show config changes alone have no effect on checkpoint findings. [VERIFIED: lib/workflow.js; node -e runTaskCheckpoint probe] |
| `lib/change-store.js` + `lib/change-capsule.js` | repo-local | Persist execution evidence and render the bounded context capsule. | TDD-04 requires richer proof after each top-level group, and these files already own `verificationLog` persistence and last-verification rendering. [VERIFIED: lib/change-store.js; lib/change-capsule.js] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `lib/runtime-guidance.js` | repo-local | Builds apply/status/resume payloads from normalized config, task groups, checkpoint results, and persisted state. | Update this when apply guidance must expose TDD mode, TDD blockers, or richer execution evidence in text/JSON payloads. [VERIFIED: lib/runtime-guidance.js] |
| `templates/project/config.yaml.tmpl` | repo-local | Seeds project-local `.opsx/config.yaml`. | Update this when the default `rules.tdd` shape needs to exist in new or refreshed projects. [VERIFIED: templates/project/config.yaml.tmpl] |
| `skills/opsx/references/artifact-templates*.md` | repo-local | Source-of-truth task template examples in English and Chinese. | Update these when `tasks.md` gains `## Test Plan`, TDD step naming, and exemption examples. [VERIFIED: skills/opsx/references/artifact-templates.md; skills/opsx/references/artifact-templates-zh.md] |
| `skills/opsx/references/action-playbooks*.md` | repo-local | Source-of-truth route behavior in English and Chinese. | Update these when `apply`, `ff`, `continue`, or checkpoint wording needs Phase 6 TDD-light guidance. [VERIFIED: skills/opsx/references/action-playbooks.md; skills/opsx/references/action-playbooks-zh.md] |
| `scripts/test-workflow-runtime.js` | repo-local | Fast assert-based regression suite for schema, state, runtime guidance, generation, and CLI behavior. | Extend this instead of creating a second test runner; it already passes `66 test(s)` and covers every layer Phase 6 touches. [VERIFIED: scripts/test-workflow-runtime.js; npm run test:workflow-runtime] |
| `lib/generator.js` + `skills/opsx/SKILL.md` | repo-local | Adjacent source-of-truth prompt and skill surfaces. | Include these in a parity wave if Phase 6 chooses to remove all “deferred to Phase 6” wording from distributed guidance. [VERIFIED: lib/generator.js; skills/opsx/SKILL.md] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Existing `task-checkpoint` and `execution-checkpoint` ids | Add a new `tdd-checkpoint` | A new checkpoint id would duplicate schema timing that already exists and expand route/docs complexity without satisfying any stated requirement. [VERIFIED: schemas/spec-driven/schema.json; .planning/REQUIREMENTS.md; .planning/ROADMAP.md] |
| Current bounded markdown parsing approach | Add a full Markdown AST dependency | The task grammar is already constrained to numbered `##` groups and exact checkbox lines, so a bounded parser stays cheaper and avoids new dependencies. [VERIFIED: skills/opsx/references/artifact-templates.md; lib/workflow.js; lib/runtime-guidance.js; package.json] |
| Existing `verificationLog` + `context.md` + `drift.md` sidecars | Introduce `tdd-log.md` or another standalone artifact | Phase 6 context explicitly says to reuse existing state/checkpoint storage where possible, and the current store/capsule path already owns execution evidence. [VERIFIED: .planning/phases/06-tdd-light-workflow/06-CONTEXT.md; lib/change-store.js; lib/change-capsule.js] |
| Runtime-normalized defaults | Document `rules.tdd` only in templates and playbooks | `normalizeConfig()` currently returns only whatever nested `rules.tdd` callers provide, so docs-only defaults would not protect runtime behavior. [VERIFIED: lib/config.js; node -e normalizeConfig probe] |

**Installation:** No new packages are required for Phase 6. [VERIFIED: package.json; npm run test:workflow-runtime]

```bash
npm run test:workflow-runtime
```

**Version verification:** `yaml@2.8.3` is the current npm-registry version and was published on `2026-03-21`; the local environment provides Node `v24.8.0` and npm `11.6.0`. [VERIFIED: npm view yaml version time --json; node --version; npm --version]

## Architecture Patterns

### System Architecture Diagram

```text
.opsx/config.yaml + change.yaml + global config
  |
  v
resolveRuntimeConfig() / normalizeConfig()
  -> rules.tdd.mode
  -> rules.tdd.requireFor
  -> rules.tdd.exempt
  |
  v
Planning artifact reads
  proposal.md + specs/** + design.md + tasks.md
  |
  +--> Test Plan section extractor
  |      -> requirement/scenario link
  |      -> verification method
  |      -> explicit mode / exemption reason
  |
  '--> Numbered task-group parser
         -> top-level groups
         -> checklist items
         -> RED/GREEN/REFACTOR/VERIFY markers
         -> explicit exemption markers
  |
  v
Task-group classifier
  -> explicit markers win
  -> visible exemption wins
  -> heuristics from proposal/design/tasks fill gaps
  |
  v
runTaskCheckpoint()
  -> off: ignore TDD checks
  -> light: WARN on missing RED / VERIFY for required classes
  -> strict: BLOCK on missing RED / VERIFY for required classes
  |
  v
buildApplyInstructions()
  -> ready / prerequisites
  -> selected next top-level group
  -> checkpoint findings surfaced to the operator
  |
  v
After one top-level group completes
  -> runExecutionCheckpoint()
  -> recordTaskGroupExecution()
       -> state.yaml verificationLog
       -> context.md last verification
       -> drift.md entries
  |
  v
Later status / resume / continue
  -> read persisted stage, warnings, blockers, hash drift, and execution proof
```

This flow stays inside the existing architecture: config normalization remains the policy boundary, TDD parsing lives next to current task parsing, enforcement reuses the existing checkpoint contract, and durable proof continues to live in state and sidecars rather than in a new artifact type. [VERIFIED: lib/config.js; lib/workflow.js; lib/runtime-guidance.js; lib/change-store.js; lib/change-capsule.js; .planning/phases/06-tdd-light-workflow/06-CONTEXT.md]

### Recommended Project Structure

```text
lib/
├── config.js               # add normalized rules.tdd defaults and list cleanup
├── workflow.js             # parse Test Plan, classify task groups, enforce TDD-light, enrich execution checkpoint
├── runtime-guidance.js     # surface TDD-aware apply guidance from shared parsing/checkpoint results
├── change-store.js         # persist additive execution evidence in verificationLog
├── change-capsule.js       # render richer last-verification summary in context.md
├── change-state.js         # likely unchanged; existing apply stages are already sufficient
└── generator.js            # optional parity refresh if prompt surfaces must mention shipped TDD-light behavior

templates/project/
└── config.yaml.tmpl        # add rules.tdd defaults

skills/opsx/references/
├── artifact-templates.md
├── artifact-templates-zh.md
├── action-playbooks.md
└── action-playbooks-zh.md

schemas/spec-driven/
└── schema.json             # likely no new checkpoint row; keep current ids canonical

scripts/
└── test-workflow-runtime.js
```

The hidden dependencies here matter for planning. `lib/change-capsule.js` is required if TDD-04 wants proof visible in `context.md`, `lib/config.js` is required if `rules.tdd` defaults should behave consistently at runtime, and `lib/generator.js` plus `skills/opsx/SKILL.md` become necessary if the phase also closes guidance drift beyond the user-listed core files. [VERIFIED: lib/change-capsule.js; lib/config.js; lib/generator.js; skills/opsx/SKILL.md]

### Pattern 1: Treat `## Test Plan` as Metadata, Not a Numbered Task Group

**What:** Add `## Test Plan` as a separate section that is parsed explicitly, while preserving numbered `## 1. ...` task groups as the only executable apply groups. [VERIFIED: .planning/phases/06-tdd-light-workflow/06-CONTEXT.md; lib/workflow.js; lib/runtime-guidance.js]

**When to use:** Use this before classifying TDD requirements or selecting the next top-level group for `apply`. [VERIFIED: lib/workflow.js; lib/runtime-guidance.js]

**Example:**

```javascript
// Source pattern: lib/workflow.js + lib/runtime-guidance.js
function extractTestPlan(tasksText = '') {
  const match = String(tasksText).match(/^##\s+Test Plan\b([\s\S]*?)(?=^##\s+\d+\.\s+|\Z)/m);
  return match ? match[1].trim() : '';
}

// Existing numbered-group parser intentionally ignores non-numeric headings.
const headingMatches = Array.from(String(tasksText).matchAll(/^##\s+(\d+\.\s+.+)$/gm));
```

The existing numbered-group regex means `## Test Plan` can be introduced safely, but it will remain invisible until the new extractor exists. [VERIFIED: lib/workflow.js; lib/runtime-guidance.js]

### Pattern 2: Explicit Task Markers First, Heuristics Second

**What:** Classify each top-level group by reading explicit RED/GREEN/REFACTOR/VERIFY markers and visible exemption text first, then fall back to simple behavior-change heuristics only when the task text is ambiguous. [VERIFIED: .planning/phases/06-tdd-light-workflow/06-CONTEXT.md; lib/workflow.js]

**When to use:** Use this inside `runTaskCheckpoint()` and any apply preview logic that needs to explain why a group is required, exempt, WARNed, or BLOCKed. [VERIFIED: lib/workflow.js; lib/runtime-guidance.js]

**Example:**

```javascript
// Source pattern: normalizeChecklistItem(), extractChecklistItems(), and D-09 from 06-CONTEXT.md
const items = extractChecklistItems(group.text).map((line) => normalizeChecklistItem(line));
const hasRed = items.some((item) => /^RED\b/i.test(item));
const hasGreen = items.some((item) => /^GREEN\b/i.test(item));
const hasRefactor = items.some((item) => /^REFACTOR\b/i.test(item));
const hasVerify = items.some((item) => /^VERIFY\b/i.test(item));
```

This keeps the enforcement grounded in visible task text and avoids over-trusting fuzzy heuristics when the author already stated intent. [VERIFIED: lib/workflow.js; .planning/phases/06-tdd-light-workflow/06-CONTEXT.md]

### Pattern 3: Keep Execution Proof Additive and State-Owned

**What:** Extend the existing `verificationLog` entry and capsule renderer with additional TDD-light proof instead of introducing a second persistence path. [VERIFIED: .planning/phases/06-tdd-light-workflow/06-CONTEXT.md; lib/change-store.js; lib/change-capsule.js]

**When to use:** Use this after each completed top-level group when `execution checkpoint` runs. [VERIFIED: lib/change-store.js; .planning/ROADMAP.md]

**Example:**

```javascript
// Source: lib/change-store.js (current minimal execution proof shape)
const verificationEntry = {
  at: timestamp,
  taskGroup: completedTaskGroup,
  verificationCommand: toNonEmptyString(payload.verificationCommand) || 'UNCONFIRMED',
  verificationResult: toNonEmptyString(payload.verificationResult) || 'UNCONFIRMED',
  changedFiles,
  checkpointStatus
};
```

Phase 6 should extend this object in-place so later status/resume/context consumers can keep reading one durable source of truth. [VERIFIED: lib/change-store.js; lib/change-capsule.js]

### Pattern 4: Reuse Existing WARN Semantics for Light Mode

**What:** Keep `light` mode advisory by relying on the existing accepted-WARN semantics instead of inventing a partial-block flow. [VERIFIED: .planning/phases/06-tdd-light-workflow/06-CONTEXT.md; lib/change-store.js; lib/runtime-guidance.js]

**When to use:** Use this when designing both task-checkpoint and execution-checkpoint outcomes for missing TDD evidence. [VERIFIED: lib/change-store.js; lib/runtime-guidance.js]

**Example:**

```javascript
// Source: lib/change-store.js
if (['BLOCK', 'FAIL', 'FAILED', 'ERROR', 'REJECTED'].includes(status)) return false;
return ['PASS', 'WARN', 'OK', 'DONE', 'ACCEPTED'].includes(status);
```

Because `WARN` is treated as accepted, light-mode TDD findings can stay visible without blocking apply progression or hash refresh. [VERIFIED: lib/change-store.js]

### Anti-Patterns to Avoid

- **Template-only TDD:** adding `## Test Plan` and RED/GREEN/VERIFY examples without runtime parsing leaves `task-checkpoint` behavior unchanged. [VERIFIED: lib/workflow.js; node -e runTaskCheckpoint probe]
- **Silent exemptions:** a hidden config exemption with no visible reason in `tasks.md` contradicts D-10 and makes review/debugging harder. [VERIFIED: .planning/phases/06-tdd-light-workflow/06-CONTEXT.md]
- **New `tdd-log.md` artifact:** Phase 6 explicitly prefers existing state/checkpoint storage; a new artifact would add resume and drift complexity for no requirement gain. [VERIFIED: .planning/phases/06-tdd-light-workflow/06-CONTEXT.md; lib/change-store.js]
- **Treating GREEN or REFACTOR as hard blockers:** D-03 makes RED and VERIFY the real strict-mode gates; GREEN is expected structure, and REFACTOR remains optional. [VERIFIED: .planning/phases/06-tdd-light-workflow/06-CONTEXT.md]
- **Updating only one of the two task-group parsers:** `lib/workflow.js` and `lib/runtime-guidance.js` both parse numbered task groups today, so changing one without the other will create preview/runtime drift. [VERIFIED: lib/workflow.js; lib/runtime-guidance.js]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dedicated TDD artifact storage | `tdd-log.md` or another sidecar | Extend `verificationLog`, `context.md`, and `drift.md` | Existing state and sidecars already persist execution proof and are the declared reuse path for Phase 6. [VERIFIED: .planning/phases/06-tdd-light-workflow/06-CONTEXT.md; lib/change-store.js; lib/change-capsule.js] |
| Second workflow test runner | New bespoke Phase 6 harness | Extend `scripts/test-workflow-runtime.js` | The current suite already covers schema, runtime guidance, state persistence, generation parity, and CLI contracts in one fast command. [VERIFIED: scripts/test-workflow-runtime.js; npm run test:workflow-runtime] |
| Full Markdown AST or parser dependency | Generic Markdown library for task parsing | Bounded section + checkbox parsing over the constrained template grammar | The task format is already exact enough for line-oriented parsing, and the project currently has only one external dependency. [VERIFIED: skills/opsx/references/artifact-templates.md; lib/workflow.js; lib/runtime-guidance.js; package.json] |
| New lifecycle stage just for TDD | `TDD_READY` / `TDD_VERIFIED` state expansion | Existing `TASKS_READY` -> `APPLYING_GROUP` -> `GROUP_VERIFIED` / `IMPLEMENTED` stages | Current requirements change checkpoint semantics and proof fields, not lifecycle ordering. [VERIFIED: .planning/REQUIREMENTS.md; lib/change-state.js; .planning/ROADMAP.md] |
| Schema expansion with another checkpoint id | `tdd-checkpoint` | Existing `task-checkpoint` and `execution-checkpoint` ids | The current schema already expresses the correct insertion points for planning and execution. [VERIFIED: schemas/spec-driven/schema.json; .planning/REQUIREMENTS.md] |

**Key insight:** Phase 6 is mostly about making existing text and proof structures honest. The repo already has the right lifecycle, checkpoint positions, and one-group apply flow; the missing pieces are policy defaults, visible task structure, classification, and richer execution evidence in the same persisted objects. [VERIFIED: lib/change-state.js; schemas/spec-driven/schema.json; lib/change-store.js; .planning/phases/06-tdd-light-workflow/06-CONTEXT.md]

## Common Pitfalls

### Pitfall 1: Adding `rules.tdd` Only to the Config Template

**What goes wrong:** New projects show a `rules.tdd` block in `.opsx/config.yaml`, but runtime behavior changes only when authors manually fill every field. [VERIFIED: templates/project/config.yaml.tmpl; lib/config.js]

**Why it happens:** `normalizeConfig()` currently deep-merges nested `rules` but does not supply any TDD defaults, so absent values stay absent. [VERIFIED: lib/config.js; node -e normalizeConfig probe]

**How to avoid:** Add default `mode`, `requireFor`, and `exempt` normalization in `lib/config.js` and lock it with tests that cover missing, partial, and invalid inputs. [VERIFIED: lib/config.js; scripts/test-workflow-runtime.js]

**Warning signs:** A probe of `normalizeConfig({ rules: { tdd: { mode: 'strict' } } })` returns only `{ "tdd": { "mode": "strict" } }` with no lists. [VERIFIED: node -e normalizeConfig probe]

### Pitfall 2: `## Test Plan` Exists in Markdown but Runtime Never Reads It

**What goes wrong:** Authors fill a Test Plan, but checkpoints still decide required/exempt/manual verification status using only loose keyword heuristics. [VERIFIED: lib/workflow.js; lib/runtime-guidance.js]

**Why it happens:** Both current top-level group parsers match only `## <number>. ...`, so a non-numbered `## Test Plan` section is ignored unless explicitly extracted. [VERIFIED: lib/workflow.js; lib/runtime-guidance.js]

**How to avoid:** Add a dedicated Test Plan extractor and make both workflow enforcement and apply preview read from the same parsed result. [VERIFIED: lib/workflow.js; lib/runtime-guidance.js]

**Warning signs:** Task previews show the right numbered groups but no TDD mode, no exemption reason, and no manual-verification rationale even when they are present in the file. [VERIFIED: lib/runtime-guidance.js]

### Pitfall 3: Generic Warnings Stay in Place Beside New TDD Findings

**What goes wrong:** Authors get both old generic findings like `test-coverage-missing` or `quality-gap` and new TDD-specific findings for the same missing VERIFY evidence. [VERIFIED: lib/workflow.js; .planning/phases/06-tdd-light-workflow/06-CONTEXT.md]

**Why it happens:** Current task and execution checkpoints already emit generic quality warnings based on keywords or missing verification signals. [VERIFIED: lib/workflow.js]

**How to avoid:** Refine or suppress overlapping generic findings when a more specific TDD-light finding explains the issue more precisely. [VERIFIED: lib/workflow.js; .planning/phases/06-tdd-light-workflow/06-CONTEXT.md]

**Warning signs:** A strict-mode behavior-change task without RED or VERIFY returns both the old generic warning and a new strict blocker, making the next step noisy or contradictory. [VERIFIED: lib/workflow.js]

### Pitfall 4: Execution Proof Remains Too Thin for Resume or Review

**What goes wrong:** `execution-checkpoint` technically runs, but later readers still cannot tell which TDD steps were completed or what changed. [VERIFIED: lib/change-store.js; lib/change-capsule.js]

**Why it happens:** Current verification entries store only six keys and the context capsule mirrors that minimal shape exactly. [VERIFIED: lib/change-store.js; lib/change-capsule.js; node -e verificationLog probe]

**How to avoid:** Extend both `verificationLog` persistence and `renderContextCapsule()` in the same wave so stored proof and human-readable summary stay aligned. [VERIFIED: lib/change-store.js; lib/change-capsule.js]

**Warning signs:** `state.yaml` shows only command/result/changedFiles, and `context.md` last verification still cannot display diff or TDD step evidence after the phase lands. [VERIFIED: lib/change-store.js; lib/change-capsule.js]

### Pitfall 5: Guidance Drift Survives After Runtime Ships

**What goes wrong:** Runtime enforces TDD-light, but `skills/opsx/SKILL.md`, playbooks, generator notes, or checked-in prompts still say TDD is deferred to Phase 6 or omit shipped rules. [VERIFIED: skills/opsx/SKILL.md; skills/opsx/references/action-playbooks.md; skills/opsx/references/action-playbooks-zh.md; lib/generator.js; commands/codex/prompts/opsx-apply.md]

**Why it happens:** Phase 6 touches both direct source files and generated/distributed guidance surfaces, and some of those surfaces are outside the user-listed core files. [VERIFIED: lib/generator.js; skills/opsx/SKILL.md; scripts/test-workflow-runtime.js]

**How to avoid:** Either include a bounded parity wave in Phase 6 or document an explicit follow-up slice so stale distributed guidance is not mistaken for shipped behavior. [VERIFIED: lib/generator.js; skills/opsx/SKILL.md; scripts/test-workflow-runtime.js]

**Warning signs:** `rg -n "deferred to Phase 6|spec checkpoint|execution checkpoint" skills/opsx lib/generator.js commands` still shows old wording after the runtime change. [VERIFIED: rg -n "TDD-light|RED/GREEN/REFACTOR/VERIFY|execution checkpoint|task checkpoint|Test Plan" skills/opsx/SKILL.md lib/generator.js commands/codex/prompts/opsx-apply.md]

### Pitfall 6: Light Mode Accidentally Stops Behaving Like Advisory Mode

**What goes wrong:** Missing RED or VERIFY evidence in light mode stops progression or leaves hashes stale, even though the mode is meant to warn, not block. [VERIFIED: .planning/phases/06-tdd-light-workflow/06-CONTEXT.md; lib/change-store.js; lib/runtime-guidance.js]

**Why it happens:** Accepted-write semantics are status-driven, and it is easy to accidentally turn a light-mode warning into a blocking prerequisite. [VERIFIED: lib/change-store.js; lib/runtime-guidance.js]

**How to avoid:** Keep light-mode TDD findings at `WARN`, let `task-checkpoint` warnings avoid the `BLOCK` prerequisite path, and keep `WARN` accepted in execution persistence. [VERIFIED: lib/change-store.js; lib/runtime-guidance.js]

**Warning signs:** `buildApplyInstructions()` reports `ready: no` for a warning-only light-mode gap, or `recordTaskGroupExecution()` stops advancing after a `WARN` checkpoint. [VERIFIED: lib/runtime-guidance.js; lib/change-store.js]

## Code Examples

Verified patterns from repo-local source-of-truth files:

### Current Numbered Task-Group Parser

```javascript
// Source: lib/runtime-guidance.js
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
      items: checklist
    };
  });
}
```

This is why `## Test Plan` can be added without breaking existing group selection, but also why it needs its own parser. [VERIFIED: lib/runtime-guidance.js]

### Current Checklist Normalization for Step Detection

```javascript
// Source: lib/workflow.js
function normalizeChecklistItem(item = '') {
  return getTextBlock(item)
    .replace(/^- \[[ xX]\]\s*/g, '')
    .replace(/^\d+(\.\d+)*\s*/g, '')
    .trim();
}

function extractChecklistItems(text) {
  return Array.from(getTextBlock(text).matchAll(/^- \[[ xX]\]\s+.+$/gm))
    .map((match) => match[0].trim());
}
```

Phase 6 can reuse this pattern to detect visible `RED`, `GREEN`, `REFACTOR`, and `VERIFY` labels instead of inventing a new checklist grammar. [VERIFIED: lib/workflow.js]

### Current Execution Proof Shape

```javascript
// Source: lib/change-store.js
const verificationEntry = {
  at: timestamp,
  taskGroup: completedTaskGroup,
  verificationCommand: toNonEmptyString(payload.verificationCommand) || 'UNCONFIRMED',
  verificationResult: toNonEmptyString(payload.verificationResult) || 'UNCONFIRMED',
  changedFiles,
  checkpointStatus
};
```

This is the exact object Phase 6 needs to extend for TDD-04; adding a new artifact would bypass the existing resume and capsule path. [VERIFIED: lib/change-store.js]

### Recommended `tasks.md` Pattern for Behavior Changes

```markdown
## Test Plan
- Behavior: runtime status output
- Requirement/Scenario: STATUS-01 / Runtime status verification
- Verification: `npm run test:workflow-runtime`
- TDD Mode: strict
- Exemption: none

## 1. Runtime status behavior
- [ ] 1.1 RED: Add failing runtime status regression
- [ ] 1.2 GREEN: Implement runtime status output
- [ ] 1.3 REFACTOR: Simplify status formatter
- [ ] 1.4 VERIFY: Run `npm run test:workflow-runtime`
```

This example follows the locked Phase 6 decisions: a top-level Test Plan, explicit RED/GREEN/REFACTOR/VERIFY naming for behavior work, and visible verification intent. [VERIFIED: .planning/phases/06-tdd-light-workflow/06-CONTEXT.md; skills/opsx/references/artifact-templates.md]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Generic task quality warnings such as `test-coverage-missing` are the only checkpoint signal for missing test structure. | Add config-driven TDD-light policy with explicit RED/VERIFY enforcement and visible exemptions for scoped task classes. | Planned for Phase 6 on `2026-04-28`. [VERIFIED: lib/workflow.js; .planning/phases/06-tdd-light-workflow/06-CONTEXT.md] | Behavior-change and bugfix work stops pretending to be TDD-complete when the task structure is missing. [VERIFIED: .planning/ROADMAP.md; .planning/REQUIREMENTS.md] |
| Execution proof records only command/result, changed files, and checkpoint status. | Extend the same `verificationLog` and context capsule with richer per-group TDD and diff evidence. | Planned for Phase 6 on `2026-04-28`. [VERIFIED: lib/change-store.js; lib/change-capsule.js; .planning/phases/06-tdd-light-workflow/06-CONTEXT.md] | Resume, review, and later verify/archive phases get durable proof without another artifact type. [VERIFIED: lib/change-store.js; .planning/phases/04-change-state-machine-and-drift-control/04-CONTEXT.md] |
| Task templates expose only numbered groups and generic verification wording. | Add `## Test Plan`, explicit RED/GREEN/REFACTOR/VERIFY examples for behavior work, and visible exemption language for non-behavior work. | Planned for Phase 6 on `2026-04-28`. [VERIFIED: skills/opsx/references/artifact-templates.md; skills/opsx/references/action-playbooks.md; .planning/phases/06-tdd-light-workflow/06-CONTEXT.md] | Task authors get a consistent authored shape that runtime can actually enforce. [VERIFIED: .planning/REQUIREMENTS.md; lib/workflow.js] |
| Shipping TDD-light might look like “add another checkpoint.” | Reuse the existing `task-checkpoint` and `execution-checkpoint` rows; no new checkpoint id is required. | Already true in the current schema and still true for Phase 6. [VERIFIED: schemas/spec-driven/schema.json; .planning/ROADMAP.md] | The phase stays bounded and avoids unnecessary schema or route churn. [VERIFIED: schemas/spec-driven/schema.json; .planning/REQUIREMENTS.md] |

**Deprecated/outdated:**

- The line “TDD-light RED/GREEN/REFACTOR/VERIFY workflow rules are deferred to Phase 6” becomes outdated once this phase ships and should not remain in distributed guidance. [VERIFIED: skills/opsx/SKILL.md; skills/opsx/references/action-playbooks.md; skills/opsx/references/action-playbooks-zh.md]
- Generator notes that mention only `spec checkpoint`, `task checkpoint`, and `execution checkpoint` as the entire planning/execution quality story become incomplete after Phase 6. [VERIFIED: lib/generator.js; commands/codex/prompts/opsx-apply.md]

## Assumptions Log

All factual claims in this research were verified from repo-local sources or the npm registry; no unresolved `[ASSUMED]` implementation claims remain. [VERIFIED: .planning/phases/06-tdd-light-workflow/06-CONTEXT.md; lib/config.js; lib/workflow.js; lib/change-store.js; npm view yaml version time --json]

## Open Questions

1. **Should Phase 6 include adjacent generator and distributed-skill parity refreshes, even though the requested focus list centers on core runtime/template files?**
   - What we know: `skills/opsx/SKILL.md`, `lib/generator.js`, and checked-in `commands/**` still contain wording that is incomplete or explicitly deferred to Phase 6, and the runtime suite already checks generated/source-of-truth alignment. [VERIFIED: skills/opsx/SKILL.md; lib/generator.js; commands/codex/prompts/opsx-apply.md; scripts/test-workflow-runtime.js]
   - What's unclear: whether the planner should keep scope strictly to the user-listed files or include one bounded parity wave at the end of the phase. [VERIFIED: user objective + focus file list; lib/generator.js; skills/opsx/SKILL.md]
   - Recommendation: include a final parity wave if Phase 6 expands tests to assert shipped TDD-light wording; otherwise document a deliberate follow-up so guidance drift is explicit rather than accidental. [VERIFIED: scripts/test-workflow-runtime.js; lib/generator.js]

2. **How much of the richer execution proof should `buildStatus()` and `buildResumeInstructions()` surface in Phase 6 versus Phase 7?**
   - What we know: TDD-04 requires the execution checkpoint to record richer evidence after each top-level group, but current status/resume payloads only expose stage, next action, warnings, blockers, and task-group pointers. [VERIFIED: .planning/REQUIREMENTS.md; lib/runtime-guidance.js]
   - What's unclear: whether Phase 6 should surface the new proof only in `context.md` and `state.yaml`, or also in runtime-guidance JSON/text payloads for operators. [VERIFIED: lib/runtime-guidance.js; lib/change-capsule.js]
   - Recommendation: at minimum, update `buildApplyInstructions()` to explain TDD blockers and selected-group expectations in Phase 6; keep broader status/reporting expansion optional unless the planner wants earlier operator visibility. [VERIFIED: lib/runtime-guidance.js; .planning/ROADMAP.md]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All Phase 6 runtime modules and tests | ✓ | `v24.8.0` | None needed. [VERIFIED: node --version] |
| npm | Running the existing regression suite | ✓ | `11.6.0` | `node scripts/test-workflow-runtime.js` directly. [VERIFIED: npm --version; package.json] |
| Local `yaml` dependency | Config and state persistence | ✓ | `2.8.3` | None needed; already installed and used by passing tests. [VERIFIED: package.json; npm view yaml version time --json; npm run test:workflow-runtime] |

**Missing dependencies with no fallback:**
- None. [VERIFIED: node --version; npm --version; npm run test:workflow-runtime]

**Missing dependencies with fallback:**
- None. [VERIFIED: node --version; npm --version; npm run test:workflow-runtime]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Custom Node.js regression script using built-in `assert`. [VERIFIED: scripts/test-workflow-runtime.js] |
| Config file | none. [VERIFIED: package.json; scripts/test-workflow-runtime.js] |
| Quick run command | `npm run test:workflow-runtime` [VERIFIED: package.json] |
| Full suite command | `npm run test:workflow-runtime` [VERIFIED: package.json] |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TDD-01 | `rules.tdd.mode`, `requireFor`, and `exempt` normalize correctly from missing, partial, invalid, and override config inputs. [VERIFIED: .planning/REQUIREMENTS.md; lib/config.js] | integration | `npm run test:workflow-runtime` | ✅ existing script; new config-normalization assertions required. [VERIFIED: scripts/test-workflow-runtime.js] |
| TDD-02 | `tasks.md` templates and skill references include Test Plan plus RED/GREEN/REFACTOR/VERIFY examples for behavior work and visible exemptions for non-behavior work. [VERIFIED: .planning/REQUIREMENTS.md; .planning/phases/06-tdd-light-workflow/06-CONTEXT.md] | integration | `npm run test:workflow-runtime` | ✅ existing script; new source-of-truth wording assertions required. [VERIFIED: scripts/test-workflow-runtime.js] |
| TDD-03 | `task-checkpoint` emits no TDD findings in `off`, WARN in `light`, and BLOCK in `strict` for required classes; exemptions and manual-verification rationale alter the result correctly. [VERIFIED: .planning/REQUIREMENTS.md; .planning/phases/06-tdd-light-workflow/06-CONTEXT.md] | integration | `npm run test:workflow-runtime` | ✅ existing script; new task-checkpoint matrix tests required. [VERIFIED: scripts/test-workflow-runtime.js] |
| TDD-04 | `execution-checkpoint` and `recordTaskGroupExecution()` persist completed-step proof, verification command/result, diff summary, and drift after one top-level group. [VERIFIED: .planning/REQUIREMENTS.md; .planning/ROADMAP.md] | integration | `npm run test:workflow-runtime` | ✅ existing script; new persistence and context-capsule assertions required. [VERIFIED: scripts/test-workflow-runtime.js] |

### Sampling Rate

- **Per task commit:** `npm run test:workflow-runtime` [VERIFIED: package.json]
- **Per wave merge:** `npm run test:workflow-runtime` [VERIFIED: package.json]
- **Phase gate:** Full suite green before `/gsd-verify-work`. [VERIFIED: CONTINUITY.md; npm run test:workflow-runtime]

### Wave 0 Gaps

- [ ] `scripts/test-workflow-runtime.js` — add `normalizeConfig()` coverage for default `rules.tdd`, invalid modes, and merged `requireFor` / `exempt` lists. [VERIFIED: lib/config.js; scripts/test-workflow-runtime.js]
- [ ] `scripts/test-workflow-runtime.js` — add task-structure coverage for `## Test Plan`, explicit RED/GREEN/REFACTOR/VERIFY labels, visible exemptions, and manual-verification rationale. [VERIFIED: .planning/phases/06-tdd-light-workflow/06-CONTEXT.md; lib/workflow.js; lib/runtime-guidance.js]
- [ ] `scripts/test-workflow-runtime.js` — add `runTaskCheckpoint()` matrix tests for `off`, `light`, and `strict`, plus required versus exempt task classes. [VERIFIED: .planning/REQUIREMENTS.md; lib/workflow.js]
- [ ] `scripts/test-workflow-runtime.js` — add `runExecutionCheckpoint()` and `recordTaskGroupExecution()` assertions for richer verification entries and `context.md` rendering. [VERIFIED: lib/change-store.js; lib/change-capsule.js]
- [ ] `scripts/test-workflow-runtime.js` — if parity is in scope, add wording assertions for `skills/opsx/SKILL.md`, `lib/generator.js`, and checked-in prompts so “deferred to Phase 6” text cannot survive the implementation. [VERIFIED: skills/opsx/SKILL.md; lib/generator.js; commands/codex/prompts/opsx-apply.md]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Phase 6 does not add user identity or login flows. [VERIFIED: .planning/ROADMAP.md; .planning/REQUIREMENTS.md] |
| V3 Session Management | no | The phase is local workflow validation and persistence, not session lifecycle logic. [VERIFIED: .planning/ROADMAP.md; .planning/REQUIREMENTS.md] |
| V4 Access Control | no | No new authorization boundary is introduced; changes remain inside local file-backed workflow state. [VERIFIED: .planning/ROADMAP.md; lib/runtime-guidance.js] |
| V5 Input Validation | yes | Normalize `rules.tdd.mode`, sanitize list values, and parse user-authored markdown task text through bounded section/checklist rules rather than trusting arbitrary free text. [VERIFIED: lib/config.js; lib/workflow.js; lib/runtime-guidance.js] |
| V6 Cryptography | no | Phase 6 does not add new crypto primitives beyond existing artifact hashing from earlier phases. [VERIFIED: .planning/ROADMAP.md; lib/change-artifacts.js] |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Silent or spoofed exemption text that hides required TDD work | Tampering | Require visible exemption reason in `tasks.md`, let explicit markers take precedence over heuristics, and keep task-checkpoint findings on existing artifacts. [VERIFIED: .planning/phases/06-tdd-light-workflow/06-CONTEXT.md; lib/workflow.js] |
| Invalid or unnormalized `rules.tdd.mode` values | Tampering | Normalize mode and list values in `lib/config.js` before runtime guidance or checkpoint logic consumes them. [VERIFIED: lib/config.js; lib/runtime-guidance.js] |
| Markdown structure confusion between metadata and executable groups | Spoofing / Tampering | Parse `## Test Plan` separately, keep numbered `## 1. ...` sections as the only apply groups, and reuse existing checkbox grammar. [VERIFIED: lib/workflow.js; lib/runtime-guidance.js] |
| Missing or misleading execution proof after apply | Repudiation | Persist richer per-group evidence in `verificationLog`, render it into `context.md`, and keep drift entries appended in `drift.md`. [VERIFIED: lib/change-store.js; lib/change-capsule.js] |

## Sources

### Primary (HIGH confidence)

- `.planning/phases/06-tdd-light-workflow/06-CONTEXT.md` - locked Phase 6 decisions, scope, and deferred work.
- `.planning/REQUIREMENTS.md` - TDD-01 through TDD-04.
- `.planning/ROADMAP.md` - Phase 6 goal, success criteria, and dependency notes.
- `.planning/STATE.md` - current project status and prior-phase dependencies.
- `CONTINUITY.md` - current milestone status and latest verification receipts.
- `AGENTS.md` - repo-local workflow and artifact-order constraints.
- `openspec/config.yaml` - project defaults and language/security-review baseline.
- `templates/project/config.yaml.tmpl` - current project config template shape.
- `skills/opsx/references/artifact-templates.md` - English artifact template source.
- `skills/opsx/references/artifact-templates-zh.md` - Chinese artifact template source.
- `skills/opsx/references/action-playbooks.md` - English route behavior source.
- `skills/opsx/references/action-playbooks-zh.md` - Chinese route behavior source.
- `skills/opsx/SKILL.md` - distributed skill workflow loop and current deferred-TDD wording.
- `schemas/spec-driven/schema.json` - canonical checkpoint and artifact catalog.
- `lib/config.js` - config normalization boundary.
- `lib/workflow.js` - task/execution checkpoint contract and task parsing helpers.
- `lib/runtime-guidance.js` - apply/status/resume payload builder and second task-group parser.
- `lib/change-store.js` - persisted checkpoint and execution-log writer.
- `lib/change-capsule.js` - `context.md` rendering for last verification.
- `lib/change-state.js` - existing apply lifecycle stages.
- `lib/generator.js` - prompt note source-of-truth for checked-in commands.
- `commands/codex/prompts/opsx-apply.md` - current distributed prompt wording example.
- `scripts/test-workflow-runtime.js` - existing regression harness and source-output assertions.
- `npm view yaml version time --json` - current `yaml` package version and publish time.
- `node --version` - local Node runtime version.
- `npm --version` - local npm version.
- `npm run test:workflow-runtime` - current runtime suite result (`66 test(s) passed`).

### Secondary (MEDIUM confidence)

- None. [VERIFIED: repo-local and npm-registry sources covered the full phase scope]

### Tertiary (LOW confidence)

- None. [VERIFIED: repo-local and npm-registry sources covered the full phase scope]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all dependencies, versions, and reuse recommendations were verified from repo-local code or the npm registry. [VERIFIED: package.json; lib/config.js; npm view yaml version time --json]
- Architecture: HIGH - checkpoint flow, task parsing, lifecycle stages, and persistence boundaries were verified by direct code inspection and runtime probes. [VERIFIED: lib/workflow.js; lib/runtime-guidance.js; lib/change-store.js; lib/change-state.js]
- Pitfalls: HIGH - each major risk is tied to a concrete current gap, duplication point, or probe result in the existing implementation. [VERIFIED: lib/config.js; lib/workflow.js; lib/runtime-guidance.js; lib/change-store.js; node -e normalizeConfig probe; node -e runTaskCheckpoint probe; node -e verificationLog probe]

**Research date:** 2026-04-28  
**Valid until:** 2026-05-05
