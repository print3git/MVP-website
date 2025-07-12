#!/usr/bin/env node
const { execSync } = require("child_process");
const env = { ...process.env };

function run(cmd) {
  execSync(cmd, { stdio: "inherit", env });
}

function main() {
  try {
    run("npm run validate-env");
    run("npm run setup");
    if (!process.env.SKIP_PW_DEPS) {
      run("npx -y playwright install --with-deps");
    }
    run(
      'npx -y concurrently -k -s first "npm run serve" "wait-on http://localhost:3000 && npx playwright test e2e/smoke.test.js"',
    );
  } catch (err) {
    console.error("Smoke test failed:", err.message);
    console.error(
      "Ensure required environment variables are set and run 'npm run setup' manually.",
    );
    process.exit(err.status ?? 1);
  }
}

if (require.main === module) {
  main();
}

module.exports = main;
