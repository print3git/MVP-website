const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { setup } = require("./helpers");

test("rsync fails on unreadable file", () => {
  const { tmp, env } = setup({ RSYNC_CHECK_PERMS: "1" });
  fs.writeFileSync(path.join(tmp, "README.md"), "data");
  fs.chmodSync(path.join(tmp, "README.md"), 0o200); // no read
  const script = path.resolve(__dirname, "../../scripts/setup_space.sh");
  const res = spawnSync("bash", [script], { env, cwd: tmp, encoding: "utf8" });
  expect(res.status).not.toBe(0);
});
