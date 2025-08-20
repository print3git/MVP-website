const { spawnSync } = require("child_process");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");

function runEslint(args) {
  const res = spawnSync("pnpm", ["exec", "eslint", ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, CI: "1" },
  });
  if (res.stderr) console.error(res.stderr);
  return res;
}

describe("eslint config resolution", () => {
  test("root lint resolves typescript", () => {
    const res = runEslint([
      "scripts/ci_watchdog.ts",
      "--no-ignore",
      "-f",
      "json",
    ]);
    if (res.status !== 0) console.error(res.stdout);
    expect(res.status).toBe(0);
    const messages = JSON.parse(res.stdout)[0].messages.filter(
      (m) => m.severity === 2,
    );
    expect(messages).toHaveLength(0);
  });

  test("tests ts files parse", () => {
    const res = runEslint([
      "tests/runSmoke.fallback-env.test.ts",
      "-f",
      "json",
    ]);
    if (res.status !== 0) console.error(res.stdout);
    expect(res.status).toBe(0);
    const messages = JSON.parse(res.stdout)[0].messages.filter(
      (m) => m.severity === 2,
    );
    expect(messages).toHaveLength(0);
  });

  test("root ignores backend", () => {
    const res = runEslint(["backend"]);
    const output = res.stdout + res.stderr;
    expect(res.status).not.toBe(0);
    expect(output).toMatch(/ignored/);
    expect(output).toMatch(/backend/);
  });
});
