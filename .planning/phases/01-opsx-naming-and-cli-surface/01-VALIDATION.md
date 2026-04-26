---
phase: 01
slug: opsx-naming-and-cli-surface
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-27
---

# Phase 01 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node script with built-in `assert` |
| **Config file** | none — `scripts/test-workflow-runtime.js` is self-contained |
| **Quick run command** | `node scripts/test-workflow-runtime.js` |
| **Full suite command** | `node scripts/test-workflow-runtime.js && node bin/opsx.js --version && node bin/opsx.js --help && npm_config_cache=/tmp/opsx-npm-cache npm pack --dry-run` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node scripts/test-workflow-runtime.js`
- **After every plan wave:** Run `node scripts/test-workflow-runtime.js && node bin/opsx.js --version && node bin/opsx.js --help`
- **Before `$gsd-verify-work`:** Full suite and stale-name search gate must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | NAME-01 | — | Package metadata does not expose old package identity | smoke | `node -e "const p=require('./package.json'); if (p.name !== '@xenonbyte/opsx') process.exit(1)"` | ✅ | ⬜ pending |
| 01-01-02 | 01 | 1 | NAME-02 | — | CLI exposes OpsX command surface without legacy `openspec` binary alias | smoke | `node bin/opsx.js --version && node bin/opsx.js --help` | ⬜ W0 | ⬜ pending |
| 01-01-03 | 01 | 1 | NAME-03 | — | Runtime/install/generator smoke tests still pass after renaming | regression | `node scripts/test-workflow-runtime.js` | ✅ | ⬜ pending |
| 01-02-01 | 02 | 2 | NAME-03, NAME-04 | — | Shipped docs/templates/commands do not present old names as active surfaces | grep | `rg -n "OpenSpec|openspec|\\.openspec|\\$openspec|/openspec|/prompts:openspec|@xenonbyte/openspec|~/.openspec" README.md README-zh.md docs package.json bin lib scripts commands skills templates` | ✅ | ⬜ pending |
| 01-02-02 | 02 | 2 | NAME-05 | — | Release metadata communicates `3.0.0` breaking OpsX rename | smoke | `rg -n "3\\.0\\.0|@xenonbyte/opsx|OpsX" package.json CHANGELOG.md README.md README-zh.md` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers this phase:

- [x] `scripts/test-workflow-runtime.js` — baseline runtime/install/check/doc regression coverage
- [x] `bin/openspec.js` — current entrypoint to be renamed to `bin/opsx.js`
- [x] `/tmp/opsx-npm-cache` — npm dry-run cache workaround for host cache permissions

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| History/migration allowlist review | NAME-04 | The grep command intentionally returns allowed lineage/history references; a human or verifier must confirm they are not active workflow guidance | Review every grep hit and classify it as source-lineage, changelog history, migration guidance, or unexpected active surface |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-04-27
