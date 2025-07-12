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
    };
    const output = run(env);
    expect(output).toContain("✅ environment OK");
  });

  test("fails when proxy variables set", () => {
    const env = {
      ...process.env,
      HF_TOKEN: "test",
      STRIPE_TEST_KEY: "sk_test",
      npm_config_http_proxy: "http://proxy",
    };
    expect(() => run(env)).toThrow();
  });
});
