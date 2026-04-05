# Action Playbooks

Use these when the active workflow action is explicit.

## Common setup

1. Resolve config from change metadata, project config, then global config.
2. Apply `context` and per-artifact `rules` before writing.
3. Read dependency artifacts from the active schema.
4. If config explicitly marks a change as security-sensitive, require `security-review.md` before `tasks`.
5. If the change matches security heuristics, recommend `security-review.md`; if waived, record the reason in artifacts.
6. Run `spec checkpoint` after `design` and before `tasks`.
7. Run `task checkpoint` after `tasks` and before `apply`.

## propose

- Create a change name.
- Create `.openspec.yaml`.
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

## verify

- Check completeness, correctness, and coherence.
- Report `CRITICAL`, `WARNING`, and `SUGGESTION` items.

## sync

- Merge delta specs into `openspec/specs/`.
- Preserve unrelated content.
- Report conflicts.

## archive

- Confirm task completion state.
- Sync specs when needed.
- Move the change to archive.

## status

- Report artifact readiness from the active schema.
- Report blockers and next actions.
- Make `security-review` readiness explicit when it is required or recommended.
- Surface checkpoint output using canonical fields: `status`, `findings`, `patchTargets`, and `nextStep`.
- Use `required`, `recommended`, `waived`, and `completed` for security-review state.
- Use `PASS`, `WARN`, and `BLOCK` for checkpoint output.
