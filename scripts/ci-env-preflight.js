#!/usr/bin/env node
const required = [
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "DB_URL",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
];
const missing = required.filter((v) => !process.env[v]);
if (missing.length) {
  console.error(`Missing required env vars for CI: ${missing.join(", ")}`);
  process.exit(1);
}

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
