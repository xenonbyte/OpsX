# Action Playbooks（中文）

在执行显式 workflow action 时使用本文件。

## 通用前置步骤

1. 先解析 change metadata、project config、global config。
2. 在写工件前应用 `context` 和对应工件的 `rules`。
3. 在文件存在时读取 `.opsx/config.yaml` 与 `.opsx/active.yaml`。
4. 若存在 active change，修改文件前先读取该 change 的 `state.yaml`、`context.md`，以及当前工件（`proposal.md`、`specs/`、`design.md`、可选 `security-review.md`、`tasks.md`）。
5. 若必需工件缺失，必须如实报告，并执行对应路由的 fallback 指引。
6. 如果 config 或 metadata 显式标记为 security-sensitive，则在 `tasks` 之前强制要求 `security-review.md`。
7. 如果命中安全启发式信号，则默认建议补 `security-review.md`；若用户选择跳过，必须在工件里记录原因。
8. 在 `specs` 之后、`design` 之前运行 `spec-split-checkpoint`。
9. 对简单单 spec 变更可内联完成 `spec-split-checkpoint`；对高风险集合（multi-spec、cross-capability、security-sensitive 或较大 requirement 集）在 `design` 前请求只读审阅。
10. 只读审阅（read-only reviewer）仅可读取工件并反馈问题：must not write files directly，且 must not create `spec-review.md`。
11. 在 `design` 之后、`tasks` 之前运行 `spec checkpoint`。
12. 在 `tasks` 之后、`apply` 之前运行 `task checkpoint`。
13. 路由面保持不变：Codex 不得新增 `$opsx-spec-split-*`，Claude/Gemini 不得新增 `/opsx-spec-split-*`，继续使用现有 `propose` / `continue` / `ff` 路由。
14. 编写 `tasks.md` 时必须包含 `## Test Plan`，且每个一级任务组都要声明 `TDD Class:` 或 `TDD Exemption:`，并包含显式 `VERIFY:`。`manual-only verification` 仅在 `Verification:` 行明确说明为何不适合自动化检查时允许。
15. verify/sync/archive/batch 路由遵循 Phase 7 硬门禁：verify 产出 `PASS`/`WARN`/`BLOCK`，sync 采用保守且不允许 partial write 的规划，archive 先做安全 sync 再移动，batch 输出每个 change 的 skipped/blocked 原因。

## onboard

- 若 `.opsx/config.yaml` 缺失，明确报告 workspace 尚未初始化。
- 推荐先执行 `opsx install --platform <claude|codex|gemini[,...]>`，然后使用对应平台路由：Codex `$opsx-new` / `$opsx-propose`，Claude/Gemini `/opsx-new` / `/opsx-propose`。
- 若 workspace 存在但 `.opsx/active.yaml` 没有 active change，明确报告该状态并建议对应平台的 `new` 或 `propose` 路由。
- 保持 onboarding 指导属性，不要 auto-create `.opsx/config.yaml`、`.opsx/active.yaml`，也不要隐式改动状态文件。

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

- 创建完整的新 change skeleton：`change.yaml`、占位 `proposal.md`、`design.md`、`tasks.md`、`specs/README.md`、`state.yaml`、`context.md`、`drift.md`。
- 将 `.opsx/active.yaml` 指向该 active change。
- 保持 `stage: INIT`，并报告 proposal 是下一个 READY 工件。

## continue

- 遵循 `state.yaml` 中持久化的 `stage` 与 `nextAction`。
- 当 `stage === APPLYING_GROUP` 时，优先继续持久化的 `active.taskGroup`。
- 其余阶段只路由或创建下一个有效工件/动作，不重做无关规划。
- 报告更新后的 `stage`、`nextAction`、`warnings`、`blockers`。

## resume

- 若 `.opsx/config.yaml` 缺失，报告 workspace 未初始化并引导到对应平台的 onboard 路由：Codex `$opsx-onboard`，Claude/Gemini `/opsx-onboard`。
- 若 `.opsx/active.yaml` 没有 active change，明确“无可恢复 change”，并建议对应平台的 `new` 或 `propose` 路由。
- 若存在 active change，从持久化状态报告 `stage`、`nextAction`、`warnings`、`blockers`。
- `resume` 必须保持只读：发现 hash drift 时先告警并从磁盘 reload，且 do not refresh stored hashes from read-only routes。
- 不要 auto-create `.opsx/active.yaml`，不要虚构默认 change，也不要在 `resume` 路由里隐式改动状态。

## ff

