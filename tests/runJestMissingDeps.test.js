const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const pluginDir = path.join(
  __dirname,
  "..",
  "node_modules",
  "@babel",
  "plugin-syntax-typescript",
);
const backupDir = pluginDir + ".bak";

function run(cmd, args, env = {}) {
  try {
    execFileSync(cmd, args, { stdio: "pipe", env: { ...process.env, ...env } });
    return 0;
  } catch (err) {
    return err.status || 1;
  }
}

test("run-jest exits when plugin missing and check skipped", () => {
  if (!fs.existsSync(pluginDir)) return; // skip if dependencies not installed
  fs.renameSync(pluginDir, backupDir);
  try {
    const code = run("node", ["scripts/run-jest.js", "tests/dummy.test.js"], {
      SKIP_ROOT_DEPS_CHECK: "1",
    });
    expect(code).not.toBe(0);
  } finally {
    fs.renameSync(backupDir, pluginDir);
  }
});

const nodemailerDir = path.join(
  __dirname,
  "..",
  "backend",
  "node_modules",
  "nodemailer",
);
const nodemailerBackup = nodemailerDir + ".bak";

test("run-jest exits when nodemailer missing", () => {
  if (!fs.existsSync(nodemailerDir)) return;
  fs.renameSync(nodemailerDir, nodemailerBackup);
  try {
    const code = run("node", ["scripts/run-jest.js", "tests/dummy.test.js"], {
      SKIP_ROOT_DEPS_CHECK: "1",
    });
    expect(code).not.toBe(0);
  } finally {
    fs.renameSync(nodemailerBackup, nodemailerDir);
  }
});
