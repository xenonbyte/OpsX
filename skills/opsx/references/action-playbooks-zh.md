# Action Playbooks（中文）

在执行显式 workflow action 时使用本文件。

## 通用前置步骤

1. 先解析 change metadata、project config、global config。
2. 在写工件前应用 `context` 和对应工件的 `rules`。
3. 按 active schema 读取依赖工件。
4. 如果 config 或 metadata 显式标记为 security-sensitive，则在 `tasks` 之前强制要求 `security-review.md`。
5. 如果命中安全启发式信号，则默认建议补 `security-review.md`；若用户选择跳过，必须在工件里记录原因。
6. 在 `design` 之后、`tasks` 之前运行 `spec checkpoint`。
7. 在 `tasks` 之后、`apply` 之前运行 `task checkpoint`。

## propose

- 生成 change 名称。
- 创建 `change.yaml`。
- 一次生成 proposal、specs、design、tasks。
- 完成后交接到 `apply`。

## explore

- 澄清范围、约束、成功标准。
- 比较方案和权衡。
- 推荐走 `propose` 或 `new`。

## new

- 仅创建 change 容器和 metadata。
- 报告 proposal 是下一个 READY 工件。

## continue

- 检测依赖就绪状态。
- 创建下一个 READY 工件。
- 报告新的可执行后续步骤。

## ff

- 按依赖顺序一次生成所有规划工件。
- 显式记录假设。
- 在显式要求或启发式命中时，将 `security-review.md` 插入到 `design` 和 `tasks` 之间。
- 在交给 `apply` 前，先通过 `spec checkpoint` 和 `task checkpoint`。

## security-review

- 总结本次变更涉及的敏感面。
- 列出具体风险、缓解措施和必须落实的控制项。
- 明确 `tasks` 是否可以继续，或还有哪些阻塞。
- 如果跳过评审，必须记录豁免原因。

## apply

- 读取 proposal、specs、可选 design、tasks。
- 按顺序执行 tasks。
- 以一级任务组作为执行里程碑。
- 每完成一个一级任务组后运行 `execution checkpoint`。
- 如果 `execution checkpoint` 返回 `WARN` 或 `BLOCK`，先回写已有工件再继续。
- 完成后将任务更新为 `- [x]`。
- 如实现改变范围，及时同步工件。

## verify

- 从 Completeness、Correctness、Coherence 三个维度检查。
- 输出 `CRITICAL`、`WARNING`、`SUGGESTION`。

## sync

- 将 delta specs 合并进 `.opsx/specs/`。
- 保留无关内容不变。
- 输出冲突点。

## archive

- 确认任务完成状态。
- 需要时先做 spec sync。
- 将 change 移入 archive。

## status

- 根据 active schema 输出工件 READY/BLOCKED/DONE。
- 报告阻塞项和下一步动作。
- 在需要或建议进行 `security-review` 时，明确显示其状态。
- checkpoint 输出需包含标准字段：`status`、`findings`、`patchTargets`、`nextStep`。
- `security-review` 使用 `required`、`recommended`、`waived`、`completed`。
- checkpoint 使用 `PASS`、`WARN`、`BLOCK`。
