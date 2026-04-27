# Requirements: OpsX

**Defined:** 2026-04-27
**Core Value:** Agents can reliably continue spec-driven work from disk-backed OpsX artifacts instead of relying on fragile chat history.

## v3.0 Requirements

### Naming and Packaging

- [x] **NAME-01**: User can install the breaking release as `@xenonbyte/opsx`.
- [x] **NAME-02**: User can invoke the CLI as `opsx` with `--help`, `--version`, `install`, `uninstall`, `check`, `doc`, `language`, `migrate`, and `status`.
- [x] **NAME-03**: User-facing docs, package metadata, templates, generated command text, and runtime messages consistently use `OpsX`, `opsx`, and `@xenonbyte/opsx`.
- [x] **NAME-04**: Historical OpenSpec references remain only where they explain source lineage, migration, or changelog history.
- [x] **NAME-05**: Release metadata clearly communicates `3.0.0` as a breaking OpsX rename and workflow-state upgrade.

### Workspace and Migration

- [x] **DIR-01**: Project workflow artifacts live under `.opsx/` with `config.yaml`, `active.yaml`, `changes/`, `specs/`, `archive/`, `cache/`, `tmp/`, and `logs/`.
- [x] **DIR-02**: Global OpsX files live under `~/.opsx/` with `config.yaml`, `manifests/`, `skills/opsx/`, and `cache/`.
- [x] **DIR-03**: User can run `opsx migrate --dry-run` to preview the full `openspec/` to `.opsx/` migration mapping without writing files.
- [x] **DIR-04**: User can run `opsx migrate` to move project config, changes, specs, archive, and change metadata into the `.opsx/` layout.
- [x] **DIR-05**: Migration renames per-change `.openspec.yaml` files to `change.yaml` and creates missing `state.yaml`, `context.md`, `drift.md`, and `.opsx/active.yaml` defaults.
- [x] **DIR-06**: Migration aborts by default when `.opsx/` already exists and requires explicit merge intent before combining directories.
- [x] **DIR-07**: Git ignore guidance preserves tracked `.opsx/` workflow artifacts while ignoring `.opsx/cache/`, `.opsx/tmp/`, and `.opsx/logs/`.

### Commands and Skills

- [ ] **CMD-01**: Claude Code users can use `/opsx-explore`, `/opsx-new`, `/opsx-propose`, `/opsx-continue`, `/opsx-ff`, `/opsx-apply`, `/opsx-verify`, `/opsx-status`, `/opsx-resume`, `/opsx-sync`, `/opsx-archive`, `/opsx-batch-apply`, `/opsx-bulk-archive`, and `/opsx-onboard`.
- [ ] **CMD-02**: Codex users can use the corresponding `$opsx-*` commands as the public primary entrypoints.
- [ ] **CMD-03**: The distributed skill lives at `skills/opsx/` with frontmatter `name: opsx` and reads `.opsx/` and `~/.opsx/` config in the correct precedence order.
- [ ] **CMD-04**: Generated prompts no longer present `/openspec`, `$openspec`, `/prompts:openspec`, or `/opsx:*` as primary workflow entrypoints.
- [ ] **CMD-05**: `opsx-onboard`, `opsx-status`, and `opsx-resume` behave correctly even when no active change exists.

### State Machine and Drift Control

- [ ] **STATE-01**: `opsx-new` creates a change skeleton with `change.yaml`, `proposal.md`, `design.md`, `tasks.md`, `specs/`, `state.yaml`, `context.md`, and `drift.md`.
- [ ] **STATE-02**: Every `/opsx-*` and `$opsx-*` command reads `.opsx/config.yaml`, `.opsx/active.yaml`, the active change `state.yaml`, `context.md`, and current artifacts before acting.
- [ ] **STATE-03**: Commands compute artifact hashes for `proposal.md`, `specs/**`, `design.md`, `security-review.md`, and `tasks.md`, warning and reloading when hashes drift from `state.yaml`.
- [ ] **STATE-04**: `state.yaml` tracks stage, next action, checkpoint states, artifact paths, hashes, active task group, verification log, blockers, warnings, allowed paths, and forbidden paths.
- [ ] **STATE-05**: `context.md` stays bounded and contains enough current-stage context for a clean-context resume.
- [ ] **STATE-06**: `drift.md` records new assumptions, detected scope changes, out-of-bound file changes, discovered requirements, and unresolved approval needs.
- [ ] **STATE-07**: `opsx-continue` resumes the next valid state-machine action without re-planning unrelated work.
- [ ] **STATE-08**: `opsx-apply` defaults to exactly one top-level task group per run and records an execution checkpoint afterward.

### Spec Review

- [ ] **SPEC-01**: The schema defines `spec-split-checkpoint` with trigger `after-specs-before-design` and states `PASS`, `WARN`, and `BLOCK`.
- [ ] **SPEC-02**: Spec review checks proposal coverage, unapproved scope expansion, duplicate requirements, conflicting requirements, empty specs, missing scenarios, and requirements hidden in fenced code blocks.
- [ ] **SPEC-03**: Spec review can run inline for simple changes and can escalate to read-only reviewer behavior for multi-spec, cross-capability, security-sensitive, or larger requirement sets.
- [ ] **SPEC-04**: Checkpoint output follows the existing contract: checkpoint, phase, status, findings, patch targets, and next step.

### TDD-Light

