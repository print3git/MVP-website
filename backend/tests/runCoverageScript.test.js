const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const repoRoot = path.join(__dirname, "..", "..");
const script = path.join(repoRoot, "scripts", "run-coverage.js");

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

describe("run-coverage script", () => {
  afterEach(() => {
    fs.rmSync(path.join(repoRoot, "coverage"), {
      recursive: true,
      force: true,
    });
    fs.rmSync(path.join(repoRoot, "backend", "coverage"), {
      recursive: true,
      force: true,
    });
  });

  test("works when invoked from backend directory", () => {
    const result = spawnSync(
      process.execPath,
      [script, "--runTestsByPath", "backend/tests/coverage/lcovParse.test.ts"],
      { cwd: path.join(repoRoot, "backend"), env, encoding: "utf8" },
    );
    expect(result.status).toBe(0);
    expect(fs.existsSync(path.join(repoRoot, "coverage", "lcov.info"))).toBe(
      true,
    );
    expect(
      fs.existsSync(path.join(repoRoot, "backend", "coverage", "lcov.info")),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(repoRoot, "backend", "coverage", "coverage-summary.json"),
      ),
    ).toBe(true);
  });
  test("prints error when showing help", () => {
    const result = spawnSync(process.execPath, [script, "--help"], {
      env,
      encoding: "utf8",
    });
    expect(result.status).toBe(1);
    expect(result.stderr + result.stdout).toMatch(/Failed to parse LCOV/);
  });
});
