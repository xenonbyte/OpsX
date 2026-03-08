# OpenSpec 实战指南 (v2.0.0)

## 1. 概览

OpenSpec 是一套规范驱动开发工作流，统一使用：
- 入口：`/openspec`
- 子命令：`/opsx:*`

支持平台：Claude、Codex、OpenCode、Gemini、OpenClaw。

## 2. 元命令

- `/openspec --help`
- `/openspec --version`
- `/openspec --language zh|en`
- `/openspec --doc`

说明：`/openspec --update` 已删除，输入时会静默回落到 help。

## 3. 约束文档命令

使用：

```bash
/opsx:rules <type> [profile] [--file <name>]
```

### type
- `tech`
- `ux`
- `writing`
- `other`

### profile
- `tech`: `web | api | fullstack | android | ios | harmony | desktop | general`
- `ux`: `product | design-system | research | general`
- `writing`: `docs | blog | spec | proposal | general`
- `other`: `general`

### 规则
- 不传参数：自动探测，失败回退 `other general`
- 输入 `android/ios/harmony/web/api/...`：自动映射为 `tech <profile>`
- `mobile` 已移除，需改用 `android|ios|harmony`

## 4. 生成逻辑

`/opsx:rules` 采用三层合成：
- Base：目标边界、流程、提交规范、质量门禁、禁止项、DoD
- Type Pack：按 type 注入领域约束
- Project Signals：按仓库事实增强规则

优先级：`用户显式参数 > 仓库事实 > type 默认值`

所有规则必须可执行、可验证，并标注 `MUST/SHOULD`。

## 5. 平台文件映射

- Claude -> `CLAUDE.md`
- Codex -> `AGENTS.md`
- OpenCode -> `AGENTS.md`
- OpenClaw -> `AGENTS.md`
- Gemini -> `GEMINI.md`

可用 `--file` 覆盖。

## 6. 安装与配置

安装：

```bash
./install.sh --platform <claude|codex|opencode|gemini|openclaw> [--workspace <path>]
```

卸载：

```bash
./uninstall.sh --platform <claude|codex|opencode|gemini|openclaw>
```

共享配置：
- `~/.openspec/.opsx-config.yaml`

## 7. 其他工作流命令

- `/opsx:propose`
- `/opsx:new`
- `/opsx:continue`
- `/opsx:ff`
- `/opsx:apply`
- `/opsx:verify`
- `/opsx:sync`
- `/opsx:archive`
- `/opsx:bulk-archive`
- `/opsx:batch-apply`
- `/opsx:resume`
- `/opsx:status`
- `/opsx:onboard`
