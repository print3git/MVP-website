const { execFileSync } = require("child_process");
const path = require("path");
const repoRoot = path.resolve(__dirname, "..");
const nodePath = path.join(repoRoot, "backend", "node_modules");

describe("db-check script", () => {
  test("skips when SKIP_DB_CHECK=1", () => {
    const out = execFileSync("node", [path.join("scripts", "check-db.js")], {
      env: { ...process.env, SKIP_DB_CHECK: "1", NODE_PATH: nodePath },
      encoding: "utf8",
    });
    expect(out).toContain("Skipping DB check");
  });

  test("fails when DB_URL missing", () => {
    expect(() => {
      execFileSync("node", [path.join("scripts", "check-db.js")], {
        env: {
          SKIP_DB_CHECK: "",
          ...process.env,
          DB_URL: "",
          NODE_PATH: nodePath,
        },
        encoding: "utf8",
      });
    }).toThrow(/DB_URL is not set/);
  });
});
