const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

test("run-smoke fails when build artifacts are missing", () => {
  const artifactDir = path.join(__dirname, "..", "frontend", "dist");
  fs.rmSync(artifactDir, { recursive: true, force: true });
  const script = path.join(__dirname, "..", "scripts", "run-smoke.js");
  const env = {
    ...process.env,
    HF_TOKEN: "test",
    AWS_ACCESS_KEY_ID: "id",
    AWS_SECRET_ACCESS_KEY: "secret",
    DB_URL: "postgres://user:pass@localhost/db",
    STRIPE_SECRET_KEY: "sk_test",
    SKIP_SETUP: "1",
    SKIP_PW_DEPS: "1",
    SKIP_NET_CHECKS: "1",
    NODE_ENV: "production",
  };
  delete env.npm_config_http_proxy;
  delete env.npm_config_https_proxy;
  const result = spawnSync("node", [script], { encoding: "utf8", env });
  expect(result.status).not.toBe(0);
  const output = `${result.stdout}\n${result.stderr}`;
  expect(output).toMatch(/Missing frontend build artifact/);
});
