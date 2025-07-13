const { execSync } = require("child_process");
const path = require("path");

describe("setup script npm cache cleanup", () => {
  test("retries when rm fails to remove _cacache", () => {
    const env = {
      ...process.env,
      HF_TOKEN: "test",
      AWS_ACCESS_KEY_ID: "id",
      AWS_SECRET_ACCESS_KEY: "secret",
      DB_URL: "postgres://user:pass@localhost/db",
      STRIPE_SECRET_KEY: "sk_test",
      SKIP_NET_CHECKS: "1",
      SKIP_PW_DEPS: "1",
      REAL_RM: execSync("command -v rm").toString().trim(),
      PATH: path.join(__dirname, "bin-cacache") + ":" + process.env.PATH,
    };
    execSync("bash scripts/setup.sh", { env, stdio: "inherit" });
  });
});
