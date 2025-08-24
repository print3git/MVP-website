const { spawnSync } = require('child_process');

test('npm ls has no missing dependencies', () => {
  const res = spawnSync('npm', ['ls'], { encoding: 'utf8' });
  expect(res.status).toBe(0);
  expect(res.stdout).not.toMatch(/missing/i);
});
