const { execSync } = require("child_process");

test("backend tests have no unused vars", () => {
  expect(() => {
    execSync(
      'npx eslint --config backend/eslint.config.js "backend/tests/**/*.js" --rule "no-unused-vars:error" --max-warnings=0',
      { stdio: "pipe" },
    );
  }).not.toThrow();
});
