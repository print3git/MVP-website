const { execSync } = require('child_process');

test('ensure-deps skips Playwright setup when offline', () => {
  const out = execSync('SKIP_NET_CHECKS=1 node backend/scripts/ensure-deps.js', { encoding: 'utf8' });
  expect(out).toMatch(/SKIP_NET_CHECKS detected; forcing SKIP_PW_DEPS/);
});

