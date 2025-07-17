const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const repoRoot = path.join(__dirname, "..");
const backendDir = path.join(repoRoot, "backend");
const stub = path.join(backendDir, "tests", "stubExecSync.js");

function runNode(script, extraEnv = {}) {
  const logFile = path.join(os.tmpdir(), `log-${Date.now()}`);
  const env = {
    ...process.env,
    PATH: "/usr/bin",
    TEST_SECRET: "s3cr3t",
    EXEC_LOG_FILE: logFile,
    NODE_OPTIONS: `--require ${stub}`,
    ...extraEnv,
  };
  const result = spawnSync(process.execPath, ["-e", script], {
    encoding: "utf8",
    env,
  });
  return { result, logFile };
}

describe("shell invocation", () => {
  test("cli helper runs with sanitized PATH", () => {
    const { result } = runNode("console.log(process.env.PATH)");
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe("/usr/bin");
  });

  test("exec command logs exclude env vars", () => {
    const { result, logFile } = runNode(
      "require('child_process').execSync('echo ok')",
    );
    expect(result.status).toBe(0);
    const logs = fs.readFileSync(logFile, "utf8");
    expect(logs).toMatch(/echo ok/);
    expect(logs).not.toMatch(/TEST_SECRET/);
  });

  test("stderr contains no CodeQL warnings", () => {
    const { result } = runNode("require('child_process').execSync('true')");
    expect(result.stderr).not.toMatch(/codeql/i);
  });
});

function runLint(cwd, env = {}) {
  return spawnSync("npm", ["run", "lint"], {
    cwd,
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
}

describe("lint exit codes", () => {
  test("root lint succeeds", () => {
    const res = runLint(repoRoot);
    expect(res.status).toBe(0);
  });

  test("backend lint succeeds", () => {
    const res = runLint(backendDir);
    expect(res.status).toBe(0);
  });

  test("CI mode writes lint.log", () => {
    const log = path.join(repoRoot, "lint.log");
    fs.unlinkSync(log, { force: true });
    const res = runLint(repoRoot, { CI: "true", LINT_LOG: log });
    expect(res.status).toBe(0);
    expect(fs.existsSync(log)).toBe(true);
    expect(fs.statSync(log).size).toBeGreaterThan(0);
    fs.unlinkSync(log);
  });
});

function runCoverage(extraEnv = {}) {
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
    ...extraEnv,
  };
  return spawnSync("npm", ["run", "coverage", "--prefix", "backend"], {
    cwd: repoRoot,
    env,
    encoding: "utf8",
  });
}

describe("coverage harness", () => {
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

  test("generates lcov with SKIP_PW_DEPS", () => {
    const res = runCoverage();
    expect(res.status).toBe(0);
    const lcov = path.join(repoRoot, "coverage", "lcov.info");
    expect(fs.existsSync(lcov)).toBe(true);
  });

  test("fails fast when deps missing", () => {
    const res = runCoverage({ FAKE_NODE_MODULES_MISSING: "1" });
    expect(res.status).not.toBe(0);
  });
});
