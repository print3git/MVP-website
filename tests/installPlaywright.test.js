const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync } = require("child_process");
/**
 * Run the install-playwright script in the provided directory using a stub npx binary that records whether it was called.
 * @param {string} dir temporary working directory
 * @returns {boolean} true if the stub npx executed
 */
function run(dir) {
  const stubDir = fs.mkdtempSync(path.join(os.tmpdir(), "npx-"));
  const log = path.join(dir, "npx.log");
  const stub = path.join(stubDir, "npx");
  fs.writeFileSync(stub, '#!/bin/sh\necho called >> "$NPX_LOG"\n');
  fs.chmodSync(stub, 0o755);
  const env = {
    ...process.env,
    PATH: `${stubDir}:${process.env.PATH}`,
    NPX_LOG: log,
    SKIP_PW_DEPS: "1",
  };
  execFileSync(
    "bash",
    [path.resolve(__dirname, "..", "scripts", "install-playwright.sh")],
    { cwd: dir, env },
  );
  return fs.existsSync(log);
}

describe("install-playwright script", () => {
  test("fails without dependencies", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pwtest-"));
    expect(() => run(dir)).toThrow();
    expect(fs.existsSync(path.join(dir, "npx.log"))).toBe(false);
  });

  test("runs when playwright installed", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pwtest-"));
    const binDir = path.join(dir, "node_modules", ".bin");
    fs.mkdirSync(binDir, { recursive: true });
    fs.writeFileSync(path.join(binDir, "playwright"), "");
    fs.chmodSync(path.join(binDir, "playwright"), 0o755);
    expect(run(dir)).toBe(true);
  });
});
