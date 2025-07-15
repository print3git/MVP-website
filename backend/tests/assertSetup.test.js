const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const script = path.join(__dirname, "..", "..", "scripts", "assert-setup.js");
const stub = path.join(__dirname, "stubExecSync.js");

function runAssertSetup(nodeVersion, extraEnv = {}) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pw-"));
  const browserDir = path.join(tmpDir, "chromium");
  fs.mkdirSync(browserDir, { recursive: true });
  const env = {
    ...process.env,
    NODE_OPTIONS: `--require ${stub}`,
    PLAYWRIGHT_BROWSERS_PATH: tmpDir,
    ...extraEnv,
  };
  const flag = path.join(__dirname, "..", ".setup-complete");
  fs.writeFileSync(flag, "");
  const code = `Object.defineProperty(process.versions,'node',{value:'${nodeVersion}'});require('${script.replace(/\\/g, "\\\\")}');`;
  const result = spawnSync(process.execPath, ["-e", code], {
    env,
    encoding: "utf8",
  });
  fs.unlinkSync(flag);
  return { tmpDir, result, ...result };
}

describe("assert-setup script", () => {
  test("fails on Node <20", () => {
    const res = runAssertSetup("18.0.0");
    expect(res.status).not.toBe(0);
    expect(res.stderr).toContain("Node 20 or newer is required");
  });

  test("succeeds on Node >=20", () => {
    const { result } = runAssertSetup("20.0.0");
    expect(result.status).toBe(0);
  });

  test("passes SKIP_DB_CHECK to validate-env", () => {
    const logFile = path.join(os.tmpdir(), `log-${Date.now()}`);
    const { result } = runAssertSetup("20.0.0", { EXEC_LOG_FILE: logFile });
    expect(result.status).toBe(0);
    const logs = fs.readFileSync(logFile, "utf8");
    expect(logs).toMatch(/SKIP_DB_CHECK=1/);
    fs.unlinkSync(logFile);
  });
});
