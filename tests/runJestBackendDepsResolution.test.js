const { execFileSync } = require("child_process");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const script = path.join("scripts", "run-jest.js");

const env = {
  ...process.env,
  HF_TOKEN: "test",
  AWS_ACCESS_KEY_ID: "id",
  AWS_SECRET_ACCESS_KEY: "secret",
  SKIP_NET_CHECKS: "1",
};

delete env.npm_config_http_proxy;
delete env.npm_config_https_proxy;

test("run-jest resolves backend node_modules for root tests", () => {
  expect(() =>
    execFileSync("node", [script, "tests/dummyBackendDeps.test.js"], {
      cwd: repoRoot,
      stdio: "inherit",
      env,
    }),
  ).not.toThrow();
});
