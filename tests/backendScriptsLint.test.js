const { execSync } = require("child_process");

describe("backend scripts lint", () => {
  test("ensure-deps.js passes eslint", () => {
    execSync("npx eslint backend/scripts/ensure-deps.js", { stdio: "pipe" });
  });
});
