const { spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const stub = path.join(repoRoot, "backend", "tests", "stubExecSync.js");

function runLint(cwd, extraEnv = {}) {
  return spawnSync("npm", ["run", "lint"], {
    cwd,
    env: { ...process.env, ...extraEnv },
    encoding: "utf8",
  });
}

describe("diagnostics", () => {
  test("stubExecSync logs command without env leakage", () => {
    const logFile = path.join(os.tmpdir(), `log-${Date.now()}`);
    const res = spawnSync(
      process.execPath,
      ["-e", "require('child_process').execSync('echo hi')"],
      {
        env: {
          ...process.env,
          NODE_OPTIONS: `--require ${stub}`,
          EXEC_LOG_FILE: logFile,
          SECRET_VAR: "should_not_appear",
          PATH: "/usr/bin",
        },
        encoding: "utf8",
      },
    );
    expect(res.status).toBe(0);
    const log = fs.readFileSync(logFile, "utf8");
    expect(log).toContain("echo hi");
    expect(log).not.toContain("should_not_appear");
    fs.unlinkSync(logFile);
  });

  test("stubExecSync rejects unsafe log path", () => {
    const res = spawnSync(process.execPath, ["-e", "console.log('test')"], {
      env: {
        ...process.env,
        NODE_OPTIONS: `--require ${stub}`,
        EXEC_LOG_FILE: "./bad;rm -rf.log",
        PATH: "/usr/bin",
      },
      encoding: "utf8",
    });
    expect(res.status).not.toBe(0);
  });

  test("root lint exits 0", () => {
    const res = runLint(repoRoot);
    expect(res.status).toBe(0);
  });

  test("backend lint exits 0", () => {
    const res = runLint(path.join(repoRoot, "backend"));
    expect(res.status).toBe(0);
  });

  test("root CI lint writes log file", () => {
    const log = path.join(repoRoot, "lint.log");
    fs.rmSync(log, { force: true });
    const res = runLint(repoRoot, { CI: "true" });
    expect(res.status).toBe(0);
    expect(fs.existsSync(log)).toBe(true);
    fs.rmSync(log, { force: true });
  });

  test("backend CI lint writes log file", () => {
    const backendDir = path.join(repoRoot, "backend");
    const log = path.join(backendDir, "lint.log");
    fs.rmSync(log, { force: true });
    const res = runLint(backendDir, { CI: "true" });
    expect(res.status).toBe(0);
    expect(fs.existsSync(log)).toBe(true);
    fs.rmSync(log, { force: true });
  });

  test("coverage succeeds and writes lcov", () => {
    const res = spawnSync("npm", ["run", "coverage", "--prefix", "backend"], {
      env: { ...process.env, SKIP_PW_DEPS: "1" },
      encoding: "utf8",
    });
    expect(res.status).toBe(0);
    const lcov = path.join(repoRoot, "coverage", "lcov.info");
    expect(fs.existsSync(lcov)).toBe(true);
  });

  test("coverage fails fast when deps missing", () => {
    const res = spawnSync("npm", ["run", "coverage", "--prefix", "backend"], {
      env: {
        ...process.env,
        SKIP_PW_DEPS: "1",
        FAKE_NODE_MODULES_MISSING: "1",
      },
      encoding: "utf8",
    });
    expect(res.status).not.toBe(0);
  });
});
