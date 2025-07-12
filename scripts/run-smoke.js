#!/usr/bin/env node
const { execSync } = require("child_process");
const env = { ...process.env };

function run(cmd) {
  try {
    execSync(cmd, { stdio: "inherit", env });
  } catch (err) {
    if (cmd === "npm run setup") {
      console.error(
        'setup failed. Run "npm run net:check" to verify network connectivity.',
      );
    }
    process.exit(err.status || 1);
  }
}

run("npm run setup");
if (!process.env.SKIP_PW_DEPS) {
  run("npx -y playwright install --with-deps");
}
run(
  'npx -y concurrently -k -s first "npm run serve" "wait-on http://localhost:3000 && npx playwright test e2e/smoke.test.js"',
);
