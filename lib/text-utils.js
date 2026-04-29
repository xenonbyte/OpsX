const { toTextBlock } = require('./string-utils');

const STOPWORD_VALUES = Object.freeze([
  'the', 'and', 'for', 'with', 'this', 'that', 'from', 'into', 'onto', 'when', 'where',
  'will', 'before', 'after', 'should', 'must', 'shall', 'have', 'has', 'had', 'was',
  'were', 'are', 'is', 'be', 'been', 'being', 'can', 'could', 'would', 'may', 'might',
  'not', 'only', 'also', 'more', 'most', 'least', 'over', 'under', 'about', 'than',
  'then', 'else', 'between', 'across', 'through', 'per', 'via', 'without', 'within',
  'using', 'used', 'use', 'need', 'needs', 'needed', 'ensure', 'ensures', 'ensured',
  'support', 'supports', 'supported', 'add', 'adds', 'added', 'update', 'updates',
  'updated', 'implement', 'implements', 'implemented', 'define', 'defines', 'defined',
  'create', 'creates', 'created', 'task', 'tasks', 'group', 'groups', 'item', 'items',
  'work', 'works', 'workflow', 'change', 'changes', 'during', 'all', 'any', 'each',
  'every', 'both', 'either', 'neither', 'todo', 'done', 'given', 'true', 'false',
  'system'
]);

const STOPWORDS = new Set(STOPWORD_VALUES);

function tokenizeText(text, options = {}) {
  const minLength = Number.isFinite(options.minLength) ? options.minLength : 3;
  return toTextBlock(text)
    .toLowerCase()
    .split(/[^a-z0-9\u4e00-\u9fff]+/g)
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => token.length >= minLength || /[\u4e00-\u9fff]/.test(token))
    .filter((token) => !STOPWORDS.has(token));
}

module.exports = {
  STOPWORDS,
  STOPWORD_VALUES,
  tokenizeText
};
