#!/usr/bin/env node
const { execSync } = require("child_process");

// Use the npm ping endpoint to ensure the registry fully responds.
const targets = [
  { url: "https://registry.npmjs.org/-/ping", name: "npm registry" },
  { url: "https://cdn.playwright.dev/browser.json", name: "Playwright CDN" },
  { url: "https://esm.sh", name: "esm.sh" },
  {
    url: "https://cdn.jsdelivr.net/npm/@google/model-viewer@1.12.0/dist/model-viewer.min.js",
    name: "jsdelivr",
  },
];

// Allow tests to override the first target URL so failure scenarios can be
// simulated without manipulating the real network environment.
if (process.env.NETWORK_CHECK_URL) {
  targets[0] = { url: process.env.NETWORK_CHECK_URL, name: "test url" };
}

function check(url) {
  try {
    execSync(`curl -sS -I --max-time 10 -o /dev/null ${url}`, {
      stdio: "pipe",
    });
    return null;
  } catch (err) {
    const stderr = err.stderr ? err.stderr.toString().trim() : err.message;
    return stderr.split("\n").slice(-1)[0];
  }
}

for (const { url, name } of targets) {
  const error = check(url);
  if (error) {
    console.error(`Unable to reach ${name}: ${url}`);
    if (error) console.error(error);
    process.exit(1);
  }
}
console.log("✅ network OK");
