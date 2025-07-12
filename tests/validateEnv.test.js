const { execFileSync } = require("child_process");

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
      SKIP_NET_CHECKS: "1",
      npm_config_http_proxy: "",
      npm_config_https_proxy: "",
      http_proxy: "",
      https_proxy: "",
    };
    const output = run(env);
    expect(output).toContain("✅ environment OK");
  });

  test("fails when proxy variables set", () => {
    const env = {
      ...process.env,
      HF_TOKEN: "test",
      STRIPE_TEST_KEY: "sk_test",
      SKIP_NET_CHECKS: "1",
      http_proxy: "http://proxy",
    };
    expect(() => run(env)).toThrow();
  });
});
