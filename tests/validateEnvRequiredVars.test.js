const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const script = path.join("scripts", "validate-env.sh");
const repoRoot = path.resolve(__dirname, "..");

const baseEnv = {
  PATH: process.env.PATH,
  HOME: process.env.HOME,
  AWS_ACCESS_KEY_ID: "id",
  AWS_SECRET_ACCESS_KEY: "secret",
  DB_URL: "postgres://user:pass@localhost/db",
  STRIPE_SECRET_KEY: "sk_test",
  HF_TOKEN: "token",
  CLOUDFRONT_MODEL_DOMAIN: "cdn.test",
  SKIP_NET_CHECKS: "1",
  SKIP_DB_CHECK: "1",
  npm_config_http_proxy: "",
  npm_config_https_proxy: "",
};

const required = [
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "DB_URL",
  "STRIPE_SECRET_KEY",
];

function withEnvFilesHidden(fn) {
  const files = [".env", ".env.example"].map((f) => path.join(repoRoot, f));
  const backups = [];
  for (const f of files) {
    if (fs.existsSync(f)) {
      const b = `${f}.bak`;
      fs.renameSync(f, b);
      backups.push([f, b]);
    }
  }
  try {
    return fn();
  } finally {
    for (const [orig, bak] of backups) {
      fs.renameSync(bak, orig);
    }
  }
}

function run(env) {
  return spawnSync("bash", [script], { env, encoding: "utf8" });
}

describe("validate-env required vars", () => {
  for (const name of required) {
    test(`fails without ${name}`, () => {
      const env = { ...baseEnv };
      delete env[name];
      const result = withEnvFilesHidden(() => run(env));
      expect(result.status).not.toBe(0);
      expect(result.stdout + result.stderr).toMatch(
        new RegExp(`${name}.*must be set`),
      );
    });
  }

  test("succeeds when all vars present", () => {
    const result = withEnvFilesHidden(() => run(baseEnv));
    expect(result.status).toBe(0);
    expect(result.stdout + result.stderr).toContain("environment OK");
  });
});
