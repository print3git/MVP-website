#!/usr/bin/env node
import { EventEmitter } from "events";
import { execSync } from "child_process";
import { createRequire } from "module";
import { isOfflineEnv, logOfflineSkip } from "./net-mode.mjs";

EventEmitter.defaultMaxListeners = Math.max(
  25,
  EventEmitter.defaultMaxListeners || 10,
);

const offline = isOfflineEnv();

if (offline) {
  logOfflineSkip("smoke");
  process.exit(0);
}
if (process.env.CI_NO_SMOKE === "1") {
  logOfflineSkip("smoke");
  process.exit(0);
}
if (
  offline &&
  process.env.SKIP_PW_DEPS === "1" &&
  !process.env.SKIP_NET_CHECKS
) {
  process.env.SKIP_NET_CHECKS = "1";
}

execSync("npm run setup", { stdio: "inherit" });

const require = createRequire(import.meta.url);
try {
  require.resolve("@jest/core");
} catch {
  logOfflineSkip("smoke");
  process.exit(0);
}

execSync(
  "npm test -- --maxWorkers=2 --runTestsByPath tests/config/package-scripts.smoke.*.spec.ts tests/smoke/healthcheck.*.spec.ts",
  { stdio: "inherit" },
);
