# Roadmap: OpsX v3.0 Migration and State-Machine Workflow

**Created:** 2026-04-27
**Milestone:** v3.0 OpsX migration and state-machine workflow
**Phase numbering:** Reset to Phase 1 because this repository had no existing `.planning/ROADMAP.md`.

## Overview

This roadmap turns the current OpenSpec `2.0.1` repository into OpsX `3.0.0`. It follows the user's recommended implementation split: first make naming and paths unambiguous, then rewrite command/skill surfaces, then add recoverable workflow state, spec review, TDD-light, and final quality gates.

| Phase | Name | Goal | Requirements |
|-------|------|------|--------------|
| 1 | OpsX Naming and CLI Surface | Rename package, binary, constants, docs, and release metadata to OpsX | NAME-01, NAME-02, NAME-03, NAME-04, NAME-05 |
| 2 | `.opsx/` Workspace and Migration | Move project/global workflow state to OpsX paths with a safe migration command | DIR-01, DIR-02, DIR-03, DIR-04, DIR-05, DIR-06, DIR-07 |
| 3 | Skill and Command Surface Rewrite | Make `/opsx-*`, `$opsx-*`, and `skills/opsx` the public workflow surface | CMD-01, CMD-02, CMD-03, CMD-04, CMD-05 |
| 4 | Change State Machine and Drift Control | Add durable per-change state, context capsules, drift ledger, hashes, and one-group apply flow | STATE-01, STATE-02, STATE-03, STATE-04, STATE-05, STATE-06, STATE-07, STATE-08 |
| 5 | Spec-Split Checkpoint | Review split specs before design for coverage, duplication, conflict, hidden requirements, and scope drift | SPEC-01, SPEC-02, SPEC-03, SPEC-04 |
| 6 | TDD-Light Workflow | Add RED/GREEN/REFACTOR/VERIFY task planning and checkpoint enforcement | TDD-01, TDD-02, TDD-03, TDD-04 |
| 7 | Verify, Sync, Archive, and Batch Gates | Enforce implementation quality gates and independent multi-change orchestration | QUAL-01, QUAL-02, QUAL-03, QUAL-04 |
| 8 | Stability, JSON, and Release Coverage | Harden path/glob/JSON behavior and cover the v3.0 migration with tests | QUAL-05, QUAL-06, TEST-01, TEST-02, TEST-03, TEST-04 |

## Phase Details

### Phase 1: OpsX Naming and CLI Surface

**Goal:** Make the package identity, CLI binary, runtime constants, docs, and release metadata consistently OpsX.

**Requirements:** NAME-01, NAME-02, NAME-03, NAME-04, NAME-05

**Status:** Complete — 2026-04-26

**Verification:** `.planning/phases/01-opsx-naming-and-cli-surface/01-VERIFICATION.md`

**Success criteria:**
1. `package.json` uses `@xenonbyte/opsx`, binary `opsx`, repository `xenonbyte/opsx`, and version `3.0.0`.
2. `bin/opsx.js` works for `--help`, `--version`, and existing non-migration CLI actions.
3. README, README-zh, CHANGELOG, docs, scripts, and templates use OpsX naming except for explicit migration/history notes.
4. `rg "OpenSpec|openspec|\\.openspec|\\$openspec|/openspec|/prompts:openspec|@xenonbyte/openspec|~/.openspec"` returns only accepted migration/history references.

### Phase 2: `.opsx/` Workspace and Migration

**Goal:** Make `.opsx/` and `~/.opsx/` the canonical workflow directories and provide safe migration from the old layout.

**Requirements:** DIR-01, DIR-02, DIR-03, DIR-04, DIR-05, DIR-06, DIR-07

**Status:** Complete — 2026-04-27

**Plans:** 4 plans

Plans:
- [x] `02-01-PLAN.md` — Add migration fixtures, CLI regression coverage, and canonical `.opsx` gitignore rules after runtime wiring.
- [x] `02-02-PLAN.md` — Build the reusable migration core in `lib/migrate.js` and `lib/workspace.js`.
- [x] `02-03-PLAN.md` — Canonicalize runtime paths and wire real `opsx migrate` / minimal truthful `opsx status`.
- [x] `02-04-PLAN.md` — Update README/docs/templates to match shipped `.opsx` migration behavior.

