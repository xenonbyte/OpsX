function toText(value) {
  return typeof value === 'string' ? value : '';
}

function toTextBlock(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join('\n');
  return toText(value);
}

function toNonEmptyString(value) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function normalizeStringArray(value) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => toNonEmptyString(String(entry || '')))
      .filter(Boolean);
  }
  const single = toNonEmptyString(String(value || ''));
  return single ? [single] : [];
}

function unique(values = []) {
  const source = Array.isArray(values) ? values : [];
  return Array.from(new Set(source.filter(Boolean)));
}

function uniqueSorted(values = []) {
  return unique(values).sort((left, right) => left.localeCompare(right));
}

function normalizeHeadingKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^##\s+/, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = {
  toText,
  toTextBlock,
  toNonEmptyString,
  normalizeStringArray,
  unique,
  uniqueSorted,
  normalizeHeadingKey
};
