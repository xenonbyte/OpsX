# OpenSpec 指南

## 最短路径

1. `openspec init --platform codex --profile core`
2. `openspec install --platform codex --profile core`
3. 在 Codex 中使用 `$openspec create an OpenSpec change for <work>`

## 配置

使用 `openspec/config.yaml` 定义 schema、language、profile、context 和按工件拆分的 rules。

## Profile

- `core`：propose、explore、apply、archive
- `expanded`：完整工作流命令面

## 生成的适配器

修改 workflow 定义后执行 `openspec generate-assets`，发布前执行 `openspec validate-assets`。
