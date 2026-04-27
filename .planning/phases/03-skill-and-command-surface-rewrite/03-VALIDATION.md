---
phase: 03
slug: skill-and-command-surface-rewrite
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-27
---

# Phase 03 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Custom Node.js assert-based runtime suite |
| **Config file** | `package.json` |
| **Quick run command** | `npm run test:workflow-runtime` |
| **Full suite command** | `npm run test:workflow-runtime` plus `node scripts/check-phase1-legacy-allowlist.js` in the final verification wave |
| **Estimated runtime** | ~2-4 seconds |

---

## Sampling Rate

- **After every task commit:** Run the plan's listed automated checks; default to `npm run test:workflow-runtime` when the plan already has the final gate inputs it needs.
- **After every wave:** Re-run all automated checks for that wave. Wave 4 must run both the runtime suite and the narrowed public-surface gate.
- **Before `$gsd-verify-work`:** `npm run test:workflow-runtime`, `node scripts/check-phase1-legacy-allowlist.js`, and `node bin/opsx.js --help` must all be green.
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 0 | CMD-01, CMD-02, CMD-04 | T-03-01 | Planning docs ban stale public entrypoints and preserve migration internals | contract | `npm run test:workflow-runtime` | Partial | pending |
| 03-01-02 | 01 | 0 | CMD-04, CMD-05 | T-03-03, T-03-04 | Public-surface scan targets narrow to real public/help/doc surfaces only | contract | `npm run test:workflow-runtime` | Partial | pending |
| 03-02-01 | 02 | 1 | CMD-01, CMD-02, CMD-04, CMD-05 | T-03-01, T-03-02 | Shared workflow metadata/templates emit explicit-only routes plus strict preflight and honest fallback behavior | unit / contract | `npm run test:workflow-runtime` | Partial | pending |
| 03-02-02 | 02 | 1 | CMD-02, CMD-04, CMD-05 | T-03-03 | Wave 1 runtime assertions validate generated source output without requiring checked-in bundle parity yet | unit / contract | `npm run test:workflow-runtime` | Partial | pending |
| 03-03-01 | 03 | 2 | CMD-01, CMD-04 | T-03-01 | First bounded Claude refresh slice matches `buildPlatformBundle('claude')` exactly | parity | `npm run test:workflow-runtime` plus direct `buildPlatformBundle('claude')` file parity check | Partial | pending |
| 03-04-01 | 04 | 2 | CMD-01, CMD-04, CMD-05 | T-03-03 | Second bounded Claude refresh slice, including empty-state routes, matches generated output | parity | `npm run test:workflow-runtime` plus direct `buildPlatformBundle('claude')` file parity check | Partial | pending |
| 03-05-01 | 05 | 2 | CMD-02, CMD-04 | T-03-01 | First bounded Codex refresh slice keeps `opsx.md` internal-only and matches generated output | parity | `npm run test:workflow-runtime` plus direct `buildPlatformBundle('codex')` file parity check | Partial | pending |
| 03-06-01 | 06 | 2 | CMD-02, CMD-04, CMD-05 | T-03-03 | Second bounded Codex refresh slice, including empty-state routes, matches generated output | parity | `npm run test:workflow-runtime` plus direct `buildPlatformBundle('codex')` file parity check | Partial | pending |
| 03-07-01 | 07 | 2 | CMD-04 | T-03-01 | First bounded Gemini refresh slice matches `buildPlatformBundle('gemini')` exactly | parity | `npm run test:workflow-runtime` plus direct `buildPlatformBundle('gemini')` file parity check | Partial | pending |
| 03-08-01 | 08 | 2 | CMD-04, CMD-05 | T-03-03 | Second bounded Gemini refresh slice, including empty-state routes, matches generated output | parity | `npm run test:workflow-runtime` plus direct `buildPlatformBundle('gemini')` file parity check | Partial | pending |
| 03-09-01 | 09 | 3 | CMD-02, CMD-03, CMD-04, CMD-05 | T-03-01, T-03-03 | Skill metadata and bilingual playbooks match explicit routes and empty-state behavior | docs contract | `npm run test:workflow-runtime` plus `rg` skill/playbook checks | Partial | pending |
| 03-10-01 | 10 | 3 | CMD-02, CMD-03, CMD-04, CMD-05 | T-03-01 | README/docs advertise only current OpsX routes and `.opsx` runtime guidance | docs contract | `npm run test:workflow-runtime` plus docs route/path scan | Partial | pending |
| 03-11-01 | 11 | 4 | CMD-01, CMD-02, CMD-03, CMD-04, CMD-05 | T-03-01, T-03-04 | Help/postinstall/template/AGENTS guidance aligns to explicit routes, full bundle parity is active, and the public-surface gate is green | integration | `npm run test:workflow-runtime`, `node scripts/check-phase1-legacy-allowlist.js`, `node bin/opsx.js --help` | Partial | pending |

*Status: pending / green / red / flaky*

---

## Wave Requirements

- [ ] Wave 0 (`03-01`) rewrites planning/validation contracts and narrows the public-surface scan targets without touching production surfaces.
- [ ] Wave 1 (`03-02`) locks the source-of-truth generator contract and generated-source assertions while intentionally deferring repo-wide checked-in bundle parity activation.
- [ ] Wave 2 (`03-03` through `03-08`) regenerates every checked-in Claude, Codex, and Gemini bundle file in bounded slices; each slice must have direct `buildPlatformBundle()` parity verification.
- [ ] Wave 3 (`03-09` and `03-10`) aligns `skills/opsx/**`, README, and docs to the refreshed route/preflight contract.
- [ ] Wave 4 (`03-11`) rewrites help/postinstall/template/AGENTS surfaces, enables repo-wide checked-in parity in `scripts/test-workflow-runtime.js`, and runs the narrowed public-surface gate.

---

## Manual-Only Verifications

All Phase 3 behaviors have automated verification; no manual-only checkpoints are required in the plan set.

---

## Threat References

| Threat | Description | Required Mitigation |
|--------|-------------|---------------------|
| T-03-01 | Conflicting route guidance across help, docs, skill metadata, and generated prompts | Centralize route text, refresh generated bundles in bounded slices, and assert no public surface exposes standalone `$opsx`, `$opsx <request>`, `/openspec`, `$openspec`, `/prompts:openspec`, `/opsx:*`, or `/prompts:opsx-*`. |
| T-03-02 | Prompts claim Phase 4 hash or stage enforcement exists before implementation | Strict preflight wording must require current file reads and honest missing-file fallback without claiming artifact hash comparison, transition enforcement, allowed/forbidden path checks, or durable state mutation. |
| T-03-03 | Empty `status` or `resume` guidance implicitly creates active state | Prompt, skill, and docs text must report missing workspace or no active change and suggest a next action without mutating `.opsx/active.yaml` or inventing a default change. |
| T-03-04 | Legacy-route cleanup accidentally weakens migration or install behavior | Keep migration/install internals separate from the public-surface gate and preserve internal Codex prompt install layout while removing stale public guidance. |

---

## Validation Sign-Off

- [x] All tasks have automated verify commands
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 1 keeps the suite green before checked-in bundle parity is activated
- [x] Final wave includes both runtime and public-surface gates
- [x] No watch-mode flags
- [x] Feedback latency < 10s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** revised 2026-04-27