**Success criteria:**
1. Runtime constants use `.opsx`, `~/.opsx`, and `config.yaml`.
2. `opsx migrate --dry-run` prints the old-to-new mapping without modifying the repository.
3. `opsx migrate` moves `openspec/config.yaml`, `changes`, `specs`, `archive`, and `.openspec.yaml` metadata into the `.opsx/` layout.
4. Migration creates missing `active.yaml`, `state.yaml`, `context.md`, and `drift.md` defaults without overwriting existing `.opsx/` content by default.
5. Documentation explains tracked versus ignored `.opsx/` paths.

### Phase 3: Skill and Command Surface Rewrite

**Goal:** Rewrite all generated commands, prompts, and skill metadata so the user-facing workflow is `/opsx-*`, `$opsx-*`, and `skills/opsx`.

**Requirements:** CMD-01, CMD-02, CMD-03, CMD-04, CMD-05

**Status:** Complete — 2026-04-27

**Verification:** `.planning/phases/03-skill-and-command-surface-rewrite/03-VERIFICATION.md`

**Plans:** 11 plans (5 waves)

Plans:
- [x] `03-01-PLAN.md` — Rewrite the hard-clean-break planning contract and establish Phase 3 validation inventories without weakening migration internals.
- [x] `03-02-PLAN.md` — Move explicit-only route semantics and strict preflight into workflow metadata/templates and add Wave 1 source-output assertions.
- [x] `03-03-PLAN.md` — Refresh the first bounded Claude generated-bundle slice from the new source of truth.
- [x] `03-04-PLAN.md` — Refresh the second bounded Claude generated-bundle slice, including `onboard`/`resume`/`status`.
- [x] `03-05-PLAN.md` — Refresh the first bounded Codex prompt slice and keep `commands/codex/prompts/opsx.md` internal-only.
- [x] `03-06-PLAN.md` — Refresh the second bounded Codex prompt slice, including `onboard`/`resume`/`status`.
- [x] `03-07-PLAN.md` — Refresh the first bounded Gemini generated-bundle slice from the new source of truth.
- [x] `03-08-PLAN.md` — Refresh the second bounded Gemini generated-bundle slice, including `onboard`/`resume`/`status`.
- [x] `03-09-PLAN.md` — Rewrite `skills/opsx` and bilingual playbooks to the explicit-only route model.
- [x] `03-10-PLAN.md` — Rewrite README and docs to the hard clean break and current `.opsx` runtime guidance.
- [x] `03-11-PLAN.md` — Align CLI/help/postinstall/template/AGENTS guidance and activate final parity/public-surface verification.

**Success criteria:**
1. `skills/opsx/SKILL.md` has `name: opsx` and describes `.opsx/changes/*`.
2. Claude command generation produces `/opsx-*` hyphen routes for every supported action.
3. Codex command generation exposes only explicit `$opsx-*` public routes and stops presenting `/prompts:*`, standalone `$opsx`, or `$opsx <request>` as the main UX.
4. Command prompts enforce strict preflight reads of `.opsx/config.yaml`, `.opsx/active.yaml`, active change `state.yaml`, `context.md`, and current artifacts when present before acting.
5. Status/onboard/resume commands report empty workspace or missing active change with concrete next steps and do not auto-create active state.

### Phase 4: Change State Machine and Drift Control

**Goal:** Persist workflow progress per change so commands can resume from disk after context compaction or a fresh agent session.

**Requirements:** STATE-01, STATE-02, STATE-03, STATE-04, STATE-05, STATE-06, STATE-07, STATE-08

**Status:** Complete — 2026-04-27

**Verification:** `.planning/phases/04-change-state-machine-and-drift-control/04-VERIFICATION.md`

**Plans:** 9 plans (7 waves)

