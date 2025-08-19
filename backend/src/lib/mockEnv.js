/**
 * Mock secret values used during local development and testing.
 * These defaults prevent tests from failing when environment variables are
 * missing.
 * @type {Record<string, string>}
 */
const mockSecrets = {
  STRIPE_SECRET_KEY: "sk_test_mock",
  STRIPE_WEBHOOK_SECRET: "whsec_mock",
  AWS_ACCESS_KEY_ID: "AKIA_MOCK",
  AWS_SECRET_ACCESS_KEY: "aws_secret_mock",
  CF_PAGES_API_TOKEN: "cf_mock",
  CLOUDFRONT_MODEL_DOMAIN: "cdn.test",
  DB_URL: "postgres://localhost/test",
};

/**
 * Apply default mock values to an environment object when keys are missing.
 *
 * @param {NodeJS.ProcessEnv} [env=process.env] - Environment object to mutate.
 * @returns {NodeJS.ProcessEnv} The updated environment.
 */
function applyMockEnv(env = process.env) {
  for (const [key, value] of Object.entries(mockSecrets)) {
    if (!env[key]) {
      env[key] = value;
    }
  }
  return env;
}

module.exports = { applyMockEnv, mockSecrets };
