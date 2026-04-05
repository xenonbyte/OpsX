## Why
OpenSpec currently relies heavily on prompt-driven behavior for common workflow actions. That keeps the user-facing workflow flexible, but it also leaves important operations such as status inspection, change scaffolding, spec sync, archive, and release metadata updates outside a shared runtime path.

## What Changes
- Add a shared project/change runtime module for artifact IO and change state.
- Add concrete CLI/runtime commands for `new`, `propose`, `continue`, `status`, `resume`, `sync`, `archive`, and `release-bump`.
- Make bootstrap-aware status/resume behavior come from runtime state rather than prompt-only inference.
- Update command docs to include the new runtime command surface.

## Capabilities

### New Capabilities
- `runtime-change-io`: shared runtime for reading change state and artifact presence
- `runtime-status`: executable change status and resume commands
- `runtime-change-lifecycle`: executable `new`, `sync`, and `archive`
- `release-bump`: executable package/changelog/readme release metadata bump

## Impact
- 受影响目录：`lib/`, `docs/`, `openspec/`
- 需要保持 CLI/runtime 命令与 skill workflow 语义一致
- 需要保证 status/resume 不会在已完成 tasks 后错误推荐回退到 planning artifacts
- Rollout / Migration：本次变更需明确迁移影响评估与执行策略，确保 runtime 命令上线步骤可追踪。
- Rollback / Compatibility：若 runtime 路径出现问题，可回退到既有 prompt-driven 路径，保持 workflow 语义兼容。
