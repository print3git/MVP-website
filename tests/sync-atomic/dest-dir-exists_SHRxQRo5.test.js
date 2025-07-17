const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { setup } = require("./helpers");

test("destination directory is cleaned before clone", () => {
  const { tmp, env } = setup();
  const dir = path.join(tmp, "Sparc3D-Space");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "old.txt"), "old");
  const script = path.resolve(__dirname, "../../scripts/setup_space.sh");
  const res = spawnSync("bash", [script], { env, cwd: tmp, encoding: "utf8" });
  expect(res.status).toBe(0);
  expect(fs.existsSync(path.join(dir, "old.txt"))).toBe(false);
});
