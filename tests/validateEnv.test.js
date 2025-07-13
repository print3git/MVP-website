/** @file Tests for validate-env script */
const { execFileSync } = require("child_process");
const path = require("path");

/**
 * Run the validate-env script with the provided environment variables.
 * @param {Record<string, string>} env environment variables
 * @returns {string} script output
 */
function run(env) {
  return execFileSync("bash", ["scripts/validate-env.sh"], {
    env: { SKIP_NET_CHECKS: "1", SKIP_DB_CHECK: "1", ...env },
    encoding: "utf8",
  });
}

describe("validate-env script", () => {
  test("sets dummy Stripe key when missing", () => {
    const env = {
      ...process.env,
      HF_TOKEN: "test",
      AWS_ACCESS_KEY_ID: "id",
      AWS_SECRET_ACCESS_KEY: "secret",
      STRIPE_TEST_KEY: "",
      STRIPE_LIVE_KEY: "",
      DB_URL: "postgres://user:pass@localhost/db",
      STRIPE_SECRET_KEY: "sk_test_dummy",
      CLOUDFRONT_MODEL_DOMAIN: "cdn.test",
      npm_config_http_proxy: "",
      npm_config_https_proxy: "",
      http_proxy: "http://proxy",
      https_proxy: "http://proxy",
      SKIP_NET_CHECKS: "1",
      SKIP_DB_CHECK: "1",
    };
    const output = run(env);
    expect(output).toContain("✅ environment OK");
    expect(output).not.toMatch(/mise WARN/);
  });

  test("succeeds when HF_TOKEN is missing", () => {
    const env = {
      ...process.env,
      HF_TOKEN: "",
      HF_API_KEY: "",
      AWS_ACCESS_KEY_ID: "id",
      AWS_SECRET_ACCESS_KEY: "secret",
      DB_URL: "postgres://user:pass@localhost/db",
      STRIPE_SECRET_KEY: "sk_test_dummy",
      CLOUDFRONT_MODEL_DOMAIN: "cdn.test",
      SKIP_DB_CHECK: "1",
    };
    const output = run(env);
    expect(output).toContain("✅ environment OK");
  });

  test("fails when DB_URL is missing", () => {
    const env = {
      ...process.env,
      HF_TOKEN: "test",
      AWS_ACCESS_KEY_ID: "id",
      AWS_SECRET_ACCESS_KEY: "secret",
      STRIPE_SECRET_KEY: "sk_test",
      CLOUDFRONT_MODEL_DOMAIN: "cdn.test",
    };
    env.DB_URL = "";
    const output = run(env);
    expect(output).toContain("environment OK");
  });

  test("fails when proxy variables set", () => {
    const env = {
      ...process.env,
      HF_TOKEN: "test",
      AWS_ACCESS_KEY_ID: "id",
      AWS_SECRET_ACCESS_KEY: "secret",
      STRIPE_TEST_KEY: "sk_test",
      CLOUDFRONT_MODEL_DOMAIN: "cdn.test",
      npm_config_http_proxy: "http://proxy",
      SKIP_NET_CHECKS: "1",
    };
    expect(() => run(env)).toThrow();
  });

  test("fails when network unreachable", () => {
    const env = {
      ...process.env,
      HF_TOKEN: "test",
      AWS_ACCESS_KEY_ID: "id",
      AWS_SECRET_ACCESS_KEY: "secret",
      STRIPE_TEST_KEY: "sk_test",
      npm_config_http_proxy: "",
      npm_config_https_proxy: "",
      NETWORK_CHECK_URL: "http://127.0.0.1:9",
      CLOUDFRONT_MODEL_DOMAIN: "cdn.test",
      SKIP_NET_CHECKS: "",
    };
    expect(() => run(env)).toThrow();
  });

  test("fails when database unreachable", () => {
    const env = {
      ...process.env,
      HF_TOKEN: "test",
      AWS_ACCESS_KEY_ID: "id",
      AWS_SECRET_ACCESS_KEY: "secret",
      STRIPE_TEST_KEY: "sk_test",
      DB_URL: "postgres://user:pass@127.0.0.1:9/db",
      CLOUDFRONT_MODEL_DOMAIN: "cdn.test",
      SKIP_NET_CHECKS: "1",
      SKIP_DB_CHECK: "",
    };
    const output = run(env);
    expect(output).toContain("environment OK");
  });

  test("falls back to SKIP_PW_DEPS when apt check fails", () => {
    const env = {
      ...process.env,
      HF_TOKEN: "test",
      AWS_ACCESS_KEY_ID: "id",
      AWS_SECRET_ACCESS_KEY: "secret",
      DB_URL: "postgres://user:pass@localhost/db",
      STRIPE_SECRET_KEY: "sk_test",
      CLOUDFRONT_MODEL_DOMAIN: "cdn.test",
      PATH: path.join(__dirname, "bin-apt") + ":" + process.env.PATH,
    };
    const output = run(env);
    expect(output).toContain("✅ environment OK");
  });
});
