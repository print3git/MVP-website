jest.setTimeout(10_000);

const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawnSync } = require("child_process");

const repoRoot = path.resolve(__dirname, "..");

function runLint(file) {
  return spawnSync(
    "npm",
    [
      "run",
      "lint",
      "--",
      "--format",
      "json",
      "--rule",
      "jsdoc/require-jsdoc:error",
      file,
    ],
    { cwd: repoRoot, encoding: "utf8" },
  );
}

function stripJsDoc(src) {
  const lines = src.split(/\n/);
  const start = lines.findIndex((l) => l.startsWith("/**"));
  if (start === -1) return src;
  for (let i = start; i < lines.length; i++) {
    if (lines[i].startsWith("*/")) {
      lines.splice(start, i - start + 1);
      break;
    }
  }
  return lines.join("\n");
}

describe("jsdoc rule enforcement", () => {
  const fileA = path.join(repoRoot, "backend", "utils", "generateTitle.js");
  const fileB = path.join(repoRoot, "scripts", "update-coverage-threshold.js");

  test("generateTitle.js has no jsdoc errors", () => {
    const res = runLint(fileA);
    const msgs = JSON.parse(res.stdout || "[]").flatMap((f) =>
      f.messages.filter((m) => m.ruleId === "jsdoc/require-jsdoc"),
    );
    expect(msgs).toEqual([]);
  });

  test("update-coverage-threshold.js has no jsdoc errors", () => {
    const res = runLint(fileB);
    const msgs = JSON.parse(res.stdout || "[]").flatMap((f) =>
      f.messages.filter((m) => m.ruleId === "jsdoc/require-jsdoc"),
    );
    expect(msgs).toEqual([]);
  });

  test("removing stub triggers one error in generateTitle.js", () => {
    const tmp = path.join(os.tmpdir(), `gt-${Date.now()}.js`);
    const src = fs.readFileSync(fileA, "utf8");
    fs.writeFileSync(tmp, stripJsDoc(src));
    const res = runLint(tmp);
    fs.unlinkSync(tmp);
    const msgs = JSON.parse(res.stdout || "[]").flatMap((f) =>
      f.messages.filter((m) => m.ruleId === "jsdoc/require-jsdoc"),
    );
    expect(msgs).toHaveLength(1);
  });

  test("removing stub triggers one error in update-coverage-threshold.js", () => {
    const tmp = path.join(os.tmpdir(), `uc-${Date.now()}.js`);
    const src = fs.readFileSync(fileB, "utf8");
    fs.writeFileSync(tmp, stripJsDoc(src));
    const res = runLint(tmp);
    fs.unlinkSync(tmp);
    const msgs = JSON.parse(res.stdout || "[]").flatMap((f) =>
      f.messages.filter((m) => m.ruleId === "jsdoc/require-jsdoc"),
    );
    expect(msgs).toHaveLength(1);
  });
});

describe("lint exit codes and log file", () => {
  const logPath = path.join(repoRoot, "lint.log");

  function runLintCmd(args = []) {
    return spawnSync("npm", ["run", "lint", ...args], {
      cwd: repoRoot,
      encoding: "utf8",
    });
  }

  test("clean repo exits with code 0", () => {
    fs.rmSync(logPath, { force: true });
    const res = runLintCmd();
    expect(res.status).toBe(0);
    expect(fs.existsSync(logPath)).toBe(true);
  });

  test("clean repo generates log", () => {
    fs.rmSync(logPath, { force: true });
    runLintCmd();
    expect(fs.existsSync(logPath)).toBe(true);
  });

  test("lint failure exits non-zero", () => {
    fs.rmSync(logPath, { force: true });
    const bad = path.join(os.tmpdir(), `bad-${Date.now()}.js`);
    fs.writeFileSync(bad, "var x = 1,");
    const res = runLintCmd(["--", bad]);
    fs.unlinkSync(bad);
    expect(res.status).not.toBe(0);
    expect(fs.existsSync(logPath)).toBe(true);
  });

  test("lint failure still writes log", () => {
    fs.rmSync(logPath, { force: true });
    const bad = path.join(os.tmpdir(), `bad-${Date.now()}.js`);
    fs.writeFileSync(bad, "var x = 1,");
    runLintCmd(["--", bad]);
    fs.unlinkSync(bad);
    expect(fs.existsSync(logPath)).toBe(true);
  });
});
