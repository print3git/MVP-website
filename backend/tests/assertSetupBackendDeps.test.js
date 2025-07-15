const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const script = path.join(__dirname, "..", "..", "scripts", "assert-setup.js");
const stub = path.join(__dirname, "stubExecSync.js");

function runAssertSetup(extraEnv = {}) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pw-"));
  fs.mkdirSync(path.join(tmpDir, "chromium"), { recursive: true });
  const env = {
    ...process.env,
    NODE_OPTIONS: `--require ${stub}`,
    PLAYWRIGHT_BROWSERS_PATH: tmpDir,
    HF_TOKEN: "x",
    AWS_ACCESS_KEY_ID: "id",
    AWS_SECRET_ACCESS_KEY: "secret",
    CLOUDFRONT_MODEL_DOMAIN: "cdn.test",
    ...extraEnv,
  };
  const result = spawnSync(process.execPath, [script], {
    env,
    encoding: "utf8",
  });
  return { result, tmpDir };
}

describe("assert-setup backend deps", () => {
  test("installs backend dependencies when missing", () => {
    const logFile = path.join(os.tmpdir(), `log-${Date.now()}`);
    const nodeModules = path.join(__dirname, "..", "node_modules");
    const backup = nodeModules + ".bak";
    if (fs.existsSync(nodeModules)) fs.renameSync(nodeModules, backup);
    try {
      const { result } = runAssertSetup({
        EXEC_LOG_FILE: logFile,
        SKIP_NET_CHECKS: "1",
        SKIP_PW_DEPS: "1",
      });
      expect(result.status).toBe(0);
      const logs = fs.readFileSync(logFile, "utf8");
      expect(logs).toMatch(/ensure-deps\.js/);
    } finally {
      fs.unlinkSync(logFile);
      if (fs.existsSync(backup)) fs.renameSync(backup, nodeModules);
    }
  });

  test("exits non-zero when ensure-deps fails", () => {
    const { result } = runAssertSetup({
      SKIP_NET_CHECKS: "1",
      SKIP_PW_DEPS: "1",
      FAIL_ENSURE_DEPS: "1",
    });
    expect(result.status).not.toBe(0);
  });
});
