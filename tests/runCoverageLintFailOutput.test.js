const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const stub = path.join(__dirname, "..", "backend", "tests", "stubExecSync.js");

function createBadFile() {
  const tmpDir = path.join(__dirname, "..");
  const file = path.join(tmpDir, `lint-fail-${Date.now()}.js`);
  fs.writeFileSync(file, "var unused = 1\n");
  return file;
}

describe("run-coverage lint failure output", () => {
  test("reports eslint errors with file path", () => {
    const badFile = createBadFile();
    try {
      execFileSync(
        "node",
        ["scripts/run-coverage.js", "tests/linting.test.js"],
        {
          cwd: path.join(__dirname, ".."),
          encoding: "utf8",
          env: {
            ...process.env,
            SKIP_NET_CHECKS: "1",
            SKIP_DB_CHECK: "1",
            SKIP_PW_DEPS: "1",
            NODE_OPTIONS: `--require ${stub}`,
          },
          stdio: "pipe",
        },
      );
      throw new Error("coverage unexpectedly succeeded");
    } catch (err) {
      const output = (err.stdout || "") + (err.stderr || "");
      expect(output).toContain(path.basename(badFile));
      expect(err.status).not.toBe(0);
    } finally {
      fs.unlinkSync(badFile);
    }
  });
});
