import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function loadEnvFile(file: string) {
  const content = fs.readFileSync(file, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const [key, value] = line.split('=', 2);
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

describe('env merge precedence', () => {
  const envPath = path.join(process.cwd(), '.env');
  const configPath = require.resolve('../../backend/config');

  afterEach(() => {
    if (fs.existsSync(envPath)) fs.unlinkSync(envPath);
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.DB_URL;
    delete require.cache[configPath];
  });

  it('preserves shell variables over .env', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_live_dummy';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_real_dummy';
    process.env.DB_URL = 'postgres://user:pass@localhost/db';
    fs.writeFileSync(envPath, 'STRIPE_SECRET_KEY=\nSTRIPE_WEBHOOK_SECRET=\n');

    loadEnvFile(envPath);
    expect(process.env.STRIPE_SECRET_KEY).toBe('sk_live_dummy');
    expect(process.env.STRIPE_WEBHOOK_SECRET).toBe('whsec_real_dummy');
    expect(() => require(configPath)).not.toThrow();
  });

  it('fails on placeholder values when env vars missing', () => {
    fs.writeFileSync(
      envPath,
      'DB_URL=postgres://user:pass@localhost/db\nSTRIPE_SECRET_KEY=dummy_sk_test\nSTRIPE_WEBHOOK_SECRET=whsec\n',
    );

    loadEnvFile(envPath);
    const result = spawnSync('node', ['-e', `require(${JSON.stringify(configPath)})`], {
      env: { ...process.env },
      encoding: 'utf8',
    });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/live (secret key|webhook secret)/);
  });
});
