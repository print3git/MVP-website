const { spawnSync } = require("child_process");
const path = require("path");
const repoRoot = path.resolve(__dirname, "../../..");

test("frontend smoke artifact guard", () => {
  const script = path.join(
    repoRoot,
    "scripts",
    "ci-guard",
    "frontend-smoke-artifact",
    "verify.js",
  );
  const result = spawnSync("node", [script], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout);
  }
});
