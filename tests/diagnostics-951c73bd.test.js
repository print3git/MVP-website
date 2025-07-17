const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const repoRoot = path.join(__dirname, "..");
const backendDir = path.join(repoRoot, "backend");
const stub = path.join(backendDir, "tests", "stubExecSync.js");

describe("diagnostics supplemental suite", () => {
  describe("shell command invocation", () => {
    test("stubExecSync with safe PATH has no CodeQL warnings", () => {
      const log = path.join(os.tmpdir(), `stub-${Date.now()}.log`);
      const res = spawnSync(
        "node",
        ["-e", "require('child_process').execSync('echo ok')"],
        {
          env: {
            PATH: "/usr/bin",
            EXEC_LOG_FILE: log,
            NODE_OPTIONS: `--require ${stub}`,
          },
          encoding: "utf8",
        },
      );
      const output = fs.readFileSync(log, "utf8");
      expect(res.status).toBe(0);
      expect(output).toContain("echo ok");
      expect(output).not.toMatch(/CodeQL/i);
    });

    test("command string excludes raw env variables", () => {
      const log = path.join(os.tmpdir(), `stub-${Date.now()}.log`);
      const res = spawnSync(
        "node",
        ["-e", "require('child_process').execSync('echo test')"],
        {
          env: {
            PATH: "/usr/bin",
            SECRET_TOKEN: "supersecret",
            EXEC_LOG_FILE: log,
            NODE_OPTIONS: `--require ${stub}`,
          },
          encoding: "utf8",
        },
      );
      const output = fs.readFileSync(log, "utf8");
      expect(res.status).toBe(0);
      expect(output).toContain("echo test");
      expect(output).not.toContain("supersecret");
    });
  });

  describe("lint exit codes & log files", () => {
    test("root lint exits zero", () => {
      const res = spawnSync("npm", ["run", "lint"], {
        cwd: repoRoot,
        encoding: "utf8",
      });
      expect(res.status).toBe(0);
    });

    test("backend lint exits zero", () => {
      const res = spawnSync("npm", ["run", "lint"], {
        cwd: backendDir,
        encoding: "utf8",
      });
      expect(res.status).toBe(0);
    });

    test("CI=true lint writes lint.log", () => {
      const logFile = path.join(repoRoot, "lint.log");
      fs.rmSync(logFile, { force: true });
      const res = spawnSync("npm", ["run", "lint"], {
        cwd: repoRoot,
        env: { ...process.env, CI: "true" },
        encoding: "utf8",
      });
      expect(res.status).toBe(0);
      expect(fs.existsSync(logFile)).toBe(true);
      expect(fs.statSync(logFile).size).toBeGreaterThan(0);
    });
  });

  describe("coverage harness", () => {
    const covDir = path.join(repoRoot, "coverage");
    const backendCov = path.join(backendDir, "coverage");

    function clean() {
      fs.rmSync(covDir, { recursive: true, force: true });
      fs.rmSync(backendCov, { recursive: true, force: true });
    }

    beforeEach(clean);
    afterEach(clean);

    test("coverage script succeeds and writes lcov", () => {
      const res = spawnSync("npm", ["run", "coverage", "--prefix", "backend"], {
        cwd: repoRoot,
        env: { ...process.env, SKIP_PW_DEPS: "1" },
        encoding: "utf8",
      });
      const lcov = path.join(covDir, "lcov.info");
      expect(res.status).toBe(0);
      expect(fs.existsSync(lcov)).toBe(true);
    });

    test("coverage fails fast when dependencies missing", () => {
      const res = spawnSync("npm", ["run", "coverage", "--prefix", "backend"], {
        cwd: repoRoot,
        env: { ...process.env, FAIL_ENSURE_DEPS: "1" },
        encoding: "utf8",
      });
      expect(res.status).not.toBe(0);
    });
  });
});
