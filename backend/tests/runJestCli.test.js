const path = require("path");
const { spawnSync } = require("child_process");

const script = path.join(__dirname, "..", "..", "scripts", "run-jest.js");
const env = { ...process.env, SKIP_ROOT_DEPS_CHECK: "1" };

function run(args) {
  return spawnSync(process.execPath, [script, ...args], {
    encoding: "utf8",
    env,
  });
}

describe("run-jest CLI", () => {
  test("--help shows jest help", () => {
    const result = run(["--help"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/Usage: jest/);
  });

  test("errors for missing test file", () => {
    const result = run(["--runTestsByPath", "nope.test.js"]);
    expect(result.status).toBe(1);
    const output = result.stdout + result.stderr;
    expect(output).toMatch(/Test file not found/);
  });
});
