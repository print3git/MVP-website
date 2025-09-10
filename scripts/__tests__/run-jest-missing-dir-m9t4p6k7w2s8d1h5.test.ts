const path = require("path");
const { spawnSync } = require("child_process");

const script = path.join(__dirname, "..", "run-jest.js");
const env = { ...process.env, SKIP_ROOT_DEPS_CHECK: "1" };

test("fails on nonexistent directory", () => {
  const missing = "definitely-missing-dir";
  const result = spawnSync(process.execPath, [script, missing], {
    encoding: "utf8",
    env,
  });
  expect(result.status).toBe(1);
  const output = result.stdout + result.stderr;
  expect(output).toContain(`Directory or file not found: ${missing}`);
});
