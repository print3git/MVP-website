const fs = require('fs');
const path = require('path');
const { test } = require('node:test');

const workflowsDir = path.join(__dirname, '..', '..', '.github', 'workflows');
const baseline = require('./workflow-baseline.json');
const runsOnPattern = /runs-on:\n\s+- \[self-hosted, linux, aws, small\]\n\s+- ubuntu-latest/g;

test('workflows use self-hosted with ubuntu fallback and retain env and cache', () => {
  const files = Object.keys(baseline);
  const errors = [];
  for (const file of files) {
    const content = fs.readFileSync(path.join(workflowsDir, file), 'utf8');
    const runOnMatches = content.match(runsOnPattern) || [];
    const runOnCount = (content.match(/runs-on:/g) || []).length;
    if (runOnMatches.length !== runOnCount) {
      errors.push(`${file}: some jobs missing self-hosted runner fallback`);
    }
    if (baseline[file].env && !/env:/i.test(content)) {
      errors.push(`${file}: missing env configuration`);
    }
    if (baseline[file].cache && !/cache/i.test(content)) {
      errors.push(`${file}: missing cache configuration`);
    }
  }
  if (errors.length) {
    throw new Error(errors.join('\n'));
  }
});
