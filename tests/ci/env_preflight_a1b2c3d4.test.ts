import path from "path";
import { spawnSync } from "child_process";
import fs from "fs";
import os from "os";

const script = path.resolve(__dirname, "../../scripts/ci-env-preflight.js");
const node = process.execPath;

describe("ci env preflight", () => {
  test("logs when required envs missing", () => {
    const result = spawnSync(node, [script], {
      env: {},
      encoding: "utf8",
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/STRIPE_SECRET_KEY missing/);
  });

  test("writes secrets to GITHUB_ENV when provided", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "env-"));
    const env = { GITHUB_ENV: path.join(tmp, "env"), CI: "1" };
    const result = spawnSync(node, [script], { env, encoding: "utf8" });
    expect(result.status).toBe(0);
    const content = fs.readFileSync(env.GITHUB_ENV, "utf8");
    expect(content).toMatch(/STRIPE_SECRET_KEY=/);
  });

  test("mocks stripe by default in CI", () => {
    const env = {
      AWS_ACCESS_KEY_ID: "a",
      AWS_SECRET_ACCESS_KEY: "b",
      DB_URL: "postgres://u:p@localhost/db",
      STRIPE_SECRET_KEY: "sk",
      STRIPE_WEBHOOK_SECRET: "whsec",
      CI: "1",
    };
    const result = spawnSync(
      node,
      [
        "-e",
        `require(${JSON.stringify(script)}); const Stripe=require('stripe'); const s=Stripe('k'); console.log(s.__mock?'mock':'real');`,
      ],
      { env, encoding: "utf8" },
    );
    const lines = result.stdout.trim().split(/\r?\n/);
    expect(lines.pop()).toBe("mock");
  });

  test("allows real stripe when CI_REQUIRE_EXTERNAL=1", () => {
    const env = {
      AWS_ACCESS_KEY_ID: "a",
      AWS_SECRET_ACCESS_KEY: "b",
      DB_URL: "postgres://u:p@localhost/db",
      STRIPE_SECRET_KEY: "sk",
      STRIPE_WEBHOOK_SECRET: "whsec",
      CI: "1",
      CI_REQUIRE_EXTERNAL: "1",
    };
    const result = spawnSync(
      node,
      [
        "-e",
        `require(${JSON.stringify(script)}); try { require('stripe'); console.log('loaded'); } catch { console.log('missing'); }`,
      ],
      { env, encoding: "utf8" },
    );
    const lines = result.stdout.trim().split(/\r?\n/);
    expect(lines.pop()).toBe("missing");
  });
});
