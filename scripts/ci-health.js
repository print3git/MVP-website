#!/usr/bin/env node
const { execSync } = require("child_process");

const { applyMockEnv } = require("../backend/src/lib/mockEnv");
applyMockEnv();

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
