const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

test("workflow mapper runs and outputs map", () => {
  const repoRoot = path.resolve(__dirname, "..", "..", "..");
  const script = path.join(
    repoRoot,
    "scripts",
    "ci-guard",
    "workflow-map-yaml-dep",
    "run-map-workflows.js",
  );
  const out = path.join(repoRoot, "ci-workflow-map.json");
  if (fs.existsSync(out)) fs.unlinkSync(out);
  const result = spawnSync("node", [script], { cwd: repoRoot });
  expect(result.status).toBe(0);
  expect(fs.existsSync(out)).toBe(true);
  fs.unlinkSync(out);
});