Plans:
- [x] `04-01-PLAN.md` — Pin `yaml@2.8.3`, add the Phase 4 state-store contract, and lock Wave 0 tests for placeholder/sparse/drift semantics.
- [x] `04-02-PLAN.md` — Build the narrow `opsx-new` skeleton writer and active-change persistence without implying accepted planning state.
- [x] `04-03-PLAN.md` — Add the strict local transition table plus read-only status/resume/continue selectors.
- [x] `04-04-PLAN.md` — Implement artifact hashing, bounded context/drift sidecars, and one-group apply persistence helpers.
- [x] `04-05-PLAN.md` — Update source-of-truth workflow/skill guidance for Phase 4 and stage a temporary source-output gate for generated refreshes.
- [x] `04-06-PLAN.md` — Refresh the bounded Claude stateful action slice from the new Phase 4 source of truth.
- [x] `04-07-PLAN.md` — Refresh the bounded Codex stateful prompt slice from the new Phase 4 source of truth.
- [x] `04-08-PLAN.md` — Refresh the bounded Gemini stateful action slice from the new Phase 4 source of truth.
- [x] `04-09-PLAN.md` — Restore full checked-in generated parity after all Phase 4 stateful refresh slices land.

**Success criteria:**
1. New modules store/load active change state, validate transitions, compute artifact hashes, update context capsules, and record verification events.
2. `opsx-new` creates the complete change skeleton and updates `.opsx/active.yaml`.
3. `opsx-propose`, `opsx-ff`, `opsx-continue`, `opsx-apply`, `opsx-status`, and `opsx-resume` update or read `state.yaml` consistently.
4. Artifact hash drift causes a visible warning and reload from disk before any further action.
5. `opsx-apply` completes one top-level task group per default run and updates `context.md`, `drift.md`, and `verificationLog`.

### Phase 5: Spec-Split Checkpoint

**Goal:** Catch split-spec errors before design and task artifacts depend on them.

**Requirements:** SPEC-01, SPEC-02, SPEC-03, SPEC-04

**Status:** Complete — 2026-04-28

**Plans:** 7 plans (5 waves)

Plans:
- [x] `05-01-PLAN.md` — Add the schema/workflow/state catalog for `spec-split-checkpoint` and lock Wave 0 persistence tests.
- [x] `05-02-PLAN.md` — Build `lib/spec-validator.js` and deterministic SPEC-02 regression coverage.
- [x] `05-03-PLAN.md` — Wire `runSpecSplitCheckpoint()`, bounded reviewer-escalation guidance, and skill/source-of-truth updates.
- [x] `05-04-PLAN.md` — Refresh the bounded Claude `propose` / `continue` / `ff` command slice from generator output.
- [x] `05-05-PLAN.md` — Refresh the bounded Codex `propose` / `continue` / `ff` prompt slice from generator output.
- [x] `05-06-PLAN.md` — Refresh the bounded Gemini `propose` / `continue` / `ff` command slice from generator output.
- [x] `05-07-PLAN.md` — Remove temporary parity exemptions and re-lock phase-wide regression plus command parity.

**Success criteria:**
1. `schemas/spec-driven/schema.json` includes `spec-split-checkpoint` after specs and before design.
2. Spec validator detects duplicate requirement IDs, likely duplicate behavior, conflicting language, missing scenarios, empty specs, proposal coverage gaps, scope expansion, and fenced-code hidden requirements.
3. Multi-spec or higher-risk changes can use read-only reviewer behavior without creating extra review artifacts.
4. Checkpoint findings update existing proposal/spec/design/task artifacts rather than producing standalone review files.

### Phase 6: TDD-Light Workflow

**Goal:** Make behavior-change tasks include explicit RED/GREEN/REFACTOR/VERIFY planning without imposing strict TDD on every change.

**Requirements:** TDD-01, TDD-02, TDD-03, TDD-04

**Status:** Complete — 2026-04-28

**Verification:** `.planning/phases/06-tdd-light-workflow/06-VERIFICATION.md`

**Plans:** 9 plans (6 waves)

Plans:
- [x] `06-01-PLAN.md` — Normalize `rules.tdd` strict defaults and lock config regression coverage.
- [x] `06-02-PLAN.md` — Add `## Test Plan`, visible exemptions, and shipped TDD-light guidance to skill/playbook templates.
- [x] `06-03-PLAN.md` — Enforce TDD-light warnings and blocks in `task-checkpoint` and surface them in apply guidance.
- [x] `06-04-PLAN.md` — Persist completed TDD steps, diff summary, and drift through existing execution proof paths.
- [x] `06-05-PLAN.md` — Update generator source-of-truth for TDD-light route copy and stage a temporary 12-file parity gate.
- [x] `06-06-PLAN.md` — Refresh the bounded Claude `apply` / `propose` / `continue` / `ff` prompt slice from generator output.
- [x] `06-07-PLAN.md` — Refresh the bounded Codex `apply` / `propose` / `continue` / `ff` prompt slice from generator output.
- [x] `06-08-PLAN.md` — Refresh the bounded Gemini `apply` / `propose` / `continue` / `ff` prompt slice from generator output.
- [x] `06-09-PLAN.md` — Remove temporary Phase 6 prompt parity allowances and re-lock full regression coverage.

