const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const repoRoot = path.join(__dirname, "..");

const env = {
  ...process.env,
  HF_TOKEN: "x",
  AWS_ACCESS_KEY_ID: "id",
  AWS_SECRET_ACCESS_KEY: "secret",
  DB_URL: "db",
  STRIPE_SECRET_KEY: "sk",
  SKIP_NET_CHECKS: "1",
  SKIP_PW_DEPS: "1",
};

afterEach(() => {
  fs.rmSync(path.join(repoRoot, "coverage"), { recursive: true, force: true });
  fs.rmSync(path.join(repoRoot, "backend", "coverage"), {
    recursive: true,
    force: true,
  });
});

test("npm run coverage reports LCOV parse error", () => {
  try {
    execFileSync(
      "npm",
      [
        "run",
        "coverage",
        "--prefix",
        "backend",
        "--",
        "backend/tests/failingCoverage.fail.js",
      ],
      { cwd: repoRoot, env, encoding: "utf8" },
    );
    throw new Error("coverage unexpectedly succeeded");
  } catch (err) {
    const output = (err.stdout || "") + (err.stderr || "");
    expect(err.status).not.toBe(0);
    expect(output).toMatch(/Failed to parse LCOV/);
  }
});
