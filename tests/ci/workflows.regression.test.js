const fs = require('fs');
const path = require('path');

describe('CI configuration', () => {
  test('workflow files exist', () => {
    const wfDir = path.join(__dirname, '../../.github/workflows');
    const files = fs.readdirSync(wfDir).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));
    expect(files.length).toBeGreaterThan(0);
  }, 1000);

  test('env example contains DB vars', () => {
    const env = fs.readFileSync(path.join(__dirname, '../../.env.example'), 'utf8');
    expect(env).toMatch(/DB_URL/);
  }, 1000);
});
