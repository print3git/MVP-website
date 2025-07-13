const { execFileSync } = require("child_process");
const path = require("path");

describe("validate-env node path", () => {
  test("script succeeds when node not on PATH", () => {
    const env = {
      ...process.env,
      PATH: "/usr/bin:/bin",
      AWS_ACCESS_KEY_ID: "id",
      AWS_SECRET_ACCESS_KEY: "secret",
      DB_URL: "postgres://u:p@h/db",
      STRIPE_SECRET_KEY: "sk_test",
      SKIP_NET_CHECKS: "1",
      SKIP_PW_DEPS: "1",
    };
    execFileSync("bash", [path.join("scripts", "validate-env.sh")], {
      env,
      stdio: "inherit",
    });
  });
});
