# Phase 5: Spec-Split Checkpoint - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-27T18:28:58Z
**Phase:** 05-spec-split-checkpoint
**Areas discussed:** Checkpoint placement, validator scope, reviewer behavior, integration boundaries

---

## Checkpoint Placement

| Option | Description | Selected |
|--------|-------------|----------|
| Specs-before-design checkpoint | Add `spec-split-checkpoint` after specs and before design; keep existing `spec-checkpoint` after design. | ✓ |
| Fold into existing spec-checkpoint | Extend `spec-checkpoint` only, leaving no early checkpoint. | |
| Add standalone review artifact | Create a separate review document before design. | |

**Captured decision:** Add an early `spec-split-checkpoint` and keep it distinct from the later `spec-checkpoint`.
**Notes:** This follows Phase 5 ROADMAP success criterion 1 and avoids hardening design/tasks on flawed split specs.

---

## Validator Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Full SPEC-02 coverage | Detect coverage gaps, scope expansion, duplicates, conflicts, missing scenarios, empty specs, and hidden fenced-code requirements. | ✓ |
| Minimal structural checks | Only validate that specs exist and contain requirement/scenario headings. | |
| Prompt-only review | Rely on skill/prompt wording without reusable runtime validation. | |

**Captured decision:** Implement reusable validator logic with full SPEC-02 coverage.
**Notes:** Existing `lib/workflow.js` already has planning evidence extraction and checkpoint contracts, but Phase 5 needs more precise split-spec validation than current `runSpecCheckpoint()`.

---

## Reviewer Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Inline by default, read-only escalation for higher risk | Simple cases run locally; multi-spec/cross-capability/security-sensitive/larger changes may use reviewer behavior without file writes. | ✓ |
| Always spawn reviewer | Every spec-split checkpoint uses a reviewer regardless of complexity. | |
| Never use reviewer behavior | Keep all validation in deterministic local logic only. | |

**Captured decision:** Use deterministic local validation first and permit read-only reviewer behavior only for higher-risk changes.
**Notes:** This preserves the milestone direction that subagent usage is `auto`, not heavy by default.

---

## Integration Boundaries

| Option | Description | Selected |
|--------|-------------|----------|
| Phase 5 only: spec-split checkpoint and guidance | Update schema, validator, checkpoint runner, tests, skill/playbooks/generated guidance. | ✓ |
| Include TDD-light enforcement | Also add RED/GREEN/REFACTOR/VERIFY task checkpoint rules. | |
| Include verify/archive gates | Also add final quality gates and archive blocking. | |

**Captured decision:** Keep Phase 5 limited to spec-split checkpoint behavior and defer TDD-light plus final verify/archive gates.
**Notes:** Phase 6 owns TDD-light; Phase 7 and Phase 8 own final quality and release hardening.

---

## the agent's Discretion

- Exact module names and function boundaries are open to the planner.
- State checkpoint key spelling is open as long as public output uses canonical `spec-split-checkpoint` and tests lock the mapping.
- The planner may decide how much existing `resolvePlanningEvidence()` logic to reuse versus extract into a new validator module.

## Deferred Ideas

- TDD-light task template and enforcement — Phase 6.
- Final verify/sync/archive quality gates — Phase 7.
- Path/glob/clean JSON hardening and broad release coverage — Phase 8.
- Supervised checkpoint retry loop — future/backlog automation.
