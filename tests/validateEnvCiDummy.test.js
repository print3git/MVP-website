const { spawnSync } = require("child_process");

function run(env) {
  return spawnSync("npm", ["run", "-s", "validate-env"], {
    env,
    encoding: "utf8",
  });
}

describe("validate-env CI defaults", () => {
  test("npm run validate-env succeeds under CI with dummy vars", () => {
    const env = {
      ...process.env,
      CI: "1",
      AWS_ACCESS_KEY_ID: "id",
      SKIP_NET_CHECKS: "1",
      SKIP_PW_DEPS: "1",
      npm_config_http_proxy: "",
      npm_config_https_proxy: "",
    };
    const result = run(env);
    expect(result.status).toBe(0);
    const output = result.stdout + result.stderr;
    expect(output).toContain("environment OK");
  });
});
