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
| **Full suite command** | `node scripts/test-workflow-runtime.js && node bin/opsx.js --version && node bin/opsx.js --help && node scripts/check-phase1-legacy-allowlist.js && npm_config_cache=/tmp/opsx-npm-cache npm pack --dry-run` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node scripts/test-workflow-runtime.js`
- **After every plan wave:** Run `node scripts/test-workflow-runtime.js && node bin/opsx.js --version && node bin/opsx.js --help`
- **Before `$gsd-verify-work`:** Full suite, allowlist gate, and package dry-run must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | NAME-01 | — | Package metadata does not expose old package identity | smoke | `node -e "const p=require('./package.json'); if (p.name !== '@xenonbyte/opsx') process.exit(1)"` | ✅ | ⬜ pending |
| 01-01-02 | 01 | 1 | NAME-02 | — | CLI exposes OpsX command surface without legacy `openspec` binary alias | smoke | `node bin/opsx.js --version && node bin/opsx.js --help` | ⬜ W0 | ⬜ pending |
| 01-01-03 | 01 | 1 | NAME-03 | — | Runtime/install/generator smoke tests still pass after renaming | regression | `node scripts/test-workflow-runtime.js` | ✅ | ⬜ pending |
| 01-02-01 | 02 | 2 | NAME-03 | T-01-05 | Shipped skill bundle is renamed to `skills/opsx` without keeping duplicate public identities | grep | `rg -n "name: opsx|OpsX|\\$opsx|/opsx-" skills/opsx` | ✅ | ⬜ pending |
| 01-02-02 | 02 | 2 | NAME-03 | T-01-06 | Install/check/doc plumbing resolves `skills/opsx` and reports `OpsX Installation Check` | smoke | `node bin/opsx.js check` | ✅ | ⬜ pending |
| 01-03-01 | 03 | 2 | NAME-03 | T-01-08 | Generator/templates emit OpsX-first command syntax | grep | `rg -n "OpsX|\\$opsx <request>|/opsx-|opsx check|opsx doc|opsx language" lib/generator.js lib/workflow.js templates/commands` | ✅ | ⬜ pending |
| 01-03-02 | 03 | 2 | NAME-03 | T-01-09 | Checked-in command assets remove legacy `openspec` entry files | grep | `! rg -n "OpenSpec|/openspec|/prompts:openspec|\\$openspec|skills/openspec|@xenonbyte/openspec|~/.openspec" commands` | ✅ | ⬜ pending |
| 01-04-01 | 04 | 3 | NAME-02, NAME-03 | T-01-11 | Runtime regression suite covers renamed CLI, skill, and command bundle surfaces | regression | `node scripts/test-workflow-runtime.js` | ✅ | ⬜ pending |
| 01-05-01 | 05 | 3 | NAME-03, NAME-04 | T-01-14 | README and docs present OpsX as the primary public surface | grep | `rg -n "@xenonbyte/opsx|OpsX|opsx (install|uninstall|check|doc|language|migrate|status)" README.md README-zh.md docs` | ✅ | ⬜ pending |
| 01-05-02 | 05 | 3 | NAME-03, NAME-04 | T-01-15 | Shipped project templates do not keep legacy public tokens | grep | `! rg -n "OpenSpec|openspec|\\.openspec|\\$openspec|/openspec|/prompts:openspec|skills/openspec|@xenonbyte/openspec|~/.openspec" templates/project` | ✅ | ⬜ pending |
| 01-06-01 | 06 | 4 | NAME-05 | T-01-17 | Changelog communicates `3.0.0` as the breaking OpsX rename release | smoke | `rg -n "3\\.0\\.0|@xenonbyte/opsx|skills/opsx|opsx" CHANGELOG.md` | ✅ | ⬜ pending |
| 01-06-02 | 06 | 4 | NAME-04, NAME-05 | T-01-18, T-01-19 | Final legacy-name and package gates pass on shipped/runtime surfaces | suite | `node scripts/check-phase1-legacy-allowlist.js && npm_config_cache=/tmp/opsx-npm-cache npm pack --dry-run` | ⬜ W0 | ⬜ pending |

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
| README lineage sentence review | NAME-04 | The allowlist script permits a single exact lineage sentence in `README.md` and `README-zh.md`; a human or verifier should confirm it is not expanded into broader legacy guidance | Confirm the only remaining README legacy text is `OpsX was originally adapted from Fission-AI/OpenSpec.` |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-04-27
