const { spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const root = path.resolve(__dirname, "..", "..");

function run(env, clean = true) {
  const e = { ...process.env, SKIP_NET_CHECKS: "1", ...env };
  if (clean) {
    delete e.npm_config_http_proxy;
    delete e.npm_config_https_proxy;
    delete e.http_proxy;
    delete e.https_proxy;
  }
  e.SKIP_NET_CHECKS = "1";
  if (!Object.prototype.hasOwnProperty.call(e, "SKIP_DB_CHECK")) {
    e.SKIP_DB_CHECK = "1";
  }
  const res = spawnSync("npm", ["run", "validate-env", "2>&1"], {
    cwd: root,
    env: e,
    shell: true,
    encoding: "utf8",
  });
  if (res.status !== 0) {
    const err = new Error(res.stdout);
    err.code = res.status;
    throw err;
  }
  return res.stdout;
}

describe("validate-env script", () => {
  test("succeeds when required vars set and proxies unset", () => {
    const output = run({
      STRIPE_TEST_KEY: "test",
      HF_TOKEN: "token",
      AWS_ACCESS_KEY_ID: "id",
      AWS_SECRET_ACCESS_KEY: "secret",
      DB_URL: "postgres://user:pass@localhost/db",
      STRIPE_SECRET_KEY: "sk_test_dummy",
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

  test("succeeds when HF_TOKEN is missing", () => {
    const output = run({
      STRIPE_TEST_KEY: "test",
      HF_TOKEN: "",
      HF_API_KEY: "",
      AWS_ACCESS_KEY_ID: "id",
      AWS_SECRET_ACCESS_KEY: "secret",
    });
    expect(output).toContain("environment OK");
  });
});
