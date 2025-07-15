const { execFileSync } = require("child_process");

test("run-jest runs JS backend unit test", () => {
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
  execFileSync(
    "node",
    ["scripts/run-jest.js", "backend/__tests__/items.test.js"],
    { stdio: "inherit", env },
  );
});
