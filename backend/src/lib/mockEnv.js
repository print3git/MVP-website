const mockSecrets = {
  STRIPE_SECRET_KEY: "sk_test_mock",
  STRIPE_WEBHOOK_SECRET: "whsec_mock",
  AWS_ACCESS_KEY_ID: "AKIA_MOCK",
  AWS_SECRET_ACCESS_KEY: "aws_secret_mock",
  CF_PAGES_API_TOKEN: "cf_mock",
  CLOUDFRONT_MODEL_DOMAIN: "cdn.test",
  DB_URL: "postgres://localhost/test",
};

function applyMockEnv(env = process.env) {
  for (const [key, value] of Object.entries(mockSecrets)) {
    if (!env[key]) {
      env[key] = value;
    }
  }
  return env;
}

module.exports = { applyMockEnv, mockSecrets };
