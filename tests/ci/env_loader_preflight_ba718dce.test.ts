const { writeFileSync, unlinkSync } = require("fs");
const { execSync } = require("child_process");
const { tmpdir } = require("os");
const { join } = require("path");
const crypto = require("crypto");

test("env loader respects exported values over .env", () => {
  const tmp = join(
    tmpdir(),
    `env-preflight-${crypto.randomBytes(4).toString("hex")}.env`,
  );
  writeFileSync(tmp, "STRIPE_SECRET_KEY=\nSTRIPE_WEBHOOK_SECRET=\n");
  const env = {
    ...process.env,
    STRIPE_SECRET_KEY: "sk_live_xxx",
    STRIPE_WEBHOOK_SECRET: "whsec_xxx",
  };
  const out = execSync(`node scripts/env-loader-preflight.js ${tmp}`, { env })
    .toString()
    .trim()
    .split("\n");
  unlinkSync(tmp);
  expect(out).toEqual(["true", "true"]);
});
