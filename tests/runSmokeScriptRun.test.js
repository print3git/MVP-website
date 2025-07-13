const { execFileSync } = require("child_process");
const path = require("path");

test("run-smoke succeeds with SKIP_PW_DEPS=1", () => {
  const script = path.join("scripts", "run-smoke.js");
  const env = {
    ...process.env,
    HF_TOKEN: "test",
    AWS_ACCESS_KEY_ID: "id",
    AWS_SECRET_ACCESS_KEY: "secret",
    DB_URL: "postgres://user:pass@localhost/db",
    STRIPE_SECRET_KEY: "sk_test",
    SKIP_PW_DEPS: "1",
    SKIP_NET_CHECKS: "1",
  };
  delete env.npm_config_http_proxy;
  delete env.npm_config_https_proxy;
  expect(() =>
    execFileSync("node", [script], { stdio: "inherit", env }),
  ).not.toThrow();
});
