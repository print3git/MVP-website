const { execSync, spawnSync } = require("child_process");
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
  return execSync("npm run validate-env 2>&1", {
    cwd: root,
    env: e,
    stdio: "pipe",
  }).toString();
}

function runGetHFAPIKey(env) {
  const e = { ...process.env, SKIP_NET_CHECKS: "1", ...env };
  delete e.npm_config_http_proxy;
  delete e.npm_config_https_proxy;
  delete e.http_proxy;
  delete e.https_proxy;
  return spawnSync(
    "bash",
    [
      "-c",
      'source scripts/validate-env.sh >/dev/null && echo -n "$HF_API_KEY"',
    ],
    { cwd: root, env: e, encoding: "utf8" },
  ).stdout;
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
      SKIP_DB_CHECK: "1",
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
      SKIP_DB_CHECK: "1",
    });
    expect(output).toContain("Using dummy HF_TOKEN and HF_API_KEY");
    expect(output).toContain("environment OK");
  });

  test("exports HF_API_KEY when absent", () => {
    const key = runGetHFAPIKey({
      STRIPE_TEST_KEY: "test",
      HF_TOKEN: "",
      HF_API_KEY: "",
      AWS_ACCESS_KEY_ID: "id",
      AWS_SECRET_ACCESS_KEY: "secret",
      DB_URL: "postgres://user:pass@localhost/db",
      STRIPE_SECRET_KEY: "sk_test_dummy",
      SKIP_DB_CHECK: "1",
    });
    expect(key).toMatch(/^hf_dummy_/);
  });

  test("falls back when database unreachable", () => {
    const output = run({
      STRIPE_TEST_KEY: "test",
      HF_TOKEN: "token",
      AWS_ACCESS_KEY_ID: "id",
      AWS_SECRET_ACCESS_KEY: "secret",
      DB_URL: "postgres://user:pass@127.0.0.1:9/db",
      SKIP_NET_CHECKS: "1",
    });
    expect(output).toMatch(/Database connection check failed/);
    expect(output).toMatch(/Falling back to SKIP_DB_CHECK=1/);
    expect(output).toMatch(/environment OK/);
  });
});
