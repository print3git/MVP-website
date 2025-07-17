const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { setup } = require("./helpers");

test("LFS clone succeeds", () => {
  const { tmp, env, log } = setup();
  const script = path.resolve(__dirname, "../../scripts/setup_space.sh");
  const res = spawnSync("bash", [script], { env, cwd: tmp, encoding: "utf8" });
  expect(res.status).toBe(0);
  const output = fs.readFileSync(log, "utf8");
  expect(output).toMatch(/git clone/);
  expect(output).toMatch(/git lfs install/);
});
