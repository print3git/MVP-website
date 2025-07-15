const { execSync } = require("child_process");

test("backend/server.js passes eslint", () => {
  expect(() => {
    const path = require("path");
    const serverPath = path.resolve(__dirname, "../server.js");
    execSync(`npx eslint ${serverPath}`, { stdio: "pipe" });
  }).not.toThrow();
});
