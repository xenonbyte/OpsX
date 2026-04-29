const REVIEW_STATES = Object.freeze(['required', 'recommended', 'waived', 'completed']);
const CHECKPOINT_STATES = Object.freeze(['PASS', 'WARN', 'BLOCK']);
const DEFAULT_HEURISTIC_INPUTS = Object.freeze(['request', 'proposal', 'specs', 'design']);
const DEFAULT_CHECKPOINT_IDS = Object.freeze([
  'spec-split-checkpoint',
  'spec-checkpoint',
  'task-checkpoint',
  'execution-checkpoint',
  'implementation-consistency-checkpoint'
]);
const PLANNING_ROLLOUT_ARTIFACTS = Object.freeze(['proposal', 'specs', 'design']);
const COMMITMENT_CATEGORIES = Object.freeze(['implementation', 'migration', 'rollback', 'compatibility', 'verification']);
const DEFAULT_TDD_REQUIRE_FOR = Object.freeze(['behavior-change', 'bugfix']);
const DEFAULT_TDD_EXEMPT = Object.freeze(['docs-only', 'copy-only', 'config-only']);
const SECURITY_KEYWORDS = Object.freeze(['security', 'auth', 'permission', 'audit', 'rate limit', 'token', 'encryption', 'signature']);

module.exports = {
  REVIEW_STATES,
  CHECKPOINT_STATES,
  DEFAULT_HEURISTIC_INPUTS,
  DEFAULT_CHECKPOINT_IDS,
  PLANNING_ROLLOUT_ARTIFACTS,
  COMMITMENT_CATEGORIES,
  DEFAULT_TDD_REQUIRE_FOR,
  DEFAULT_TDD_EXEMPT,
  SECURITY_KEYWORDS
};
