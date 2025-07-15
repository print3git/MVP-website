const fs = require("fs");
const path = require("path");

describe("validate-env installs mise when missing", () => {
  test("script contains install logic", () => {
    const content = fs.readFileSync(
      path.join(__dirname, "..", "scripts", "validate-env.sh"),
      "utf8",
    );
    expect(content).toMatch(/command -v mise/);
    expect(content).toMatch(/install-mise\.sh/);
  });
});
