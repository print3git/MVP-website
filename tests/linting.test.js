const { execSync } = require("child_process");

test("repository passes ESLint with no warnings", () => {
  expect(() => {
    execSync("npm run lint --silent", { stdio: "pipe" });
  }).not.toThrow();
});
