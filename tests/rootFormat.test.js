const { execSync } = require("child_process");

describe("root format", () => {
  test("prettier check passes", () => {
    execSync("npm run format:check", { stdio: "inherit" });
  });
});
