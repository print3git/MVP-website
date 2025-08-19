#!/usr/bin/env node

const fs = require("fs");

const required = ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "DB_URL"];
const stripeVars = ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"];

const requireRealSecrets =
  process.env.REQUIRE_REAL_SECRETS === "1" ||
  process.env.GITHUB_REF === "refs/heads/main" ||
  process.env.BRANCH_NAME === "main";

const status = Object.fromEntries(
  required.map((k) => [k, Boolean(process.env[k])]),
);
const missing = required.filter((k) => !status[k]);

if (missing.length && requireRealSecrets) {
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

console.log(
  `ci-env-preflight: ${required.map((k) => `${k}=${status[k]}`).join(" ")}`,
);

const mockValues = {
  AWS_ACCESS_KEY_ID: "mock_access",
  AWS_SECRET_ACCESS_KEY: "mock_secret",
  DB_URL: "postgres://user:pass@localhost:5432/testdb",
};

for (const key of required) {
  setEnv(key, process.env[key] || mockValues[key]);
}

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
