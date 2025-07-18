import { spawnSync } from "child_process";
import * as path from "path";
import * as fs from "fs";

const repoRoot = path.join(__dirname, "..", "..");
const script = path.join(repoRoot, "scripts", "run-coverage.js");
const stub = path.join(__dirname, "stubValidateFail.js");

function runCoverage() {
  const env = {
    ...process.env,
    NODE_OPTIONS: `--require ${stub}`,
    HF_TOKEN: "x",
    AWS_ACCESS_KEY_ID: "id",
    AWS_SECRET_ACCESS_KEY: "secret",
    DB_URL: "db",
    STRIPE_SECRET_KEY: "sk",
    SKIP_NET_CHECKS: "1",
    SKIP_PW_DEPS: "1",
  } as NodeJS.ProcessEnv;
  return spawnSync(
    process.execPath,
    [script, "--runTestsByPath", "backend/tests/coverage/lcovParse.test.ts"],
    { env, encoding: "utf8" },
  );
}

describe("run-coverage env failure handling", () => {
  test("warns but continues when validate-env fails", () => {
    const result = runCoverage();
    expect(result.status).toBe(0);
    const output = result.stdout + result.stderr;
    expect(output).toMatch(/validate-env failed/);
    expect(output).toMatch(/Environment validation failed/);
  });
});
