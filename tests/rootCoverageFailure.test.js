const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const repoRoot = path.join(__dirname, "..");

function clean() {
  fs.rmSync(path.join(repoRoot, "coverage"), { recursive: true, force: true });
  fs.rmSync(path.join(repoRoot, "backend", "coverage"), {
    recursive: true,
    force: true,
  });
}

describe("npm run coverage", () => {
  afterEach(() => {
    clean();
  });

  test("reports missing coverage summary", () => {
    const stub = path.resolve(__dirname, "stubMissingSummary.js");
    const env = {
      ...process.env,
      HF_TOKEN: "x",
      AWS_ACCESS_KEY_ID: "id",
      AWS_SECRET_ACCESS_KEY: "secret",
      DB_URL: "db",
      STRIPE_SECRET_KEY: "sk",
      SKIP_NET_CHECKS: "1",
      SKIP_PW_DEPS: "1",
      NODE_OPTIONS: `--require ${stub}`,
    };
    let output = "";
    let status = 0;
    try {
      execFileSync("npm", ["run", "coverage", "--prefix", "backend"], {
        cwd: repoRoot,
        env,
        encoding: "utf8",
        stdio: "pipe",
      });
      throw new Error("coverage unexpectedly succeeded");
    } catch (err) {
      status = err.status;
      output = (err.stdout || "") + (err.stderr || "");
    }
    expect(status).not.toBe(0);
    expect(output).toMatch(/Missing coverage summary/);
  });
});
