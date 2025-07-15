const { execSync } = require("child_process");

test("backend/server.js passes eslint", () => {
  expect(() => {
    execSync("npx eslint server.js", { stdio: "pipe", cwd: __dirname + "/.." });
  }).not.toThrow();
});
