const fs = require('fs');
const path = require('path');

function listSpecFiles(specsDir) {
  if (!fs.existsSync(specsDir) || !fs.statSync(specsDir).isDirectory()) return [];
  const files = [];
  const stack = [specsDir];

  while (stack.length > 0) {
    const currentDir = stack.pop();
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    entries.forEach((entry) => {
      const absolutePath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        stack.push(absolutePath);
        return;
      }
      if (entry.isFile() && entry.name === 'spec.md') {
        files.push(absolutePath);
      }
    });
  }

  return files.sort((left, right) => left.localeCompare(right));
}

module.exports = {
  listSpecFiles
};
