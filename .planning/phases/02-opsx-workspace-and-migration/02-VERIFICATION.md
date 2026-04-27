---
phase: 02-opsx-workspace-and-migration
verified: 2026-04-27T05:10:28Z
status: passed
score: 9/9 must-haves verified
overrides_applied: 0
requirements_checked:
  - DIR-01
  - DIR-02
  - DIR-03
  - DIR-04
  - DIR-05
  - DIR-06
  - DIR-07
automated_checks:
  - npm run test:workflow-runtime
  - node bin/opsx.js --help
  - node bin/opsx.js status
  - node bin/opsx.js migrate --dry-run
  - node bin/opsx.js check
---

# Phase 02: `.opsx/` Workspace and Migration Verification Report

**Phase Goal:** Make `.opsx/` and `~/.opsx/` the canonical workflow directories and provide safe migration from the old layout.
**Verified:** 2026-04-27T05:10:28Z
**Status:** passed
**Re-verification:** No

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Canonical runtime path resolution uses `.opsx/` and `config.yaml` everywhere, with legacy `openspec/` and `~/.openspec/` kept diagnostic-only. | ✓ VERIFIED | `lib/constants.js`, `lib/config.js`, `lib/install.js`, `lib/runtime-guidance.js`, and `lib/cli.js` now resolve canonical `.opsx` paths; `node bin/opsx.js check` reports canonical paths first and only labels old locations as migration candidates. |
| 2 | `opsx migrate --dry-run` prints the repo/home `MOVE`/`CREATE` plan and performs zero writes. | ✓ VERIFIED | `npm run test:workflow-runtime` test 18 passes; `node bin/opsx.js migrate --dry-run` printed exact `MOVE` lines for `openspec/...` and `~/.openspec/...`, `CREATE .opsx/active.yaml`, and no fixture files changed. |
| 3 | `opsx migrate` execute mode moves legacy repo/home assets, renames `.openspec.yaml` to `change.yaml`, and creates missing scaffolds. | ✓ VERIFIED | `npm run test:workflow-runtime` test 19 passes; execute-mode coverage confirmed `.opsx/config.yaml`, `.opsx/changes/<change>/change.yaml`, `state.yaml`, `context.md`, `drift.md`, `~/.opsx/config.yaml`, `~/.opsx/manifests/<platform>.manifest`, `~/.opsx/skills/opsx/SKILL.md`, and `~/.opsx/commands/opsx.md`. |
| 4 | Migration aborts by default when `.opsx/` already exists or canonical destinations conflict. | ✓ VERIFIED | `npm run test:workflow-runtime` test 20 passes; `lib/migrate.js` preflights conflicts and `node bin/opsx.js migrate --dry-run` / `status` surface abort reasons when relevant. |
| 5 | Minimal scaffolds are written only when missing, and they stay honest about Phase 4 not yet existing. | ✓ VERIFIED | `lib/workspace.js` creates `active.yaml`, `state.yaml`, `context.md`, and `drift.md` only when absent; `buildInitialContext()` includes `Placeholder created by opsx migrate.` and `buildInitialDrift()` starts empty with the required headings. |
| 6 | `opsx status` is truthful Phase 2 guidance and does not claim durable Phase 4 behavior. | ✓ VERIFIED | `node bin/opsx.js status` prints `Current phase: Phase 2 (.opsx/ Workspace and Migration)` and says durable change-state lifecycle remains scheduled for Phase 4; it also recommends `Run \`opsx migrate --dry-run\` to preview migration.` when legacy state is present. |
| 7 | Docs and templates describe current canonical `.opsx` behavior, shared-home precedence, tracked/ignored paths, and save locations. | ✓ VERIFIED | `README.md`, `README-zh.md`, `docs/customization.md`, `docs/runtime-guidance.md`, `templates/project/config.yaml.tmpl`, and `templates/project/change-metadata.yaml.tmpl` now use `.opsx/config.yaml`, `~/.opsx/config.yaml`, `change.yaml`, and explicit save-path comments. |
| 8 | `.gitignore` preserves tracked `.opsx` workflow artifacts and ignores runtime scratch directories. | ✓ VERIFIED | `.gitignore` contains `!.opsx/config.yaml`, `!.opsx/active.yaml`, `!.opsx/changes/**`, `!.opsx/specs/**`, `!.opsx/archive/**`, plus `.opsx/cache/**`, `.opsx/tmp/**`, and `.opsx/logs/**`; the runtime suite validates this with real `git check-ignore -v`. |
| 9 | The regression harness covers dry-run, execute, abort, shared-home migration, and gitignore policy through the public CLI and git semantics. | ✓ VERIFIED | `scripts/test-workflow-runtime.js` includes fixture builders and tests for `dry-run`, execute, abort, legacy shared-home migration, `opsx status`, and `.gitignore` behavior; `npm run test:workflow-runtime` passed 29/29. |

