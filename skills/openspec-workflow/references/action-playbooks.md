# Action Playbooks

Use this file when user asks for specific `opsx`/`openspec` workflow actions.

## `propose`

Use for one-shot creation of planning artifacts.

1. Clarify ambiguous scope quickly.
2. Derive kebab-case change name.
3. Create change directory and `.openspec.yaml`.
4. Create proposal/specs/design/tasks in dependency order.
5. Summarize generated files and suggest next step (`apply`).

## `explore`

Use for pre-planning discovery.

1. Clarify problem, constraints, and success criteria.
2. Surface options and trade-offs.
3. Recommend whether to proceed with `new` or `propose`.

## `new`

Use for initializing change only.

1. Create `openspec/changes/<name>/specs`.
2. Write `.openspec.yaml` metadata.
3. Report that proposal is the next READY artifact.

## `continue`

Use for iterative artifact creation.

1. Detect existing artifacts in current change.
2. Compute READY artifacts from dependency rules.
3. Create the next selected artifact.
4. Report unlocked next artifacts.

## `ff`

Use for fast-forward planning generation.

1. Read user intent once.
2. Generate all planning artifacts in order.
3. Flag assumptions explicitly.
4. Hand off to `apply`.

## `apply`

Use for implementation.

1. Read `proposal.md`, all `specs`, `design.md` (if present), and `tasks.md`.
2. Implement tasks in order.
3. Update tasks to `- [x]` as work completes.
4. If implementation changes scope, update relevant planning artifacts.
5. Stop and ask when blocked by missing requirements.

## `verify`

Validate across three axes.

1. Completeness: all tasks done and all required artifacts present.
2. Correctness: implementation matches requirement statements and scenarios.
3. Coherence: implementation aligns with design decisions.
4. Report issues using severity levels: `CRITICAL`, `WARNING`, `SUGGESTION`.

## `sync`

Merge change delta specs into main specs.

1. Read delta specs in `changes/<name>/specs/`.
2. Read corresponding files in `openspec/specs/`.
3. Apply `ADDED`, `MODIFIED`, `REMOVED` semantics.
4. Preserve unrelated content.
5. Report merge summary and any manual conflict points.

## `archive`

Finalize one completed change.

1. Confirm task completion status.
2. Ask whether spec sync is needed (if not already done).
3. Move folder to `openspec/changes/archive/YYYY-MM-DD-<name>/`.
4. Report archive location and next active changes.

## `bulk-archive`

Finalize multiple completed changes.

1. List candidate changes.
2. Detect overlapping spec targets.
3. Resolve ordering/conflicts before moving.
4. Archive each selected change.
5. Provide consolidated result summary.

## `batch-apply`

Implement multiple changes with controlled execution.

1. Validate each selected change is READY for apply.
2. Choose serial or parallel mode based on coupling risk.
3. Execute per-change `apply` loop.
4. Report per-change outcomes and blockers.

## `resume`

Rehydrate context in a new session.

1. List active changes (exclude `archive/`).
2. Show artifact completion for each change.
3. Recommend one next action per change.

## `status`

Show point-in-time workflow state.

1. List changes and artifact presence.
2. Highlight READY/BLOCKED/DONE per artifact.
3. Show blockers and immediate next commands.

## `onboard`

Teach first-time usage.

1. Explain workflow concepts briefly.
2. Show minimum command path: `propose -> apply -> verify -> archive`.
3. Provide one concrete example change.
4. Suggest first action to start now.
