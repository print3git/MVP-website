const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const repoRoot = path.join(__dirname, "..", "..");
const script = path.join(repoRoot, "scripts", "run-coverage.js");

function run(args) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, SKIP_NET_CHECKS: "1", SKIP_PW_DEPS: "1" },
  });
}

describe("run-coverage --dry-run", () => {
  test("succeeds with valid coverage directory", () => {
    const dir = fs.mkdtempSync(path.join(repoRoot, "tmp-cov-"));
    fs.writeFileSync(path.join(dir, "coverage-summary.json"), "{}");
    const result = run(["--dry-run", "--coverage-dir", dir]);
    fs.rmSync(dir, { recursive: true, force: true });
    expect(result.status).toBe(0);
    expect(result.stdout + result.stderr).toMatch(new RegExp(dir));
  });

  test("fails for missing coverage directory", () => {
    const bad = path.join(repoRoot, "no-such-dir");
    const result = run(["--dry-run", "--coverage-dir", bad]);
    expect(result.status).toBe(1);
    expect(result.stdout + result.stderr).toMatch(/Missing coverage summary/);
  });
});
