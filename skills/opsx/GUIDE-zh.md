# OpsX 指南

## 最短路径

1. `opsx install --platform codex`
2. `opsx check`
3. 在 Codex 中使用 `$opsx create an OpsX change for <work>`

## 配置

使用 `.opsx/config.yaml` 定义 `schema`、`language`、`context`、按工件拆分的 `rules`，以及 `securityReview`。

## 命令面

- `opsx install --platform <claude|codex|gemini[,...]>`
- `opsx uninstall --platform <claude|codex|gemini[,...]>`
- `opsx check`
- `opsx doc`
- `opsx language <en|zh>`
- `opsx migrate`
- `opsx status`
- `opsx --help`
- `opsx --version`

## 说明

- 安装始终下发完整命令面，不再区分 `--profile`。
- `--check` 会同时展示已安装 manifest 与“最后一次选择的平台”配置字段。
- `--doc` 优先读取包内 guide，再回退到已安装共享副本。
- 命令包会在 `install` 时自动生成，不需要额外的构建/校验命令。
- 在 Codex 中优先使用 `$opsx <request>`；需要显式路由时使用 `$opsx-*`。
- 在 Claude/Gemini 中，使用 `/opsx-*` 作为主要命令入口。