- 按依赖顺序一次生成所有规划工件。
- 显式记录假设。
- 在 `design` 前先运行 `spec-split-checkpoint`；若建议升级审阅，保持只读审阅且不新增审阅工件。
- 在显式要求或启发式命中时，将 `security-review.md` 插入到 `design` 和 `tasks` 之间。
- 在交给 `apply` 前，先通过 `spec checkpoint` 和 `task checkpoint`。

## security-review

- 总结本次变更涉及的敏感面。
- 列出具体风险、缓解措施和必须落实的控制项。
- 明确 `tasks` 是否可以继续，或还有哪些阻塞。
- 如果跳过评审，必须记录豁免原因。

## apply

- 读取 proposal、specs、可选 design、tasks。
- 默认只执行一个一级任务组（one top-level task group）。
- 完成该一级任务组后运行 `execution checkpoint`。
- 记录 completed TDD steps、verification command/result、changed files、diff summary、drift status；刷新 `context.md` / `drift.md`，然后停止等待下一次执行。
- 如果 `execution checkpoint` 返回 `WARN` 或 `BLOCK`，先回写已有工件再继续。
- 仅将本次执行的任务组条目标记为 `- [x]`。
- 保持 execution 证据完整，确保后续 `verify` 能输出准确的 `PASS` / `WARN` / `BLOCK` 结论。

## batch-apply

- 执行前先确认目标变更集合与执行顺序。
- 仅对真实 READY 的 changes 执行批量 apply。
- 迭代前先校验全局前置条件；若失败则以 `BLOCK` 立即停止。
- 对每个 change 使用 per-change isolation，单个失败后继续处理其他目标。
- 输出 `applied`、`skipped`、`blocked` 计数及逐项原因。
- 若未找到 READY changes，立即停止并建议对应平台的 `status` 路由：Codex `$opsx-status`，Claude/Gemini `/opsx-status`。
- 不要 auto-create 缺失状态，不要伪造 READY 任务，也不要跳过 checkpoint 要求。

## verify

- 从 Completeness、Correctness、Coherence 三个维度检查。
- 产出标准化的 `PASS`、`WARN`、`BLOCK` 结果，并附带 `patchTargets` 与 `nextStep`。
- 对未解决 drift 审批、forbidden/out-of-scope 路径变更、execution 证据缺失、未完成任务组等情况直接阻塞。

## sync

- 写入 `.opsx/specs/` 前先在内存中完成保守规划。
- 保留无关内容并明确报告冲突。
- 若出现 `BLOCK` finding，则 do not write partial sync output。

## archive

- 仅接受 `VERIFIED` 或 `SYNCED` 的 change。
- 对 `VERIFIED` change，移动前必须执行同一套内部 safe sync 检查。
- verify 或 sync 前置条件失败时必须阻塞 archive。
- 门禁通过后将完整 change 目录移动到 `.opsx/archive/<change-name>/`。

## bulk-archive

- 批量归档前先确认目标集合。
- 迭代前先校验全局前置条件；若失败则以 `BLOCK` 立即停止。
- 仅归档通过 verify/sync 前置条件的 changes。
- 对每个 change 使用 per-change isolation，单个失败后继续处理其他目标。
- 输出 `archived`、`skipped`、`blocked` 计数及逐项原因。
- 若没有可归档的 completed changes，立即停止并建议对应平台的 `status` 路由：Codex `$opsx-status`，Claude/Gemini `/opsx-status`。
- 不要 auto-create archive metadata，也不要把未完成 change 标记为 completed。

## status

- 报告 workspace 是否存在（`.opsx/config.yaml`）以及 active change 是否存在（`.opsx/active.yaml`）。
- 按 active schema 报告工件 READY/BLOCKED/DONE。
- 报告 `stage`、`nextAction`、`warnings`、`blockers`。
- 若 workspace 缺失，建议对应平台的 `onboard` 路由：Codex `$opsx-onboard`，Claude/Gemini `/opsx-onboard`。
- 若无 active change，建议对应平台的 `new` 或 `propose` 路由：Codex `$opsx-new` / `$opsx-propose`，Claude/Gemini `/opsx-new` / `/opsx-propose`。
- 在需要或建议进行 `security-review` 时，明确显示其状态。
- checkpoint 输出需包含标准字段：`status`、`findings`、`patchTargets`、`nextStep`。
- `security-review` 使用 `required`、`recommended`、`waived`、`completed`。
- checkpoint 使用 `PASS`、`WARN`、`BLOCK`。
- `status` 必须保持只读：发现 hash drift 时先告警并从磁盘 reload，且 do not refresh stored hashes from read-only routes。
- 输出中应反映当前硬门禁语义：verify/sync/archive 候选出现阻塞 finding 时，状态保持 blocked 直到修复完成。
- 不要 auto-create `.opsx/active.yaml`，也不要在 `status` 路由里虚构 active change。
