const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

test('script exits with 1 when sleep_after not zero', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'curl-'));
  const fakeCurl = path.join(tmp, 'curl');
  fs.writeFileSync(fakeCurl, '#!/bin/sh\necho "{\\"sleep_after\\":60}"\n');
  fs.chmodSync(fakeCurl, 0o755);
  let code = 0;
  try {
    const script = path.join(__dirname, '..', '..', 'scripts', 'check_sleep_zero.sh');
    execFileSync('bash', [script], {
      env: { ...process.env, PATH: `${tmp}:${process.env.PATH}`, SLACK_WEBHOOK: '' },
      stdio: 'ignore',
    });
  } catch (err) {
    code = err.status;
  }
  expect(code).toBe(1);
});
