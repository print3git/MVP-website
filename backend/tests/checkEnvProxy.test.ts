const { execFileSync } = require("child_process");
const path = require("path");

describe("check-env proxy vars", () => {
  test("fails when npm proxy variables set", () => {
    const env = {
      ...process.env,
      npm_config_http_proxy: "http://proxy",
      npm_config_https_proxy: "http://proxy",
      HF_TOKEN: "x",
      AWS_ACCESS_KEY_ID: "id",
      AWS_SECRET_ACCESS_KEY: "secret",
      DB_URL: "db",
      STRIPE_SECRET_KEY: "sk",
      CLOUDFRONT_MODEL_DOMAIN: "cdn",
      SKIP_NET_CHECKS: "1",
    };
    expect(() => {
      execFileSync(
        "bash",
        [path.join(__dirname, "..", "..", "scripts", "check-env.sh")],
        { env, encoding: "utf8" },
      );
    }).toThrow(/npm proxy variables must be unset/);
  });
});
