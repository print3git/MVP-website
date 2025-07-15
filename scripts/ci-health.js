#!/usr/bin/env node
const { execSync } = require("child_process");

const requiredEnv = [
  "DB_URL",
  "STRIPE_SECRET_KEY",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
];

for (const name of requiredEnv) {
  if (!process.env[name]) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
}

const services = [
  process.env.DALLE_SERVER_URL,
  process.env.SHIPPING_API_URL,
  process.env.PRINTER_API_URL,
].filter(Boolean);

for (const url of services) {
  try {
    execSync(`curl -fsIL --max-time 5 ${url} -o /dev/null`, {
      stdio: "ignore",
    });
  } catch {
    console.error(`Service unreachable: ${url}`);
    process.exit(1);
  }
}

console.log("✅ CI environment healthy");
