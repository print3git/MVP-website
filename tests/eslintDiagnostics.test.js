const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const backendDir = path.join(repoRoot, "backend");

function run(cmd, args, cwd, env = {}) {
  return spawnSync(cmd, args, {
    cwd,
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
}

describe("eslint diagnostics", () => {
  test("pnpm exec eslint . exits 0 at repo root", () => {
    const result = run("pnpm", ["exec", "eslint", "."], repoRoot);
    if (result.status !== 0) console.error(result.stdout || result.stderr);
    expect(result.status).toBe(0);
  });

  test("pnpm exec eslint . exits 0 in backend", () => {
    const result = run("pnpm", ["exec", "eslint", "."], backendDir);
    if (result.status !== 0) console.error(result.stdout || result.stderr);
    expect(result.status).toBe(0);
  });

  test("no warnings with --max-warnings=0", () => {
    const result = run(
      "pnpm",
      ["exec", "eslint", ".", "--max-warnings=0"],
      repoRoot,
    );
    if (result.status !== 0) console.error(result.stdout || result.stderr);
    expect(result.status).toBe(0);
  });

  test("no error messages in json output", () => {
    const outFile = path.join(repoRoot, "tmp_eslint.json");
    const result = run(
      "pnpm",
      ["exec", "eslint", ".", "-f", "json", "--output-file", outFile],
      repoRoot,
    );
    if (result.status !== 0) console.error(result.stdout || result.stderr);
    const output = JSON.parse(fs.readFileSync(outFile, "utf8"));
    fs.unlinkSync(outFile);
    const errors = output.flatMap((r) =>
      r.messages.filter((m) => m.severity === 2),
    );
    expect(errors).toEqual([]);
  });

  test("print-config resolves for server.js", () => {
    const result = run(
      "pnpm",
      ["exec", "eslint", "--print-config", "server.js"],
      backendDir,
    );
    if (result.status !== 0) console.error(result.stdout || result.stderr);
    expect(result.status).toBe(0);
  });
});
