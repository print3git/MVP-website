import { spawnSync } from "child_process";
import path from "path";

describe("env vars strictness", () => {
  test("server fails fast when critical vars missing", () => {
    const server = path.join(__dirname, "..", "backend", "server.js");
    const env = {
      ...process.env,
      NODE_ENV: "production",
      CLOUDFRONT_MODEL_DOMAIN: "example.com",
    };
    delete env.DB_URL;
    delete env.STRIPE_SECRET_KEY;
    delete env.STRIPE_WEBHOOK_SECRET;

    const start = Date.now();
    const res = spawnSync("node", [server], { env, encoding: "utf8" });
    const elapsed = Date.now() - start;

    const output = `${res.stdout}${res.stderr}`;
    expect(res.status).not.toBe(0);
    expect(output).toMatch(/DB_URL/);
    expect(output).toMatch(/STRIPE_SECRET_KEY/);
    expect(elapsed).toBeLessThan(5000);
  });
});
