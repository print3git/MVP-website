#!/usr/bin/env node
const { execSync } = require("child_process");

// Use the npm ping endpoint to ensure the registry fully responds.
const targets = [
  { url: "https://registry.npmjs.org/-/ping", name: "npm registry" },
  { url: "https://cdn.playwright.dev", name: "Playwright CDN" },
  { url: "https://esm.sh", name: "esm.sh" },
  {
    url: "https://cdn.jsdelivr.net/npm/@google/model-viewer@1.12.0/dist/model-viewer.min.js",
    name: "jsdelivr",
  },

  {
    url: process.env.APT_CHECK_URL || "http://archive.ubuntu.com",
    name: "apt archive",
  },
];

// Allow tests to override the first target URL so failure scenarios can be
// simulated without manipulating the real network environment.
if (process.env.NETWORK_CHECK_URL) {
  targets[0] = { url: process.env.NETWORK_CHECK_URL, name: "test url" };
}

function check(url) {
  try {
    execSync(`curl -sI --max-time 10 ${url}`, { stdio: "ignore" });
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
