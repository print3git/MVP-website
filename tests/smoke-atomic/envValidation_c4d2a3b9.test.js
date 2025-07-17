const { spawnSync } = require("child_process");
const path = require("path");
const { initEnv } = require("../../scripts/run-smoke.js");

const repoRoot = path.resolve(__dirname, "..", "..");

function run(env) {
  return spawnSync("bash", ["scripts/validate-env.sh"], {
    cwd: repoRoot,
    env,
    encoding: "utf8",
  });
}

describe("validate-env script", () => {
  const baseEnv = initEnv({ SKIP_NET_CHECKS: "1", SKIP_DB_CHECK: "1" });

  test("fails when AWS_ACCESS_KEY_ID missing", () => {
    const env = { ...baseEnv, AWS_ACCESS_KEY_ID: "" };
    const res = run(env);
    expect(res.status).not.toBe(0);
    expect(res.stdout + res.stderr).toMatch(/AWS_ACCESS_KEY_ID must be set/);
  });

  test("succeeds with required vars", () => {
    const res = run(baseEnv);
    expect(res.status).toBe(0);
    expect(res.stdout + res.stderr).toContain("environment OK");
  });
});
