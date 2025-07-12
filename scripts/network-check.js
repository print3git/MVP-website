#!/usr/bin/env node
const { execSync } = require("child_process");

const targets = [
  {
    url: process.env.NPM_REGISTRY_URL || "https://registry.npmjs.org",
    name: "npm registry",
  },
  {
    url: process.env.PLAYWRIGHT_CDN_URL || "https://cdn.playwright.dev",
    name: "Playwright CDN",
  },
];

const timeout = parseInt(process.env.NETWORK_CHECK_TIMEOUT, 10) || 10;

function check(url) {
  try {
    execSync(`curl -sI --max-time ${timeout} ${url}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

for (const { url, name } of targets) {
  if (!check(url)) {
    console.error(
      `Unable to reach ${name}: ${url}\n` +
        "Check proxy and firewall settings or set SKIP_NET_CHECKS=1 if connectivity is intentionally blocked.",
    );
    process.exit(1);
  }
}
console.log("✅ network OK");
