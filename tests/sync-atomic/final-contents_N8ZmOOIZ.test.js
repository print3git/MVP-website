const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { setup } = require("./helpers");

test("README copied to final directory", () => {
  const { tmp, env } = setup();
  fs.writeFileSync(path.join(tmp, "README.md"), "readme");
  const script = path.resolve(__dirname, "../../scripts/setup_space.sh");
  const res = spawnSync("bash", [script], { env, cwd: tmp, encoding: "utf8" });
  expect(res.status).toBe(0);
  expect(fs.existsSync(path.join(tmp, "Sparc3D-Space", "README.md"))).toBe(
    true,
  );
});
