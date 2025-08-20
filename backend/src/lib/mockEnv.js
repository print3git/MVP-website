const mockSecrets = {
  STRIPE_SECRET_KEY: "sk_test_mock",
  STRIPE_WEBHOOK_SECRET: "whsec_mock",
  AWS_ACCESS_KEY_ID: "mock",
  AWS_SECRET_ACCESS_KEY: "mock",
  AWS_REGION: "us-east-1",
  S3_BUCKET: "mock-bucket",
  CF_PAGES_API_TOKEN: "cf_mock",
  CLOUDFRONT_MODEL_DOMAIN: "cdn.test",
  DB_URL: "postgres://user:pass@localhost:5432/testdb",
};

/**
 * Apply default mock values to an environment object when keys are missing.
 *
 * @param {NodeJS.ProcessEnv} [env=process.env] - Environment object to mutate.
 * @returns {NodeJS.ProcessEnv} The updated environment.
 */
function applyMockEnv(env = process.env) {
  if (process.env.NODE_ENV === "production" && !process.env.CI) {
    return env;
  }
  for (const [key, value] of Object.entries(mockSecrets)) {
    if (!env[key]) {
      env[key] = value;
    }
  }
  return env;
}

module.exports = { applyMockEnv, mockSecrets };
