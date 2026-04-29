# Agent Harness Map

OpsX treats agent constraint files as entry maps. They should tell an agent where to look and what must never drift, not duplicate the full workflow manual.

## Constraint Files

- `AGENTS.md`: Codex-specific entry map.
- `CLAUDE.md`: Claude Code-specific entry map.
- `GEMINI.md`: Gemini-specific entry map.

Each file should stay short and point to source material that can be reviewed, generated, or tested. If a rule needs detail, move the detail to the shared skill, a reference doc, a template, or an executable check.

## Progressive Disclosure

Use this lookup order when adding or changing guidance:

1. Root constraint files: platform route and source map only.
2. `skills/opsx/SKILL.md`: shared workflow contract and reference loading.
3. `skills/opsx/references/`: detailed artifact templates and action playbooks.
4. `templates/`: generated command, action-skill, and hand-off surfaces.
5. `scripts/test-workflow-*.js`: executable invariants that should not rely on prose alone.

## Hard Invariants

- Codex public routes stay explicit `$opsx-*`.
- Claude Code and Gemini public routes stay `/opsx-*`.
- Do not install or document a standalone runtime `opsx` action; each public action has its own `opsx-<action>` command or skill.
- Public docs, prompts, and templates must not introduce dispatcher or wildcard route forms.
- `.opsx/` is the canonical workspace layout.
- Behavior-changing workflow edits should update runtime code, generated prompts, templates, docs, and tests together.

## Verification

For constraint-file, docs, template, or prompt changes, run:

```bash
node scripts/test-workflow-generation.js
node scripts/check-phase1-legacy-allowlist.js
```

Run `npm test` when a change touches runtime behavior, generated bundles, packaging, or workflow gates.
