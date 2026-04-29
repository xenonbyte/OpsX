const { unique } = require('./string-utils');
const {
  DEFAULT_TDD_REQUIRE_FOR,
  DEFAULT_TDD_EXEMPT
} = require('./workflow-constants');
const { addWorkflowFinding } = require('./checkpoint-result');
const {
  getTextBlock,
  toList
} = require('./workflow-utils');

const MANUAL_VERIFICATION_REASON_PATTERN = /\bmanual\b\s+[—-]\s+(.+)$/i;

function normalizeTddClassToken(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
}

function normalizeTddClassList(values = [], defaults = []) {
  return unique([
    ...toList(defaults),
    ...toList(values)
  ].map((entry) => normalizeTddClassToken(entry)).filter(Boolean));
}

function resolveTddCheckpointConfig(config = {}) {
  const rules = config && typeof config === 'object' && config.rules && typeof config.rules === 'object'
    ? config.rules
    : {};
  const tdd = rules.tdd && typeof rules.tdd === 'object' && !Array.isArray(rules.tdd)
    ? rules.tdd
    : {};
  const mode = typeof tdd.mode === 'string' ? tdd.mode.trim().toLowerCase() : '';
  return {
    mode: ['off', 'light', 'strict'].includes(mode) ? mode : 'strict',
    requireFor: normalizeTddClassList(tdd.requireFor, DEFAULT_TDD_REQUIRE_FOR),
    exempt: normalizeTddClassList(tdd.exempt, DEFAULT_TDD_EXEMPT)
  };
}

function parseManualVerificationText(value = '') {
  const text = String(value || '').trim();
  if (!/\bmanual\b/i.test(text)) {
    return { manual: false, reason: '' };
  }
  const reasonMatch = text.match(MANUAL_VERIFICATION_REASON_PATTERN);
  return {
    manual: true,
    reason: reasonMatch && reasonMatch[1] ? reasonMatch[1].trim() : ''
  };
}

