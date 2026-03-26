# Changelog

## v1.3.0

Release date: 2026-03-26

Highlights:
- Ship OpenSpec as a Node-first CLI for `init`, `install`, `update`, `uninstall`, asset generation, and validation
- Add project-level `openspec/config.yaml` with schema, profile, language, context, rules, and `securityReview` policy
- Add schema-driven workflow runtime with explicit `security-review` hard gate and heuristic soft gate
- Add canonical security-review states: `required`, `recommended`, `waived`, `completed`
- Add planning checkpoints: `spec checkpoint` before `tasks` and `task checkpoint` before `apply`
- Add execution checkpoints after each top-level task group during `apply`
- Generate Claude, Codex, and Gemini adapters from shared templates instead of maintaining separate prompt logic
- Make Codex use `$openspec` as the primary entrypoint and keep `/prompts:*` as thin routing commands
- Expand `openspec validate-assets` to cover generated assets, workflow contracts, and packaging readiness
- Refresh README, focused docs, skill guidance, and artifact/playbook references to match the new workflow model
