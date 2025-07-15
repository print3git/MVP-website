const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

describe("load_env_file handling", () => {
  const root = path.resolve(__dirname, "..");
  const envFile = path.join(root, ".env");
  const baseEnv = {
    AWS_ACCESS_KEY_ID: "id",
    AWS_SECRET_ACCESS_KEY: "secret",
    DB_URL: "postgres://user:pass@localhost/db",
    STRIPE_SECRET_KEY: "sk",
    CLOUDFRONT_MODEL_DOMAIN: "cdn",
    SKIP_DB_CHECK: "1",
    SKIP_NET_CHECKS: "1",
  };

  afterEach(() => {
    if (fs.existsSync(envFile)) fs.unlinkSync(envFile);
  });

  test("first duplicate wins", () => {
    fs.writeFileSync(envFile, "FOO=first\nFOO=second\n");
    const result = spawnSync(
      "bash",
      ["-c", "source scripts/check-env.sh >/dev/null && echo -n $FOO"],
      {
        cwd: root,
        env: { ...process.env, ...baseEnv },
        encoding: "utf8",
      },
    );
    expect(result.stdout).toBe("first");
  });

  test("existing env vars are not overwritten", () => {
    fs.writeFileSync(envFile, "BAR=fromfile\n");
    const result = spawnSync(
      "bash",
      ["-c", "BAR=pre source scripts/check-env.sh >/dev/null && echo -n $BAR"],
      {
        cwd: root,
        env: { ...process.env, ...baseEnv },
        encoding: "utf8",
        shell: "/bin/bash",
      },
    );
    expect(result.stdout).toBe("pre");
  });
});
