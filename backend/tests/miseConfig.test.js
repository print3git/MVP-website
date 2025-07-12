const { execSync } = require('child_process');

describe('mise config', () => {
  test('idiomatic_version_file_enable_tools includes node', () => {
    const output = execSync('mise settings get idiomatic_version_file_enable_tools', { encoding: 'utf8' }).trim();
    expect(output).toContain('node');
  });

  test('mise config file is trusted', () => {
    execSync('mise trust --yes', { stdio: 'ignore' });
    const status = execSync('mise trust --show', { encoding: 'utf8' }).trim();
    expect(status).toMatch(/: trusted$/);
  });
});
