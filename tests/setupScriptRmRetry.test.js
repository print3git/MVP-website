const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

describe("setup script rm retry", () => {
  test("retries when rimraf and rm fail twice", () => {
    const flag = path.join(__dirname, "..", ".setup-complete");
    if (fs.existsSync(flag)) fs.unlinkSync(flag);
    fs.mkdirSync(path.join(__dirname, "..", "node_modules"), {
      recursive: true,
    });
    fs.mkdirSync(path.join(__dirname, "..", "backend", "node_modules"), {
      recursive: true,
    });
    const env = {
      ...process.env,
      HF_TOKEN: "test",
      AWS_ACCESS_KEY_ID: "id",
      AWS_SECRET_ACCESS_KEY: "secret",
      DB_URL: "postgres://user:pass@localhost/db",
      STRIPE_SECRET_KEY: "sk_test",
      SKIP_NET_CHECKS: "1",
      SKIP_PW_DEPS: "1",
      REAL_NPX: execSync("command -v npx").toString().trim(),
      PATH: path.join(__dirname, "bin-rm-twice") + ":" + process.env.PATH,
    };
    execSync("bash scripts/setup.sh", { env, stdio: "inherit" });
    expect(fs.existsSync(flag)).toBe(true);
    expect(fs.existsSync(path.join(__dirname, "..", "node_modules"))).toBe(
      false,
    );
    expect(
      fs.existsSync(path.join(__dirname, "..", "backend", "node_modules")),
    ).toBe(false);
  });
});
