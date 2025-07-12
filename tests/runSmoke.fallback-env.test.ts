const { spawnSync } = require('child_process');
const path = require('path');

test('run-smoke uses fallback env vars', () => {
  const script = path.join('scripts', 'run-smoke.js');
  const res = spawnSync('node', [script], {
    env: {
      ...process.env,
      STRIPE_TEST_KEY: 'dummy',
      AWS_ACCESS_KEY_ID: 'id',
      AWS_SECRET_ACCESS_KEY: 'secret',
      STRIPE_SECRET_KEY: 'sk_test',
    },
    encoding: 'utf8',
  });
  expect(res.status).toBe(0);
});
