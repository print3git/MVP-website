const { spawnSync } = require("child_process");
const { setup } = require("./helpers");
const path = require("path");

test("LFS fetch timeout exits non-zero", () => {
  const { tmp, env } = setup({ GIT_LFS_TIMEOUT: "1" });
  const script = path.resolve(__dirname, "../../scripts/setup_space.sh");
  const res = spawnSync("bash", [script], { env, cwd: tmp, encoding: "utf8" });
  expect(res.status).not.toBe(0);
});
