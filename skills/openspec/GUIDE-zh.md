# OpenSpec 指南

## 最短路径

1. `openspec install --platform codex`
2. `openspec --check`
3. 在 Codex 中使用 `$openspec create an OpenSpec change for <work>`

## 配置

使用 `openspec/config.yaml` 定义 `schema`、`language`、`context`、按工件拆分的 `rules`，以及 `securityReview`。

## 命令面

- `openspec install --platform <claude|codex|gemini[,...]>`
- `openspec uninstall --platform <claude|codex|gemini[,...]>`
- `openspec --check`
- `openspec --doc`
- `openspec --language <en|zh>`
- `openspec --help`
- `openspec --version`

## 说明

- 安装始终下发完整命令面，不再区分 `--profile`。
- `--check` 会同时展示已安装 manifest 与“最后一次选择的平台”配置字段。
- `--doc` 优先读取包内 guide，再回退到已安装共享副本。
- 命令包会在 `install` 时自动生成，不需要额外的构建/校验命令。
- 在 Codex 中优先使用 `$openspec <request>`；需要显式路由时使用 `/prompts:opsx-*`。
