const { spawnSync } = require("child_process");

function run(env) {
  return spawnSync(
    "bash",
    [
      "-c",
      'source scripts/validate-env.sh >/dev/null && echo -n "$HF_API_KEY $S3_BUCKET_NAME"',
    ],
    {
      env: { SKIP_NET_CHECKS: "1", SKIP_DB_CHECK: "1", ...env },
      encoding: "utf8",
    },
  );
}

test("does not override conflicting variables", () => {
  const res = run({
    HF_TOKEN: "tok1",
    HF_API_KEY: "tok2",
    AWS_ACCESS_KEY_ID: "id",
    AWS_SECRET_ACCESS_KEY: "secret",
    DB_URL: "postgres://user:pass@localhost/db",
    STRIPE_SECRET_KEY: "sk_test",
    CLOUDFRONT_MODEL_DOMAIN: "cdn.test",
    S3_BUCKET: "bucket",
    S3_BUCKET_NAME: "name",
  });
  expect(res.status).toBe(0);
  expect(res.stdout).toBe("tok2 name");
});
