# OpsX v3.0 Release Checklist

Run executable shell commands from repository root. Invoke workflow-agent steps through the GSD/Codex workflow UI.

## 1. Full regression entrypoint

```bash
npm test
```

Pass: all topic suites pass (aggregate runner exits `0`).
Fail: any topic failure or non-zero exit.

## 2. CLI smoke and command surface

```bash
node bin/opsx.js --help
node bin/opsx.js --version
node bin/opsx.js check
node bin/opsx.js doc
node bin/opsx.js status
node bin/opsx.js status --json
```

Pass:
- `--help` and `--version` exit `0`.
- `check`, `doc`, `status` exit `0`.
- `status --json` stdout is parseable JSON with top-level keys:
  `ok`, `version`, `command`, `workspace`, `migration`, `activeChange`,
  `changeStatus`, `warnings`, `errors`.
- `status --json` uses `ok: true` for transport success.

Fail:
- malformed JSON or stdout noise in `status --json`.
- non-zero exit for expected workflow states (for example workspace not initialized, no active change, migration candidates).

Note:
- True exceptional failures (invalid CLI usage, runtime filesystem/internal exceptions) may use stderr and non-zero exit.
- Expected workflow/readiness issues must stay encoded in the JSON envelope (`workspace`, `migration`, `changeStatus`, `warnings`, `errors`) instead of flipping `ok` to `false`.

## 3. Package release preflight

```bash
npm_config_cache=.npm-cache npm pack --dry-run --json
```

Pass: exits `0`, JSON output parses, tarball metadata/surface matches expected OpsX release files.
Fail: non-zero exit, parse failure, or missing required release surface.

## 4. Public surface hard-clean gate

```bash
node scripts/check-phase1-legacy-allowlist.js
```

Pass: legacy public-surface bans remain clean.
Fail: command reports banned legacy route/surface drift.

## 5. Planning and verification gates

Run the executable schema drift shell command from repository root:

```bash
gsd-sdk query verify.schema-drift 08
```

Invoke through the GSD/Codex workflow UI:

```text
$gsd-code-review 8
$gsd-verify-work 8
```

Pass:
- schema drift check reports valid for phase 08.
- code review and UAT verification complete with no blocking findings.

Fail:
- schema drift issues, unresolved review findings, or UAT blockers.
