const { execSync } = require('child_process');
const path = require('path');

function check(dir) {
  execSync('npm ci --dry-run --ignore-scripts', {
    cwd: dir,
    stdio: 'inherit',
  });
}

describe('lockfile sync', () => {
  test('root lock file is synced', () => {
    expect(() => check(path.join(__dirname, '..', '..'))).not.toThrow();
  });

  test('backend lock file is synced', () => {
    expect(() => check(path.join(__dirname, '..'))).not.toThrow();
  });

  test('dalle_server lock file is synced', () => {
    expect(() => check(path.join(__dirname, '..', 'dalle_server'))).not.toThrow();
  });
});
