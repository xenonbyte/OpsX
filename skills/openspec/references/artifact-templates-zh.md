# 工件模板

在读取 `openspec/config.yaml` 并解析对应工件 `rules` 之后，按本文件编写工件。

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
## 1. Setup
- [ ] 1.1 Example task
```

规则：
- 必须使用 `- [ ] X.Y Description`。
- 已完成任务改成 `- [x]`。
- 按依赖顺序编排任务。
- 使用 `## 1. Setup` 这类一级任务组；`execution checkpoint` 会在每个一级任务组后运行。
- 如果 checkpoint 发现问题，回写 `tasks.md`，不要新增独立 review 工件。
