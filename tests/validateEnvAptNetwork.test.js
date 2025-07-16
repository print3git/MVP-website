const { spawnSync } = require("child_process");

function run(env) {
  const result = spawnSync("bash", ["scripts/validate-env.sh"], {
    env,
    encoding: "utf8",
  });
  const output = (result.stdout || "") + (result.stderr || "");
  if (result.status !== 0) {
    const error = new Error(output);
    error.code = result.status;
    throw error;
  }
  return output;
}

describe("validate-env apt network", () => {
  test("skips network failure for apt after fallback", () => {
    const env = {
      ...process.env,
      HF_TOKEN: "tok",
      AWS_ACCESS_KEY_ID: "id",
      AWS_SECRET_ACCESS_KEY: "secret",
      DB_URL: "postgres://user:pass@localhost/db",
      STRIPE_SECRET_KEY: "sk_test",
      CLOUDFRONT_MODEL_DOMAIN: "cdn.test",
      APT_CHECK_URL: "http://127.0.0.1:9",
      SKIP_NET_CHECKS: "",
    };
    const output = run(env);
    expect(output).toContain("APT repository check failed");
    expect(output).toContain("✅ environment OK");
  });
});
