const { execSync } = require("child_process");

test("backend/server.js passes eslint", () => {
  expect(() => {
    execSync("npx eslint backend/server.js", { stdio: "pipe" });
  }).not.toThrow();
});
