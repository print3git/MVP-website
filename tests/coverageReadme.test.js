const fs = require("fs");
const path = require("path");

describe("README coverage section", () => {
  test("uses file redirection for coveralls", () => {
    const file = path.join(__dirname, "..", "README.md");
    const content = fs.readFileSync(file, "utf8");
    expect(content).toMatch(
      /npm run coverage\s*\n\s*npx coveralls < backend\/coverage\/lcov.info/,
    );
  });
});
