#!/usr/bin/env node
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const required = [
  "tests/stripe/webhook.valid-signature.spec.ts",
  "tests/stripe/webhook.invalid-signature.spec.ts",
  "tests/stripe/webhook.idempotency.spec.ts",
  "tests/stripe/webhook.event-types.spec.ts",
  "tests/stripe/webhook.performance.spec.ts",
  "tests/stripe/webhook.logging.spec.ts",
  "tests/stripe/checkout.session.success.spec.ts",
  "tests/stripe/checkout.session.errors.spec.ts",
];

try {
  const missing = required.filter(
    (p) => !fs.existsSync(path.join(__dirname, "..", p)),
  );
  if (missing.length > 0) {
    if (process.env.ALLOW_MISSING_TESTS === "1") {
      console.warn(
        `ALLOW_MISSING_TESTS=1; skipping missing tests:\n${missing.join("\n")}`,
      );
      process.exit(0);
    }
    console.error(`Missing required test files:\n${missing.join("\n")}`);
    process.exit(1);
  }

  const output = execSync("npx jest --listTests", { encoding: "utf-8" }).trim();
  const count = output ? output.split("\n").filter(Boolean).length : 0;
  if (count < 1) {
    console.error("No tests discovered; failing to prevent silent skips.");
    process.exit(1);
  }
} catch (err) {
  console.error("Failed to list tests; ensure Jest is installed.");
  process.exit(1);
}
