const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const cliPath = path.join(process.cwd(), 'bin', 'cli.js');

(hasCli => {
  const testFn = hasCli ? test : test.skip;
  testFn('CLI --help exits with code 0', () => {
    const result = spawnSync('node', [cliPath, '--help'], { stdio: 'pipe' });
    expect(result.status).toBe(0);
  });
})(fs.existsSync(cliPath));
