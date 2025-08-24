const { spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const script = path.join(__dirname, "..", "..", "scripts", "validate-env.sh");

describe("validate-env script", () => {
  const baseEnv = {
    HF_TOKEN: "t",
    AWS_ACCESS_KEY_ID: "id",
    AWS_SECRET_ACCESS_KEY: "secret",
    DB_URL: "postgres://user:pass@localhost/db",
    STRIPE_SECRET_KEY: "sk_test",
    SKIP_NET_CHECKS: "1",
    SKIP_DB_CHECK: "1",
    http_proxy: "",
    https_proxy: "",
    npm_config_http_proxy: "",
    npm_config_https_proxy: "",
  };

  test("passes with STRIPE_TEST_KEY set", () => {
    const { status } = spawnSync("bash", [script], {
      env: { ...process.env, ...baseEnv, STRIPE_TEST_KEY: "sk_test" },
      stdio: "pipe",
    });
    expect(status).toBe(0);
  });

  test("passes with STRIPE_LIVE_KEY set", () => {
    const { status } = spawnSync("bash", [script], {
      env: {
        ...process.env,
        ...baseEnv,
        STRIPE_LIVE_KEY: "sk_live",
        STRIPE_TEST_KEY: "",
      },
      stdio: "pipe",
    });
    expect(status).toBe(0);
  });

  test("uses dummy stripe key when none provided", () => {
    const { status } = spawnSync("bash", [script], {
      env: {
        ...process.env,
        ...baseEnv,
        STRIPE_TEST_KEY: "",
        STRIPE_LIVE_KEY: "",
      },
      stdio: "pipe",
    });
    expect(status).toBe(0);
  });

  test("fails when npm proxy vars are set", () => {
    const { status } = spawnSync("bash", [script], {
      env: {
        ...process.env,
        ...baseEnv,
        STRIPE_TEST_KEY: "sk_test",
        npm_config_http_proxy: "http://proxy",
      },
      stdio: "pipe",
    });
    expect(status).not.toBe(0);
  });

  test("falls back to .env.example when DB_URL missing", () => {
    const env = { ...process.env, ...baseEnv };
    delete env.DB_URL;
    const { status } = spawnSync("bash", [script], { env, stdio: "pipe" });
    expect(status).toBe(0);
  });

  test("uses repo root env file when run from backend directory", () => {
    const env = { ...process.env, ...baseEnv };
    delete env.DB_URL;
    const { status } = spawnSync("bash", [script], {
      env,
      stdio: "pipe",
      cwd: path.join(__dirname, ".."),
    });
    expect(status).toBe(0);
  });

  test("fails when DB_URL missing and example file absent", () => {
    const env = { ...process.env, ...baseEnv, SKIP_DB_CHECK: "" };
    delete env.DB_URL;
    const example = path.resolve(__dirname, "..", "..", ".env.example");
    const backup = `${example}.bak`;
    if (!fs.existsSync(example)) {
      fs.writeFileSync(example, "");
    }
    fs.renameSync(example, backup);
    const { status } = spawnSync("bash", [script], { env, stdio: "pipe" });
    fs.renameSync(backup, example);
    expect(status).not.toBe(0);
  });

  test("fails when database unreachable", () => {
    const { stdout, stderr } = spawnSync("bash", [script], {
      env: {
        ...process.env,
        ...baseEnv,
        DB_URL: "postgres://user:pass@127.0.0.1:9/db",
        SKIP_NET_CHECKS: "1",
        SKIP_DB_CHECK: "",
      },
      encoding: "utf8",
    });
    const output = `${stdout}${stderr}`;
    expect(output).toMatch(/Database connection check failed/);
    expect(output).toMatch(/environment OK/);
  });
});
