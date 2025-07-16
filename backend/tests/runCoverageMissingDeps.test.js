const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const repoRoot = path.join(__dirname, "..", "..");
const script = path.join(repoRoot, "scripts", "run-coverage.js");
const stub = path.join(__dirname, "stubExecSync.js");

function runCoverage(extraEnv = {}) {
  const env = {
    ...process.env,
    NODE_OPTIONS: `--require ${stub}`,
    HF_TOKEN: "x",
    AWS_ACCESS_KEY_ID: "id",
    AWS_SECRET_ACCESS_KEY: "secret",
    DB_URL: "db",
    STRIPE_SECRET_KEY: "sk",
    SKIP_NET_CHECKS: "1",
    SKIP_PW_DEPS: "1",
    ...extraEnv,
  };
  return spawnSync(
    process.execPath,
    [script, "--runTestsByPath", "backend/tests/coverage/lcovParse.test.ts"],
    { env, encoding: "utf8" },
  );
}

describe("run-coverage missing deps", () => {
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

  test("installs dependencies when node_modules are missing", () => {
    const logFile = path.join(os.tmpdir(), `covlog-${Date.now()}`);
    const result = runCoverage({
      EXEC_LOG_FILE: logFile,
      FAKE_NODE_MODULES_MISSING: "1",
    });
    try {
      expect(result.status).toBe(0);
      const logs = fs.readFileSync(logFile, "utf8");
      expect(logs).toMatch(/ensure-deps\.js/);
    } finally {
      fs.unlinkSync(logFile);
    }
  });
});
