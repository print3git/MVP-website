const { execSync } = require("child_process");
const path = require("path");

describe("setup script tarball warning", () => {
  test("retries when npm ci reports corrupted tarball", () => {
    const env = {
      ...process.env,
      HF_TOKEN: "test",
      AWS_ACCESS_KEY_ID: "id",
      AWS_SECRET_ACCESS_KEY: "secret",
      DB_URL: "postgres://user:pass@localhost/db",
      STRIPE_SECRET_KEY: "sk_test",
      SKIP_NET_CHECKS: "1",
      SKIP_PW_DEPS: "1",
      REAL_NPM: execSync("command -v npm").toString().trim(),
      PATH: path.join(__dirname, "bin-tarball") + ":" + process.env.PATH,
    };
    execSync("bash scripts/setup.sh", { env, stdio: "inherit" });
  });
});
