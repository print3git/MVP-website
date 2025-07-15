const fs = require("fs");
const path = require("path");

describe("README coverage instructions", () => {
  test("show updated coveralls command", () => {
    const readme = fs.readFileSync(
      path.join(__dirname, "..", "README.md"),
      "utf8",
    );
    expect(readme).toContain("cat coverage/lcov.info | npx coveralls");
  });
});
