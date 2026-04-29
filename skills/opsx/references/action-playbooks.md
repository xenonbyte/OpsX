# Action Playbooks

Use these when the active workflow action is explicit.

## Common setup

1. Resolve config from change metadata, project config, then global config.
2. Apply `context` and per-artifact `rules` before writing.
3. Read `.opsx/config.yaml` and `.opsx/active.yaml` when those files exist.
4. When an active change exists, read active `state.yaml`, `context.md`, and current artifacts (`proposal.md`, `specs/`, `design.md`, optional `security-review.md`, and `tasks.md`) before mutating files.
5. If required artifacts are missing, report that honestly and apply route-specific fallback guidance.
6. If config explicitly marks a change as security-sensitive, require `security-review.md` before `tasks`.
7. If the change matches security heuristics, recommend `security-review.md`; if waived, record the reason in artifacts.
8. Run `spec-split-checkpoint` after `specs` and before `design`.
9. For simple single-spec changes, run `spec-split-checkpoint` inline; for risky sets (multi-spec, cross-capability, security-sensitive, or larger requirement sets), request a read-only reviewer pass before `design`.
10. Read-only reviewer behavior is inspection-only: reviewer may read artifacts and report findings, but must not write files directly and must not create `spec-review.md`.
11. Run `spec checkpoint` after `design` and before `tasks`.
12. Run `task checkpoint` after `tasks` and before `apply`.
13. Keep route surface unchanged: Codex must not add `$opsx-spec-split-*`, Claude/Gemini must not add `/opsx-spec-split-*`; use existing `propose` / `continue` / `ff` routes.
14. Authored tasks must include `## Test Plan`, and each top-level group must declare `TDD Class:` or `TDD Exemption:`, `Requirement Coverage:`, `Implementation Evidence:`, and explicit `Verification:` / `VERIFY:` coverage. `manual-only verification` is allowed only when the `Verification:` line explains why automated checks are not practical.
15. Verify/sync/archive/batch routes follow Phase 7 hard gates: verify emits `PASS`/`WARN`/`BLOCK`, sync uses conservative no-partial-write planning, archive enforces safe sync before move, and batch routes report per-change skipped/blocked reasons.

## onboard

- If `.opsx/config.yaml` is missing, report that the workspace is not initialized.
- If command routes are not installed yet, recommend `opsx install --platform <claude|codex|gemini[,...]>`.
- Use the platform route to create the first real change and initialize workspace config: Codex `$opsx-new` / `$opsx-propose`, Claude/Gemini `/opsx-new` / `/opsx-propose`.
- If workspace exists but `.opsx/active.yaml` has no active change, report that state and suggest the same platform-specific `new` or `propose` route.
- Keep onboarding instructional and do not auto-create `.opsx/active.yaml`, change state, or change files implicitly.

## propose

- If `.opsx/config.yaml` is missing, ask a brief workspace-init question before writing it: confirm schema, whether to lock project language, and whether to add stable context/rules now. If the user chooses defaults, create a sparse project config with `schema` only; do not copy personal global defaults into project policy.
- Create a change name.
- Create `change.yaml`.
- Generate proposal, specs, design, and tasks.
- Hand off to `apply`.

## explore

- Clarify scope, constraints, and success criteria.
- Compare approaches.
- Recommend `propose` or `new`.

## new

- If `.opsx/config.yaml` is missing, ask a brief workspace-init question before writing it: confirm schema, whether to lock project language, and whether to add stable context/rules now. If the user chooses defaults, create a sparse project config with `schema` only; do not copy personal global defaults into project policy.
- Create only the new-change scaffold: `change.yaml`, `specs/`, `state.yaml`, `context.md`, and `drift.md`.
- Do not create placeholder `proposal.md`, `design.md`, `tasks.md`, or `specs/README.md`.
- Set `.opsx/active.yaml` to this active change.
- Leave `stage: INIT` and report proposal as the next ready artifact.

## continue

- Follow persisted `stage` and `nextAction` from `state.yaml`.
- If `stage === APPLYING_GROUP`, continue the persisted `active.taskGroup` first.
- Otherwise create or route only the next valid artifact/action.
- Report updated `stage`, `nextAction`, and any warnings/blockers.

## resume

- If `.opsx/config.yaml` is missing, report workspace-not-initialized and recommend the platform-specific `new` or `propose` route: Codex `$opsx-new` / `$opsx-propose`, Claude/Gemini `/opsx-new` / `/opsx-propose`.
- If `.opsx/active.yaml` has no active change, state that no resumable change exists and recommend the platform-specific `new` or `propose` route.
- If an active change exists, report `stage`, `nextAction`, `warnings`, and `blockers` from persisted state.
- Treat `resume` as read-only: warn on hash drift, reload from disk, and do not refresh stored hashes from read-only routes.
- Do not auto-create `.opsx/active.yaml`, invent a default change, or mutate state from `resume`.

