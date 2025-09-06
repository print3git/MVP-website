#!/usr/bin/env node
const { execSync } = require("child_process");

function run(cmd) {
  execSync(cmd, { stdio: "inherit" });
}

// Unset npm proxy variables to avoid forcing offline mode
delete process.env.npm_config_http_proxy;
delete process.env.npm_config_https_proxy;

// Ensure required mock dependency is present
try {
  require.resolve("aws-sdk-client-mock");
} catch {
  console.error("aws-sdk-client-mock is missing; run npm install");
  process.exit(1);
}

// Warn if dependency tree is out of sync
try {
  execSync("npm ls aws-sdk-client-mock --silent", { stdio: "pipe" });
} catch {
  console.warn(
    "aws-sdk-client-mock may be extraneous or mismatched; run npm install"
  );
}

// Bail if manual offline flags are present
for (const key of ["CI_NO_NET", "CI_SANDBOX", "SKIP_NET_CHECKS"]) {
  if (process.env[key]) {
    console.error(`${key} must be unset for image pipeline tests`);
    process.exit(1);
  }
}

// Verify connectivity to npm registry and other required hosts
let networkOk = true;
try {
  run("node scripts/network-check.js");
} catch {
  console.warn("network check failed; proceeding in offline mode");
  networkOk = false;
}

// Install dependencies if network check passed
if (networkOk) {
  try {
    run("npm run setup");
  } catch {
    console.warn("npm run setup failed; continuing");
  }
}

// Force tests to run even when offline
run("CI_FORCE=1 node scripts/run-jest.js --testPathPattern tests/assets");
