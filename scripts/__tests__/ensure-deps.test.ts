const { execSync } = require('child_process');

test('ensure-deps runs cleanly', () => {
  const out = execSync('node scripts/ensure-deps.mjs', { encoding: 'utf8' });
  expect(out).toMatch(/✅ environment OK/);
});
