#!/usr/bin/env node

const fs = require("fs");

const dummies = {
  STRIPE_SECRET_KEY: "sk_test_mock",
  STRIPE_WEBHOOK_SECRET: "whsec_mock",
  AWS_ACCESS_KEY_ID: "mock",
  AWS_SECRET_ACCESS_KEY: "mock",
  AWS_REGION: "us-east-1",
  S3_BUCKET: "mock-bucket",
  DB_URL: "postgres://user:pass@localhost:5432/testdb",
};

const requireExternal = process.env.CI_REQUIRE_EXTERNAL === "1";

function setEnv(key, value) {
  if (!value) return;
  process.env[key] = value;
  const envPath = process.env.GITHUB_ENV;
  if (!envPath) return;
  let content = "";
  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, "utf8");
  }
  const line = `${key}=${value}`;
  const regex = new RegExp(`^${key}=.*$`, "m");
  if (regex.test(content)) {
    const newContent = content.replace(regex, line);
    fs.writeFileSync(envPath, newContent);
  } else {
    fs.appendFileSync(envPath, `${line}\n`);
  }
}

for (const [key, dummy] of Object.entries(dummies)) {
  if (!process.env[key]) {
    setEnv(key, dummy);
  } else {
    setEnv(key, process.env[key]);
  }
}

if (!process.env.PORT) {
  setEnv("PORT", "3000");
} else {
  setEnv("PORT", process.env.PORT);
}

const missing = [];
for (const [key, dummy] of Object.entries(dummies)) {
  const val = process.env[key];
  const hasLive = val && val !== dummy;
  if (requireExternal && !hasLive) {
    missing.push(key);
  }
  dummies[key] = hasLive;
}

if (missing.length) {
  console.error(`Missing required env vars for CI: ${missing.join(", ")}`);
  process.exit(1);
}

console.log(
  `ci-env-preflight: ${Object.entries(dummies)
    .map(([k, v]) => `${k}=${v}`)
    .join(" ")}`,
);

if (process.env.CI && process.env.CI_REQUIRE_EXTERNAL !== "1") {
  const Module = require("module");
  const originalLoad = Module._load;
  Module._load = function (request, _parent, _isMain) {
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
