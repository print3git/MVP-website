const { spawnSync } = require("child_process");
const path = require("path");

const script = path.join(
  __dirname,
  "..",
  "..",
  "scripts",
  "check-host-deps.js",
);
const stub = path.join(__dirname, "stubMissingDeps.js");

test("auto installs host deps when SKIP_PW_DEPS is set", () => {
  const result = spawnSync(process.execPath, [script], {
    env: {
      ...process.env,
      SKIP_PW_DEPS: "1",
      SKIP_NET_CHECKS: "1",
      NODE_OPTIONS: `--require ${stub}`,
    },
    encoding: "utf8",
  });
  expect(result.status).toBe(0);
  expect(result.stderr).toMatch(/Installing anyway/);
});
