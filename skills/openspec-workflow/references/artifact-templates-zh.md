# 工件模板

在创建或编辑 `proposal.md`、`specs/**/*.md`、`design.md`、`tasks.md` 时使用本文件。

## 1) Proposal（`proposal.md`）

目的：说明为什么要做这个变更，以及影响哪些能力。

模板：

```markdown
## Why
<!-- 1-2 句话说明问题或机会 -->

## What Changes
<!-- 用列表描述变更；破坏性变更标注 **BREAKING** -->

## Capabilities

### New Capabilities
- `<capability-name>`: <简要描述>

### Modified Capabilities
- `<existing-capability>`: <变更点>

## Impact
<!-- 受影响的代码、API、数据、依赖、团队 -->
```

规则：

- 保持简洁（通常 1-2 页）。
- 关注意图和范围，不展开实现细节。
- 这里列出的能力必须能在后续 specs 中一一对应。

## 2) Specs（`specs/<capability>/spec.md`）

目的：定义系统行为要求（WHAT）。

模板：

```markdown
## ADDED Requirements

### Requirement: User can export data
The system SHALL allow users to export their data in CSV format.

#### Scenario: Successful export
- **WHEN** user clicks "Export"
- **THEN** system downloads a CSV containing the user's data

## MODIFIED Requirements
<!-- 填写完整的更新后 requirement 文本 -->

## REMOVED Requirements
<!-- 填写移除原因与迁移路径 -->
```

规则：

- Requirement 使用规范性措辞（`SHALL`/`MUST`）。
- 每条 requirement 至少包含一个 scenario。
- Scenario 标题格式必须是 `#### Scenario:`。
- 场景步骤使用清晰的 `WHEN`/`THEN`。

Delta 语义：

- `ADDED`：新增能力行为
- `MODIFIED`：变更既有行为（需提供完整替换内容）
- `REMOVED`：移除行为（需提供原因与迁移建议）

## 3) Design（`design.md`，可选）

目的：说明实现方案（HOW），用于中高复杂度变更。

以下情况建议补充 design：

- 跨模块或跨服务影响
- 新依赖或数据模型调整
- 安全/性能/迁移复杂度较高
- 存在需要明确取舍的重要技术决策

模板：

```markdown
## Context

## Goals / Non-Goals

## Decisions

## Risks / Trade-offs

## Migration Plan
```

规则：

- 记录关键决策及其理由。
- 记录风险及缓解措施。
- 明确 Non-Goals，控制范围蔓延。

## 4) Tasks（`tasks.md`）

目的：把实现拆成可勾选的执行项。

模板：

```markdown
## 1. Setup
- [ ] 1.1 Create module structure
- [ ] 1.2 Add dependencies

## 2. Core Implementation
- [ ] 2.1 Implement feature logic
- [ ] 2.2 Add tests
```

规则：

- 使用精确复选框格式：`- [ ] X.Y Description`
- 完成后标记为 `- [x]`
- 单个任务应能在一次专注工作中完成
- 按依赖顺序编排

## 工件质量检查清单

在规划阶段完成前，确认：

- Proposal 中的能力与 specs 对齐
- Specs 可验证，且 scenario 覆盖完整
- Design 覆盖主要技术不确定性
- Tasks 覆盖实现与验证工作
