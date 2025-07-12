const { execSync } = require("child_process");
const path = require("path");

const script = path.join(__dirname, "..", "..", "scripts", "validate-env.sh");

describe("validate-env script", () => {
  test("passes with STRIPE_TEST_KEY set", () => {
    expect(() =>
      execSync(`bash ${script}`, {
        env: {
          ...process.env,
          STRIPE_TEST_KEY: "sk_test",
          HF_TOKEN: "t",
          SKIP_NET_CHECKS: "1",
          http_proxy: "",
          https_proxy: "",
          npm_config_http_proxy: "",
          npm_config_https_proxy: "",
        },
        stdio: "pipe",
      }),
    ).not.toThrow();
  });

  test("passes with STRIPE_LIVE_KEY set", () => {
    expect(() =>
      execSync(`bash ${script}`, {
        env: {
          ...process.env,
          STRIPE_LIVE_KEY: "sk_live",
          STRIPE_TEST_KEY: "",
          HF_TOKEN: "t",
          SKIP_NET_CHECKS: "1",
          http_proxy: "",
          https_proxy: "",
          npm_config_http_proxy: "",
          npm_config_https_proxy: "",
        },
        stdio: "pipe",
      }),
    ).not.toThrow();
  });

  test("fails without stripe keys", () => {
    expect(() =>
      execSync(`bash ${script}`, {
        env: {
          ...process.env,
          STRIPE_TEST_KEY: "",
          STRIPE_LIVE_KEY: "",
          HF_TOKEN: "t",
        },
        stdio: "pipe",
      }),
    ).toThrow();
  });

  test("fails when npm proxy vars are set", () => {
    expect(() =>
      execSync(`bash ${script}`, {
        env: {
          ...process.env,
          STRIPE_TEST_KEY: "sk_test",
          HF_TOKEN: "t",
          SKIP_NET_CHECKS: "1",
          npm_config_http_proxy: "http://proxy",
        },
        stdio: "pipe",
      }),
    ).toThrow();
  });
});
