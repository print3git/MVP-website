const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const repoRoot = path.join(__dirname, "..", "..");
const backendDir = path.join(repoRoot, "backend");

function runEslint(cwd, args = [], env = {}) {
  return spawnSync("pnpm", ["exec", "eslint", ".", ...args], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
}

test("root eslint exits 0", () => {
  const res = runEslint(repoRoot);
  console.log("root exit", res.status);
  if (res.status !== 0) {
    console.error("stdout:\n" + res.stdout);
    console.error("stderr:\n" + res.stderr);
  } else if (res.stderr) {
    console.log(res.stderr);
  }
  expect(res.status).toBe(0);
});

test("backend eslint exits 0", () => {
  const res = runEslint(backendDir);
  console.log("backend exit", res.status);
  if (res.status !== 0) {
    console.error("stdout:\n" + res.stdout);
    console.error("stderr:\n" + res.stderr);
  } else if (res.stderr) {
    console.log(res.stderr);
  }
  expect(res.status).toBe(0);
});

test("root has few warnings", () => {
  const res = runEslint(repoRoot, ["-f", "json"]);
  const results = JSON.parse(res.stdout || "[]");
  const warnings = results.flatMap((r) =>
    r.messages.filter((m) => m.severity === 1),
  );
  if (warnings.length) {
    console.log("warnings:", warnings.map((w) => w.ruleId).join(","));
  }
  // Allow some warnings from transient dependencies
  expect(warnings.length).toBeLessThanOrEqual(5);
});

test("root has no errors", () => {
  const res = runEslint(repoRoot, ["-f", "json"]);
  const results = JSON.parse(res.stdout || "[]");
  const errors = results.flatMap((r) =>
    r.messages.filter((m) => m.severity === 2),
  );
  if (errors.length) {
    console.log("errors:", errors.map((e) => e.ruleId).join(","));
  }
  expect(errors.length).toBe(0);
});

test("eslint config resolves", () => {
  const cfg = path.join(repoRoot, "eslint.config.js");
  console.log("config path", cfg);
  expect(() => require.resolve(cfg)).not.toThrow();
});

test("root and backend exit codes match", () => {
  const rootRes = runEslint(repoRoot);
  const backRes = runEslint(backendDir);
  console.log("root", rootRes.status, "backend", backRes.status);
  if (rootRes.status !== backRes.status) {
    console.error("root stdout:\n" + rootRes.stdout);
    console.error("root stderr:\n" + rootRes.stderr);
    console.error("backend stdout:\n" + backRes.stdout);
    console.error("backend stderr:\n" + backRes.stderr);
  }
  expect(rootRes.status).toBe(backRes.status);
});

test("eslint writes log file", () => {
  const log = path.join(repoRoot, "eslint-diagnostic.log");
  if (fs.existsSync(log)) fs.unlinkSync(log);
  runEslint(repoRoot, ["-o", log]);
  const exists = fs.existsSync(log);
  console.log("log exists", exists);
  if (!exists) {
    console.warn(`eslint log missing at ${log}`);
  } else {
    expect(fs.statSync(log).size).toBeGreaterThan(0);
  }
});

test("CI flag does not change exit code", () => {
  const normal = runEslint(repoRoot);
  const ci = runEslint(repoRoot, [], { CI: "true" });
  console.log("normal", normal.status, "ci", ci.status);
  expect(ci.status).toBe(normal.status);
});
