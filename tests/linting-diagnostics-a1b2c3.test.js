const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const repoRoot = path.join(__dirname, "..");
const backendDir = path.join(repoRoot, "backend");
const PNPM_BIN = path.join(repoRoot, "node_modules", ".bin", "pnpm");

function runEslint(cwd, env = {}) {
  return spawnSync(PNPM_BIN, ["exec", "eslint", ".", "-f", "json"], {
    cwd,
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
}

describe("linting diagnostics", () => {
  test("pnpm exec eslint . succeeds from root", () => {
    const res = runEslint(repoRoot);
    console.log("root exit code:", res.status);
    console.log(res.stderr);
    expect(res.status).toBe(0);
  });

  test("no warnings from root run", () => {
    const res = runEslint(repoRoot);
    const data = JSON.parse(res.stdout || "[]");
    const warnings = data.reduce((n, f) => n + (f.warningCount || 0), 0);
    console.log("root warnings:", warnings);
    expect(warnings).toBe(0);
  });

  test("no errors from root run", () => {
    const res = runEslint(repoRoot);
    const data = JSON.parse(res.stdout || "[]");
    const errors = data.reduce((n, f) => n + (f.errorCount || 0), 0);
    console.log("root errors:", errors);
    expect(errors).toBe(0);
  });

  test("eslint config can be required", () => {
    expect(() =>
      require(path.join(repoRoot, "eslint.config.js")),
    ).not.toThrow();
    expect(() =>
      require(path.join(backendDir, "eslint.config.js")),
    ).not.toThrow();
  });

  test("pnpm exec eslint . succeeds from backend", () => {
    const res = runEslint(backendDir);
    console.log("backend exit code:", res.status);
    console.log(res.stderr);
    expect(res.status).toBe(0);
  });

  test("writes log file when redirected", () => {
    const tmp = path.join(repoRoot, "eslint-log.txt");
    fs.unlinkSync(tmp, { force: true });
    const res = spawnSync(PNPM_BIN, ["exec", "eslint", "."], {
      cwd: repoRoot,
      env: process.env,
      encoding: "utf8",
      stdio: ["ignore", fs.openSync(tmp, "w"), "pipe"],
    });
    console.log("log exit code:", res.status);
    expect(fs.existsSync(tmp)).toBe(true);
    expect(fs.statSync(tmp).size).toBeGreaterThan(0);
    fs.unlinkSync(tmp);
  });

  test("CI env does not change results", () => {
    const base = runEslint(repoRoot, { CI: "" });
    const ci = runEslint(repoRoot, { CI: "true" });
    expect(base.status).toBe(ci.status);
    expect(base.stdout).toBe(ci.stdout);
  });

  test("arbitrary env vars do not affect eslint", () => {
    const res = runEslint(repoRoot, { FOO: "bar" });
    console.log("env var exit code:", res.status);
    expect(res.status).toBe(0);
  });
});
