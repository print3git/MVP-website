#!/usr/bin/env node
const { execSync } = require("child_process");

const defaultTargets = [
  { url: "https://registry.npmjs.org", name: "npm registry" },
  { url: "https://cdn.playwright.dev", name: "Playwright CDN" },
];

let targets;
try {
  targets = process.env.NETWORK_CHECK_TARGETS
    ? JSON.parse(process.env.NETWORK_CHECK_TARGETS)
    : defaultTargets;
} catch {
  console.error("Invalid NETWORK_CHECK_TARGETS value");
  process.exit(1);
}

function check(url) {
  try {
    execSync(`curl -sI --max-time 10 ${url}`, {
      stdio: "ignore",
      env: { ...process.env, http_proxy: "", https_proxy: "" },
    });
    return true;
  } catch {
    return false;
  }
}

for (const { url, name } of targets) {
  if (!check(url)) {
    console.error(`Unable to reach ${name}: ${url}`);
    process.exit(1);
  }
}
console.log("✅ network OK");
