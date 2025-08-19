#!/usr/bin/env node

const fs = require("fs");

const required = ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "DB_URL"];
const stripeVars = ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"];

const requireExternal = process.env.CI_REQUIRE_EXTERNAL === "1";
const missing = required.filter((k) => !process.env[k]);
if (missing.length && requireExternal) {
  console.error(`Missing required env vars for CI: ${missing.join(", ")}`);
  process.exit(1);
}

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

const fallbacks = {
  AWS_ACCESS_KEY_ID: "AKIA_TEST",
  AWS_SECRET_ACCESS_KEY: "SECRET_TEST",
  DB_URL: "postgres://user:pass@localhost:5432/testdb",
};

for (const key of required) {
  if (!process.env[key]) {
    setEnv(key, fallbacks[key]);
    console.log(`Seeded ${key} with fallback`);
  } else {
    setEnv(key, process.env[key]);
  }
}

if (!process.env.PORT) {
  setEnv("PORT", "3000");
  console.log("Seeded PORT with fallback 3000");
} else {
  setEnv("PORT", process.env.PORT);
}

const status = Object.fromEntries(
  required.map((k) => [k, Boolean(process.env[k])]),
);
console.log(
  `ci-env-preflight: ${required.map((k) => `${k}=${status[k]}`).join(" ")}`,
);

const mocked = [];
for (const key of stripeVars) {
  if (!process.env[key]) {
    const value = key === "STRIPE_SECRET_KEY" ? "sk_test_mock" : "whsec_mock";
    setEnv(key, value);
    mocked.push(key);
  } else {
    setEnv(key, process.env[key]);
  }
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
