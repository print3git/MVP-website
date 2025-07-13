const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync } = require("child_process");
/**
 * Run the install-playwright script using a stub npx that records the arguments.
 * @param {string} dir temporary working directory
 * @param {string[]} args script arguments
 * @param {object} envOverride environment variables to override
 * @returns {string} arguments passed to the stub npx
 */
function run(dir, args = [], envOverride = {}) {
  const stubDir = fs.mkdtempSync(path.join(os.tmpdir(), "npx-"));
  const log = path.join(dir, "npx.log");
  const stub = path.join(stubDir, "npx");
  fs.writeFileSync(stub, '#!/bin/sh\necho "$@" >> "$NPX_LOG"\n');
  fs.chmodSync(stub, 0o755);
  const env = {
    ...process.env,
    PATH: `${stubDir}:${process.env.PATH}`,
    NPX_LOG: log,
    ...envOverride,
  };
  execFileSync(
    "bash",
    [
      path.resolve(__dirname, "..", "scripts", "install-playwright.sh"),
      ...args,
    ],
    { cwd: dir, env },
  );
  return fs.readFileSync(log, "utf8").trim();
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
    expect(run(dir, ["chromium"], { SKIP_PW_DEPS: "1" })).toBe(
      "install chromium",
    );
  });

  test("passes --with-deps when not skipped", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pwtest-"));
    const binDir = path.join(dir, "node_modules", ".bin");
    fs.mkdirSync(binDir, { recursive: true });
    fs.writeFileSync(path.join(binDir, "playwright"), "");
    fs.chmodSync(path.join(binDir, "playwright"), 0o755);
    const args = run(dir, ["chromium"], {});
    expect(args).toBe("install chromium --with-deps");
  });
});