function extractTestPlanSection(tasksText) {
  const text = getTextBlock(tasksText);
  const headingMatch = text.match(/^##\s+Test Plan\s*$/im);
  if (!headingMatch || headingMatch.index === undefined) {
    return {
      present: false,
      text: '',
      lines: [],
      fields: {},
      verification: '',
      manualVerification: false,
      manualVerificationReason: '',
      manualVerificationReasonMissing: false
    };
  }

  const sectionStart = headingMatch.index + headingMatch[0].length;
  const remainder = text.slice(sectionStart);
  const nextHeading = remainder.match(/^\s*##\s+/m);
  const sectionBody = (nextHeading ? remainder.slice(0, nextHeading.index) : remainder).trim();
  const lines = sectionBody
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean);
  const fields = {};
  lines.forEach((line) => {
    const fieldMatch = line.match(/^-+\s*([^:]+):\s*(.+)$/);
    if (!fieldMatch) return;
    const key = String(fieldMatch[1] || '').trim().toLowerCase();
    const value = String(fieldMatch[2] || '').trim();
    if (!key || !value) return;
    fields[key] = value;
  });

  const verification = fields.verification || '';
  const manualVerification = parseManualVerificationText(verification);

  return {
    present: true,
    text: sectionBody,
    lines,
    fields,
    verification,
    manualVerification: manualVerification.manual,
    manualVerificationReason: manualVerification.reason,
    manualVerificationReasonMissing: manualVerification.manual && !manualVerification.reason
  };
}

function parseTddGroupMetadata(groupText) {
  const text = getTextBlock(groupText);
  const classMatch = text.match(/^\s*-\s*TDD Class:\s*([^\n\r]+)\s*$/im);
  const exemptionMatch = text.match(/^\s*-\s*TDD Exemption:\s*([^\n\r]+)\s*$/im);
  const explicitClass = classMatch ? normalizeTddClassToken(classMatch[1]) : '';

  let exemptionClass = '';
  let exemptionReason = '';
  if (exemptionMatch) {
    const rawExemption = String(exemptionMatch[1] || '').trim();
    const parsed = rawExemption.match(/^(.+?)(?:\s+[—-]\s*(.*))?$/);
    if (parsed) {
      exemptionClass = normalizeTddClassToken(parsed[1]);
      exemptionReason = parsed[2] ? String(parsed[2]).trim() : '';
    } else {
      exemptionClass = normalizeTddClassToken(rawExemption);
    }
  }

  const verifyEntries = Array.from(text.matchAll(/^- \[[ xX]\]\s+VERIFY:\s*(.+)$/gim))
    .map((entry) => String(entry[1] || '').trim())
    .filter(Boolean);
  const manualVerifyRationaleMissing = verifyEntries.some((entry) => {
    const manual = parseManualVerificationText(entry);
    return manual.manual && !manual.reason;
  });

  return {
    explicitClass,
    exemptionClass,
    exemptionReason,
    hasRedStep: /^- \[[ xX]\]\s+RED:\s*/im.test(text),
    hasGreenStep: /^- \[[ xX]\]\s+GREEN:\s*/im.test(text),
    hasVerifyStep: /^- \[[ xX]\]\s+VERIFY:\s*/im.test(text),
    hasRefactorStep: /^- \[[ xX]\]\s+REFACTOR:\s*/im.test(text),
    verifyEntries,
    manualVerifyRationaleMissing
  };
}

function inferTddGroupClass(group = {}, evidence = {}) {
  const groupHeading = String(group.heading || '').toLowerCase();
  const groupText = getTextBlock(group.text).toLowerCase();
  const proposalText = evidence.proposal && evidence.proposal.text ? evidence.proposal.text : '';
  const specsText = evidence.specs && evidence.specs.text ? evidence.specs.text : '';
  const designText = evidence.design && evidence.design.text ? evidence.design.text : '';
  const planningText = [proposalText, specsText, designText].join('\n').toLowerCase();
  const haystack = [groupHeading, groupText, planningText].join('\n');

  if (/\bbehavior[- ]?change\b/.test(haystack)) return 'behavior-change';
  if (/\bbug[- ]?fix\b/.test(haystack) || /\bbugfix\b/.test(haystack)) return 'bugfix';
  if (/\bdocs[- ]?only\b/.test(haystack)) return 'docs-only';
  if (/\bcopy[- ]?only\b/.test(haystack)) return 'copy-only';
  if (/\bconfig[- ]?only\b/.test(haystack)) return 'config-only';
  if (/\bmigration[- ]?only\b/.test(haystack)) return 'migration-only';
  if (/\bgenerated[- ]?refresh[- ]?only\b/.test(haystack)) return 'generated-refresh-only';

  return '';
}

function classifyTaskGroupTdd(group, evidence, config) {
  const normalizedGroup = group && typeof group === 'object' ? group : { heading: '', text: '', items: [] };
  const metadata = parseTddGroupMetadata(normalizedGroup.text);
  const resolvedConfig = config && typeof config === 'object' && Array.isArray(config.requireFor) && Array.isArray(config.exempt)
    ? config
    : resolveTddCheckpointConfig(config);
  const requireForSet = new Set(normalizeTddClassList(resolvedConfig.requireFor, DEFAULT_TDD_REQUIRE_FOR));
  const exemptSet = new Set(normalizeTddClassList(resolvedConfig.exempt, DEFAULT_TDD_EXEMPT));
  const hasValidExemptionReason = Boolean(metadata.exemptionReason && metadata.exemptionReason.trim());
  const exemptionClassAllowed = Boolean(metadata.exemptionClass)
    && exemptSet.has(metadata.exemptionClass);
  const exemptionClassInvalid = Boolean(metadata.exemptionClass) && !exemptionClassAllowed;

  let tddClass = '';
  let classSource = 'heuristic';

  if (metadata.exemptionClass) {
    tddClass = metadata.exemptionClass;
    classSource = 'explicit-exemption';
  } else if (metadata.explicitClass) {
    tddClass = metadata.explicitClass;
    classSource = 'explicit-class';
  } else {
    tddClass = inferTddGroupClass(normalizedGroup, evidence);
    classSource = tddClass ? 'heuristic' : 'unclassified';
  }

  const explicitlyExempt = Boolean(metadata.exemptionClass)
    && hasValidExemptionReason
    && exemptionClassAllowed;
  const exemptClassWithoutReason = !metadata.exemptionClass && Boolean(tddClass) && exemptSet.has(tddClass);
  const exempt = explicitlyExempt;
  const required = !exemptionClassInvalid && !exempt && Boolean(tddClass) && requireForSet.has(tddClass);
  const exemptionReasonMissing = !exemptionClassInvalid && (
    (Boolean(metadata.exemptionClass) || exemptClassWithoutReason)
    && !hasValidExemptionReason
  );

  return {
    heading: String(normalizedGroup.heading || '').trim(),
    class: tddClass || null,
    classSource,
    required,
    exempt,
    exemptionClass: metadata.exemptionClass || null,
    exemptionClassInvalid,
    exemptionReason: metadata.exemptionReason || '',
    exemptionReasonMissing,
    hasRedStep: metadata.hasRedStep,
    hasGreenStep: metadata.hasGreenStep,
    hasVerifyStep: metadata.hasVerifyStep,
    hasRefactorStep: metadata.hasRefactorStep,
    manualVerifyRationaleMissing: metadata.manualVerifyRationaleMissing
  };
}

function appendTddTaskCheckpointFindings(findings, groups, evidence, config) {
  const tddConfig = resolveTddCheckpointConfig(config);
  const testPlan = extractTestPlanSection(evidence.tasks ? evidence.tasks.text : '');
  const tddGroups = (groups || []).map((group) => classifyTaskGroupTdd(group, evidence, tddConfig));

  if (tddConfig.mode === 'off') {
    return {
      mode: tddConfig.mode,
      testPlanPresent: testPlan.present,
      groups: tddGroups
    };
  }

  const requiredGroups = tddGroups.filter((group) => group.required === true);
  if (requiredGroups.length > 0 && !testPlan.present) {
    addWorkflowFinding(findings, {
      severity: 'WARN',
      code: 'tdd-test-plan-missing',
      message: 'Required TDD task groups must include a `## Test Plan` section.',
      patchTargets: ['tasks']
    });
  }

  const requiredSeverity = tddConfig.mode === 'strict' ? 'BLOCK' : 'WARN';
  const invalidExemptionClasses = tddGroups
    .filter((group) => group.exemptionClassInvalid === true)
    .map((group) => group.heading)
    .filter(Boolean);
  if (invalidExemptionClasses.length > 0) {
    addWorkflowFinding(findings, {
      severity: requiredSeverity,
      code: 'tdd-exemption-class-invalid',
      message: `TDD Exemption classes must be configured in rules.tdd.exempt: ${invalidExemptionClasses.join(', ')}.`,
      patchTargets: ['tasks']
    });
  }

  const classificationMissing = tddGroups
    .filter((group) => group.classSource === 'unclassified')
    .map((group) => group.heading)
    .filter(Boolean);
  if (classificationMissing.length > 0) {
    addWorkflowFinding(findings, {
      severity: requiredSeverity,
      code: 'tdd-classification-missing',
      message: `Task groups must declare TDD Class or TDD Exemption: ${classificationMissing.join(', ')}.`,
      patchTargets: ['tasks']
    });
  }

  const exemptionReasonMissing = tddGroups
    .filter((group) => group.exemptionReasonMissing === true)
    .map((group) => group.heading)
    .filter(Boolean);
  if (exemptionReasonMissing.length > 0) {
    addWorkflowFinding(findings, {
      severity: requiredSeverity,
      code: 'tdd-exemption-reason-missing',
      message: `Exempt TDD classes must include a visible non-empty TDD Exemption reason: ${exemptionReasonMissing.join(', ')}.`,
      patchTargets: ['tasks']
    });
  }

  const missingRedHeadings = requiredGroups
    .filter((group) => group.hasRedStep !== true)
    .map((group) => group.heading)
    .filter(Boolean);
  if (missingRedHeadings.length > 0) {
    addWorkflowFinding(findings, {
      severity: requiredSeverity,
      code: 'tdd-red-missing',
      message: `TDD required task groups are missing RED checklist steps: ${missingRedHeadings.join(', ')}.`,
      patchTargets: ['tasks']
    });
  }

  const missingVerifyHeadings = requiredGroups
    .filter((group) => group.hasVerifyStep !== true)
    .map((group) => group.heading)
    .filter(Boolean);
  if (missingVerifyHeadings.length > 0) {
    addWorkflowFinding(findings, {
      severity: requiredSeverity,
      code: 'tdd-verify-missing',
      message: `TDD required task groups are missing VERIFY checklist steps: ${missingVerifyHeadings.join(', ')}.`,
      patchTargets: ['tasks']
    });
  }

  const manualVerificationReasonMissing = testPlan.manualVerificationReasonMissing
    || tddGroups.some((group) => group.manualVerifyRationaleMissing === true);
  if (manualVerificationReasonMissing) {
    addWorkflowFinding(findings, {
      severity: 'WARN',
      code: 'tdd-manual-verify-rationale-missing',
      message: 'Manual-only verification must include a reason after `manual —`.',
      patchTargets: ['tasks']
    });
  }

  return {
    mode: tddConfig.mode,
    testPlanPresent: testPlan.present,
    groups: tddGroups
  };
}

module.exports = {
  resolveTddCheckpointConfig,
  classifyTaskGroupTdd,
  appendTddTaskCheckpointFindings
};
