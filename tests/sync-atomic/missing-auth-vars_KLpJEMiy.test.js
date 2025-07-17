const { spawnSync } = require("child_process");
const path = require("path");
const { setup } = require("./helpers");

test("fails when auth vars missing", () => {
  const { tmp, env } = setup({ HF_TOKEN: "", HF_API_KEY: "" });
  const script = path.resolve(__dirname, "../../scripts/setup_space.sh");
  const res = spawnSync("bash", [script], { env, cwd: tmp, encoding: "utf8" });
  expect(res.status).not.toBe(0);
  expect(res.stderr).toMatch(/HF_TOKEN or HF_API_KEY/);
});
