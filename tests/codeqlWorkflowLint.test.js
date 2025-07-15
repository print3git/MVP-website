const { execSync } = require("child_process");

test("codeql workflow test passes eslint", () => {
  expect(() => {
    execSync("npx eslint tests/codeqlWorkflow.test.js", { stdio: "pipe" });
  }).not.toThrow();
});
