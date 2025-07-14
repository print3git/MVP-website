const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

describe("setup script SIGINT handling", () => {
  test("reports interruption when npm ci is terminated", () => {
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
      PATH: path.join(__dirname, "bin-sigint") + ":" + process.env.PATH,
    };
    let output = "";
    try {
      execSync("bash scripts/setup.sh", { env, stdio: "pipe" });
    } catch (err) {
      output = String(err.stdout || "") + String(err.stderr || "");
    }
    expect(output).toMatch(/Setup interrupted by SIGINT/);
    expect(fs.existsSync(path.join(__dirname, "..", ".setup-complete"))).toBe(false);
  });
});
