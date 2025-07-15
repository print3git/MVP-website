#!/usr/bin/env node
const { execSync } = require("child_process");

if (process.env.SKIP_NET_CHECKS) {
  console.log("Skipping network checks");
  process.exit(0);
}

// Use the npm ping endpoint to ensure the registry fully responds.
const targets = [
  {
    url: "https://registry.npmjs.org/-/ping",
    name: "npm registry",
    required: true,
  },
  // Skip the Playwright CDN check if the browsers are already installed or the
  // caller explicitly sets SKIP_PW_DEPS. This allows tests to run without
  // network access to the CDN when Playwright is preinstalled.
  ...(process.env.SKIP_PW_DEPS
    ? []
    : [
        {
          url: "https://cdn.playwright.dev/browser.json",
          name: "Playwright CDN",
          required: true,
        },
      ]),
  { url: "https://esm.sh", name: "esm.sh", required: false },
  {
    url: "https://cdn.jsdelivr.net/npm/@google/model-viewer@1.12.0/dist/model-viewer.min.js",
    name: "jsdelivr",
    required: false,
  },
  {
    url: process.env.APT_CHECK_URL || "http://archive.ubuntu.com",
    name: "apt archive",
    required: !process.env.SKIP_PW_DEPS,
  },
];

// Allow tests to override the first target URL so failure scenarios can be
// simulated without manipulating the real network environment.
if (process.env.NETWORK_CHECK_URL) {
  targets[0] = {
    url: process.env.NETWORK_CHECK_URL,
    name: "test url",
    required: true,
  };
}

function check(url) {
  try {
    // Use HEAD requests without `-f` so HTTP errors (e.g. 400) still
    // indicate connectivity instead of failing the check.
    execSync(`curl -sSIL --max-time 10 -o /dev/null ${url}`, {
      stdio: "pipe",
    });
    return null;
  } catch (err) {
    const stderr = err.stderr ? err.stderr.toString().trim() : err.message;
    // Treat HTTP 4xx/5xx responses from the Playwright CDN as success. Some
    // Codex environments proxy requests and respond with 4xx or 5xx even though
    // the host is reachable. Allowing this prevents false negatives during
    // validation.
    if (
      url.includes("cdn.playwright.dev") &&
      /error:\s*[45][0-9]{2}/.test(stderr)
    ) {
      return null;
    }
    return stderr.split("\n").slice(-1)[0];
  }
}

for (const { url, name, required } of targets) {
  const error = check(url);
  if (error) {
    const log = required ? console.error : console.warn;
    log(`Unable to reach ${name}: ${url}`);
    if (error) log(error);
    if (required) {
      if (name === "Playwright CDN" && /error:\s*[45][0-9]{2}/i.test(error)) {
        console.error("Set SKIP_PW_DEPS=1 to skip Playwright dependencies.");
      }
      process.exit(1);
    }
  }
}
console.log("✅ network OK");
