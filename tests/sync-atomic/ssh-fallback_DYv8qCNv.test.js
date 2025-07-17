const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { setup } = require("./helpers");

test("ssh clone url is converted to https", () => {
  const { tmp, env, log } = setup();
  env.SPACE_URL = "git@huggingface.co:print2/Sparc3D";
  const script = path.resolve(__dirname, "../../scripts/setup_space.sh");
  const res = spawnSync("bash", [script], { env, cwd: tmp, encoding: "utf8" });
  expect(res.status).toBe(0);
  const output = fs.readFileSync(log, "utf8");
  expect(output).toMatch(/git clone https:\/\/user:/);
});
