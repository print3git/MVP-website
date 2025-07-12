const { execSync } = require('child_process');

describe('mise config', () => {
  test('idiomatic_version_file_enable_tools includes node', () => {
    const output = execSync('mise settings get idiomatic_version_file_enable_tools', { encoding: 'utf8' }).trim();
    expect(output).toContain('node');
  });
});
