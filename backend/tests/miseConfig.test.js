const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

describe('mise config', () => {
  test('idiomatic_version_file_enable_tools includes node', () => {
    const output = execSync('mise settings get idiomatic_version_file_enable_tools', { encoding: 'utf8' }).trim();
    expect(output).toContain('node');
  });

  test('.mise.toml sets idiomatic setting', () => {
    const configPath = path.join(__dirname, '..', '..', '.mise.toml');
    const config = fs.readFileSync(configPath, 'utf8');
    expect(config).toMatch(/idiomatic_version_file_enable_tools\s*=\s*\[\s*['\"]node['\"]\s*\]/);
  });
});
