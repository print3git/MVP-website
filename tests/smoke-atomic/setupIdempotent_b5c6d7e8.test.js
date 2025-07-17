const { spawnSync } = require("child_process");
const path = require("path");

test("setup script can run twice without error", () => {
  const script = path.join(__dirname, "..", "..", "scripts", "setup.sh");
  const env = { ...process.env, SKIP_PW_DEPS: "1", SKIP_NET_CHECKS: "1" };
  const first = spawnSync("bash", [script], { env, encoding: "utf8" });
  expect(first.status).toBe(0);
  const second = spawnSync("bash", [script], { env, encoding: "utf8" });
  expect(second.status).toBe(0);
});
