const { execSync } = require("child_process");
const path = require("path");

describe("setup script tar error", () => {
  test("retries when npm ci reports TAR_ENTRY_ERROR", () => {
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
      PATH: path.join(__dirname, "bin-tar") + ":" + process.env.PATH,
    };
    try {
      execSync("bash scripts/setup.sh", { env, stdio: "inherit" });
    } finally {
      const restoreEnv = {
        ...process.env,
        SKIP_NET_CHECKS: "1",
        SKIP_PW_DEPS: "1",
      };
      execSync("npm ci --no-audit --no-fund", {
        stdio: "inherit",
        env: restoreEnv,
      });
      execSync("npm ci --prefix backend --no-audit --no-fund", {
        stdio: "inherit",
        env: restoreEnv,
      });
      execSync("npm ci --prefix backend/dalle_server --no-audit --no-fund", {
        stdio: "inherit",
        env: restoreEnv,
      });
    }
  });
});
