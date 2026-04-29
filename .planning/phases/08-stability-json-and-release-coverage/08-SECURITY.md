---
phase: 08
slug: stability-json-and-release-coverage
status: verified
threats_open: 0
asvs_level: 1
created: 2026-04-29
---

# Phase 08 - Security

Per-phase security contract: planned threat mitigations only. This audit did not scan for unrelated new threats.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| published package surface -> split test suite | TEST-01 / TEST-02 can regress if package/bin and public-route assertions are lost during the split. | package metadata, tarball file list, public route assertions |
| aggregate runner -> topic modules | Missing or dynamically skipped topic registration can hide assertion groups while the aggregate exits zero. | test registration contract and topic order |
| CLI stdout/stderr -> machine consumer | Human text or unexpected stderr breaks JSON consumers. | `opsx status --json` stdout/stderr and exit status |
| persisted workspace state -> JSON envelope | Expected blocked or missing workflow states must be diagnostics, not transport failures. | workspace, migration, active change, status warnings/blockers |
| filesystem-derived artifact paths -> shared matcher helpers | Literal glob characters can widen matching if treated as raw patterns. | artifact paths and glob patterns |
| normalized relative paths -> scope/hash logic | Divergent path normalization can change allow/forbid or drift decisions. | relative paths, path scopes, tracked artifact hashes |
| user-/plan-derived target paths -> migrate/sync writes | Traversal or forged roots can redirect writes outside `.opsx/**`. | migration and sync write targets |
| split test files -> aggregate release gate | Moved gate assertions can disappear if topic and aggregate files drift. | gate test names and aggregate summary |
| packaged tarball -> published release | Release contents can drift from repo expectations without inspecting real pack output. | npm pack metadata and tarball file list |
| generated command surface -> public docs/help | Banned entrypoints can reappear while runtime tests still pass. | generated bundles, checked-in commands, help/docs |
| release documentation -> operator action | Stale docs can cause publication without the full Phase 8 gate. | release checklist commands and pass/fail criteria |
| documented JSON contract -> automation users | Incorrect docs can mislead scripts about `ok`, stderr, and exit semantics. | README, command docs, runtime guidance, changelog |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status | Evidence |
|-----------|----------|-----------|-------------|------------|--------|----------|
| T-08-01 | Tampering | `package.json` / topic scripts | mitigate | `npm test` and `npm run test:workflow-runtime` use the same aggregate runner; TEST-01/TEST-02 assertions live in explicit topic files with exact test names. | closed | `package.json:7-10`; `scripts/test-workflow-package.js:38-43`, `scripts/test-workflow-package.js:182`; `scripts/test-workflow-generation.js:164`; `npm test` passed 126/126 on 2026-04-29. |
| T-08-02 | Information Integrity | `scripts/test-workflow-runtime.js` | mitigate | Explicit `registerTests(test, helpers)` contract and deterministic topic import order; no dynamic discovery or silent skip path. | closed | `scripts/test-workflow-runtime.js:4-18`, `scripts/test-workflow-runtime.js:20-30`. |
| T-08-03 | Information Disclosure | `lib/cli.js` JSON output | mitigate | JSON mode writes only the serialized envelope to stdout; stderr/non-zero are reserved for exceptional failures. | closed | `lib/cli.js:147-193`, `lib/cli.js:278-284`; `scripts/test-workflow-state.js:464-470`, `scripts/test-workflow-state.js:537-540`; `npm test` passed 126/126. |
| T-08-04 | Tampering | `lib/cli.js` status branch | mitigate | Missing workspace, missing active change, migration candidates, warnings, and blocked state are serialized in the envelope with exit 0. | closed | `lib/cli.js:157-226`; `scripts/test-workflow-state.js:475-530`; `docs/commands.md:76-86`. |
| T-08-05 | Tampering | `lib/path-utils.js` / read-only consumers | mitigate | Shared normalization/base-relative helpers are imported by read-only consumers instead of duplicated for artifact/scope handling. | closed | `lib/path-utils.js:1-42`; `lib/change-artifacts.js:5-22`; `lib/path-scope.js:1-46`; `scripts/test-workflow-paths.js:93-103`. |
| T-08-06 | Elevation of Privilege | `lib/glob-utils.js` / `lib/path-scope.js` | mitigate | Literal glob characters are escaped and matching goes through one `picomatch` wrapper. | closed | `lib/glob-utils.js:1-49`; `lib/path-scope.js:1-2`, `lib/path-scope.js:32-46`; `scripts/test-workflow-paths.js:60-91`, `scripts/test-workflow-paths.js:201-227`. |
| T-08-07 | Tampering | `lib/sync.js` | mitigate | Canonical `repoRoot/.opsx/specs` guard and no-partial-write behavior are retained while using shared containment. | closed | `lib/sync.js:32-40`, `lib/sync.js:306-363`; `scripts/test-workflow-paths.js:248-307`; `npm test` passed 126/126. |
| T-08-08 | Elevation of Privilege | `lib/migrate.js` / `lib/path-utils.js` | mitigate | Shared `ensureWithinBase()` policy prevents migration writes outside canonical repo/home roots. | closed | `lib/migrate.js:4-7`, `lib/migrate.js:86-88`, `lib/migrate.js:140-154`, `lib/migrate.js:234-238`, `lib/migrate.js:381-388`; `scripts/test-workflow-paths.js:229-245`. |
| T-08-09 | Tampering | `scripts/test-workflow-gates.js` | mitigate | Critical gate test names are preserved in the moved gate topic file. | closed | `scripts/test-workflow-gates.js:230`, `scripts/test-workflow-gates.js:557`, `scripts/test-workflow-gates.js:924`, `scripts/test-workflow-gates.js:3606`; `npm test` passed 126/126. |
| T-08-10 | Information Integrity | `scripts/test-workflow-runtime.js` | mitigate | Aggregate runner only performs ordered topic registration and final summary execution. | closed | `scripts/test-workflow-runtime.js:4-30`; `scripts/test-workflow-shared.js:416-480`; `scripts/test-workflow-paths.js:309-319`. |
| T-08-11 | Information Integrity | `scripts/test-workflow-package.js` | mitigate | `npm_config_cache=.npm-cache npm pack --dry-run --json` and shipped CLI smoke validate the packed surface. | closed | `scripts/test-workflow-package.js:8`, `scripts/test-workflow-package.js:56-99`, `scripts/test-workflow-package.js:101-180`; `08-REVIEW.md:50-54`; `npm test` passed 126/126. |
| T-08-12 | Spoofing | `scripts/test-workflow-generation.js` / shipped commands | mitigate | Parity plus legacy public-surface gates prevent banned entrypoints from masquerading as valid public routes. | closed | `scripts/test-workflow-shared.js:13-21`; `scripts/test-workflow-generation.js:155-162`, `scripts/test-workflow-generation.js:164-224`, `scripts/test-workflow-generation.js:437-484`; `08-REVIEW.md:50-54`. |
| T-08-13 | Repudiation | `docs/release-checklist.md` | mitigate | Canonical checklist contains exact release commands and verification evidence exists before release. | closed | `docs/release-checklist.md:1-45`, `docs/release-checklist.md:50-72`; `08-VERIFICATION.md:45-53`; `08-07-SUMMARY.md:50-70`, `08-07-SUMMARY.md:82-88`. |
| T-08-14 | Information Integrity | README/docs/changelog | mitigate | README/docs/changelog match shipped Phase 8 runtime, release, and path/glob behavior. | closed | `README.md:49-58`; `README-zh.md:49-57`; `docs/commands.md:76-86`; `docs/runtime-guidance.md:32-49`; `CHANGELOG.md:11-12`; `08-VERIFICATION.md:36-41`. |

