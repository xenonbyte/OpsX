# Phase 1: OpsX Naming and CLI Surface - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-27
**Phase:** 01-opsx-naming-and-cli-surface
**Areas discussed:** Product identity, CLI surface, legacy references, generated assets and skills, verification expectations

---

## Runtime Note

The user invoked `$gsd-discuss-phase 1` after providing a complete OpsX optimization report. The session is running in Codex Default mode, where the GSD interactive question component is unavailable. Following the skill adapter fallback, decisions below were extracted from the supplied report, `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, and codebase scouting rather than through a live menu flow.

No additional scope was added.

---

## Product Identity

| Option | Description | Selected |
|--------|-------------|----------|
| Full OpsX rename | Rename product, package, binary, repo metadata, docs, and release notes to OpsX for v3.0 | yes |
| Hybrid OpenSpec/OpsX | Keep OpenSpec as package/skill identity while showing OpsX commands | no |
| Cosmetic docs rename only | Leave package and CLI unchanged for now | no |

**User's choice:** Full OpsX rename.
**Notes:** User explicitly requested `OpsX = Operational Spec eXecution`, package `@xenonbyte/opsx`, CLI `opsx`, skill `opsx`, repository `xenonbyte/opsx`, and version `3.0.0`.

---

## CLI Surface

| Option | Description | Selected |
|--------|-------------|----------|
| `opsx` only | Ship only the `opsx` binary from the new package; old binary handled separately if needed | yes |
| Dual binary | Ship both `opsx` and `openspec` from `@xenonbyte/opsx` | no |
| Keep `openspec` for one major | Delay binary rename to preserve compatibility | no |

**User's choice:** `opsx` only.
**Notes:** Compatibility bridge, if any, is deferred to a possible final `@xenonbyte/openspec@2.x` package. Phase 1 must avoid overclaiming deep `migrate` or `status` behavior that belongs to later phases.

---

## Legacy References

| Option | Description | Selected |
|--------|-------------|----------|
| History/migration only | Allow OpenSpec references only for lineage, changelog, and migration guidance | yes |
| Keep old commands in docs | Continue documenting `/openspec`, `$openspec`, and `/prompts:openspec` alongside OpsX | no |
| Remove every occurrence | Delete even changelog/source-lineage mentions | no |

**User's choice:** History/migration only.
**Notes:** The search gate should leave only intentional historical or migration references after Phase 1.

---

## Generated Assets and Skills

| Option | Description | Selected |
|--------|-------------|----------|
| Coarse rename now, semantic rewrite later | Rename paths/labels needed for package coherence now; Phase 3 rewrites behavior in detail | yes |
| Full prompt/skill rewrite now | Do all command semantics and preflight behavior in Phase 1 | no |
| Defer all generated assets | Leave generated commands and skills untouched until Phase 3 | no |

**User's choice:** Coarse rename now, semantic rewrite later.
**Notes:** This keeps Phase 1 focused while avoiding a package that still ships obvious `openspec` paths as active surfaces.

---

## Verification Expectations

| Option | Description | Selected |
|--------|-------------|----------|
| Rename smoke + existing tests | Verify `opsx` help/version, install/check/doc smoke paths, runtime tests, search gate, and package dry-run | yes |
| Docs-only verification | Only check changed docs and package metadata | no |
| Full future suite | Build all Phase 8 test scripts during Phase 1 | no |

**User's choice:** Rename smoke + existing tests.
**Notes:** Phase 8 owns the expanded full v3.0 coverage suite. Phase 1 still needs enough regression coverage to avoid shipping broken package identity.

---

## the agent's Discretion

- Exact edit order and commit granularity.
- Whether `migrate` and `status` appear as recognized placeholders in Phase 1 or are reserved for later implementation, as long as help/docs do not falsely claim complete behavior.
- Helper constant structure for product names and command names.

## Deferred Ideas

- Final `@xenonbyte/openspec@2.x` bridge package.
- Full `.opsx/` workspace migration engine.
- Full command preflight rewrite around active change state.
