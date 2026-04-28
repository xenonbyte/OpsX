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
14. Authored tasks must include `## Test Plan`, and each top-level group must declare `TDD Class:` or `TDD Exemption:` with explicit `VERIFY:` coverage. `manual-only verification` is allowed only when the `Verification:` line explains why automated checks are not practical.
15. Hard verify/archive enforcement remains deferred to Phase 7.

## onboard

- If `.opsx/config.yaml` is missing, report that the workspace is not initialized.
- Recommend `opsx install --platform <claude|codex|gemini[,...]>`, then continue with the platform route: Codex `$opsx-new` / `$opsx-propose`, Claude/Gemini `/opsx-new` / `/opsx-propose`.
- If workspace exists but `.opsx/active.yaml` has no active change, report that state and suggest the same platform-specific `new` or `propose` route.
- Keep onboarding instructional and do not auto-create `.opsx/config.yaml`, `.opsx/active.yaml`, or change files implicitly.

## propose

- Create a change name.
- Create `change.yaml`.
- Generate proposal, specs, design, and tasks.
- Hand off to `apply`.

## explore

- Clarify scope, constraints, and success criteria.
- Compare approaches.
- Recommend `propose` or `new`.

## new

- Create the full new-change skeleton: `change.yaml`, placeholder `proposal.md`, `design.md`, `tasks.md`, `specs/README.md`, `state.yaml`, `context.md`, and `drift.md`.
- Set `.opsx/active.yaml` to this active change.
- Leave `stage: INIT` and report proposal as the next ready artifact.

## continue

- Follow persisted `stage` and `nextAction` from `state.yaml`.
- If `stage === APPLYING_GROUP`, continue the persisted `active.taskGroup` first.
- Otherwise create or route only the next valid artifact/action.
- Report updated `stage`, `nextAction`, and any warnings/blockers.

## resume

- If `.opsx/config.yaml` is missing, report workspace-not-initialized and redirect to the platform-specific onboard route: Codex `$opsx-onboard`, Claude/Gemini `/opsx-onboard`.
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
- Record verification command/result plus changed files, refresh `context.md` / `drift.md`, and stop for the next run.
- If `execution checkpoint` returns `WARN` or `BLOCK`, patch existing artifacts before continuing.
- Mark completed tasks with `- [x]` for the executed group only.
- Surface `allowedPaths` / `forbiddenPaths` as warnings only in Phase 4; hard-block verify/archive enforcement is deferred to Phase 7.

## batch-apply

- Confirm the target set and execution order before mutating files.
- Apply only changes that are actually ready to execute.
- If no ready changes are found, stop and recommend the platform-specific `status` route: Codex `$opsx-status`, Claude/Gemini `/opsx-status`.
- Do not auto-create missing state, do not fabricate ready tasks, and do not skip checkpoint requirements.

## verify

- Check completeness, correctness, and coherence.
- Report `CRITICAL`, `WARNING`, and `SUGGESTION` items.
- In Phase 4, drift and path-boundary findings remain warnings. Hard verify/archive gates begin in Phase 7.

## sync

- Merge delta specs into `.opsx/specs/`.
- Preserve unrelated content.
- Report conflicts.

## archive

- Confirm task completion state.
- Sync specs when needed.
- Move the change to archive.
- In Phase 4, do not treat `allowedPaths` / `forbiddenPaths` drift as an automatic hard block here; that hard gate is deferred to Phase 7.

## bulk-archive

- Confirm the target set before archiving multiple changes.
- Archive only changes that are completed and ready for archival.
- If no completed changes are found, stop and recommend the platform-specific `status` route: Codex `$opsx-status`, Claude/Gemini `/opsx-status`.
- Do not auto-create archive metadata, and do not mark incomplete changes as completed.

## status

- Report whether workspace exists (`.opsx/config.yaml`) and whether an active change is selected (`.opsx/active.yaml`).
- Report artifact readiness from the active schema.
- Report `stage`, `nextAction`, `warnings`, and `blockers`.
- If workspace is missing, recommend the platform-specific `onboard` route: Codex `$opsx-onboard`, Claude/Gemini `/opsx-onboard`.
- If no active change exists, recommend the platform-specific `new` or `propose` route: Codex `$opsx-new` / `$opsx-propose`, Claude/Gemini `/opsx-new` / `/opsx-propose`.
- Make `security-review` readiness explicit when it is required or recommended.
- Surface checkpoint output using canonical fields: `status`, `findings`, `patchTargets`, and `nextStep`.
- Use `required`, `recommended`, `waived`, and `completed` for security-review state.
- Use `PASS`, `WARN`, and `BLOCK` for checkpoint output.
- Treat `status` as read-only: warn on hash drift, reload from disk, and do not refresh stored hashes from read-only routes.
- Surface `allowedPaths` / `forbiddenPaths` as warnings in Phase 4 (not hard blocks).
- Hard verify/archive path enforcement is deferred to Phase 7.
- Do not auto-create `.opsx/active.yaml` or invent an active change from `status`.
