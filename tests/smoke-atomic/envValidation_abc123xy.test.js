const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const script = path.join(__dirname, "..", "..", "scripts", "validate-env.sh");

const baseEnv = {
  PATH: process.env.PATH,
  HOME: process.env.HOME,
  AWS_ACCESS_KEY_ID: "id",
  AWS_SECRET_ACCESS_KEY: "secret",
  DB_URL: "postgres://user:pass@localhost/db",
  STRIPE_SECRET_KEY: "sk_test",
  SKIP_NET_CHECKS: "1",
  SKIP_DB_CHECK: "1",
  npm_config_http_proxy: "",
  npm_config_https_proxy: "",
};

function withEnvFilesHidden(fn) {
  const repo = path.resolve(__dirname, "../..");
  const files = [".env", ".env.example"].map((f) => path.join(repo, f));
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

describe("validate-env script", () => {
  function run(env) {
    return spawnSync("bash", [script], { env, encoding: "utf8" });
  }

  test("fails when AWS_ACCESS_KEY_ID missing", () => {
    const env = { ...baseEnv };
    delete env.AWS_ACCESS_KEY_ID;
    const result = withEnvFilesHidden(() => run(env));
    expect(result.status).not.toBe(0);
    expect(result.stdout + result.stderr).toMatch(
      /AWS_ACCESS_KEY_ID.*must be set/,
    );
  });

  test("succeeds when all vars present", () => {
    const result = withEnvFilesHidden(() => run(baseEnv));
    expect(result.status).toBe(0);
    expect(result.stdout + result.stderr).toMatch(/environment OK/);
  });
});
