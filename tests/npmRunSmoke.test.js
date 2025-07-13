const { execFileSync } = require("child_process");

/** Ensure npm run smoke completes without errors when skip flags are set */
test("npm run smoke works with skip flags", () => {
  const env = {
    ...process.env,
    HF_TOKEN: "test",
    AWS_ACCESS_KEY_ID: "id",
    AWS_SECRET_ACCESS_KEY: "secret",
    DB_URL: "postgres://user:pass@localhost/db",
    STRIPE_SECRET_KEY: "sk_test",
    SKIP_PW_DEPS: "1",
    SKIP_ROOT_DEPS_CHECK: "1",
    SKIP_NET_CHECKS: "1",
  };
  delete env.npm_config_http_proxy;
  delete env.npm_config_https_proxy;
  delete env.JEST_WORKER_ID;
  execFileSync("npm", ["run", "smoke"], { stdio: "inherit", env });
});
