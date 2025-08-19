
const crypto = require("crypto");
const mockId = crypto.randomBytes(3).toString("hex");

const mockSecrets = {
  STRIPE_SECRET_KEY: `sk_test_${mockId}_mock`,
  STRIPE_WEBHOOK_SECRET: `whsec_${mockId}_mock`,
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
