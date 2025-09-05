const { execSync } = require('child_process');

test('ensure-deps skips Playwright setup when offline', () => {
  const out = execSync('SKIP_NET_CHECKS=1 node backend/scripts/ensure-deps.js', { encoding: 'utf8' });
  expect(out).toMatch(/Skipping network check due to SKIP_NET_CHECKS/);
});

