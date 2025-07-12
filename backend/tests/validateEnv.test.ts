const { execSync } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "..", "..");

function run(env, clean = true) {
  const e = { ...process.env, ...env };
  if (clean) {
    delete e.npm_config_http_proxy;
    delete e.npm_config_https_proxy;
    delete e.http_proxy;
    delete e.https_proxy;
  }
  return execSync("npm run validate-env", {
    cwd: root,
    env: e,
    stdio: "pipe",
  }).toString();
}

describe("validate-env script", () => {
  test("succeeds when required vars set and proxies unset", () => {
    const output = run({
      STRIPE_TEST_KEY: "test",
      HF_TOKEN: "token",
      AWS_ACCESS_KEY_ID: "id",
      AWS_SECRET_ACCESS_KEY: "secret",
      SKIP_NET_CHECKS: "1",
    });
    expect(output).toContain("environment OK");
  });

  test("fails when proxy variables are present", () => {
    expect(() =>
      run(
        {
          STRIPE_TEST_KEY: "test",
          HF_TOKEN: "token",
          AWS_ACCESS_KEY_ID: "id",
          AWS_SECRET_ACCESS_KEY: "secret",
          SKIP_NET_CHECKS: "1",
          npm_config_http_proxy: "http://proxy",
        },
        false,
      ),
    ).toThrow();
  });
});
