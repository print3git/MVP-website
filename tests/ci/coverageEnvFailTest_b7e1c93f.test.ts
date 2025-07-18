/**
 * @ciOnly
 */
import { execFileSync } from "child_process";

test("run-coverage fails with env error", () => {
  const env = {
    ...process.env,
    SKIP_NET_CHECKS: "1",
    SKIP_DB_CHECK: "1",
    SKIP_PW_DEPS: "1",
    AWS_ACCESS_KEY_ID: "id",
    AWS_SECRET_ACCESS_KEY: "secret",
    DB_URL: "db",
    STRIPE_SECRET_KEY: "sk",
    npm_config_http_proxy: "http://bad",
  };
  let err;
  try {
    execFileSync(
      "node",
      ["scripts/run-coverage.js", "backend/tests/awsCredentials.test.ts"],
      { env, encoding: "utf8", stdio: "pipe" },
    );
  } catch (e) {
    err = e;
  }
  expect(err).toBeTruthy();
  const output = (err.stdout || "") + (err.stderr || "");
  expect(output).toContain("npm proxy variables must be unset");
  expect(output).not.toMatch(/\n\s+at /);
});
