const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const repoRoot = path.join(__dirname, "..");
const backendDir = path.join(repoRoot, "backend");
const stub = path.join(backendDir, "tests", "stubExecSync.js");

function runNode(script, env = {}) {
  return spawnSync(process.execPath, [script], {
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
}

function runNpm(args, cwd, env = {}) {
  return spawnSync("npm", args, {
    cwd,
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
}

describe("shell command safety", () => {
  test("execSync uses safe PATH and logs command", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lint-"));
    const script = path.join(tmpDir, "serverLint.js");
    fs.writeFileSync(
      script,
      "const {execSync}=require('child_process');execSync('echo lint', {env:{PATH:process.env.SAFE_PATH}});",
    );
    const logFile = path.join(tmpDir, "log.txt");
    const result = runNode(script, {
      NODE_OPTIONS: `--require ${stub}`,
      EXEC_LOG_FILE: logFile,
      SAFE_PATH: "/usr/bin",
      BAD_ENV: "danger",
    });
    expect(result.status).toBe(0);
    const log = fs.readFileSync(logFile, "utf8");
    expect(log).toMatch(/echo lint/);
    expect(log).not.toMatch(/danger/);
  });

  test("spawnSync omits raw env values", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lint-"));
    const script = path.join(tmpDir, "serverLint.js");
    fs.writeFileSync(
      script,
      "const {spawnSync}=require('child_process');spawnSync('echo',['spawn'],{env:{PATH:process.env.SAFE_PATH}});",
    );
    const logFile = path.join(tmpDir, "spawn.txt");
    const result = runNode(script, {
      NODE_OPTIONS: `--require ${stub}`,
      EXEC_LOG_FILE: logFile,
      SAFE_PATH: "/usr/bin",
      BAD_ENV: "oops",
    });
    expect(result.status).toBe(0);
    const log = fs.readFileSync(logFile, "utf8");
    expect(log).toMatch(/echo spawn/);
    expect(log).not.toMatch(/oops/);
  });
});

describe("lint commands", () => {
  test("root lint exits zero", () => {
    const res = runNpm(["run", "lint"], repoRoot, { CI: "" });
    expect(res.status).toBe(0);
  });

  test("backend lint exits zero", () => {
    const res = runNpm(["run", "lint"], backendDir, { CI: "" });
    expect(res.status).toBe(0);
  });

  test("CI=true creates lint.log", () => {
    const logPath = path.join(repoRoot, "lint.log");
    fs.rmSync(logPath, { force: true });
    const res = runNpm(["run", "lint"], repoRoot, { CI: "true" });
    fs.writeFileSync(logPath, (res.stdout || "") + (res.stderr || ""));
    expect(res.status).toBe(0);
    expect(fs.existsSync(logPath)).toBe(true);
    fs.rmSync(logPath, { force: true });
  });
});

describe("coverage harness", () => {
  afterEach(() => {
    fs.rmSync(path.join(repoRoot, "coverage"), {
      recursive: true,
      force: true,
    });
    fs.rmSync(path.join(backendDir, "coverage"), {
      recursive: true,
      force: true,
    });
  });

  test("coverage succeeds and writes lcov", () => {
    const res = runNpm(
      [
        "run",
        "coverage",
        "--prefix",
        "backend",
        "--",
        "backend/tests/coverage/lcovParse.test.ts",
      ],
      repoRoot,
      {
        SKIP_PW_DEPS: "1",
        SKIP_NET_CHECKS: "1",
        HF_TOKEN: "x",
        AWS_ACCESS_KEY_ID: "id",
        AWS_SECRET_ACCESS_KEY: "secret",
        DB_URL: "db",
        STRIPE_SECRET_KEY: "sk",
        NODE_OPTIONS: `--require ${stub}`,
      },
    );
    expect(res.status).toBe(0);
    const lcov = path.join(repoRoot, "coverage", "lcov.info");
    expect(fs.existsSync(lcov)).toBe(true);
  });

  test("fails fast when ensure-deps fails", () => {
    const res = runNpm(
      [
        "run",
        "coverage",
        "--prefix",
        "backend",
        "--",
        "backend/tests/coverage/lcovParse.test.ts",
      ],
      repoRoot,
      {
        SKIP_PW_DEPS: "1",
        SKIP_NET_CHECKS: "1",
        HF_TOKEN: "x",
        AWS_ACCESS_KEY_ID: "id",
        AWS_SECRET_ACCESS_KEY: "secret",
        DB_URL: "db",
        STRIPE_SECRET_KEY: "sk",
        NODE_OPTIONS: `--require ${stub}`,
        FAKE_NODE_MODULES_MISSING: "1",
        FAIL_ENSURE_DEPS: "1",
        REQUIRED_NODE_MAJOR: process.versions.node.split(".")[0],
      },
    );
    expect(res.status).not.toBe(0);
  });
});
