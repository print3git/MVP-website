const { execFileSync } = require("child_process");
const path = require("path");
const repoRoot = path.resolve(__dirname, "..");

describe("db-check module resolution", () => {
  test("resolves pg from backend when NODE_PATH unset", () => {
    expect(() => {
      execFileSync("node", [path.join("scripts", "check-db.js")], {
        cwd: repoRoot,
        env: {
          ...process.env,
          DB_URL: "postgres://user:pass@127.0.0.1:9/db",
          NODE_PATH: "",
        },
        encoding: "utf8",
      });
    }).toThrow(/Unable to connect to database/);
  });
});
