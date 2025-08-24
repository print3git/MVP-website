const fs = require('fs');
const path = require('path');
const workflowsDir = path.join(__dirname, '..', '..', '.github', 'workflows');
const files = fs.readdirSync(workflowsDir).filter(f => f.endsWith('.yml'));
const names = files.map(f => {
  const content = fs.readFileSync(path.join(workflowsDir, f), 'utf8');
  const match = content.match(/^name:\s*(.+)$/m);
  return match ? match[1].trim() : f;
});
console.log(names.sort().join('\n'));
