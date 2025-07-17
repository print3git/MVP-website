const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const repoRoot = path.resolve(__dirname, "..", "..");
const eslintBin = path.join(repoRoot, "node_modules", ".bin", "eslint");

function runEslint(args) {
  return spawnSync("node", ["--experimental-vm-modules", eslintBin, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
}

describe("isolated ESLint failures", () => {
  test("missing JSDoc comments", () => {
    const res = runEslint([
      "scripts/assert-setup.js",
      "--format",
      "json",
      "--rule",
      "jsdoc/require-jsdoc:error",
    ]);
    expect(res.status).not.toBe(0);
    const messages = JSON.parse(res.stdout)[0].messages;
    const jsdoc = messages.filter((m) => m.ruleId === "jsdoc/require-jsdoc");
    expect(jsdoc).toHaveLength(5);
    jsdoc.forEach((m) => {
      expect(m.message).toBe("Missing JSDoc comment.");
    });
  });

  test("typescript parsing error", () => {
    const res = runEslint(["scripts/ci_watchdog.ts", "--no-ignore"]);
    expect(res.status).not.toBe(0);
    expect(res.stdout).toMatch(/Parsing error: Unexpected token !/);
  });

  test("backend directory ignored", () => {
    const res = runEslint(["backend"]);
    expect(res.status).not.toBe(0);
    const output = res.stdout + res.stderr;
    expect(output).toMatch(/are ignored/);
  });

  test("clean file passes", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "eslint-"));
    const tmp = path.join(tmpDir, "hello.js");
    fs.writeFileSync(tmp, "/**\n * hi\n */\nfunction hi() {}\n");
    const res = runEslint([
      tmp,
      "--config",
      "eslint.config.js",
      "--no-warn-ignored",
    ]);
    fs.rmSync(tmpDir, { recursive: true, force: true });
    if (res.stderr) console.error(res.stderr);
    expect(res.status).toBe(0);
  });
});
