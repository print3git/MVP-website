const { loadEnv } = require('../test/envLoader');

describe('env loader preflight', () => {
  test('throws in production when secrets missing', () => {
    expect(() => loadEnv({ NODE_ENV: 'production' })).toThrow(/Missing required env vars/);
  });

  test('injects mocks in test mode', () => {
    const env = loadEnv({});
    expect(env.STRIPE_SECRET_KEY).toBe('sk_test_mock');
  });
});
