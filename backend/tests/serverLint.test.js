const { execSync } = require("child_process");
const path = require("path");

test("backend/server.js passes eslint", () => {
  expect(() => {
    const serverPath = path.join(__dirname, "../server.js");
    execSync(`npx eslint ${serverPath}`, { stdio: "pipe" });
  }).not.toThrow();
});