## ff

- Generate all planning artifacts in dependency order.
- Record assumptions explicitly.
- Run `spec-split-checkpoint` before `design`; if escalation is recommended, keep reviewer behavior read-only and artifact-free.
- Insert `security-review.md` between `design` and `tasks` when explicit config requires it or when the workflow chooses to include it after a heuristic match.
- Finish planning by passing `spec checkpoint` and `task checkpoint` before handing off to `apply`.

## security-review

- Summarize the sensitive surfaces in scope.
- List concrete risks, mitigations, and required controls.
- State whether `tasks` may proceed or what remains blocked.
- If the review is waived, record the waiver reason and approver context.

## apply

- Read proposal, specs, design if present, and tasks.
- Execute exactly one top-level task group by default.
- Run `execution checkpoint` after that one top-level task group.
- Record completed TDD steps, verification command/result, changed files, diff summary, and drift status; refresh `context.md` / `drift.md`, then stop for the next run.
- If `execution checkpoint` returns `WARN` or `BLOCK`, patch existing artifacts before continuing.
- Mark completed tasks with `- [x]` for the executed group only.
- Keep execution evidence complete so downstream `verify` can emit accurate `PASS` / `WARN` / `BLOCK` outcomes.

## batch-apply

- Confirm the target set and execution order before mutating files.
- Apply only changes that are actually ready to execute.
- Enforce global preconditions before iteration; if they fail, stop with a `BLOCK` result.
- Run each change in per-change isolation and continue after per-change failures.
- Report `applied`, `skipped`, and `blocked` counts with per-change reasons.
- If no ready changes are found, stop and recommend the platform-specific `status` route: Codex `$opsx-status`, Claude/Gemini `/opsx-status`.
- Do not auto-create missing state, do not fabricate ready tasks, and do not skip checkpoint requirements.

## verify

- Check completeness, correctness, and coherence.
- Run `implementation-consistency-checkpoint` for `IMPLEMENTED` changes before verify acceptance.
- Emit canonical `PASS`, `WARN`, and `BLOCK` findings with `patchTargets` and `nextStep`.
- Treat unresolved drift approvals, forbidden/out-of-scope path changes, missing execution proof, and incomplete task groups as blocking conditions.

## sync

- Plan spec updates in memory before writing to `.opsx/specs/`.
- Treat change-local specs as full target specs for each capability, not delta-only patches.
- Preserve unrelated content and surface conflicts explicitly.
- If findings include `BLOCK`, do not write partial sync output.

## archive

- Accept only `VERIFIED` or `SYNCED` changes.
- For `VERIFIED`, run the same internal safe sync checks before archive move.
- Block archive when verify or sync preconditions fail.
- Move the full change directory into `.opsx/archive/<change-name>/` after gate acceptance.

## bulk-archive

- Confirm the target set before archiving multiple changes.
- Enforce global preconditions before iteration; if they fail, stop with a `BLOCK` result.
- Archive only changes that pass verify/sync prerequisites.
- Run each change in per-change isolation and continue after per-change failures.
- Report `archived`, `skipped`, and `blocked` counts with per-change reasons.
- If no completed changes are found, stop and recommend the platform-specific `status` route: Codex `$opsx-status`, Claude/Gemini `/opsx-status`.
- Do not auto-create archive metadata, and do not mark incomplete changes as completed.

## status

- Report whether workspace exists (`.opsx/config.yaml`) and whether an active change is selected (`.opsx/active.yaml`).
- Report artifact readiness from the active schema.
- Report `stage`, `nextAction`, `warnings`, and `blockers`.
- If workspace is missing, recommend the platform-specific `new` or `propose` route to initialize it: Codex `$opsx-new` / `$opsx-propose`, Claude/Gemini `/opsx-new` / `/opsx-propose`.
- If no active change exists, recommend the platform-specific `new` or `propose` route: Codex `$opsx-new` / `$opsx-propose`, Claude/Gemini `/opsx-new` / `/opsx-propose`.
- Make `security-review` readiness explicit when it is required or recommended.
- Surface checkpoint output using canonical fields: `status`, `findings`, `patchTargets`, and `nextStep`.
- Use `required`, `recommended`, `waived`, and `completed` for security-review state.
- Use `PASS`, `WARN`, and `BLOCK` for checkpoint output.
- Treat `status` as read-only: warn on hash drift, reload from disk, and do not refresh stored hashes from read-only routes.
- Reflect active hard-gate semantics in output: blocked verify/sync/archive candidates stay blocked until findings are resolved.
- Do not auto-create `.opsx/active.yaml` or invent an active change from `status`.
