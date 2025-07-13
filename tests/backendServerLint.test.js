const { execSync } = require("child_process");

describe("backend server lint", () => {
  test("server.js passes eslint", () => {
    execSync("npx eslint backend/server.js", { stdio: "pipe" });
  });
});