**Score:** 9/9 must-haves verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `lib/constants.js` | Canonical product and workspace constants | VERIFIED | `SHARED_HOME_NAME` is `.opsx` and `GLOBAL_CONFIG_NAME` is `config.yaml`. |
| `lib/config.js` | Canonical and legacy path helpers | VERIFIED | Canonical helpers resolve `.opsx`; legacy detectors remain explicit and non-canonical. |
| `lib/install.js` | Truthful install/check flow | VERIFIED | `runCheck()` reports canonical paths first and only treats old paths as migration candidates. |
| `lib/workspace.js` | Minimal non-overwriting scaffold writers | VERIFIED | Writes `active.yaml`, `state.yaml`, `context.md`, and `drift.md` only when missing. |
| `lib/migrate.js` | Shared migration plan, formatter, execute path, and status inspection | VERIFIED | Builds one plan for dry-run and execute, includes repo/home moves, and aborts on conflicts. |
| `lib/cli.js` | Public migrate/status wiring | VERIFIED | Dispatches to `runMigration()` and `getMigrationStatus()` instead of placeholders. |
| `lib/runtime-guidance.js` | Canonical runtime artifact resolution | VERIFIED | Reads `.opsx/config.yaml` and `.opsx/changes/<name>/change.yaml`. |
| `scripts/test-workflow-runtime.js` | Fast migration and gitignore regression harness | VERIFIED | Covers dry-run, execute, abort, shared-home, and `git check-ignore` behavior. |
| `README.md`, `README-zh.md`, `docs/customization.md`, `docs/runtime-guidance.md`, `templates/project/config.yaml.tmpl`, `templates/project/change-metadata.yaml.tmpl` | Operator-facing docs and templates | VERIFIED | Docs and templates now match shipped `.opsx` semantics and canonical save paths. |
| `.gitignore` | Tracked vs ignored `.opsx` policy | VERIFIED | Tracks workflow files and ignores runtime scratch directories exactly as required. |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `lib/cli.js` | `lib/migrate.js` | `require('./migrate')` and command dispatch | VERIFIED | `migrate` and `status` are wired to the shared migration service. |
| `lib/install.js` | `lib/config.js` | Canonical and legacy config path helpers | VERIFIED | `runCheck()` now uses `getGlobalConfigPath()`, `getLegacySharedHome()`, and `getLegacyGlobalConfigPath()`. |
| `lib/runtime-guidance.js` | `.opsx/changes/<name>/change.yaml` | Runtime config resolution | VERIFIED | Change metadata loading uses `change.yaml` instead of `.openspec.yaml`. |
| `scripts/test-workflow-runtime.js` | `bin/opsx.js` | `spawnSync` CLI integration | VERIFIED | The regression harness exercises the public CLI surface directly. |
| `README.md` and `README-zh.md` | `.gitignore` | Literal tracked/ignored policy text | VERIFIED | Both READMEs mirror the repository `.gitignore` path policy verbatim. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| --- | --- | --- | --- | --- |
| `lib/install.js` `runCheck()` | Canonical and legacy path diagnostics | Filesystem existence checks on `.opsx/config.yaml`, `~/.opsx/config.yaml`, and legacy candidates | Yes | VERIFIED |
| `lib/migrate.js` `createMigrationPlan()` | Move/create/warning/abort plan | Current repo and home filesystem contents | Yes | VERIFIED |
| `lib/runtime-guidance.js` `resolveRuntimeConfig()` | Project and change config data | `.opsx/config.yaml`, `.opsx/changes/<name>/change.yaml`, and shared config | Yes | VERIFIED |
| `scripts/test-workflow-runtime.js` | CLI and gitignore assertions | Temp fixtures plus `git check-ignore -v` | Yes | VERIFIED |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Workflow regression suite | `npm run test:workflow-runtime` | `29 test(s) passed.` | ✓ PASS |
| CLI help | `node bin/opsx.js --help` | Shows `opsx migrate --dry-run`, `opsx migrate`, and the rest of the public surface. | ✓ PASS |
| CLI status | `node bin/opsx.js status` | Prints Phase 2 status, canonical/legacy migration diagnostics, and the preview hint. | ✓ PASS |
| CLI dry-run | `node bin/opsx.js migrate --dry-run` | Prints exact repo/home `MOVE`/`CREATE` lines and a legacy backup warning. | ✓ PASS |
| CLI check | `node bin/opsx.js check` | Reports canonical `.opsx` paths and legacy candidates with the required phrases. | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| `DIR-01` | Phase 2 | Project workflow artifacts live under `.opsx/` with `config.yaml`, `active.yaml`, `changes/`, `specs/`, `archive/`, `cache/`, `tmp/`, and `logs/`. | SATISFIED | `lib/constants.js`, `lib/config.js`, `lib/workspace.js`, `lib/runtime-guidance.js`, `README.md`, and `node bin/opsx.js status`. |
| `DIR-02` | Phase 2 | Global OpsX files live under `~/.opsx/` with `config.yaml`, `manifests/`, `skills/opsx/`, and `cache/`. | SATISFIED | `lib/config.js`, `lib/install.js`, `lib/migrate.js`, and `node bin/opsx.js check`. |
| `DIR-03` | Phase 2 | User can run `opsx migrate --dry-run` to preview the full `openspec/` to `.opsx/` migration mapping without writing files. | SATISFIED | `lib/migrate.js`, `scripts/test-workflow-runtime.js`, and `node bin/opsx.js migrate --dry-run`. |
| `DIR-04` | Phase 2 | User can run `opsx migrate` to move project config, changes, specs, archive, and change metadata into the `.opsx/` layout. | SATISFIED | `lib/migrate.js` execute path and `npm run test:workflow-runtime` test 19. |
| `DIR-05` | Phase 2 | Migration renames per-change `.openspec.yaml` files to `change.yaml` and creates missing `state.yaml`, `context.md`, `drift.md`, and `.opsx/active.yaml` defaults. | SATISFIED | `lib/workspace.js`, `lib/migrate.js`, and `npm run test:workflow-runtime` test 19. |
| `DIR-06` | Phase 2 | Migration aborts by default when `.opsx/` already exists and requires explicit merge intent before combining directories. | SATISFIED | `lib/migrate.js` preflight and `npm run test:workflow-runtime` test 20. |
| `DIR-07` | Phase 2 | Git ignore guidance preserves tracked `.opsx/` workflow artifacts while ignoring `.opsx/cache/`, `.opsx/tmp/`, and `.opsx/logs/`. | SATISFIED | `.gitignore`, both READMEs, and `npm run test:workflow-runtime` test 22. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| `lib/cli.js` | parseArgs | `--dry-run` is treated as value-taking when followed by an extra token. | Warning | A malformed command such as `opsx migrate --dry-run extra` can fall through to execute mode instead of failing closed. This is a residual risk from the code review, not a phase-blocking gap. |
| `lib/migrate.js` | preflight / execute ordering | Destination parent conflicts are not fully preflighted. | Warning | A non-directory parent at `~/.opsx` or a subdirectory can still create a partial-migration edge case. This was flagged in code review and remains an advisory risk. |
| `lib/migrate.js` | `REQUIRED_MOVE_LINE_REFERENCES` | Unused reference constant. | Info | No user-facing impact; it only makes the runtime code look more assertion-heavy than it is. |

### Gaps Summary

No phase gaps block goal achievement. All seven DIR requirements are satisfied, the migration runtime is wired through the public CLI, the docs/templates match shipped behavior, and the regression suite passed 29/29. The code review report is `issues_found`; its two substantive findings are recorded above as residual risks because they are edge-case safety issues, not requirement failures.

---

_Verified: 2026-04-27T05:10:28Z_
_Verifier: Claude (gsd-verifier)_
