# Research Summary: OpsX v3.0 Migration

**Source:** 2026-04-27 user-provided OpsX optimization report plus local repository inspection.

## Stack Additions

- Keep the Node CLI architecture and add focused modules for migration, workspace resolution, state storage, context capsule generation, artifact hashing, drift tracking, TDD checkpointing, spec-split review, path/glob utilities, and clean JSON output.
- Keep generated adapters for Claude Code, Codex, and Gemini, but rewrite their public command surfaces to OpsX naming.
- Keep the schema-driven workflow runtime, extending `schemas/spec-driven/schema.json` with `spec-split-checkpoint` and runtime artifacts.

## Feature Table Stakes

- Consistent OpsX naming across package metadata, binary, docs, templates, generated commands, skills, constants, and install/uninstall flows.
- Safe migration from `openspec/` to `.opsx/`, from `.openspec.yaml` to `change.yaml`, and from `~/.openspec/` to `~/.opsx/`.
- State recovery through `.opsx/active.yaml`, per-change `state.yaml`, `context.md`, `drift.md`, and artifact hashes.
- Planning review through `spec-split-checkpoint`, existing spec/task checkpoints, TDD-light task structure, and execution checkpoints after every top-level task group.
- Verification through drift checks, allowed/forbidden path guards, clean `opsx status --json`, sync/archive gating, and expanded tests.

## Watch Out For

- Do not leave runtime, docs, skill metadata, or generated command text pointing to `openspec`, `$openspec`, `/openspec`, `/prompts:openspec`, `openspec/`, `skills/openspec`, or `~/.openspec/` except in migration/history notes.
- Do not let state-machine behavior rely on chat history; every command must reload `.opsx/` artifacts before acting.
- Do not implement a full autonomous agent engine or Lite/Advanced profile split; the goal is a lightweight recoverable workflow, not a new automation platform.
- Do not silently archive changes with unresolved drift, incomplete tasks, missing execution checkpoints, or unsynced specs.
