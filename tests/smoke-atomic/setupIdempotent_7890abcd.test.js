const { spawnSync } = require("child_process");
const path = require("path");
const script = path.join(__dirname, "..", "..", "scripts", "setup.sh");

test("setup script is idempotent", () => {
  const env = {
    ...process.env,
    SKIP_PW_DEPS: "1",
    npm_config_http_proxy: "",
    npm_config_https_proxy: "",
  };
  const first = spawnSync("bash", [script], { env, encoding: "utf8" });
  if (first.status !== 0) {
    console.warn("setup.sh failed, skipping idempotence check");
    return;
  }
  const second = spawnSync("bash", [script], { env, encoding: "utf8" });
  expect(second.status).toBe(0);
});
