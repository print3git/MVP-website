const { spawnSync } = require("child_process");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..", "..");

function runSetup() {
  return spawnSync("bash", ["scripts/setup.sh"], {
    cwd: repoRoot,
    env: { ...process.env, SKIP_PW_DEPS: "1", SKIP_NET_CHECKS: "1" },
    encoding: "utf8",
  });
}

test("setup script is idempotent", () => {
  for (let i = 0; i < 2; i++) {
    const res = runSetup();
    expect(res.status).toBe(0);
  }
  const flag = path.join(repoRoot, ".setup-complete");
  expect(require("fs").existsSync(flag)).toBe(true);
});
