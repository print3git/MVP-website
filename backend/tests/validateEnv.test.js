const { execFileSync } = require('child_process');
const path = require('path');

test('validate-env generates dummy stripe key', () => {
  const script = path.join(__dirname, '..', '..', 'scripts', 'validate-env.sh');
  const output = execFileSync('bash', [script], {
    env: { HF_TOKEN: 'dummy', PATH: process.env.PATH },
  }).toString();
  expect(output).toContain('environment OK');
});

test('validate-env fails without HF token', () => {
  const script = path.join(__dirname, '..', '..', 'scripts', 'validate-env.sh');
  let code = 0;
  try {
    execFileSync('bash', [script], {
      env: { PATH: process.env.PATH },
      stdio: 'pipe',
    });
  } catch (err) {
    code = err.status;
  }
  expect(code).toBe(1);
});
