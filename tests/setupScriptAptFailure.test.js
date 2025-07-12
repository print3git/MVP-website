/** @file Tests setup.sh when apt-get fails */
const { execFileSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const script = path.join(__dirname, "..", "scripts", "setup.sh");
const binDir = path.join(__dirname, "bin-apt");

/** Ensure fake bin exists */
expect(fs.existsSync(path.join(binDir, "apt-get"))).toBe(true);

/**
 * Execute the setup script with a modified PATH.
 * @param {Record<string, string>} env environment variables
 * @returns {Buffer} script output
 */
function run(env) {
  return execFileSync("bash", [script], {
    env: { ...process.env, PATH: `${binDir}:${process.env.PATH}`, ...env },
    encoding: "utf8",
    stdio: "pipe",
  });
}

describe("setup script apt-get failure", () => {
  test("fails when apt-get is not available and deps not skipped", () => {
    expect(() => run({})).toThrow();
  });

  test("succeeds when SKIP_PW_DEPS=1", () => {
    expect(() =>
      run({ SKIP_PW_DEPS: "1", SKIP_NET_CHECKS: "1" }),
    ).not.toThrow();
  });
});
