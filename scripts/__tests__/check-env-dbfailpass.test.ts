import { spawnSync } from 'child_process';
import path from 'path';

const script = path.join(__dirname, '..', 'check-env.sh');

function run(env: NodeJS.ProcessEnv) {
  return spawnSync('bash', [script], { env, encoding: 'utf8' });
}

describe('check-env.sh required vars', () => {
  const baseEnv = {
    AWS_ACCESS_KEY_ID: 'id',
    AWS_SECRET_ACCESS_KEY: 'secret',
    STRIPE_SECRET_KEY: 'sk',
    CLOUDFRONT_MODEL_DOMAIN: 'cdn',
    SKIP_NET_CHECKS: '1',
  };

  test('fails when DB_URL missing', () => {
    const result = run({ ...process.env, ...baseEnv });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/DB_URL.*must be set/);
  });

  test('passes with dummy DB_URL', () => {
    const env = { ...process.env, ...baseEnv, DB_URL: 'postgres://u:p@h/db' };
    const result = run(env);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('✅ environment OK');
  });
});
