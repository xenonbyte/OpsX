---
phase: 02
slug: opsx-workspace-and-migration
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-27
---

# Phase 02 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Custom Node test script using built-in `assert` with CLI and temp-fixture integration |
| **Config file** | none - self-contained harness in `scripts/test-workflow-runtime.js` |
| **Quick run command** | `npm run test:workflow-runtime` |
| **Full suite command** | `npm run test:workflow-runtime` plus targeted temp-fixture `opsx migrate --dry-run` and execute smoke cases once added |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:workflow-runtime`.
- **After every plan wave:** Run `npm run test:workflow-runtime` plus targeted fixture smoke coverage for dry-run, execute, conflict abort, shared-home migration, and `.gitignore`.
- **Before `$gsd-verify-work`:** Full migration coverage must be green, `opsx check` must report canonical and legacy-candidate paths truthfully, and `.gitignore` behavior must be verified.
- **Max feedback latency:** 10 seconds.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-01 | migration-core | 0 | DIR-03 | T-02-01 / T-02-04 | Dry-run reuses the same operation plan as execute mode and performs zero writes | integration | `npm run test:workflow-runtime` | yes, extend `scripts/test-workflow-runtime.js` | pending |
| 02-01-02 | migration-core | 0 | DIR-04 | T-02-02 / T-02-03 | Execute mode moves only planned legacy paths into `.opsx/` | integration | `npm run test:workflow-runtime` | yes, extend `scripts/test-workflow-runtime.js` | pending |
| 02-01-03 | migration-core | 0 | DIR-05 | T-02-02 / T-02-03 | Per-change `.openspec.yaml` becomes `change.yaml`; runtime scaffolds are generated without overwriting existing files | integration | `npm run test:workflow-runtime` | yes, extend `scripts/test-workflow-runtime.js` | pending |
| 02-01-04 | migration-core | 0 | DIR-06 | T-02-02 | Existing `.opsx/` aborts by default before mutation | integration | `npm run test:workflow-runtime` | yes, extend `scripts/test-workflow-runtime.js` | pending |
| 02-02-01 | path-canonicalization | 1 | DIR-01 | T-02-01 | Project runtime constants and loaders use `.opsx/` as canonical workspace root | integration | `npm run test:workflow-runtime` | yes, extend `scripts/test-workflow-runtime.js` | pending |
| 02-02-02 | path-canonicalization | 1 | DIR-02 | T-02-03 | Shared-home runtime constants and install/check logic use `~/.opsx/` and do not lose legacy-state visibility during migration | integration | `npm run test:workflow-runtime` | yes, extend `scripts/test-workflow-runtime.js` | pending |
| 02-03-01 | gitignore-docs | 1 | DIR-07 | T-02-03 | Tracked workflow artifacts are not ignored; `.opsx/cache/`, `.opsx/tmp/`, and `.opsx/logs/` are ignored | integration + VCS check | `npm run test:workflow-runtime` plus `git check-ignore -v ...` | yes, extend `.gitignore` and docs | pending |

*Status: pending, green, red, flaky.*

---

## Wave 0 Requirements

- [ ] Add test-fixture helpers for legacy repo state under `openspec/`.
- [ ] Add test-fixture helpers for legacy shared-home state under `~/.openspec/`.
- [ ] Add `opsx migrate --dry-run` assertions for exact mapping output and zero-write behavior.
- [ ] Add execute-mode assertions for moved paths, renamed `change.yaml`, and generated `active/state/context/drift` files.
- [ ] Add conflict-abort assertions when `.opsx/` already exists before migration runs.
- [ ] Add `.gitignore` verification for tracked `.opsx/changes/**` and ignored `.opsx/cache/**`, `.opsx/tmp/**`, and `.opsx/logs/**`.

---

## Manual-Only Verifications

All phase behaviors should have automated verification. Manual review is still required for documentation clarity and migration-output readability.

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Docs explain tracked vs ignored `.opsx` paths clearly | DIR-07 | Wording quality is not fully captured by automated path checks | Review README/customization docs after `.gitignore` assertions pass |

---

## Threat References

| Threat ID | Threat | Required Control |
|-----------|--------|------------------|
| T-02-01 | Path traversal through crafted change names or destination paths | Resolve paths and reject destinations whose `path.relative()` escapes the approved base |
| T-02-02 | Silent overwrite of existing `.opsx/` content | Preflight conflicts and abort by default unless explicit merge support is implemented later |
| T-02-03 | Partial migration leaves repo or shared home split across old and new layouts | Build a complete operation plan before mutation; generate scaffolds only after required moves complete |
| T-02-04 | Dry-run output diverges from execute-mode behavior | Use the same migration plan object for dry-run formatting and execute-mode mutation |

---

## Validation Sign-Off

- [x] All planned implementation tasks must include automated verification or Wave 0 dependencies.
- [x] Sampling continuity: no 3 consecutive implementation tasks may skip automated verification.
- [x] Wave 0 covers all missing test references identified by research.
- [x] No watch-mode flags.
- [x] Feedback latency target is under 10 seconds.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** approved 2026-04-27 for planning; execution sign-off remains pending until tests are implemented and green.
