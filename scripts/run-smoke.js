#!/usr/bin/env node
const { execSync } = require("child_process");
const env = { ...process.env };

const required = ["HF_TOKEN", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"];
for (const name of required) {
  if (!env[name]) {
    console.error(
      `Environment variable ${name} must be set. Run 'npm run validate-env' to verify your configuration.`,
    );
    process.exit(1);
  }
}

function run(cmd) {
  execSync(cmd, { stdio: "inherit", env });
}

run("npm run setup");
if (!process.env.SKIP_PW_DEPS) {
  run("npx -y playwright install --with-deps");
}
run(
  'npx -y concurrently -k -s first "npm run serve" "wait-on http://localhost:3000 && npx playwright test e2e/smoke.test.js"',
);
