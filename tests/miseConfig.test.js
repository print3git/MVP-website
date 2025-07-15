const { execSync } = require("child_process");

describe("mise config validity", () => {
  test("node 20 can be executed via mise", () => {
    const output = execSync("mise exec node -- node -v", {
      encoding: "utf8",
    }).trim();
    expect(output).toMatch(/^v20\./);
  });
});
