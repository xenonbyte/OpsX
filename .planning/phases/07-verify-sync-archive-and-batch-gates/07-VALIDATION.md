---
phase: 07
slug: verify-sync-archive-and-batch-gates
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-28
---

# Phase 07 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| Framework | Custom Node.js regression script using built-in `assert` |
| Config file | none |
| Quick run command | `npm run test:workflow-runtime` |
| Full suite command | `npm run test:workflow-runtime` |
| Estimated runtime | under 10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:workflow-runtime`
- **After every plan wave:** Run `npm run test:workflow-runtime`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | QUAL-01 | T-07-01 / T-07-02 | Verify gates block stale artifacts, incomplete tasks, missing proof, unresolved drift, and forbidden-path changes | integration | `npm run test:workflow-runtime` | yes | pending |
| 07-02-01 | 02 | 1 | QUAL-02 | T-07-03 | Sync plans delta spec writes in memory and performs no partial write when conflicts exist | integration | `npm run test:workflow-runtime` | yes | pending |
| 07-03-01 | 03 | 2 | QUAL-03 | T-07-01 / T-07-03 / T-07-04 | Archive enforces verify/sync/drift/path/task preconditions before moving a change | integration | `npm run test:workflow-runtime` | yes | pending |
| 07-04-01 | 04 | 2 | QUAL-04 | T-07-05 | Batch flows reload each change independently and report skipped/blocked reasons without context bleed | integration | `npm run test:workflow-runtime` | yes | pending |
| 07-05-01 | 05 | 3 | QUAL-01 / QUAL-02 / QUAL-03 / QUAL-04 | T-07-06 | Prompt and skill guidance describe hard gates and remain generated-parity clean | integration | `npm run test:workflow-runtime` | yes | pending |

---

## Wave 0 Requirements

- [ ] `scripts/test-workflow-runtime.js` - add QUAL-01 fixtures for forbidden-path block, unresolved `User approval needed`, `scopeChanges` / `discoveredRequirements` block, incomplete task groups, missing execution proof, and manual-only verification warnings.
- [ ] `scripts/test-workflow-runtime.js` - add QUAL-02 fixtures for `ADDED` / `MODIFIED` / `REMOVED` sync plans, omitted-target protection, duplicate/conflicting requirements, and atomic no-partial-write guarantees.
- [ ] `scripts/test-workflow-runtime.js` - add QUAL-03 fixtures for archive-from-VERIFIED with safe internal sync, archive-from-SYNCED happy path, and block conditions for incomplete tasks, unresolved drift, forbidden paths, and unsafe sync.
- [ ] `scripts/test-workflow-runtime.js` - add QUAL-04 fixtures for per-change isolation and aggregate `applied` / `archived` / `skipped` / `blocked` reporting in batch flows.
- [ ] `scripts/test-workflow-runtime.js` - add source and checked-in prompt assertions for verify/sync/archive/batch route wording across Claude, Codex, and Gemini.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| None | QUAL-01 to QUAL-04 | Phase 7 gate behavior is covered by runtime regression assertions | N/A |

---

## Threat References

| Threat Ref | Threat | Mitigation |
|------------|--------|------------|
| T-07-01 | Verify or archive passes against stale artifact hashes | Recompute tracked artifact hashes, compare stored hashes, and block unresolved drift before accepted writes |
| T-07-02 | Changed files outside approved scope are treated as advisory and archived | Match changed files against `allowedPaths` / `forbiddenPaths` and block forbidden or clearly out-of-scope paths |
| T-07-03 | Sync overwrites canonical specs or hides requirement conflicts | Compute sync plans in memory, reuse spec parsing/conflict checks, and write only after a conflict-free plan |
| T-07-04 | Archive becomes a shortcut around verify or sync | Run verify and safe sync gates inside archive and move only after all preconditions pass |
| T-07-05 | Batch execution mixes state/context between changes | Load each change independently and aggregate plain per-change result objects |
| T-07-06 | Runtime gates and generated guidance drift apart | Update source-of-truth guidance first, mechanically refresh generated route files, and keep parity tests strict |

---

## Validation Sign-Off

- [x] All tasks have automated verification through `npm run test:workflow-runtime`
- [x] Sampling continuity: no 3 consecutive tasks without automated verification
- [x] Wave 0 covers all missing references
- [x] No watch-mode flags
- [x] Feedback latency target under 10 seconds
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
