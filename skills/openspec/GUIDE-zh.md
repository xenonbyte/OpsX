# OpenSpec 实战指南 (v1.0.0)

## 1. 概览

OpenSpec 是一套规范驱动开发工作流，统一使用：
- 入口：`/openspec`
- 子命令：`/opsx:*`

支持平台：Claude、Codex、Gemini。

平台调用方式：
- Claude/Gemini：使用 `/openspec ...` 与 `/opsx:*`
- Codex：使用 `/prompts:openspec ...` 与 `/prompts:opsx-*`

## 2. 元命令

- `/openspec --help` — 显示命令参考
- `/openspec --version` — 显示已安装版本和配置
- `/openspec --language zh|en` — 切换输出语言
- `/openspec --doc` — 显示本指南
- `/openspec --check` — 验证安装和工作区配置

Codex 对应写法：
- `/prompts:openspec --help`
- `/prompts:openspec --version`
- `/prompts:openspec --language zh|en`
- `/prompts:openspec --doc`
- `/prompts:openspec --check`

## 3. 安装与配置

安装：

```bash
./install.sh --platform <claude|codex|gemini> [--workspace <path>]
```

卸载：

```bash
./uninstall.sh --platform <claude|codex|gemini>
```

共享配置：
- `~/.openspec/.opsx-config.yaml`

## 4. 工作流命令速查

| 命令 | 用途 | 使用场景 |
|------|------|----------|
| `/opsx:propose` | 创建变更 + 全部工件 | 需求清晰，快速开始 |
| `/opsx:explore` | 探索想法 | 立项前调研 |
| `/opsx:new` | 创建新变更 | 逐步构建工件 |
| `/opsx:continue` | 创建下一个工件 | 增量式构建 |
| `/opsx:ff` | 一次性创建所有规划工件 | 需求清晰，快速通道 |
| `/opsx:apply` | 实施任务 | 准备写代码 |
| `/opsx:verify` | 验证实现 | 归档前检查 |
| `/opsx:sync` | 更新主规格 | 规格需要同步 |
| `/opsx:archive` | 归档完成的变更 | 工作完成 |
| `/opsx:status` | 显示当前状态 | 检查进度 |
| `/opsx:resume` | 恢复之前的工作 | 新会话继续 |
| `/opsx:onboard` | 引导式教程 | 首次使用 |

Codex 映射规则：把 `/opsx:<action>` 替换为 `/prompts:opsx-<action>`

## 5. 选择合适的工作流

### 何时使用 `/opsx:propose`
- 对要构建的内容有清晰的想法
- 希望一步生成所有工件
- 需求明确的功能快速启动

### 何时使用 `/opsx:new` + `/opsx:continue`
- 想要逐步思考每个工件
- 需求可能随着编写而演进
- 第一次学习工作流

### 何时使用 `/opsx:ff`
- 需求清晰但想在实施前检查
- 类似 propose，但在 apply 前有一个检查点

### 何时使用 `/opsx:explore`
- 不确定采用什么方案
- 需要比较多个解决方案
- 正在调查复杂问题

## 6. 编写高质量规格

### Proposal 最佳实践
- "Why" 部分保持 1-2 句话
- 明确列出所有受影响的能力
- 用 **BREAKING** 标记破坏性变更

### Spec 最佳实践
- 使用 SHALL/MUST 表示规范性要求
- 每个需求至少有一个场景
- 场景使用 WHEN/THEN 格式
- 保持场景可测试、具体

### Design 最佳实践
- 以下情况需要包含：跨模块变更、新依赖、安全/性能影响
- 说明决策及理由，不仅是"做什么"还要说明"为什么"
- 有风险的变更包含回滚计划

### Tasks 最佳实践
- 每个任务应能在一个会话内完成
- 严格使用复选框格式：`- [ ] X.Y 任务描述`
- 按依赖关系排序

## 7. 常见模式

### 功能开发
```
/opsx:propose add-feature-x
/opsx:apply add-feature-x
/opsx:verify add-feature-x
/opsx:archive add-feature-x
```

### Bug 修复（含调研）
```
/opsx:explore
(理解问题)
/opsx:propose fix-bug-y
/opsx:apply fix-bug-y
/opsx:archive fix-bug-y
```

### 重构
```
/opsx:new refactor-module-z
/opsx:continue refactor-module-z
(简单重构可能跳过 design)
/opsx:ff refactor-module-z
/opsx:apply refactor-module-z
/opsx:verify refactor-module-z
```

### 多变更迭代
```
/opsx:status
/opsx:batch-apply
(选择多个变更)
/opsx:bulk-archive
```

## 8. 故障排除

### "找不到变更"
- 检查变更名称拼写
- 使用 `/opsx:status` 列出活跃变更
- 使用 `/opsx:resume` 恢复之前的工作

### "依赖未满足"
- 工件必须按顺序创建：proposal → specs → design → tasks
- 使用 `/opsx:continue` 创建下一个工件

### "任务未更新"
- 确保复选框格式正确：`- [ ]` 和 `- [x]`
- 检查是否在编辑正确变更的 tasks.md

### 安装问题
- 运行 `/openspec --check` 诊断
- 检查 `~/.openspec/.opsx-config.yaml` 是否存在
- 验证平台目录有预期的文件