**Success criteria:**
1. `.opsx/config.yaml` supports `rules.tdd.mode` and requirement/exemption lists.
2. Task templates and skill references include Test Plan and RED/GREEN/REFACTOR/VERIFY examples.
3. `task-checkpoint` warns in light mode and blocks in strict mode for missing test or verification structure.
4. Execution checkpoints record command/result, diff summary, and drift after each top-level group.

### Phase 7: Verify, Sync, Archive, and Batch Gates

**Goal:** Prevent incomplete or drifted changes from being marked done or archived.

**Requirements:** QUAL-01, QUAL-02, QUAL-03, QUAL-04

**Status:** In Progress — 2026-04-28

**Plans:** 8 plans (6 waves)

Plans:
- [x] `07-01-PLAN.md` — Add Node-14-compatible path-scope matching and the hard verify gate with accepted `VERIFIED` transitions.
- [x] `07-02-PLAN.md` — Build conservative in-memory spec sync with no-partial-write semantics and accepted `SYNCED` transitions.
- [x] `07-03-PLAN.md` — Implement archive safe-sync gating, exact `.opsx/archive/<change-name>/` moves, and isolated batch orchestration.
- [ ] `07-04-PLAN.md` — Update source-of-truth verify/sync/archive/batch guidance and stage a temporary 15-route prompt assertion scope.
- [ ] `07-05-PLAN.md` — Refresh the bounded Claude verify/sync/archive/batch route slice from generator output.
- [ ] `07-06-PLAN.md` — Refresh the bounded Codex verify/sync/archive/batch prompt slice from generator output.
- [ ] `07-07-PLAN.md` — Refresh the bounded Gemini verify/sync/archive/batch route slice from generator output.
- [ ] `07-08-PLAN.md` — Remove temporary Phase 7 prompt allowances and restore strict full-bundle parity.

**Success criteria:**
1. `opsx-verify` compares proposal, specs, design, tasks, code diff, tests, TDD records, execution checkpoints, drift, and allowed/forbidden paths.
2. `opsx-sync` merges change specs into `.opsx/specs/**` and detects omitted or conflicting requirements.
3. `opsx-archive` refuses unverified, unsynced, incomplete, or unresolved-drift changes.
4. Batch apply and bulk archive process each change with isolated state/context and report skipped changes with reasons.

### Phase 8: Stability, JSON, and Release Coverage

**Goal:** Harden edge cases and make the v3.0 release testable before publication.

**Requirements:** QUAL-05, QUAL-06, TEST-01, TEST-02, TEST-03, TEST-04

**Success criteria:**
1. Path utilities canonicalize artifact paths and escape glob-special paths.
2. Glob artifact output parsing works for generated artifact sets.
3. `opsx status --json` emits parseable JSON on stdout with progress or diagnostics kept out of stdout.
4. Test scripts cover metadata, command generation, migration, state machine, TDD checkpointing, spec review, path guards, archive blocking, and status JSON.
5. Final verification runs the expanded test suite, CLI help/version/check/doc/status smoke tests, and package dry-run.

## Dependency Notes

- Phase 2 depends on Phase 1 constants and CLI identity.
- Phase 3 depends on Phase 1 naming and Phase 2 path conventions.
- Phase 4 depends on Phase 2 workspace layout and Phase 3 command preflight text.
- Phase 5 and Phase 6 depend on Phase 4 state/checkpoint recording.
- Phase 7 depends on state, drift, TDD records, and spec review outputs.
- Phase 8 depends on all prior phases and is the release hardening pass.

## Coverage

- v3.0 requirements: 43 total
- Mapped to phases: 43
- Unmapped: 0

---
*Roadmap created: 2026-04-27*
