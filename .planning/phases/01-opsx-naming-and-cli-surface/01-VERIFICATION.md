---
phase: 01-opsx-naming-and-cli-surface
status: passed
verified_at: 2026-04-26T20:37:08Z
requirements_checked:
  - NAME-01
  - NAME-02
  - NAME-03
  - NAME-04
  - NAME-05
automated_checks:
  count: 11
  list:
    - Runtime regression suite
    - Legacy allowlist gate
    - npm pack dry-run
    - CLI --version smoke
    - CLI --help smoke
    - CLI migrate placeholder smoke
    - CLI status placeholder smoke
    - CLI check smoke
    - CLI doc smoke
    - package.json metadata sanity check
    - legacy entry file absence check
gaps:
  count: 0
  list: []
---

# Phase 01: OpsX Naming and CLI Surface Verification Report

**Phase Goal:** Make the package identity, CLI binary, runtime constants, docs, and release metadata consistently OpsX.
**Verified:** 2026-04-26T20:37:08Z
**Status:** passed
**Re-verification:** No

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| - | - | - | - |
| 1 | `@xenonbyte/opsx@3.0.0` is the published package identity and only `opsx` is exposed in the bin map. | ✓ VERIFIED | `package.json:2-7,38-45`; `node -e` metadata sanity check passed; `npm_config_cache=/tmp/opsx-npm-cache npm pack --dry-run` produced `@xenonbyte/opsx@3.0.0` with `bin/opsx.js` only and no legacy bin alias. |
| 2 | `node bin/opsx.js` exposes the OpsX command surface with truthful Phase 1 `migrate` and `status` placeholders. | ✓ VERIFIED | `lib/cli.js:29-77,79-157`; `node bin/opsx.js --help`; `node bin/opsx.js --version`; `node bin/opsx.js migrate`; `node bin/opsx.js status`; `node scripts/test-workflow-runtime.js` test cases 16, 17, and 18. |
| 3 | User-facing docs, skill assets, command bundles, and release text speak OpsX as the primary public surface. | ✓ VERIFIED | `README.md:1-54`; `README-zh.md:1-54`; `docs/commands.md:1-68`; `docs/codex.md:1-24`; `docs/runtime-guidance.md:1-35`; `skills/opsx/SKILL.md:1-42`; `commands/claude/opsx.md:1-28`; `commands/codex/prompts/opsx.md:1-31`; `commands/gemini/opsx.toml:1-30`. |
| 4 | Historical OpenSpec references are confined to the approved lineage/history/deferred-runtime allowlist. | ✓ VERIFIED | `CHANGELOG.md:3-10`; `README.md:5`; `README-zh.md:5`; `scripts/check-phase1-legacy-allowlist.js:11-37,89-100,116-161`; `node scripts/check-phase1-legacy-allowlist.js` passed with 54 allowlisted legacy-token hits. |
| 5 | Release metadata clearly communicates `3.0.0` as the breaking OpsX rename and workflow-state upgrade. | ✓ VERIFIED | `package.json:2-6,38-45`; `CHANGELOG.md:3-10`; `node bin/opsx.js --version` printed `OpsX v3.0.0`. |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `package.json` | `@xenonbyte/opsx`, `3.0.0`, `bin/opsx.js`, OpsX repo URLs | VERIFIED | The package metadata and bin map are OpsX-only. |
| `bin/opsx.js` | Thin CLI wrapper to `lib/cli.js` | VERIFIED | The wrapper calls `runCli(process.argv.slice(2))`. |
| `lib/constants.js` | Public identity constants use OpsX names | VERIFIED | `PRODUCT_NAME`, `PRODUCT_SHORT_NAME`, and `PRODUCT_LONG_NAME` are OpsX-branded. |
| `lib/cli.js` | Help/version plus `install`, `uninstall`, `check`, `doc`, `language`, `migrate`, `status` | VERIFIED | Help text and dispatch are OpsX-first; Phase 1 placeholders are truthful. |
| `lib/config.js` / `lib/install.js` | Skill lookup and install/check/doc plumbing resolve `skills/opsx` | VERIFIED | Repo skill dir, install checks, and doc lookup all point at `skills/opsx`. |
| `skills/opsx/` | Distributed skill bundle with OpsX-only public entrypoints | VERIFIED | Skill frontmatter and guides use `opsx`, `$opsx <request>`, and `/opsx-*`. |
| `commands/claude/opsx.md`, `commands/codex/prompts/opsx.md`, `commands/gemini/opsx.toml` | Generated command bundle with OpsX primary routes | VERIFIED | Claude/Gemini use `/opsx-<action>`; Codex prefers `$opsx <request>` and `$opsx-*`. |
| `README.md`, `README-zh.md`, `docs/*.md` | OpsX-first public documentation | VERIFIED | Public docs present OpsX as the primary package/CLI/skill identity. |
| `CHANGELOG.md` | `3.0.0` breaking release note | VERIFIED | The release note names the package rename and defers later phases explicitly. |
| `scripts/check-phase1-legacy-allowlist.js` | Deterministic legacy-token gate | VERIFIED | The gate hardcodes scan targets and passed on the current tree. |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| `package.json` | `bin/opsx.js` | `bin` map | VERIFIED | The published bin map exposes only `opsx`. |
| `bin/opsx.js` | `lib/cli.js` | `require('../lib/cli')` | VERIFIED | The wrapper is still the thin entrypoint. |
| `lib/cli.js` | `lib/install.js` | dispatch and `runCheck` / `showDoc` / `setLanguage` | VERIFIED | The CLI delegates install/check/doc/language behavior to the install module. |
| `lib/install.js` | `skills/opsx/` | `getRepoSkillDir()` and install/doc reads | VERIFIED | Install and doc flows resolve the renamed skill bundle. |
| `docs/commands.md` | `commands/claude/opsx.md` / `commands/codex/prompts/opsx.md` / `commands/gemini/opsx.toml` | shared public route surface | VERIFIED | Public docs and generated bundles agree on the same OpsX route model. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| `lib/cli.js` | `PRODUCT_NAME`, `PRODUCT_SHORT_NAME`, `PRODUCT_LONG_NAME`, `PACKAGE_VERSION` | `lib/constants.js` / `package.json` | Yes | VERIFIED |
| `lib/install.js` | skill bundle path and installation report text | repo filesystem + `getRepoSkillDir()` | Yes | VERIFIED |
| `lib/install.js` `showDoc()` | guide content | `skills/opsx/GUIDE-en.md` / `GUIDE-zh.md` | Yes | VERIFIED |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Package identity/version/bin | `node -e "const p=require('./package.json'); if (p.name!=='@xenonbyte/opsx' || p.version!=='3.0.0' || !p.bin || Object.keys(p.bin).length !== 1 || p.bin.opsx !== 'bin/opsx.js' || Object.prototype.hasOwnProperty.call(p.bin,'openspec')) process.exit(1)"` | Passed | ✓ PASS |
| Runtime regression suite | `node scripts/test-workflow-runtime.js` | `23 test(s) passed.` | ✓ PASS |
| Legacy-token gate | `node scripts/check-phase1-legacy-allowlist.js` | `Phase 1 legacy allowlist check passed.` / `Scanned files: 88` / `Allowlisted legacy-token hits: 54` | ✓ PASS |
| Package dry-run | `npm_config_cache=/tmp/opsx-npm-cache npm pack --dry-run` | Tarball `@xenonbyte/opsx@3.0.0` included `bin/opsx.js`, `commands/*/opsx*`, and `skills/opsx`; no legacy bin alias or legacy entry files appeared. | ✓ PASS |
| CLI version smoke | `node bin/opsx.js --version` | `OpsX v3.0.0` | ✓ PASS |
| CLI help smoke | `node bin/opsx.js --help` | Help text lists `opsx install`, `opsx uninstall`, `opsx check`, `opsx doc`, `opsx language`, `opsx migrate`, and `opsx status`, plus secondary compatibility aliases. | ✓ PASS |
| CLI migrate smoke | `node bin/opsx.js migrate` | Phase 1 placeholder that points real migration to Phase 2. | ✓ PASS |
| CLI status smoke | `node bin/opsx.js status` | Phase 1 placeholder that points durable state reporting to Phase 4. | ✓ PASS |
| CLI check smoke | `node bin/opsx.js check` | OpsX Installation Check output rendered successfully. The current host still has preexisting `.openspec` user state, which is outside Phase 1 repo scope. | ✓ PASS |
| CLI doc smoke | `node bin/opsx.js doc` | OpsX guide content rendered successfully. | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ---------- | ----------- | ------ | -------- |
| `NAME-01` | Phase 1 | User can install the breaking release as `@xenonbyte/opsx`. | SATISFIED | `package.json:2-7,38-45`; `npm pack --dry-run`; package metadata sanity check. |
| `NAME-02` | Phase 1 | User can invoke the CLI as `opsx` with `--help`, `--version`, `install`, `uninstall`, `check`, `doc`, `language`, `migrate`, and `status`. | SATISFIED | `lib/cli.js:29-157`; direct CLI smoke checks; `scripts/test-workflow-runtime.js` cases 16, 17, 18, 20, 21, and 22. |
| `NAME-03` | Phase 1 | User-facing docs, package metadata, templates, generated command text, and runtime messages consistently use `OpsX`, `opsx`, and `@xenonbyte/opsx`. | SATISFIED | `README.md`; `README-zh.md`; `docs/*.md`; `skills/opsx/*`; `commands/*/opsx*`; `lib/cli.js`; `lib/install.js`; `CHANGELOG.md`. |
| `NAME-04` | Phase 1 | Historical OpenSpec references remain only where they explain source lineage, migration, or changelog history. | SATISFIED | The only README lineage sentence is the approved one; the allowlist gate passed and only approved deferred/runtime files retain legacy tokens. |
| `NAME-05` | Phase 1 | Release metadata clearly communicates `3.0.0` as a breaking OpsX rename and workflow-state upgrade. | SATISFIED | `package.json`; `CHANGELOG.md:3-10`; `node bin/opsx.js --version`. |

### Anti-Patterns Found

None blocking. The only intentional placeholder behavior is the Phase 1 `migrate` / `status` messaging in `lib/cli.js:63-76`, which is required by the phase boundary and covered by tests.

### Human Verification Required

None.

### Gaps Summary

No repo gaps. The shipped public surface is OpsX-only, the legacy-token gate passed, and the remaining legacy references are confined to the approved deferred-runtime / lineage / changelog areas. The direct `check` smoke on this machine surfaced preexisting user-home `.openspec` state, which is expected until Phase 2 migration and is outside Phase 1 repo verification.

---

_Verified: 2026-04-26T20:37:08Z_
_Verifier: Codex (gsd-verifier)_
