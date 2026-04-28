---
phase: 8
slug: stability-json-and-release-coverage
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-29
---

# Phase 8 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Custom Node.js regression scripts using the built-in `assert` module |
| **Config file** | none |
| **Quick run command** | `npm run test:workflow-runtime` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run the touched topic script plus `npm run test:workflow-runtime` until the compatibility runner delegates to the split scripts.
- **After every plan wave:** Run `npm test` once available; before that entrypoint exists, run `npm run test:workflow-runtime` plus any new topic scripts introduced in the wave.
- **Before release sign-off:** Run the full release gate: `npm test`, CLI smoke checks, generated command parity, legacy public-surface grep, `npm_config_cache=.npm-cache npm pack --dry-run --json`, `gsd-sdk query verify.schema-drift 08`, `$gsd-code-review 8`, and `$gsd-verify-work 8`.
- **Max feedback latency:** 60 seconds.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 08-TBD-QUAL-05 | TBD | TBD | QUAL-05 | T8-JSON-STDOUT | `status --json` emits parseable JSON only on stdout and reserves stderr for exceptional failures | integration | `node scripts/test-workflow-state.js` | MISSING | pending |
| 08-TBD-QUAL-06 | TBD | TBD | QUAL-06 | T8-PATH-GLOB | path/glob helpers normalize paths, enforce base containment, and escape glob-special literal paths | integration | `node scripts/test-workflow-paths.js` | MISSING | pending |
| 08-TBD-TEST-01 | TBD | TBD | TEST-01 | T8-PACKAGE-SURFACE | package/bin metadata and packed tarball expose only `@xenonbyte/opsx` and `opsx` | integration | `node scripts/test-workflow-package.js` | MISSING | pending |
| 08-TBD-TEST-02 | TBD | TBD | TEST-02 | T8-COMMAND-SURFACE | generated and checked-in commands expose only explicit `/opsx-*` and `$opsx-*` public routes | integration | `node scripts/test-workflow-generation.js` | MISSING | pending |
| 08-TBD-TEST-03 | TBD | TBD | TEST-03 | T8-STATE-DRIFT | migration, state-machine, artifact hash drift, resume/continue, and status JSON behavior remain covered | integration | `node scripts/test-workflow-state.js` | MISSING | pending |
| 08-TBD-TEST-04 | TBD | TBD | TEST-04 | T8-GATES | spec review, TDD, path guards, archive blocking, and batch gates remain covered after the split | integration | `node scripts/test-workflow-gates.js` | MISSING | pending |

*Status: pending until PLAN.md files assign concrete task IDs.*

---

## Wave 0 Requirements

- [ ] `scripts/test-workflow-shared.js` - shared fixture, process, parity, and pack helpers extracted from the current monolith.
- [ ] `scripts/test-workflow-package.js` - package/bin metadata plus `npm_config_cache=.npm-cache npm pack --dry-run --json` assertions.
- [ ] `scripts/test-workflow-generation.js` - generated command parity and banned public-surface assertions.
- [ ] `scripts/test-workflow-state.js` - migration, state-machine, drift, resume/continue, and `status --json` assertions.
- [ ] `scripts/test-workflow-paths.js` - shared path/glob utility and glob-special fixture assertions.
- [ ] `scripts/test-workflow-gates.js` - spec review, TDD-light, verify/sync/archive, and batch gate assertions.
- [ ] `package.json` - `npm test` total release/preflight entrypoint while preserving `npm run test:workflow-runtime`.

---

## Manual-Only Verifications

All Phase 8 behaviors should have automated verification. Manual review is limited to confirming release-facing documentation text matches the final scripts and CLI behavior.

---

## Threat References

| Threat | Behavior | Mitigation |
|--------|----------|------------|
| T8-JSON-STDOUT | Non-JSON stdout breaks machine consumers | `status --json` tests parse stdout as JSON and assert exceptional failures are the only stderr/non-zero cases |
| T8-PATH-GLOB | Literal artifact paths with glob-special characters are misinterpreted as patterns | shared glob utilities escape literals and tests include special-character fixtures |
| T8-PACKAGE-SURFACE | Packed tarball exposes legacy public entrypoints or stale assets | pack dry-run JSON assertions and legacy public-surface grep run in the release gate |
| T8-COMMAND-SURFACE | Generated commands drift from source-of-truth workflow bundles | generated parity tests compare `lib/generator.js` output to checked-in command files |
| T8-STATE-DRIFT | Runtime status or drift checks mutate state while reporting | status/state tests assert read-only behavior and artifact hash drift warnings |
| T8-GATES | Verify/sync/archive/batch gates regress during test split | gate topic tests preserve existing blocking and skip-reason assertions |

---

## Validation Sign-Off

- [x] All phase requirements have planned automated verification surfaces.
- [x] Sampling continuity prevents more than 3 consecutive tasks without automated verification.
- [x] Wave 0 requirements identify all currently missing test files and scripts.
- [x] No watch-mode flags are required.
- [x] Feedback latency target is under 60 seconds.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** pending PLAN.md task ID assignment.
