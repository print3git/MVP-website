const { execSync } = require("child_process");

describe("ci script network failure", () => {
  test("fails when npm registry unreachable", () => {
    const env = {
      ...process.env,
      NETWORK_CHECK_URL: "http://127.0.0.1:9",
      HF_TOKEN: "test",
      AWS_ACCESS_KEY_ID: "id",
      AWS_SECRET_ACCESS_KEY: "secret",
      DB_URL: "postgres://user:pass@localhost/db",
      STRIPE_SECRET_KEY: "sk_test",
      CLOUDFRONT_MODEL_DOMAIN: "cdn.test",
      SKIP_PW_DEPS: "1",
    };
    delete env.npm_config_http_proxy;
    delete env.npm_config_https_proxy;
    expect(() => {
      execSync("npm run ci", { stdio: "pipe", env });
    }).toThrow();
  });
});
