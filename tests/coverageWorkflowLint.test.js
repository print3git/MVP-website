const { execSync } = require("child_process");

test("coverage workflow test passes eslint", () => {
  expect(() => {
    execSync("npx eslint tests/coverageWorkflow.test.js", { stdio: "pipe" });
  }).not.toThrow();
});
