import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";

const repoRoot = path.resolve(__dirname, "..");
const envFile = path.join(repoRoot, ".env");

function runValidate(env) {
  return spawnSync("bash", ["scripts/validate-env.sh"], {
    cwd: repoRoot,
    env,
    encoding: "utf8",
  });
}

describe("env validation and mise install", () => {
  const baseEnv = {
    AWS_ACCESS_KEY_ID: "id",
    AWS_SECRET_ACCESS_KEY: "secret",
    DB_URL: "postgres://u:p@h/db",
    STRIPE_SECRET_KEY: "sk_test",
    CLOUDFRONT_MODEL_DOMAIN: "cdn.test",
    SKIP_DB_CHECK: "1",
    SKIP_NET_CHECKS: "1",
    PATH: process.env.PATH || "",
  };

  let envBackup = null;

  beforeAll(() => {
    if (fs.existsSync(envFile)) {
      envBackup = fs.readFileSync(envFile, "utf8");
    }
    fs.writeFileSync(
      envFile,
      [
        "AWS_ACCESS_KEY_ID=id",
        "AWS_SECRET_ACCESS_KEY=secret",
        "DB_URL=postgres://u:p@h/db",
        "STRIPE_SECRET_KEY=sk_test",
        "CLOUDFRONT_MODEL_DOMAIN=cdn.test",
      ].join("\n") + "\n",
    );
  });

  afterAll(() => {
    if (envBackup !== null) {
      fs.writeFileSync(envFile, envBackup);
    } else if (fs.existsSync(envFile)) {
      fs.unlinkSync(envFile);
    }
  });

  test("validate-env succeeds with required vars", () => {
    const result = runValidate({ ...process.env, ...baseEnv });
    const output = result.stdout + result.stderr;
    expect(result.status).toBe(0);
    for (const name of [
      "AWS_ACCESS_KEY_ID",
      "AWS_SECRET_ACCESS_KEY",
      "DB_URL",
      "STRIPE_SECRET_KEY",
    ]) {
      expect(output).toContain(`Checking ${name}`);
    }
    expect(output).toContain("environment OK");
  });

  test("logs install failure when mise download fails", () => {
    const toolsDir = fs.mkdtempSync(path.join(repoRoot, "tmp-tools-"));
    const fakeCurl = path.join(toolsDir, "curl");
    fs.writeFileSync(fakeCurl, '#!/usr/bin/env bash\necho "404" >&2\nexit 22');
    fs.chmodSync(fakeCurl, 0o755);
    for (const cmd of [
      "bash",
      "dirname",
      "mkdir",
      "rm",
      "chmod",
      "grep",
      "sleep",
    ]) {
      fs.symlinkSync(`/usr/bin/${cmd}`, path.join(toolsDir, cmd));
    }
    const env = { ...process.env, ...baseEnv, PATH: toolsDir };
    const result = runValidate(env);
    expect(result.status).not.toBe(0);
    expect((result.stdout || "") + (result.stderr || "")).toMatch(/404/);
  });

  test("env file contains required entries", () => {
    const content = fs.readFileSync(envFile, "utf8");
    for (const key of [
      "AWS_ACCESS_KEY_ID",
      "AWS_SECRET_ACCESS_KEY",
      "DB_URL",
      "STRIPE_SECRET_KEY",
    ]) {
      expect(content).toMatch(new RegExp(`^${key}=`, "m"));
    }
  });
});
