# Phase 2: `.opsx/` Workspace and Migration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `02-CONTEXT.md` - this log preserves the alternatives considered.

**Date:** 2026-04-27
**Phase:** 02-opsx-workspace-and-migration
**Mode:** Default-mode fallback; interactive selector unavailable, so recommended defaults were selected from the user-provided milestone report and prior Phase 1 context.
**Areas discussed:** Canonical paths, migration behavior, generated defaults, git tracking, CLI/runtime surface

---

## Canonical Paths

| Option | Description | Selected |
|--------|-------------|----------|
| Full OpsX paths now | Move project/global runtime paths to `.opsx/` and `~/.opsx/` in Phase 2 | Yes |
| Keep legacy runtime paths temporarily | Continue using `openspec/` and `~/.openspec/` while only documenting future paths | |
| Dual-write compatibility | Write both old and new directories during transition | |

**Selected default:** Full OpsX paths now.
**Rationale:** Phase 1 intentionally left path migration for Phase 2; the milestone direction requires `.opsx/` and `~/.opsx/` to become canonical before command preflight and state-machine phases.

---

## Migration Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Safe dry-run plus default abort on existing `.opsx/` | Preview mappings without writes, execute only when destination is safe | Yes |
| Automatic merge | Combine old and new directories automatically when both exist | |
| Best-effort copy | Copy what can be copied and warn on conflicts | |

**Selected default:** Safe dry-run plus default abort on existing `.opsx/`.
**Rationale:** The user explicitly prioritized migration safety: dry-run, abort when `.opsx/` already exists, and require explicit merge intent before combining directories.

---

## Generated Defaults

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal honest scaffolds | Create missing `active.yaml`, `state.yaml`, `context.md`, and `drift.md` without pretending full state-machine behavior exists | Yes |
| Full state-machine records | Generate complete Phase 4-style state/hashes/verification logs during migration | |
| No generated state files | Only move old artifacts and leave state creation for Phase 4 | |

**Selected default:** Minimal honest scaffolds.
**Rationale:** Phase 2 requirements include creating missing runtime artifacts, but Phase 4 owns the durable state machine. Generated files should support later recovery without fabricating verification data.

---

## Git Tracking

| Option | Description | Selected |
|--------|-------------|----------|
| Track workflow artifacts, ignore runtime noise | Track config/active/changes/specs/archive; ignore cache/tmp/logs | Yes |
| Track entire `.opsx/` directory | Simpler but risks committing cache/log noise | |
| Ignore entire `.opsx/` directory | Prevents noise but loses versioned workflow artifacts | |

**Selected default:** Track workflow artifacts, ignore runtime noise.
**Rationale:** This exactly matches the milestone guidance and keeps specs/changes versionable while preventing generated cache/log files from entering commits.

---

## CLI and Runtime Surface

| Option | Description | Selected |
|--------|-------------|----------|
| Implement real `opsx migrate`, keep deep `status` for later | Replace migrate placeholder now and keep status truthful/minimal | Yes |
| Implement full migrate and full status together | Broader scope; overlaps Phase 4/8 | |
| Leave both as placeholders | Fails Phase 2 migration requirements | |

**Selected default:** Implement real `opsx migrate`, keep deep `status` for later.
**Rationale:** Phase 2 success criteria require migration behavior. Full durable state status depends on Phase 4 state artifacts and Phase 8 clean JSON output.

---

## the agent's Discretion

- The planner can decide module names and exact internal helper boundaries.
- The planner can choose the exact dry-run text format if tests assert the complete mapping.
- The planner can infer conservative `state.yaml` stages when existing artifacts make the stage obvious, but should avoid fabricating verification logs.

## Deferred Ideas

- `opsx migrate --merge` beyond default safe abort.
- Full state-machine validation, artifact hashes, active task group tracking, and verification logs.
- Final `@xenonbyte/openspec@2.x` bridge package.
