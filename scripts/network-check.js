#!/usr/bin/env node
const { execSync } = require("child_process");

const defaultTargets = [
  { url: "https://registry.npmjs.org", name: "npm registry" },
  { url: "https://cdn.playwright.dev", name: "Playwright CDN" },
];

const envTargets = process.env.NET_CHECK_URLS
  ? process.env.NET_CHECK_URLS.split(",").map((url) => ({ url, name: url }))
  : null;

const targets = envTargets || defaultTargets;

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
