import path from "path";
import { spawnSync } from "child_process";

const script = path.resolve(__dirname, "../../scripts/ci-env-preflight.js");
const node = process.execPath;

describe("ci env preflight", () => {
  test("fails when required envs missing", () => {
    const result = spawnSync(node, [script], {
      env: {},
      encoding: "utf8",
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/Missing required env vars for CI/);
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
    expect(result.stdout.trim()).toBe("mock");
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
    expect(result.stdout.trim()).toBe("missing");
  });
});
