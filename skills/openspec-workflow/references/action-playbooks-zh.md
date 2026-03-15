# Action Playbooks（中文）

当用户请求特定 `opsx`/`openspec` 动作时使用本文件。

## `propose`

用于一站式生成规划工件。

1. 快速澄清含糊范围。
2. 生成 kebab-case 变更名。
3. 创建变更目录与 `.openspec.yaml`。
4. 按依赖顺序创建 proposal/specs/design/tasks。
5. 汇总生成结果，并建议下一步（`apply`）。

## `explore`

用于正式立项前的探索。

1. 澄清问题、约束、成功标准。
2. 给出可行方案与权衡。
3. 建议下一步走 `new` 或 `propose`。

## `new`

仅初始化 change。

1. 创建 `openspec/changes/<name>/specs`。
2. 写入 `.openspec.yaml` 元数据。
3. 说明 proposal 是下一个 READY 工件。

## `continue`

用于增量创建工件。

1. 检测当前 change 已有工件。
2. 按依赖规则计算 READY 工件。
3. 创建用户选择的下一个工件。
4. 报告新解锁的后续工件。

## `ff`

用于快速补齐规划文档。

1. 一次读取用户意图。
2. 按顺序生成所有规划工件。
3. 显式标注假设。
4. 交接到 `apply`。

## `apply`

用于实现阶段。

1. 读取 `proposal.md`、全部 `specs`、`design.md`（若存在）、`tasks.md`。
2. 按顺序执行 tasks。
3. 完成后将任务更新为 `- [x]`。
4. 若实现改变范围，同步更新相关工件。
5. 遇到需求缺口时暂停并提问。

## `verify`

按三维度验证。

1. Completeness：任务是否完成、必要工件是否齐全。
2. Correctness：实现是否匹配 requirements 与 scenarios。
3. Coherence：实现是否遵循设计决策。
4. 用 `CRITICAL`、`WARNING`、`SUGGESTION` 输出问题级别。

## `sync`

将 change 的 delta specs 合并到主 specs。

1. 读取 `changes/<name>/specs/` 下的 delta。
2. 读取 `openspec/specs/` 对应主文件。
3. 按 `ADDED`、`MODIFIED`、`REMOVED` 语义合并。
4. 保留无关内容不变。
5. 输出合并摘要与需要人工确认的冲突点。

## `archive`

归档单个已完成 change。

1. 确认任务完成状态。
2. 询问是否需要先做 spec sync（若尚未做）。
3. 移动目录到 `openspec/changes/archive/YYYY-MM-DD-<name>/`。
4. 输出归档路径与剩余 active changes。

## `bulk-archive`

归档多个已完成 change。

1. 列出候选 changes。
2. 检测 specs 目标重叠。
3. 先解决顺序与冲突，再执行归档。
4. 逐个归档所选 changes。
5. 输出汇总结果。

## `batch-apply`

受控执行多个 change 的实现。

1. 验证每个选中 change 都是 READY for apply。
2. 按耦合风险选择串行或并行模式。
3. 对每个 change 执行 `apply` 循环。
4. 输出逐项结果与阻塞项。

## `resume`

在新会话中恢复上下文。

1. 列出 active changes（排除 `archive/`）。
2. 展示每个 change 的工件完成度。
3. 为每个 change 推荐一个下一步动作。

## `status`

输出当前工作流状态快照。

1. 列出 changes 与工件存在情况。
2. 标注各工件 READY/BLOCKED/DONE。
3. 给出阻塞项和可立即执行的命令。

## `onboard`

用于新手引导。

1. 简要解释工作流概念。
2. 展示最小路径：`propose -> apply -> verify -> archive`。
3. 给出一个具体示例 change。
4. 建议立即执行的第一步。
