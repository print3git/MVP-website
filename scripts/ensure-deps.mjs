#!/usr/bin/env node
import { EventEmitter } from "events";
import { withRetries } from "./net-mode.mjs";

EventEmitter.defaultMaxListeners = Math.max(
  25,
  EventEmitter.defaultMaxListeners || 10,
);

try {
  withRetries("npm ping");
  if (
    process.env.SKIP_PW_DEPS !== "1" &&
    process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD !== "1"
  ) {
    withRetries(
      "curl -sSIL --max-time 10 https://cdn.playwright.dev/browser.json -o /dev/null",
    );
  }
  console.log("✅ environment OK");
} catch (err) {
  const msg = err && err.message ? err.message.trim() : "";
  console.error("dependency check failed", msg);
  process.exit(1);
}
