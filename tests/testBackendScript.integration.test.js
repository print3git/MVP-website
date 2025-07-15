const { execFileSync } = require("child_process");
const path = require("path");

test("test-backend script runs a backend unit test", () => {
  const script = path.join("scripts", "test-backend.sh");
  const env = {
    ...process.env,
    HF_TOKEN: "x",
    AWS_ACCESS_KEY_ID: "id",
    AWS_SECRET_ACCESS_KEY: "secret",
    DB_URL: "postgres://user:pass@localhost/db",
    STRIPE_SECRET_KEY: "sk_test",
    SKIP_NET_CHECKS: "1",
    SKIP_PW_DEPS: "1",
    SKIP_DB_CHECK: "1",
  };
  delete env.npm_config_http_proxy;
  delete env.npm_config_https_proxy;
  execFileSync("bash", [script, "backend/tests/envValidation.test.js"], {
    stdio: "inherit",
    env,
  });
});
