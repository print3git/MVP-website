import { spawnSync } from "child_process";
import path from "path";

const required = [
  "STRIPE_PUBLISHABLE_KEY",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
];

function assertFrontendEnv() {
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length) {
    throw new Error(`Missing frontend env vars: ${missing.join(", ")}`);
  }
}

describe("frontend build env check", () => {
  test("all required vars defined", () => {
    assertFrontendEnv();
    const result = spawnSync("npm", ["run", "build"], {
      cwd: path.resolve(__dirname, ".."),
      env: process.env,
      encoding: "utf8",
    });
    expect(result.status).toBe(0);
  });
});
