const { execFileSync } = require("child_process");
const path = require("path");
const repoRoot = path.resolve(__dirname, "..");
const nodePath = path.join(repoRoot, "backend", "node_modules");

describe("db-check placeholder URL", () => {
  test("skips when DB_URL is placeholder", () => {
    const out = execFileSync("node", [path.join("scripts", "check-db.js")], {
      env: {
        ...process.env,
        DB_URL: "postgres://user:password@localhost:5432/your_database",
        NODE_PATH: nodePath,
      },
      encoding: "utf8",
    });
    expect(out).toContain("Skipping DB check for placeholder DB_URL");
  });
});
