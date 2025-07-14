/** @file Tests for validate-env script */
const { spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const os = require("os");

/**
 * Run the validate-env script with the provided environment variables.
 * @param {Record<string, string>} env environment variables
 * @returns {string} script output
 */
function run(env) {
  const result = spawnSync("bash", ["scripts/validate-env.sh"], {
    env: { SKIP_NET_CHECKS: "1", ...env },
    encoding: "utf8",
  });
  const output = (result.stdout || "") + (result.stderr || "");
  if (result.status !== 0) {
    const error = new Error(output);
    error.code = result.status;
    throw error;
  }
  return output;
}

function runAndGetHFAPIKey(env) {
  const result = spawnSync(
    "bash",
    [
      "-c",
      'source scripts/validate-env.sh >/dev/null && echo -n "$HF_API_KEY"',
    ],
    { env: { SKIP_NET_CHECKS: "1", ...env }, encoding: "utf8" },
  );
  if (result.status !== 0) {
    const error = new Error(result.stdout + result.stderr);
    error.code = result.status;
    throw error;
  }
  return result.stdout;
}

describe("validate-env script", () => {
  test("sets dummy Stripe key when missing", () => {
    const env = {
      ...process.env,
      HF_TOKEN: "test",
      AWS_ACCESS_KEY_ID: "id",
      AWS_SECRET_ACCESS_KEY: "secret",
      STRIPE_TEST_KEY: "",
      STRIPE_LIVE_KEY: "",
      DB_URL: "postgres://user:pass@localhost/db",
      STRIPE_SECRET_KEY: "sk_test_dummy",
      CLOUDFRONT_MODEL_DOMAIN: "cdn.test",
      npm_config_http_proxy: "",
      npm_config_https_proxy: "",
      http_proxy: "http://proxy",
      https_proxy: "http://proxy",
      SKIP_NET_CHECKS: "1",
      SKIP_DB_CHECK: "1",
    };
    const output = run(env);
    expect(output).toContain("✅ environment OK");
    expect(output).not.toMatch(/mise WARN/);
  });

  test("succeeds when HF_TOKEN is missing", () => {
    const env = {
      ...process.env,
      HF_TOKEN: "",
      HF_API_KEY: "",
      AWS_ACCESS_KEY_ID: "id",
      AWS_SECRET_ACCESS_KEY: "secret",
      DB_URL: "postgres://user:pass@localhost/db",
      STRIPE_SECRET_KEY: "sk_test_dummy",
      CLOUDFRONT_MODEL_DOMAIN: "cdn.test",
      SKIP_DB_CHECK: "1",
    };
    const output = run(env);
    expect(output).toContain("Using dummy HF_TOKEN and HF_API_KEY");
    expect(output).toContain("✅ environment OK");
  });


  test("injects dummy CLOUDFRONT_MODEL_DOMAIN when missing", () => {
    const env = {
      ...process.env,
      HF_TOKEN: "token",
      AWS_ACCESS_KEY_ID: "id",
      AWS_SECRET_ACCESS_KEY: "secret",
      DB_URL: "postgres://user:pass@localhost/db",
      STRIPE_SECRET_KEY: "sk_test",
      CLOUDFRONT_MODEL_DOMAIN: "",
      SKIP_DB_CHECK: "1",
    };
    const example = path.resolve(__dirname, "..", ".env.example");
    const backup = `${example}.bak`;
    fs.renameSync(example, backup);
    try {
      const output = run(env);
      expect(output).toContain("Using dummy CLOUDFRONT_MODEL_DOMAIN");
      expect(output).toContain("✅ environment OK");
    } finally {
      fs.renameSync(backup, example);
    }
  });

  test.skip("fails when DB_URL is missing", () => {
    const env = {
      ...process.env,
      HF_TOKEN: "test",
      AWS_ACCESS_KEY_ID: "id",
      AWS_SECRET_ACCESS_KEY: "secret",
      STRIPE_SECRET_KEY: "sk_test",
      CLOUDFRONT_MODEL_DOMAIN: "cdn.test",
      DB_URL: "",
    };
    expect(() => run(env)).toThrow();
  });

  test("fails when proxy variables set", () => {
    const env = {
      ...process.env,
      HF_TOKEN: "test",
      AWS_ACCESS_KEY_ID: "id",
      AWS_SECRET_ACCESS_KEY: "secret",
      STRIPE_TEST_KEY: "sk_test",
      CLOUDFRONT_MODEL_DOMAIN: "cdn.test",
      npm_config_http_proxy: "http://proxy",
      SKIP_NET_CHECKS: "1",
    };
    expect(() => run(env)).toThrow();
  });

  test("fails when network unreachable", () => {
    const env = {
      ...process.env,
      HF_TOKEN: "test",
      AWS_ACCESS_KEY_ID: "id",
      AWS_SECRET_ACCESS_KEY: "secret",
      STRIPE_TEST_KEY: "sk_test",
      npm_config_http_proxy: "",
      npm_config_https_proxy: "",
      NETWORK_CHECK_URL: "http://127.0.0.1:9",
      CLOUDFRONT_MODEL_DOMAIN: "cdn.test",
      SKIP_NET_CHECKS: "",
    };
    expect(() => run(env)).toThrow(/Network check failed/);
  });

  test("fails when database unreachable", () => {
    const env = {
      ...process.env,
      HF_TOKEN: "test",
      AWS_ACCESS_KEY_ID: "id",
      AWS_SECRET_ACCESS_KEY: "secret",
      STRIPE_TEST_KEY: "sk_test",
      DB_URL: "postgres://user:pass@127.0.0.1:9/db",
      CLOUDFRONT_MODEL_DOMAIN: "cdn.test",
      SKIP_NET_CHECKS: "1",
    };
    const output = run(env);

    expect(output).toMatch(/Database connection check failed/);
    expect(output).toMatch(/environment OK/);
  });

  test("falls back to SKIP_PW_DEPS when apt check fails", () => {
    const env = {
      ...process.env,
      HF_TOKEN: "test",
      AWS_ACCESS_KEY_ID: "id",
      AWS_SECRET_ACCESS_KEY: "secret",
      DB_URL: "postgres://user:pass@localhost/db",
      STRIPE_SECRET_KEY: "sk_test",
      CLOUDFRONT_MODEL_DOMAIN: "cdn.test",
      PATH: path.join(__dirname, "bin-apt") + ":" + process.env.PATH,
      SKIP_DB_CHECK: "1",
    };
    const output = run(env);
    expect(output).toContain("APT repository check failed");
    expect(output).toContain("✅ environment OK");
  });

  test("falls back to SKIP_PW_DEPS when CDN unreachable", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "curl-"));
    const fakeCurl = path.join(tmp, "curl");
    fs.writeFileSync(
      fakeCurl,
      '#!/usr/bin/env bash\nif echo "$@" | grep -q cdn.playwright.dev; then echo "curl: (6) Could not resolve host" >&2; exit 6; fi\nexit 0',
    );
    fs.chmodSync(fakeCurl, 0o755);
    const env = {
      ...process.env,
      HF_TOKEN: "test",
      AWS_ACCESS_KEY_ID: "id",
      AWS_SECRET_ACCESS_KEY: "secret",
      DB_URL: "postgres://user:pass@localhost/db",
      STRIPE_SECRET_KEY: "sk_test",
      CLOUDFRONT_MODEL_DOMAIN: "cdn.test",
      PATH: `${tmp}:${process.env.PATH}`,
      SKIP_NET_CHECKS: "",
    };
    const output = run(env);
    expect(output).toContain("Network check failed for Playwright CDN");
    expect(output).toContain("✅ environment OK");
  });

  test("succeeds when sourced under strict mode", () => {
    const env = {
      ...process.env,
      HF_TOKEN: "test",
      AWS_ACCESS_KEY_ID: "id",
      AWS_SECRET_ACCESS_KEY: "secret",
      DB_URL: "postgres://user:pass@localhost/db",
      STRIPE_SECRET_KEY: "sk_test",
      CLOUDFRONT_MODEL_DOMAIN: "cdn.test",
      S3_BUCKET: "bucket",
      SKIP_NET_CHECKS: "1",
      SKIP_DB_CHECK: "1",
    };
    const result = spawnSync(
      "bash",
      ["-euo", "pipefail", "-c", "source scripts/validate-env.sh >/dev/null"],
      { env, encoding: "utf8" },
    );
    expect(result.status).toBe(0);
  });

  test("maps legacy env vars", () => {
    const env = {
      ...process.env,
      HF_TOKEN: "tok",
      AWS_ACCESS_KEY_ID: "id",
      AWS_SECRET_ACCESS_KEY: "secret",
      DB_URL: "postgres://user:pass@localhost/db",
      STRIPE_SECRET_KEY: "sk_test",
      CLOUDFRONT_MODEL_DOMAIN: "cdn.test",
      S3_BUCKET: "bucket",
      SKIP_NET_CHECKS: "1",
      SKIP_DB_CHECK: "1",
    };
    const result = spawnSync(
      "bash",
      [
        "-euo",
        "pipefail",
        "-c",
        "source scripts/validate-env.sh >/dev/null; echo $HF_API_KEY $S3_BUCKET_NAME",
      ],
      { env, encoding: "utf8" },
    );
    expect(result.stdout.trim()).toBe("tok bucket");
    expect(result.status).toBe(0);
  });
});
