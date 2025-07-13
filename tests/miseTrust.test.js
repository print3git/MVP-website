const { execSync } = require("child_process");

describe("mise trust", () => {
  test("config files are trusted", () => {
    const output = execSync("mise use -g node@20", { encoding: "utf8" });
    expect(output).not.toMatch(/not trusted/i);
  });
});
