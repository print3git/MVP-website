#!/usr/bin/env node
import { EventEmitter } from "events";
import { execSync } from "child_process";
import { isOfflineEnv } from "./net-mode.mjs";

EventEmitter.defaultMaxListeners = Math.max(
  25,
  EventEmitter.defaultMaxListeners || 10,
);

const offline = isOfflineEnv();
if (offline && !process.env.SKIP_NET_CHECKS) {
  process.env.SKIP_NET_CHECKS = "1";
}

execSync(
  "npm test -- --maxWorkers=2 --runTestsByPath tests/config/package-scripts.smoke.*.spec.ts tests/smoke/healthcheck.*.spec.ts",
  { stdio: "inherit" },
);
