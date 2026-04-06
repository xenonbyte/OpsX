## 1. Case set: advisory review actionability fix
Covers: Review-state activation and next-step selection
Done when: advisory `security-review` states are no longer treated as actionable planning work, while required/completed behavior remains stable.
- [x] 1.1 Update runtime artifact activation so waived review no longer remains actionable in workflow state.
- [x] 1.2 Update runtime artifact activation so recommended review no longer becomes the next planning step.
- [x] 1.3 Update exported workflow review state so recommended review is also inactive for workflow API consumers.

## 2. Case set: request-source heuristic preservation
Covers: Runtime heuristic inputs
Done when: caller-provided request text and in-memory artifact text survive kernel construction and still drive review guidance.
- [x] 2.1 Merge caller-provided `sources.request` with file-derived artifact text in runtime kernel construction.
- [x] 2.2 Preserve caller-provided `proposal`, `specs`, `design`, and `tasks` text when files are absent.
- [x] 2.3 Preserve caller-provided artifact text when matching files contain only whitespace.
- [x] 2.4 Verify status and apply instructions preserve request-only heuristic security signals and unsaved-buffer artifact previews.

## 3. Case set: regression coverage and verification
Covers: Runtime tests and workflow validation
Done when: regression tests catch advisory-review misguidance and project checks remain green.
- [x] 3.1 Add runtime workflow regression coverage for waived and recommended review next-step behavior.
- [x] 3.2 Extend workflow contract validation and summary output to assert advisory review is inactive and preserve security-review gating semantics.
- [x] 3.3 Add regression coverage for summarized workflow inactivity and array-backed apply-preview task grouping.
- [x] 3.4 Add regression coverage so apply readiness stays false until required planning artifacts exist on disk.
- [x] 3.5 Run runtime tests, CLI checks, syntax checks, package dry-run verification, and rollback/compatibility verification notes.
