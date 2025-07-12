const fs = require('fs');
const path = require('path');

describe('mise.toml', () => {
  test('enables idiomatic version files for node', () => {
    const misePath = path.resolve(__dirname, '../../.mise.toml');
    const content = fs.readFileSync(misePath, 'utf8');
    expect(content).toMatch(/idiomatic_version_file_enable_tools\s*=\s*\[\s*"node"\s*\]/);
  });
});
