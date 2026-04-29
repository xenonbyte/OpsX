const { unique } = require('./string-utils');
const { tokenizeText } = require('./text-utils');

function toList(value) {
  if (Array.isArray(value)) return value.filter((item) => typeof item === 'string');
  if (typeof value === 'string') return [value];
  return [];
}

function parseHeuristicHints(value) {
  return unique(String(value || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean));
}

function getTextBlock(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join('\n');
  return typeof value === 'string' ? value : '';
}

function getSourceBlock(sources = {}, key) {
  return getTextBlock(sources[key]).trim();
}

function countMatches(text, regex) {
  const matches = getTextBlock(text).match(regex);
  return matches ? matches.length : 0;
}

function hasKeyword(text, keyword) {
  return getTextBlock(text).toLowerCase().includes(String(keyword || '').toLowerCase());
}

function hasAnyKeyword(text, keywords = []) {
  const haystack = getTextBlock(text).toLowerCase();
  return keywords.some((keyword) => haystack.includes(String(keyword).toLowerCase()));
}

function hasSection(text, sectionName) {
  return new RegExp(`^##\\s+${sectionName.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`, 'mi').test(getTextBlock(text));
}

function toTokenSet(text, options = {}) {
  return new Set(tokenizeText(text, options));
}

function setIntersectionSize(left, right) {
  if (!left || !right || !left.size || !right.size) return 0;
  let count = 0;
  left.forEach((value) => {
    if (right.has(value)) count += 1;
  });
  return count;
}

function normalizeChecklistItem(item = '') {
  return getTextBlock(item)
    .replace(/^- \[[ xX]\]\s*/g, '')
    .replace(/^\d+(\.\d+)*\s*/g, '')
    .trim();
}

function extractChecklistItems(text) {
  return Array.from(getTextBlock(text).matchAll(/^- \[[ xX]\]\s+.+$/gm))
    .map((match) => match[0].trim());
}

function extractCompletedChecklistItems(text) {
  return Array.from(getTextBlock(text).matchAll(/^- \[[xX]\]\s+.+$/gm))
    .map((match) => match[0].trim());
}

function normalizeCompletedTddStep(value = '') {
  const match = String(value || '').trim().match(/^(RED|GREEN|REFACTOR|VERIFY)\b/i);
  return match ? match[1].toUpperCase() : '';
}

function extractCompletedTddSteps(completedItems = [], explicitSteps = []) {
  const extracted = completedItems
    .map((item) => normalizeChecklistItem(item))
    .map((item) => {
      const match = item.match(/^(RED|GREEN|REFACTOR|VERIFY)\s*:/i);
      return match ? match[1].toUpperCase() : '';
    })
    .filter(Boolean);

  const explicit = toList(explicitSteps)
    .map((step) => normalizeCompletedTddStep(step))
    .filter(Boolean);

  return unique([...extracted, ...explicit]);
}

module.exports = {
  toList,
  parseHeuristicHints,
  getTextBlock,
  getSourceBlock,
  countMatches,
  hasKeyword,
  hasAnyKeyword,
  hasSection,
  toTokenSet,
  setIntersectionSize,
  normalizeChecklistItem,
  extractChecklistItems,
  extractCompletedChecklistItems,
  extractCompletedTddSteps
};
