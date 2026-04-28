function stripInlineComment(value) {
  if (!value) return value;
  if (value.startsWith('"') || value.startsWith("'")) return value;
  const hashIndex = value.indexOf(' #');
  return hashIndex === -1 ? value : value.slice(0, hashIndex).trimEnd();
}

function parseScalar(raw) {
  const value = stripInlineComment(String(raw).trim());
  if (value === '') return '';
  if (value === '[]') return [];
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null') return null;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

function nextContentLine(lines, startIndex) {
  for (let index = startIndex; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line || /^\s*#/.test(line)) continue;
    const trimmed = line.trim();
    if (!trimmed) continue;
    return {
      indent: (line.match(/^\s*/) || [''])[0].length,
      trimmed
    };
  }
  return null;
}

function shouldParseChildAsArray(lines, startIndex, parentIndent) {
  const next = nextContentLine(lines, startIndex);
  return Boolean(next && next.indent > parentIndent && next.trimmed.startsWith('- '));
}

function parseYaml(text) {
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
  const root = {};
  const stack = [{ indent: -1, value: root }];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line || /^\s*#/.test(line)) continue;
    const indent = (line.match(/^\s*/) || [''])[0].length;
    const trimmed = line.trim();
    if (!trimmed) continue;

    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }

    const current = stack[stack.length - 1].value;
    if (Array.isArray(current) && trimmed.startsWith('- ')) {
      const rawItem = trimmed.slice(2).trim();
      current.push(parseScalar(rawItem));
      continue;
    }

    const match = trimmed.match(/^([^:]+):(.*)$/);
    if (!match) continue;
    const key = match[1].trim();
    const rawValue = match[2].trim();

    if (rawValue === '|') {
      const block = [];
      let next = index + 1;
      while (next < lines.length) {
        const nextLine = lines[next];
        const nextIndent = (nextLine.match(/^\s*/) || [''])[0].length;
        if (nextLine.trim() && nextIndent <= indent) break;
        const sliceAt = Math.min(nextIndent, indent + 2);
        block.push(nextLine.slice(sliceAt));
        next += 1;
      }
      current[key] = block.join('\n').replace(/\n+$/, '');
      index = next - 1;
      continue;
    }

    if (rawValue === '') {
      const child = shouldParseChildAsArray(lines, index + 1, indent) ? [] : {};
      current[key] = child;
      stack.push({ indent, value: child });
      continue;
    }

    current[key] = parseScalar(rawValue);
  }

  return root;
}

function stringifyScalar(value) {
  if (Array.isArray(value) && value.length === 0) return '[]';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  if (value === null || value === undefined) return '""';
  const stringValue = String(value);
  if (stringValue === '') return '""';
  if (/[:#\n]/.test(stringValue) || /^\s|\s$/.test(stringValue)) {
    return JSON.stringify(stringValue);
  }
  return JSON.stringify(stringValue);
}

function stringifyYaml(value, indent = 0) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
  const pad = ' '.repeat(indent);
  return Object.keys(value).map((key) => {
    const entry = value[key];
    if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
      const nested = stringifyYaml(entry, indent + 2);
      return `${pad}${key}:\n${nested}`;
    }
    if (Array.isArray(entry)) {
      if (entry.length === 0) return `${pad}${key}: []`;
      const lines = entry.map((item) => `${pad}  - ${stringifyScalar(item)}`);
      return [`${pad}${key}:`, ...lines].join('\n');
    }
    if (typeof entry === 'string' && entry.includes('\n')) {
      const block = entry.split('\n').map((line) => `${pad}  ${line}`).join('\n');
      return `${pad}${key}: |\n${block}`;
    }
    return `${pad}${key}: ${stringifyScalar(entry)}`;
  }).join('\n');
}

module.exports = {
  parseYaml,
  stringifyYaml
};
