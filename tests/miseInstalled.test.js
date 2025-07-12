const { execSync } = require("child_process");

describe("mise installation", () => {
  test("mise command is available", () => {
    expect(() => {
      execSync("mise --version", { stdio: "ignore" });
    }).not.toThrow();
  });
});