---

## Accepted Risks Log

No accepted risks.

---

## Unregistered Flags

None. No `## Threat Flags` sections were present in `08-01-SUMMARY.md` through `08-07-SUMMARY.md`.

---

## Residual Documentation Risks

These are carried from `08-REVIEW.md` / `08-VERIFICATION.md` as non-security residual documentation risks because they do not leave a planned mitigation open:

| Ref | File | Classification | Rationale |
|-----|------|----------------|-----------|
| WR-01 | `README.md:47`, `README-zh.md:47` | non-security residual documentation risk | Planned mitigations for TEST-02/public-surface gating are implemented in generation/package tests and the release allowlist gate. The remaining issue is warning wording that spells banned route examples. |
| WR-02 | `docs/release-checklist.md:61-64` | non-security residual documentation risk | T-08-13 requires exact commands and release verification evidence; the checklist records those commands, and Phase 8 verification evidence is present. The remaining issue is operator copy/paste ergonomics for GSD workflow invocations. |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-04-29 | 14 | 14 | 0 | Codex GSD security auditor |

Verification commands and cited evidence:
- `npm test` - passed 126/126 on 2026-04-29.
- `rg -n "^## Threat Flags" .planning/phases/08-stability-json-and-release-coverage/08-*-SUMMARY.md` - no threat-flag sections found.
- Source evidence cited above from `package.json`, `lib/cli.js`, `lib/path-utils.js`, `lib/glob-utils.js`, `lib/path-scope.js`, `lib/migrate.js`, `lib/sync.js`, split topic scripts, docs, and Phase 8 review/verification artifacts.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-04-29
