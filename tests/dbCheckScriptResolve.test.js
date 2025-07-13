const { execFileSync } = require("child_process");
const path = require("path");
const repoRoot = path.resolve(__dirname, "..");

describe("db-check module resolution", () => {
  test("loads pg from backend when not installed in root", () => {
    const out = execFileSync("node", [path.join("scripts", "check-db.js")], {
      cwd: repoRoot,
      env: { ...process.env, SKIP_DB_CHECK: "1", NODE_PATH: "" },
      encoding: "utf8",
    });
    expect(out).toContain("Skipping DB check");
  });
});
