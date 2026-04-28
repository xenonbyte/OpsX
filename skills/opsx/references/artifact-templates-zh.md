# 工件模板

在读取 `.opsx/config.yaml` 并解析对应工件 `rules` 之后，按本文件编写工件。

## proposal.md

```markdown
## Why

## What Changes

## Capabilities

### New Capabilities

### Modified Capabilities

## Impact
```

## specs/<capability>/spec.md

```markdown
## ADDED Requirements

### Requirement: Example requirement
The system SHALL ...

#### Scenario: Example scenario
- **WHEN** ...
- **THEN** ...
```

规则：
- Requirement 使用 `SHALL` 或 `MUST`。
- 每条 requirement 至少有一个 scenario。
- 视情况使用 `ADDED`、`MODIFIED`、`REMOVED`。

## design.md

```markdown
## Context
## Goals / Non-Goals
## Decisions
## Risks / Trade-offs
## Migration Plan
```

## security-review.md

```markdown
## Scope
## Sensitive Surfaces
## Risks
## Required Controls
## Waiver
```

规则：
- 对安全敏感变更，在 `design` 之后、`tasks` 之前使用本工件。
- 如果跳过评审，必须在 `## Waiver` 中写明原因和决策上下文。
- 需要明确当前状态是 `required`、`recommended`、`waived` 还是 `completed`。

## tasks.md

```markdown
## Test Plan
- Behavior: 对行为变更任务组强制 RED 与 VERIFY 证据。
- Requirement/Scenario: TDD-02 / behavior-change 任务组必须暴露可机读的 TDD 标记。
- Verification: 运行 `npm run test:workflow-runtime` 并检查 checkpoint 结果。
- TDD Mode: strict
- Exemption Reason: none

## 1. 强化 task-checkpoint 的 TDD 标记
- TDD Class: behavior-change
- [ ] RED: 增加一个缺少 VERIFY 证据时应失败的 runtime 测试。
- [ ] GREEN: 实现 checkpoint 逻辑更新，让 RED 测试通过。
- [ ] REFACTOR: 可选清理，且必须保持测试通过。
- [ ] VERIFY: 运行 `npm run test:workflow-runtime` 并记录结果。

## 2. 更新 docs-only 文案
- TDD Exemption: docs-only — 仅文案修改，不涉及行为逻辑变更。
- [ ] 更新 guidance 工件文案以匹配已落地的 TDD-light 规则。
- [ ] VERIFY: 运行 `npm run test:workflow-runtime`，确认无 runtime 回归。
```

规则：
- 将 `## Test Plan` 作为元数据块，放在可执行一级任务组之前。
- Test Plan 中的键名保持可机读：`Behavior`、`Requirement/Scenario`、`Verification`、`TDD Mode`、`Exemption Reason`。
- 对行为变更或 bugfix 任务组，使用 `- TDD Class: behavior-change` 或 `- TDD Class: bugfix`，并包含显式 `RED`、`GREEN`、`VERIFY` 清单项。
- `REFACTOR` 可选，但使用时必须显式可见。
- 对豁免任务组，添加可见的 `- TDD Exemption: <class> — <reason>`，且仍需包含 `VERIFY` 清单项。
- 可执行工作仍按 `## 1. ...` 这类一级任务组组织；`execution checkpoint` 会在每个一级任务组后运行。
- 如果 checkpoint 发现问题，回写 `tasks.md`，不要新增独立 review 工件。
