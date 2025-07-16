const { execFileSync } = require("child_process");

describe("run-coverage network skip", () => {
  test("succeeds when SKIP_PW_DEPS set and network unreachable", () => {
    const env = {
      ...process.env,
      SKIP_PW_DEPS: "1",
      NETWORK_CHECK_URL: "http://127.0.0.1:9",
      SKIP_DB_CHECK: "1",
      HF_TOKEN: "test",
      AWS_ACCESS_KEY_ID: "id",
      AWS_SECRET_ACCESS_KEY: "secret",
      DB_URL: "postgres://user:pass@localhost/db",
      STRIPE_SECRET_KEY: "sk_test",
      CLOUDFRONT_MODEL_DOMAIN: "cdn.test",
    };
    delete env.npm_config_http_proxy;
    delete env.npm_config_https_proxy;
    execFileSync(
      "node",
      ["scripts/run-coverage.js", "backend/tests/awsCredentials.test.ts"],
      {
        env,
        encoding: "utf8",
      },
    );
  });
});
