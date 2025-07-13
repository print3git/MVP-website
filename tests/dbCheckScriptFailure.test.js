const { execFileSync } = require("child_process");
const path = require("path");
const repoRoot = path.resolve(__dirname, "..");
const nodePath = path.join(repoRoot, "backend", "node_modules");

describe("db-check failure", () => {
  test("fails when connection refused", () => {
    expect(() => {
      execFileSync("node", [path.join("scripts", "check-db.js")], {
        env: {
          ...process.env,
          DB_URL: "postgres://user:pass@127.0.0.1:9/db",
          NODE_PATH: nodePath,
        },
        encoding: "utf8",
      });
    }).toThrow(/Unable to connect to database/);
  });
});
