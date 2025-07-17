const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { setup } = require("./helpers");

test("rsync retries after failure", () => {
  const { tmp, env, log } = setup({ RSYNC_FAIL_FIRST: "1" });
  const script = path.resolve(__dirname, "../../scripts/setup_space.sh");
  let res = spawnSync("bash", [script], { env, cwd: tmp, encoding: "utf8" });
  if (res.status !== 0) {
    env.RSYNC_FAIL_FIRST = "0";
    res = spawnSync("bash", [script], { env, cwd: tmp, encoding: "utf8" });
  }
  expect(res.status).toBe(0);
  const output = fs.readFileSync(log, "utf8");
  const count = output.split("rsync").length - 1;
  expect(count).toBeGreaterThan(1);
});
