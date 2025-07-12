/** @file Tests for validate-env script */
const { execFileSync } = require("child_process");

/**
 * Run the validate-env script with the provided environment variables.
 * @param {Record<string, string>} env environment variables
 * @returns {string} script output
 */
function run(env) {
  return execFileSync("bash", ["scripts/validate-env.sh"], {
    env,
    encoding: "utf8",
  });
}

describe("validate-env script", () => {
  test("sets dummy Stripe key when missing", () => {
    const env = {
      ...process.env,
      HF_TOKEN: "test",
      STRIPE_TEST_KEY: "",
      STRIPE_LIVE_KEY: "",
      npm_config_http_proxy: "",
      npm_config_https_proxy: "",
      http_proxy: "http://proxy",
      https_proxy: "http://proxy",
      SKIP_NET_CHECKS: "1",
    };
    const output = run(env);
    expect(output).toContain("✅ environment OK");
    expect(output).not.toMatch(/mise WARN/);
  });

  test("fails when proxy variables set", () => {
    const env = {
      ...process.env,
      HF_TOKEN: "test",
      STRIPE_TEST_KEY: "sk_test",
      npm_config_http_proxy: "http://proxy",
      SKIP_NET_CHECKS: "1",
    };
    expect(() => run(env)).toThrow();
  });

  test("fails when HF_TOKEN is missing", () => {
    const env = {
      ...process.env,
      STRIPE_TEST_KEY: "sk_test",
      npm_config_http_proxy: "",
      npm_config_https_proxy: "",
      AWS_ACCESS_KEY_ID: "id",
      AWS_SECRET_ACCESS_KEY: "secret",
      SKIP_NET_CHECKS: "1",
    };
    delete env.HF_TOKEN;
    expect(() => run(env)).toThrow(/HF_TOKEN must be set/);
  });

  test("fails when AWS credentials are missing", () => {
    const env = {
      ...process.env,
      HF_TOKEN: "test",
      STRIPE_TEST_KEY: "sk_test",
      npm_config_http_proxy: "",
      npm_config_https_proxy: "",
      SKIP_NET_CHECKS: "1",
    };
    delete env.AWS_ACCESS_KEY_ID;
    delete env.AWS_SECRET_ACCESS_KEY;
    expect(() => run(env)).toThrow(/AWS_ACCESS_KEY_ID must be set/);
  });
});
