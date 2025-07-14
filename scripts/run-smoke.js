#!/usr/bin/env node
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function initEnv(baseEnv = process.env) {
  const env = { ...baseEnv };

  function loadEnvFile(file) {
    if (!fs.existsSync(file)) return;
    const content = fs.readFileSync(file, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) {
        const [, key, val] = m;
        if (!env[key]) {
          env[key] = val.replace(/^['"]|['"]$/g, "");
        }
      }
    }
  }

  if (fs.existsSync(path.join(process.cwd(), ".env"))) {
    loadEnvFile(path.join(process.cwd(), ".env"));
  } else if (fs.existsSync(path.join(process.cwd(), ".env.example"))) {
    loadEnvFile(path.join(process.cwd(), ".env.example"));
  }

  function ensureDefault(key, value) {
    if (!env[key]) {
      env[key] = value;
    }
  }

  ensureDefault("AWS_ACCESS_KEY_ID", "dummy");
  ensureDefault("AWS_SECRET_ACCESS_KEY", "dummy");
  ensureDefault("DB_URL", "postgres://user:pass@localhost/db");
  ensureDefault("STRIPE_SECRET_KEY", "sk_test_dummy");
  ensureDefault("STRIPE_TEST_KEY", `sk_test_dummy_${Date.now()}`);
  ensureDefault("SKIP_DB_CHECK", "1");

  const required = [
    "STRIPE_TEST_KEY",
    "CLOUDFRONT_MODEL_DOMAIN",
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "DB_URL",
    "STRIPE_SECRET_KEY",
  ];
  for (const key of required) {
    if (!env[key]) {
      console.warn(`Missing env var ${key}`);
    }
  }

  return env;
}

const env = initEnv(process.env);

let lastCommand = "";

function run(cmd) {
  lastCommand = cmd;
  execSync(cmd, { stdio: "inherit", env });
}

function dumpDiagnostics(err) {
  console.error("Smoke test failed:");
  console.error(err.stack || err.message);
  console.error("Environment keys:", Object.keys(env).join(", "));
  if (lastCommand) {
    console.error("Command:", lastCommand);
  }
  console.error(
    "Ensure required environment variables are set and run 'npm run setup' manually.",
  );
}

function main() {
  try {
    run("npm run validate-env");
    run("npm run setup");
    if (!process.env.SKIP_PW_DEPS) {
      run("npx -y playwright install --with-deps");
    }
    const waitArgs = process.env.WAIT_ON_TIMEOUT
      ? `-t ${process.env.WAIT_ON_TIMEOUT} `
      : "";
    run(
      `npx -y concurrently -k -s first "npm run serve" "npx -y wait-on ${waitArgs}http://localhost:3000 && npx playwright test e2e/smoke.test.js"`,
    );
  } catch (err) {
    dumpDiagnostics(err);
    process.exit(err.status ?? 1);
  }
}

process.on("uncaughtException", dumpDiagnostics);
process.on("unhandledRejection", dumpDiagnostics);

if (require.main === module) {
  main();
}

module.exports = { main, env, run, initEnv };
