const { execSync } = require("child_process");

const TIMEOUT = 5 * 60 * 1000;
const runStage = process.env.RUN_SMOKE_STAGES ? test : test.skip;

function run(command) {
  const env = {
    ...process.env,
    HF_TOKEN: "test",
    AWS_ACCESS_KEY_ID: "id",
    AWS_SECRET_ACCESS_KEY: "secret",
    DB_URL: "postgres://user:pass@localhost/db",
    STRIPE_SECRET_KEY: "sk_test",
    STRIPE_WEBHOOK_SECRET: "whsec",
    CLOUDFRONT_MODEL_DOMAIN: "cdn.test",
    SKIP_PW_DEPS: "1",
    SKIP_NET_CHECKS: "1",
    SKIP_DB_CHECK: "1",
  };
  delete env.npm_config_http_proxy;
  delete env.npm_config_https_proxy;
  execSync(command, { stdio: "inherit", env });
}

describe("smoke stages", () => {
  runStage(
    "install",
    () => {
      run("npm ci");
    },
    TIMEOUT,
  );

  runStage(
    "build",
    () => {
      run("npm run build");
    },
    TIMEOUT,
  );

  runStage(
    "lint",
    () => {
      run("npm run lint");
    },
    TIMEOUT,
  );

  runStage(
    "typecheck",
    () => {
      run("npm run typecheck");
    },
    TIMEOUT,
  );

  runStage(
    "unit",
    () => {
      run("npm test --prefix backend");
    },
    TIMEOUT,
  );

  runStage(
    "integration",
    () => {
      run("npm run smoke");
    },
    TIMEOUT,
  );
});