- [ ] **TDD-01**: `.opsx/config.yaml` supports `rules.tdd.mode` with `off`, `light`, and `strict`.
- [ ] **TDD-02**: `tasks.md` templates include a Test Plan and RED/GREEN/REFACTOR/VERIFY task structure for behavior changes and bug fixes.
- [ ] **TDD-03**: `task-checkpoint` warns in light mode when behavior changes lack RED or VERIFY tasks and blocks in strict mode.
- [ ] **TDD-04**: `execution-checkpoint` records completed steps, verification command/result, diff summary, and drift after each top-level task group.

### Verification, Sync, Archive, and Batch Workflows

- [ ] **QUAL-01**: `opsx-verify` checks proposal/specs/design/tasks/code/test alignment, TDD-light records, execution checkpoint completeness, changed-file scope, drift, and configured verification commands.
- [ ] **QUAL-02**: `opsx-sync` merges change specs into `.opsx/specs/**` while checking for omissions and requirement conflicts.
- [ ] **QUAL-03**: `opsx-archive` blocks unless the change is verified or synced, tasks are complete, execution checkpoints are complete, specs are synced, and drift has no unresolved blockers.
- [ ] **QUAL-04**: `opsx-batch-apply` and `opsx-bulk-archive` process each change independently without mixing state or context.
- [ ] **QUAL-05**: `opsx status --json` writes clean JSON to stdout without spinner/progress noise.
- [ ] **QUAL-06**: Path and glob utilities canonicalize artifact paths, escape glob-special paths, and handle glob artifact outputs predictably.

### Test Coverage

- [ ] **TEST-01**: Tests verify package/bin metadata only exposes `@xenonbyte/opsx` and `opsx`.
- [ ] **TEST-02**: Tests verify command generation only exposes `/opsx-*` and `$opsx-*` public entrypoints.
- [ ] **TEST-03**: Tests cover migration, state-machine transitions, artifact hash drift, resume/continue behavior, and status JSON output.
- [ ] **TEST-04**: Tests cover spec-split review, hidden requirement detection, TDD-light warnings/blocks, allowed/forbidden path checks, and archive blocking.

## Future Requirements

### Automation

- **AUTO-01**: OpsX can optionally orchestrate fresh-context agents for each task group.
- **AUTO-02**: OpsX can retry checkpoint failures through a supervised recovery loop.

### Compatibility

- **COMPAT-01**: A final `@xenonbyte/openspec@2.x` bridge package can warn users to install `@xenonbyte/opsx` and run `opsx migrate`.
- **COMPAT-02**: `opsx migrate --merge` can support non-trivial manual merge workflows after the default safe migration path ships.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Lite/advanced profiles | User explicitly wants the full command set visible by default. |
| Full autonomous agent engine | Milestone target is lightweight recoverable workflow state, not an auto-runner. |
| Old primary entrypoints in v3.0 | `/openspec`, `$openspec`, `/prompts:openspec`, and `/opsx:*` would preserve the naming confusion this milestone is meant to remove. |
| Hosted service or telemetry | No requirement for remote state, cloud execution, or analytics. |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| NAME-01 | Phase 1 | Completed |
| NAME-02 | Phase 1 | Completed |
| NAME-03 | Phase 1 | Completed |
| NAME-04 | Phase 1 | Completed |
| NAME-05 | Phase 1 | Completed |
| DIR-01 | Phase 2 | Completed |
| DIR-02 | Phase 2 | Completed |
| DIR-03 | Phase 2 | Completed |
| DIR-04 | Phase 2 | Completed |
| DIR-05 | Phase 2 | Completed |
| DIR-06 | Phase 2 | Completed |
| DIR-07 | Phase 2 | Completed |
| CMD-01 | Phase 3 | Pending |
| CMD-02 | Phase 3 | Pending |
| CMD-03 | Phase 3 | Pending |
| CMD-04 | Phase 3 | Pending |
| CMD-05 | Phase 3 | Pending |
| STATE-01 | Phase 4 | Pending |
| STATE-02 | Phase 4 | Pending |
| STATE-03 | Phase 4 | Pending |
| STATE-04 | Phase 4 | Pending |
| STATE-05 | Phase 4 | Pending |
| STATE-06 | Phase 4 | Pending |
| STATE-07 | Phase 4 | Pending |
| STATE-08 | Phase 4 | Pending |
| SPEC-01 | Phase 5 | Pending |
| SPEC-02 | Phase 5 | Pending |
| SPEC-03 | Phase 5 | Pending |
| SPEC-04 | Phase 5 | Pending |
| TDD-01 | Phase 6 | Pending |
| TDD-02 | Phase 6 | Pending |
| TDD-03 | Phase 6 | Pending |
| TDD-04 | Phase 6 | Pending |
| QUAL-01 | Phase 7 | Pending |
| QUAL-02 | Phase 7 | Pending |
| QUAL-03 | Phase 7 | Pending |
| QUAL-04 | Phase 7 | Pending |
| QUAL-05 | Phase 8 | Pending |
| QUAL-06 | Phase 8 | Pending |
| TEST-01 | Phase 8 | Pending |
| TEST-02 | Phase 8 | Pending |
| TEST-03 | Phase 8 | Pending |
| TEST-04 | Phase 8 | Pending |

**Coverage:**
- v3.0 requirements: 43 total
- Mapped to phases: 43
- Unmapped: 0

---
*Requirements defined: 2026-04-27*
*Last updated: 2026-04-27 after Phase 2 verification*
