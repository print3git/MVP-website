#!/usr/bin/env node
const fs = require("fs");

const required = ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "DB_URL"];
const stripeVars = ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"];

let missing = required.filter((v) => !process.env[v]);

if (process.env.CI_REQUIRE_EXTERNAL === "1") {
  missing = missing.concat(stripeVars.filter((v) => !process.env[v]));
}

if (missing.length) {
  console.error(`Missing required env vars for CI: ${missing.join(", ")}`);
  process.exit(1);
}

const mocked = [];
for (const key of stripeVars) {
  if (!process.env[key]) {
    process.env[key] =
      key === "STRIPE_SECRET_KEY" ? "sk_test_mock" : "whsec_mock";
    mocked.push(key);
  }
  fs.appendFileSync(process.env.GITHUB_ENV, `${key}=${process.env[key]}\n`);
}

for (const key of required) {
  fs.appendFileSync(process.env.GITHUB_ENV, `${key}=${process.env[key]}\n`);
}

mocked.forEach((k) => console.log(`Mocked ${k}`));
stripeVars
  .filter((k) => !mocked.includes(k))
  .forEach((k) => console.log(`Using live ${k}`));

if (process.env.CI && process.env.CI_REQUIRE_EXTERNAL !== "1") {
  const Module = require("module");
  const originalLoad = Module._load;
  Module._load = function (request, parent, isMain) {
    if (request === "stripe") {
      return function () {
        return {
          __mock: true,
          webhooks: {
            constructEvent: () => ({ id: "evt_test", type: "mock.event" }),
          },
        };
      };
    }
    return originalLoad.apply(this, arguments);
  };
}
