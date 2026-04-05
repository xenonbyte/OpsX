## Context
Bootstrap, status inspection, and release metadata updates now have meaningful runtime behavior, but until this change most non-install OpenSpec actions still lived only in prompt guidance. The project needs a minimal executable action layer so shared state handling does not drift between docs, prompts, and actual command behavior.

## Goals / Non-Goals
### Goals
- Add shared runtime change IO and next-step logic.
- Expose executable commands for the most operationally important actions.
- Keep prompt-driven workflow semantics aligned with those runtime commands.

### Non-Goals
- Do not fully replace prompt-driven implementation for complex coding work inside `apply`.
- Do not add a full remote service or daemon.

## Decisions
- Shared change state and artifact scaffolding live in a dedicated runtime module.
- `status` and `resume` use runtime state rather than prompt-only heuristics.
- `archive` remains conservative and blocks incomplete tasks unless `--force` is used.
- `release-bump` updates package/changelog/readme together as a single runtime operation.
- rollout stays compatibility-first with explicit migration impact handling: legacy prompt-driven paths remain usable while runtime commands take over the most operationally important actions.
- because runtime commands touch release metadata and change lifecycle, compatibility and rollback expectations stay explicit in this change.

## Risks / Trade-offs
- Runtime action scaffolds are intentionally minimal and can create placeholders rather than rich authored content.
- Prompt-driven actions and runtime commands must stay aligned, or users will see two different mental models.

## Migration Plan
1. Add shared runtime change IO helpers.
2. Add CLI/runtime commands for change lifecycle and release metadata.
3. Update docs to expose the new command surface.
4. Validate status/resume behavior and release metadata updates.
