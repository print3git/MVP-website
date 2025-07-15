const { execSync } = require("child_process");
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
    expect(() =>
      execSync(`bash ${script}`, {
        env: { ...process.env, ...baseEnv, STRIPE_TEST_KEY: "sk_test" },
        stdio: "pipe",
      }),
    ).not.toThrow();
  });

  test("passes with STRIPE_LIVE_KEY set", () => {
    expect(() =>
      execSync(`bash ${script}`, {
        env: {
          ...process.env,
          ...baseEnv,
          STRIPE_LIVE_KEY: "sk_live",
          STRIPE_TEST_KEY: "",
        },
        stdio: "pipe",
      }),
    ).not.toThrow();
  });

  test("uses dummy stripe key when none provided", () => {
    expect(() =>
      execSync(`bash ${script}`, {
        env: {
          ...process.env,
          ...baseEnv,
          STRIPE_TEST_KEY: "",
          STRIPE_LIVE_KEY: "",
        },
        stdio: "pipe",
      }),
    ).not.toThrow();
  });

  test("fails when npm proxy vars are set", () => {
    expect(() =>
      execSync(`bash ${script}`, {
        env: {
          ...process.env,
          ...baseEnv,
          STRIPE_TEST_KEY: "sk_test",
          npm_config_http_proxy: "http://proxy",
        },
        stdio: "pipe",
      }),
    ).toThrow();
  });

  test("falls back to .env.example when DB_URL missing", () => {
    const env = { ...process.env, ...baseEnv };
    delete env.DB_URL;
    expect(() =>
      execSync(`bash ${script}`, { env, stdio: "pipe" }),
    ).not.toThrow();
  });

  test("uses repo root env file when run from backend directory", () => {
    const env = { ...process.env, ...baseEnv };
    delete env.DB_URL;
    expect(() =>
      execSync(`bash ${script}`, {
        env,
        stdio: "pipe",
        cwd: path.join(__dirname, ".."),
      }),
    ).not.toThrow();
  });

  test("fails when DB_URL missing and example file absent", () => {
    const env = { ...process.env, ...baseEnv };
    delete env.DB_URL;
    const example = path.resolve(__dirname, "../../.env.example");
    const backup = `${example}.bak`;
    fs.renameSync(example, backup);
    let threw = false;
    try {
      execSync(`bash ${script}`, { env, stdio: "pipe" });
    } catch (_err) {
      threw = true;
    }
    fs.renameSync(backup, example);
    expect(threw).toBe(true);
  });

  test("fails when database unreachable", () => {
    const output = execSync(`bash ${script} 2>&1`, {
      env: {
        ...process.env,
        ...baseEnv,
        DB_URL: "postgres://user:pass@127.0.0.1:9/db",
        SKIP_NET_CHECKS: "1",
        SKIP_DB_CHECK: "",
      },
      stdio: "pipe",
    }).toString();
    expect(output).toMatch(/Database connection check failed/);
    expect(output).toMatch(/environment OK/);
  });
});
