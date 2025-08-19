const { execSync } = require("child_process");
const { readFileSync, unlinkSync } = require("fs");
const { tmpdir } = require("os");
const { join } = require("path");
const crypto = require("crypto");

test("ci-env-preflight uses mock stripe secrets when absent", () => {
  const tmp = join(tmpdir(), `ci-env-${crypto.randomBytes(4).toString("hex")}`);
  const env = { ...process.env };
  delete env.STRIPE_SECRET_KEY;
  delete env.STRIPE_WEBHOOK_SECRET;
  env.GITHUB_ENV = tmp;
  env.AWS_ACCESS_KEY_ID = "x";
  env.AWS_SECRET_ACCESS_KEY = "y";
  env.DB_URL = "postgres://user:pass@localhost/db";
  execSync("node scripts/ci-env-preflight.js", { env });
  const out = readFileSync(tmp, "utf8");
  unlinkSync(tmp);
  expect(out).toMatch(/STRIPE_SECRET_KEY=sk_test_mock/);
  expect(out).toMatch(/STRIPE_WEBHOOK_SECRET=whsec_mock/);
});

test("ci-env-preflight fails when stripe secrets required", () => {
  const tmp = join(tmpdir(), `ci-env-${crypto.randomBytes(4).toString("hex")}`);
  const env = { ...process.env };
  delete env.STRIPE_SECRET_KEY;
  delete env.STRIPE_WEBHOOK_SECRET;
  env.GITHUB_ENV = tmp;
  env.CI_REQUIRE_EXTERNAL = "1";
  env.AWS_ACCESS_KEY_ID = "x";
  env.AWS_SECRET_ACCESS_KEY = "y";
  env.DB_URL = "postgres://user:pass@localhost/db";
  expect(() => execSync("node scripts/ci-env-preflight.js", { env })).toThrow();
  if (require("fs").existsSync(tmp)) unlinkSync(tmp);
});
