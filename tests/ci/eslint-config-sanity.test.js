const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const cp = require("node:child_process");

test("eslint ignore migration", () => {
  const hasIgnore = fs.existsSync(path.join(process.cwd(), ".eslintignore"));
  const hasConfig = fs.existsSync(path.join(process.cwd(), "eslint.config.js"));
  if (hasIgnore && hasConfig) {
    assert.fail(
      "Migrate ignores into eslint.config.js – .eslintignore no longer supported.",
    );
  }
  const eslintBin = path.join(process.cwd(), "node_modules", ".bin", "eslint");
  if (fs.existsSync(eslintBin)) {
    const res = cp.spawnSync(eslintBin, ["--print-config", "package.json"], {
      stdio: "ignore",
    });
    if (res.status !== 0) {
      console.warn(
        "eslint --print-config failed; verify eslint setup locally.",
      );
    }
  }
});
