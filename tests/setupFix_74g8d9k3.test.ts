const { spawnSync } = require("child_process");
const path = require("path");

/** Ensure setup script runs successfully */
test("setup script completes", () => {
  const script = path.join(__dirname, "..", "scripts", "setup.sh");
  const res = spawnSync("bash", [script], {
    env: { ...process.env, SKIP_PW_DEPS: "1", SKIP_NET_CHECKS: "1" },
    encoding: "utf8",
  });
  if (res.status !== 0) {
    console.error(res.stdout);
    console.error(res.stderr);
  }
  expect(res.status).toBe(0);
});
