const { execSync } = require('child_process');
const path = require('path');

describe('check-lockfiles script', () => {
  test('runs without error', () => {
    const root = path.resolve(__dirname, '..', '..');
    expect(() => {
      execSync('node scripts/check-lockfiles.js', { cwd: root, stdio: 'inherit' });
    }).not.toThrow();
  });
});
