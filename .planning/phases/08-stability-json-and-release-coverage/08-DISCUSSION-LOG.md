# Phase 8: Stability, JSON, and Release Coverage - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-04-29
**Phase:** 08-stability-json-and-release-coverage
**Areas discussed:** `status --json` output contract, path/glob stability, test suite organization, release verification gate

---

## `status --json` Output Contract

| Option | Description | Selected |
|--------|-------------|----------|
| Complete envelope | Include `ok`, `version`, `command`, `workspace`, `migration`, `activeChange`, `changeStatus`, `warnings`, and `errors`. | yes |
| Mirror current change status only | Mainly output `change`, `stage`, `nextAction`, `route`, `active`, `blockers`, and `warnings`. | |
| Minimal status object | Only output `change`, `stage`, `nextAction`, `blockers`, and `warnings`. | |

**User's choice:** Complete envelope.
**Notes:** The JSON contract is agent-facing and should support workspace/migration states, not only active change state.

| Option | Description | Selected |
|--------|-------------|----------|
| JSON stdout always | Expected workflow states exit `0`; stdout is JSON only; stderr is for true exceptions. | yes |
| Non-zero for problems | Workspace missing, no active change, or blocked state exit non-zero while stdout stays JSON. | |
| Success stdout, errors stderr | Error cases write stderr text or JSON. | |

**User's choice:** JSON stdout always.
**Notes:** Expected states must be represented in the JSON envelope rather than via process failure.

| Option | Description | Selected |
|--------|-------------|----------|
| Summary plus diagnostics | Include pending counts, abort reason, legacy candidates, and canonical/legacy root state. | yes |
| Summary only | Include only `needed`, `abortReason`, and `nextAction`. | |
| Full dry-run mapping | Embed full migration move/create mapping. | |

**User's choice:** Summary plus diagnostics.
**Notes:** Status should remain diagnostic without becoming a second dry-run command.

---

## Path and Glob Stability

| Option | Description | Selected |
|--------|-------------|----------|
| Central utility modules | Add `lib/path-utils.js` / `lib/glob-utils.js` and replace scattered helpers. | |
| Patch local helpers | Keep scattered local helpers and only fix failing cases. | |
| Introduce path/glob dependency | Use an additional dependency if it improves correctness. | yes |

**User's choice:** Introduce path/glob dependency.
**Notes:** This must not break Node `>=14.14.0`.

| Option | Description | Selected |
|--------|-------------|----------|
| Research then lock package/version | Validate Node compatibility, maintenance state, and API stability before selecting. | yes |
| Default to fast-glob-like package | Plan around a fast-glob style implementation. | |
| Default to npm glob-like package | Plan around the `glob` package family. | |

**User's choice:** Research then lock package/version.
**Notes:** Phase 8 research must verify the dependency rather than choosing by memory.

| Option | Description | Selected |
|--------|-------------|----------|
| All artifact/path surfaces | Cover runtime-guidance, hashing, migrate, sync, path-scope, and glob-special fixtures. | yes |
| Requirement-explicit only | Cover only artifact canonicalization, escaping, and glob outputs. | |
| CLI-only | Cover only user-visible status and CLI smoke behavior. | |

**User's choice:** All artifact/path surfaces.
**Notes:** The stabilization should reduce path behavior drift across modules.

---

## Test Suite Organization

| Option | Description | Selected |
|--------|-------------|----------|
| Multiple scripts plus total entrypoint | Split tests by topic and keep one total runner. | yes |
| Single `test:workflow-runtime` | Keep the monolithic current test script. | |
| Release smoke only | Add only a release smoke script while keeping the main monolith. | |

**User's choice:** Multiple scripts plus total entrypoint.
**Notes:** The suite is large enough that topic-level scripts are now preferable.

| Option | Description | Selected |
|--------|-------------|----------|
| `npm test` total entrypoint | Use standard npm total test entrypoint for release/preflight checks. | yes |
| Keep `test:workflow-runtime` as total | Avoid adding `npm test`. | |
| Add `quality:ci` total | Use a separate CI-style entrypoint. | |

**User's choice:** `npm test` total entrypoint.
**Notes:** `test:workflow-runtime` should remain available as a compatibility or runtime-focused command.

| Option | Description | Selected |
|--------|-------------|----------|
| Gradual split | Extract helpers first, then migrate tests by topic. | |
| Split cleanly in one phase | Move the 109-test baseline into topic-focused scripts during Phase 8. | yes |
| Wrapper only | Keep tests in place and only add a wrapper. | |

**User's choice:** Split cleanly in one phase.
**Notes:** Planning should still decompose this into reviewable implementation steps.

---

## Release Verification Gate

| Option | Description | Selected |
|--------|-------------|----------|
| Complete release gate | Include `npm test`, CLI smoke, parity, grep, package dry-run, schema drift, review, and verification. | yes |
| Tests plus CLI smoke | Skip package dry-run and legacy grep. | |
| npm test only | Rely only on the test entrypoint. | |

**User's choice:** Complete release gate.
**Notes:** Phase 8 is the final release-hardening pass, so the gate should be comprehensive.

| Option | Description | Selected |
|--------|-------------|----------|
| `npm pack --dry-run --json` | Assert package metadata and packed file contents without publishing. | yes |
| `npm pack --dry-run` text | Use text output only. | |
| Skip pack dry-run | Do not run npm pack as a release check. | |

**User's choice:** `npm pack --dry-run --json`.
**Notes:** JSON output is easier to assert and fits the release gate.

| Option | Description | Selected |
|--------|-------------|----------|
| Update release docs and checklist | Update changelog/checklist/README for release-facing changes. | yes |
| Code and tests only | Do not touch release docs. | |
| Verification report only | Record release details only in GSD verification artifacts. | |

**User's choice:** Update release docs and checklist.
**Notes:** Release-facing docs should match the final v3.0 behavior.

---

## the agent's Discretion

- Exact JSON field ordering can be implementation-defined if deterministic in tests.
- Exact path/glob dependency is left to Phase 8 research after compatibility validation.
- Exact test script names are left to planning if they clearly map to command, migration, state, spec review, TDD, JSON, and release coverage.

## Deferred Ideas

None.
