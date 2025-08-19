#!/usr/bin/env node
const fs = require("fs");
const { applyMockEnv, mockSecrets } = require("../backend/src/lib/mockEnv");

const originalEnv = { ...process.env };
applyMockEnv();

const secretKeys = Object.keys(mockSecrets);

if (process.env.GITHUB_ENV) {
  const lines = secretKeys.map((key) => `${key}=${process.env[key]}`);
  fs.appendFileSync(process.env.GITHUB_ENV, lines.join("\n") + "\n");
} else {
  for (const key of secretKeys) {
    const status = originalEnv[key] ? "present" : "missing";
    console.log(`${key} ${status}`);
  }
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
