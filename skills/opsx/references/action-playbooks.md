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
8. Run `spec checkpoint` after `design` and before `tasks`.
9. Run `task checkpoint` after `tasks` and before `apply`.

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

- Create the change container and metadata only.
- Report that proposal is the next ready artifact.

## continue

- Inspect dependency readiness.
- Create the next ready artifact.
- Report what became ready next.

## resume

- If `.opsx/config.yaml` is missing, report workspace-not-initialized and redirect to the platform-specific onboard route: Codex `$opsx-onboard`, Claude/Gemini `/opsx-onboard`.
- If `.opsx/active.yaml` has no active change, state that no resumable change exists and recommend the platform-specific `new` or `propose` route.
- If an active change exists, summarize current artifact/task state and recommend the next concrete command.
- Do not auto-create `.opsx/active.yaml`, invent a default change, or mutate state from `resume`.

## ff

- Generate all planning artifacts in dependency order.
- Record assumptions explicitly.
- Insert `security-review.md` between `design` and `tasks` when explicit config requires it or when the workflow chooses to include it after a heuristic match.
- Finish planning by passing `spec checkpoint` and `task checkpoint` before handing off to `apply`.

## security-review

- Summarize the sensitive surfaces in scope.
- List concrete risks, mitigations, and required controls.
- State whether `tasks` may proceed or what remains blocked.
- If the review is waived, record the waiver reason and approver context.

## apply

- Read proposal, specs, design if present, and tasks.
- Execute tasks in order.
- Use top-level task groups as execution milestones.
- Run `execution checkpoint` after each top-level task group.
- If `execution checkpoint` returns `WARN` or `BLOCK`, patch existing artifacts before continuing.
- Mark completed tasks with `- [x]`.
- Update artifacts when implementation changes scope.

## batch-apply

- Confirm the target set and execution order before mutating files.
- Apply only changes that are actually ready to execute.
- If no ready changes are found, stop and recommend the platform-specific `status` route: Codex `$opsx-status`, Claude/Gemini `/opsx-status`.
- Do not auto-create missing state, do not fabricate ready tasks, and do not skip checkpoint requirements.

## verify

- Check completeness, correctness, and coherence.
- Report `CRITICAL`, `WARNING`, and `SUGGESTION` items.

## sync

- Merge delta specs into `.opsx/specs/`.
- Preserve unrelated content.
- Report conflicts.

## archive

- Confirm task completion state.
- Sync specs when needed.
- Move the change to archive.

## bulk-archive

- Confirm the target set before archiving multiple changes.
- Archive only changes that are completed and ready for archival.
- If no completed changes are found, stop and recommend the platform-specific `status` route: Codex `$opsx-status`, Claude/Gemini `/opsx-status`.
- Do not auto-create archive metadata, and do not mark incomplete changes as completed.

## status

- Report whether workspace exists (`.opsx/config.yaml`) and whether an active change is selected (`.opsx/active.yaml`).
- Report artifact readiness from the active schema.
- Report blockers and the next concrete command.
- If workspace is missing, recommend the platform-specific `onboard` route: Codex `$opsx-onboard`, Claude/Gemini `/opsx-onboard`.
- If no active change exists, recommend the platform-specific `new` or `propose` route: Codex `$opsx-new` / `$opsx-propose`, Claude/Gemini `/opsx-new` / `/opsx-propose`.
- Make `security-review` readiness explicit when it is required or recommended.
- Surface checkpoint output using canonical fields: `status`, `findings`, `patchTargets`, and `nextStep`.
- Use `required`, `recommended`, `waived`, and `completed` for security-review state.
- Use `PASS`, `WARN`, and `BLOCK` for checkpoint output.
- Do not auto-create `.opsx/active.yaml` or invent an active change from `status`.
