const { execSync } = require("child_process");

/** Ensure backend code is formatted */
describe("backend format", () => {
  test("prettier check passes", () => {
    execSync("npm run format:check", { cwd: "backend", stdio: "inherit" });
  });
});
