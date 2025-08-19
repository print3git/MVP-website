const placeholders = [
  'your_',
  'example',
  'dummy',
  '<',
  '>',
  'sk_test_...',
  'whsec_...',
  'postgres://user:password@localhost:5432/your_database'
];

const required = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'CLOUDFLARE_API_TOKEN',
  'CLOUDFLARE_ZONE_ID',
  'CLOUDFLARE_ACCOUNT_ID',
  'DB_URL'
];

describe('diagnostic env vars', () => {
  for (const name of required) {
    test(`${name} present and not placeholder`, () => {
      const val = process.env[name];
      if (!val) {
        throw new Error(`${name} missing`);
      }
      if (placeholders.some((p) => val.includes(p))) {
        throw new Error(`${name} appears to be a placeholder`);
      }
    });
  }
});
