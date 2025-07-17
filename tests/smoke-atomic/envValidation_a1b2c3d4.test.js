const { spawnSync } = require("child_process");
const path = require("path");

test("validate-env fails without DB_URL and succeeds when present", () => {
  const script = path.join(__dirname, "..", "..", "scripts", "validate-env.sh");
  const missing = spawnSync("bash", [script], {
    env: {
      ...process.env,
      AWS_ACCESS_KEY_ID: "id",
      AWS_SECRET_ACCESS_KEY: "secret",
      STRIPE_SECRET_KEY: "sk_test",
      CLOUDFRONT_MODEL_DOMAIN: "cdn.test",
      DB_URL: "",
      SKIP_NET_CHECKS: "1",
    },
    encoding: "utf8",
  });
  expect(missing.status).not.toBe(0);
  expect(missing.stdout + missing.stderr).toMatch(/DB_URL must be set/);

  const ok = spawnSync("bash", [script], {
    env: {
      ...process.env,
      AWS_ACCESS_KEY_ID: "id",
      AWS_SECRET_ACCESS_KEY: "secret",
      STRIPE_SECRET_KEY: "sk_test",
      CLOUDFRONT_MODEL_DOMAIN: "cdn.test",
      DB_URL: "postgres://user:pass@localhost/db",
      SKIP_NET_CHECKS: "1",
      SKIP_DB_CHECK: "1",
    },
    encoding: "utf8",
  });
  expect(ok.status).toBe(0);
  expect(ok.stdout + ok.stderr).toMatch(/environment OK/);
});
