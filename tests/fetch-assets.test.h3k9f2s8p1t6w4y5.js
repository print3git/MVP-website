const test = require("node:test");
const assert = require("node:assert/strict");
const { resolve } = require("node:path");
const fs = require("node:fs");

test("fetch-assets script exists", () => {
  const script = resolve(__dirname, "../scripts/fetch-assets.cjs");
  assert.ok(fs.existsSync(script), "fetch-assets.cjs should exist");
});
