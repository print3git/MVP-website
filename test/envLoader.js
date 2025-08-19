const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

const REQUIRED_KEYS = [
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "DB_URL",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
];

function loadEnv(target = process.env) {
  const env = target;
  const envPath = path.resolve(__dirname, "..", ".env.test");
  if (fs.existsSync(envPath)) {
    const parsed = dotenv.parse(fs.readFileSync(envPath));
    for (const [k, v] of Object.entries(parsed)) {
      if (!env[k]) env[k] = v;
    }
  }

  const defaults = {
    AWS_ACCESS_KEY_ID: "test",
    AWS_SECRET_ACCESS_KEY: "test",
    DB_URL: "postgres://user:pass@localhost/db",
    STRIPE_SECRET_KEY: "sk_test_mock",
    STRIPE_WEBHOOK_SECRET: "whsec_mock",
    STRIPE_PUBLISHABLE_KEY: "pk_test_mock",
    STRIPE_TEST_KEY: "sk_test_mock",
    CLOUDFRONT_MODEL_DOMAIN: "cdn.test",
    SPARC3D_ENDPOINT: "http://sparc3d.test",
    SPARC3D_TOKEN: "token",
    HF_TOKEN: "hf_mock",
    SKIP_DB_CHECK: "1",
  };
  for (const [k, v] of Object.entries(defaults)) {
    if (!env[k]) env[k] = v;
  }

  if (env.NODE_ENV === "production") {
    const missing = REQUIRED_KEYS.filter((k) => !env[k]);
    if (missing.length) {
      throw new Error(`Missing required env vars: ${missing.join(", ")}`);
    }
  }
  return env;
}

module.exports = { loadEnv, REQUIRED_KEYS };

if (require.main === module) {
  loadEnv();
}
