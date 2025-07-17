const { test } = require("node:test");
const assert = require("node:assert");
const { spawnSync } = require("node:child_process");

test("Mutation score \u2265 80%", () => {
  const proc = spawnSync(
    "node",
    ["scripts/check-mutation-score.js", "--min=80"],
    { encoding: "utf8" },
  );
  if (proc.status !== 0) {
    console.error(proc.stdout);
  }
  assert.strictEqual(proc.status, 0);
});
