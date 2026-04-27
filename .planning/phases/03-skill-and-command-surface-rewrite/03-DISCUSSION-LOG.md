# Phase 3: Skill and Command Surface Rewrite - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `03-CONTEXT.md` - this log preserves the alternatives considered.

**Date:** 2026-04-27
**Phase:** 03-skill-and-command-surface-rewrite
**Areas discussed:** Codex entrypoint model, Prompt preflight depth, Generated command architecture, Legacy entrypoint cleanup boundary, Empty active change behavior

---

## Codex entrypoint model

| Option | Description | Selected |
|--------|-------------|----------|
| `$opsx-*` as primary with `$opsx <request>` as fallback | Keep explicit routes primary but retain natural-language fallback. | |
| `$opsx-*` and `$opsx <request>` as dual primary | Preserve flexibility but keep two public mental models. | |
| Remove `$opsx <request>` entirely | No standalone `$opsx`; all public Codex routes are `$opsx-*`. | yes |

**User's choice:** Use `$opsx-*` only. Remove standalone `$opsx` and `$opsx <request>`.
**Notes:** User clarified: "也就是没有单独的$opsx入口，入口都是$opsx-*".

---

## Prompt preflight depth

| Option | Description | Selected |
|--------|-------------|----------|
| Strict preflight wording plus missing-file fallback | Require reading `.opsx` config/state/context/artifacts when present, with honest fallback when missing. | yes |
| Lightweight prompt hint only | Mention `.opsx/` artifacts without a uniform step sequence. | |
| Full Phase 4 state-machine rules now | Include hashes, transitions, drift, and path guard enforcement in prompt text now. | |

**User's choice:** Strict preflight wording plus missing-file fallback.
**Notes:** Full state-machine enforcement remains Phase 4.

---

## Generated command architecture

| Option | Description | Selected |
|--------|-------------|----------|
| Centralized generation from workflow metadata and templates | Extend `lib/workflow.js` and `templates/commands/*`, then refresh generated outputs. | yes |
| Hand-edit checked-in command files | Directly edit `commands/**`, risking drift from generator output. | |
| Hybrid mode with platform-specific hand edits | Use shared templates but allow manual platform exceptions. | |

**User's choice:** Centralized generation.
**Notes:** `lib/workflow.js` metadata and templates are the source of truth.

---

## Legacy entrypoint cleanup boundary

| Option | Description | Selected |
|--------|-------------|----------|
| Strict public/runtime surface cleanup with migration/history/test allowlist | Remove old primary route guidance but preserve legacy references in migration/history/tests. | |
| Only remove old primary entrypoints while keeping internal `/prompts:opsx-*` explanations | Keep some prompt-path references visible for Codex internals. | |
| Zero legacy token policy, even if it supersedes migration/history/test allowlists | Hard clean break; update earlier requirements and tests accordingly. | yes |

**User's choice:** Zero legacy token policy.
**Notes:** After being warned this conflicts with `NAME-04` and Phase 2 migration-history/test allowlists, the user explicitly confirmed: "推翻吧，长痛不如短痛，留一堆历史遗留".

---

## Empty active change behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Non-error recoverable status and next-step guidance | `onboard`, `status`, and `resume` report state and suggest next action when no active change exists. | yes |
| Strict fail-fast error | Missing active change fails immediately. | |
| Automatically create a default active change | Create state implicitly when active change is absent. | |

**User's choice:** Non-error recoverable status and next-step guidance.
**Notes:** Do not auto-create active changes from `status` or `resume`.

---

## the agent's Discretion

- Planner may choose exact preflight text and fallback wording.
- Planner may choose generator helper structure.
- Planner may choose test organization, provided centralized generation and hard-clean-break decisions are enforced.

## Deferred Ideas

None.
